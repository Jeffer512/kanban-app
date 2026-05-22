import type { NextFunction, Request, Response } from 'express';
import pool from '../db.ts';
import { CreateTaskSchema, UpdateTaskSchema, MoveTaskSchema, IdSchema } from '../schemas/kanban.ts';
import { z } from 'zod';

/**
 * Create a new task and append it to the end of a column.
 */
export async function createTask(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.columnId);
  const bodyResult = CreateTaskSchema.safeParse(req.body);

  if (!idResult.success) return res.status(400).json({ error: "Invalid Column ID" });
  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const columnId = idResult.data;
  const { title, description } = bodyResult.data;
  const userId = req.user?.userId;

  // Verify membership and retrieve project_id for denormalization
  const columnInfo = await pool.query(
    `SELECT c.project_id, c.board_id FROM columns c
     JOIN project_members pm ON c.project_id = pm.project_id
     WHERE c.id = $1 AND pm.user_id = $2`,
    [columnId, userId]
  );

  if (columnInfo.rows.length === 0) {
    return res.status(403).json({ error: "Access denied or column not found" });
  }

  const projectId = columnInfo.rows[0].project_id;
  const boardId = columnInfo.rows[0].board_id;

  // Calculate next order index within the column
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM tasks WHERE column_id = $1',
    [columnId]
  );
  const orderIndex = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `INSERT INTO tasks (title, description, column_id, project_id, order_index) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING id, title, description, order_index, created_at`,
    [title, description, columnId, projectId, orderIndex]
  );

  req.io.to(`board:${boardId}`).emit('board-updated');

  res.status(201).json(result.rows[0]);
}

/**
 * Update task content or metadata.
 */
export async function updateTask(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  const bodyResult = UpdateTaskSchema.safeParse(req.body);

  if (!idResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid ID or data" });
  }

  const updates = bodyResult.data;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No update data provided" });
  }

  const taskId = idResult.data;
  const userId = req.user?.userId;

  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

  // Update via join to verify project membership
  const query = `
    UPDATE tasks t
    SET ${setClause}
    FROM columns c, project_members pm
    WHERE t.id = $${fields.length + 1} 
    AND t.project_id = pm.project_id 
    AND pm.user_id = $${fields.length + 2}
    RETURNING t.id, t.title, t.description, t.order_index, t.created_at, c.board_id
  `;

  const result = await pool.query(query, [...values, taskId, userId]);

  if (result.rows.length === 0) {
    return res.status(403).json({ error: "Task not found or access denied" });
  }

  req.io.to(`board:${result.rows[0].board_id}`).emit('board-updated');

  res.json(result.rows[0]);
}

/**
 * Delete a task.
 */
export async function deleteTask(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: "Invalid ID format" });

  const taskId = idResult.data;
  const userId = req.user?.userId;

  const result = await pool.query(
    `DELETE FROM tasks t
     USING columns c, project_members pm
     WHERE t.id = $1 AND t.project_id = pm.project_id AND pm.user_id = $2
     RETURNING t.id, c.board_id`,
    [taskId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(403).json({ error: "Access denied or task not found" });
  }

  req.io.to(`board:${result.rows[0].board_id}`).emit('board-updated');

  res.json({ message: "Task deleted", id: taskId });
}

/**
 * Move a task within a column or to a different column.
 * Re-indexes affected tasks to maintain consistent ordering.
 */
export async function moveTask(req: Request, res: Response, next: NextFunction) {
  const idResult = IdSchema.safeParse(req.params.id);
  const bodyResult = MoveTaskSchema.safeParse(req.body);

  if (!idResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid ID or move data" });
  }

  const taskId = idResult.data;
  const { newColumnId, newOrderIndex } = bodyResult.data;
  const userId = req.user?.userId;

  const client = await pool.connect();;
  try {
    await client.query('BEGIN');

    // Get current task state and verify project membership
    const taskQuery = `
      SELECT t.column_id, t.order_index, t.project_id, c.board_id
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = $1 AND pm.user_id = $2
      FOR UPDATE OF t -- Lock the row to prevent concurrent move conflicts
    `;
    const taskRes = await client.query(taskQuery, [taskId, userId]);

    if (taskRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Task not found or access denied" });
    }

    const { column_id: oldColumnId, order_index: oldOrderIndex, project_id: projectId } = taskRes.rows[0];
    const { board_id: boardId } = taskRes.rows[0];

    if (oldColumnId === newColumnId) {
      // Moving within the same column
      if (oldOrderIndex !== newOrderIndex) {
        const moveForward = oldOrderIndex < newOrderIndex;
        const shiftQuery = `
          UPDATE tasks 
          SET order_index = CASE 
            WHEN id = $1 THEN $2
            WHEN $3 = true AND order_index > $4 AND order_index <= $2 THEN order_index - 1
            WHEN $3 = false AND order_index < $4 AND order_index >= $2 THEN order_index + 1
            ELSE order_index
          END
          WHERE column_id = $5
        `;
        await client.query(shiftQuery, [taskId, newOrderIndex, moveForward, oldOrderIndex, oldColumnId]);
      }
    } else {
      // Moving to a different column

      // Verify the NEW COLUMN belongs to the same project
      const columnCheck = await client.query(
        'SELECT id FROM columns WHERE id = $1 AND project_id = $2',
        [newColumnId, projectId]
      );

      if (columnCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: "Invalid target column" });
      }

      // Shift tasks in the old column up to fill the gap
      await client.query(
        'UPDATE tasks SET order_index = order_index - 1 WHERE column_id = $1 AND order_index > $2',
        [oldColumnId, oldOrderIndex]
      );

      // Shift tasks in the new column down to make space
      await client.query(
        'UPDATE tasks SET order_index = order_index + 1 WHERE column_id = $1 AND order_index >= $2',
        [newColumnId, newOrderIndex]
      );

      // Update the target task
      await client.query(
        'UPDATE tasks SET column_id = $1, order_index = $2 WHERE id = $3',
        [newColumnId, newOrderIndex, taskId]
      );
    }

    await client.query('COMMIT');
    
    req.io.to(`board:${boardId}`).emit('board-updated');

    res.json({ message: "Task moved successfully" });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    next(error);
  } finally {
    if (client) client.release();
  }
}