import type { Request, Response } from 'express';
import pool from '../db.ts';
import { CreateColumnSchema, UpdateColumnSchema, IdSchema } from '../schemas/kanban.ts';
import { z } from 'zod';

/**
 * Create a new column in a board.
 */
export async function createColumn(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.boardId);
  const bodyResult = CreateColumnSchema.safeParse(req.body);

  if (!idResult.success) return res.status(400).json({ error: "Invalid Board ID" });
  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const boardId = idResult.data;
  const { title } = bodyResult.data;
  const userId = req.user?.userId;

  // Verify project membership and get project_id for denormalization
  const boardInfo = await pool.query(
    `SELECT b.project_id FROM boards b
     JOIN project_members pm ON b.project_id = pm.project_id
     WHERE b.id = $1 AND pm.user_id = $2`,
    [boardId, userId]
  );

  if (boardInfo.rows.length === 0) {
    return res.status(403).json({ error: "Access denied" });
  }

  const projectId = boardInfo.rows[0].project_id;

  // Calculate next order index
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM columns WHERE board_id = $1',
    [boardId]
  );
  const orderIndex = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `INSERT INTO columns (title, board_id, project_id, order_index) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, title, order_index, created_at`,
    [title, boardId, projectId, orderIndex]
  );
  
  req.io.to(`board:${boardId}`).emit('board-updated');

  res.status(201).json(result.rows[0]);
}

/**
 * Update column title or order.
 */
export async function updateColumn(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  const bodyResult = UpdateColumnSchema.safeParse(req.body);

  if (!idResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid ID or data" });
  }

  const updates = bodyResult.data;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  const columnId = idResult.data;
  const userId = req.user?.userId;

  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

  const query = `
    UPDATE columns c
    SET ${setClause}
    FROM project_members pm
    WHERE c.id = $${fields.length + 1} 
    AND c.project_id = pm.project_id 
    AND pm.user_id = $${fields.length + 2}
    RETURNING c.id, c.title, c.order_index, c.created_at, c.board_id
  `;

  const result = await pool.query(query, [...values, columnId, userId]);

  if (result.rows.length === 0) {
    return res.status(403).json({ error: "Column not found or access denied" });
  }

  req.io.to(`board:${result.rows[0].board_id}`).emit('board-updated');

  res.json(result.rows[0]);
}

/**
 * Delete a column and its tasks.
 */
export async function deleteColumn(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: "Invalid ID" });

  const columnId = idResult.data;
  const userId = req.user?.userId;

  const result = await pool.query(
    `DELETE FROM columns c
     USING project_members pm
     WHERE c.id = $1 AND c.project_id = pm.project_id AND pm.user_id = $2
     RETURNING c.id, c.board_id`,
    [columnId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(403).json({ error: "Access denied" });
  }

  req.io.to(`board:${result.rows[0].board_id}`).emit('board-updated');

  res.json({ message: "Column deleted", id: columnId });
}