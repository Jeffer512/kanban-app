import type { Request, Response } from 'express';
import pool from '../db.ts';
import { CreateTaskSchema, UpdateTaskSchema, IdSchema } from '../schemas/kanban.ts';
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
    `SELECT c.project_id FROM columns c
     JOIN project_members pm ON c.project_id = pm.project_id
     WHERE c.id = $1 AND pm.user_id = $2`,
    [columnId, userId]
  );

  if (columnInfo.rows.length === 0) {
    return res.status(403).json({ error: "Access denied or column not found" });
  }

  const projectId = columnInfo.rows[0].project_id;

  // Calculate next order index within the column
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM tasks WHERE column_id = $1',
    [columnId]
  );
  const orderIndex = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `INSERT INTO tasks (title, description, column_id, project_id, order_index) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [title, description, columnId, projectId, orderIndex]
  );

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
  const setClause = fields.map((f, i) => `t.${f} = $${i + 1}`).join(', ');

  // Update via join to verify project membership
  const query = `
    UPDATE tasks t
    SET ${setClause}
    FROM project_members pm
    WHERE t.id = $${fields.length + 1} 
    AND t.project_id = pm.project_id 
    AND pm.user_id = $${fields.length + 2}
    RETURNING t.*
  `;

  const result = await pool.query(query, [...values, taskId, userId]);

  if (result.rows.length === 0) {
    return res.status(403).json({ error: "Task not found or access denied" });
  }

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
     USING project_members pm
     WHERE t.id = $1 AND t.project_id = pm.project_id AND pm.user_id = $2
     RETURNING t.id`,
    [taskId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(403).json({ error: "Access denied or task not found" });
  }

  res.json({ message: "Task deleted", id: taskId });
}