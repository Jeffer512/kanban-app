import type { Request, Response, NextFunction } from 'express';
import pool from '../db.ts';
import { CreateBoardSchema, UpdateBoardSchema, IdSchema } from '../schemas/kanban.ts';
import { z } from 'zod';

/**
 * Create a board and initialize default columns.
 */
export async function createBoard(req: Request, res: Response, next: NextFunction) {
  const idResult = IdSchema.safeParse(req.params.projectId);
  const bodyResult = CreateBoardSchema.safeParse(req.body);

  if (!idResult.success) return res.status(400).json({ error: "Invalid Project ID format" });
  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const projectId = idResult.data;
  const { name } = bodyResult.data;
  const userId = req.user?.userId;

  const client = await pool.connect();
  try {
    const memberCheck = await client.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    await client.query('BEGIN');

    const boardResult = await client.query(
      'INSERT INTO boards (name, project_id) VALUES ($1, $2) RETURNING *',
      [name, projectId]
    );
    const boardId = boardResult.rows[0].id;

    // Perform multi-row insert for default board state
    const columnQuery = `
      INSERT INTO columns (title, board_id, project_id, order_index)
      VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)
    `;
    const columnValues = [
      'To Do', boardId, projectId, 0,
      'Doing', boardId, projectId, 1,
      'Done', boardId, projectId, 2
    ];

    await client.query(columnQuery, columnValues);
    await client.query('COMMIT');

    res.status(201).json(boardResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Get all boards for a specific project.
 */
export async function getBoards(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.projectId);
  if (!idResult.success) return res.status(400).json({ error: "Invalid Project ID format" });

  const projectId = idResult.data;
  const userId = req.user?.userId;

  const query = `
    SELECT b.* FROM boards b
    JOIN project_members pm ON b.project_id = pm.project_id
    WHERE b.project_id = $1 AND pm.user_id = $2
    ORDER BY b.created_at ASC
  `;

  const result = await pool.query(query, [projectId, userId]);
  res.json(result.rows);
}

/**
 * Update board metadata.
 */
export async function updateBoard(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  const bodyResult = UpdateBoardSchema.safeParse(req.body);

  if (!idResult.success) return res.status(400).json({ error: "Invalid Board ID format" });
  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const updates = bodyResult.data;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No update data provided" });
  }

  const boardId = idResult.data;
  const userId = req.user?.userId;

  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

  // Update via join to verify project membership
  const query = `
    UPDATE boards b
    SET ${setClause}
    FROM project_members pm
    WHERE b.id = $${fields.length + 1} 
    AND b.project_id = pm.project_id 
    AND pm.user_id = $${fields.length + 2}
    RETURNING b.*
  `;

  const result = await pool.query(query, [...values, boardId, userId]);

  if (result.rows.length === 0) {
    return res.status(403).json({ error: "Board not found or access denied" });
  }

  res.json(result.rows[0]);
}

/**
 * Delete a board.
 */
export async function deleteBoard(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: "Invalid Board ID format" });

  const boardId = idResult.data;
  const userId = req.user?.userId;

  const roleCheck = await pool.query(
    `SELECT pm.role FROM project_members pm
     JOIN boards b ON b.project_id = pm.project_id
     WHERE b.id = $1 AND pm.user_id = $2`,
    [boardId, userId]
  );

  if (roleCheck.rows.length === 0 || roleCheck.rows[0].role === 'viewer') {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  await pool.query('DELETE FROM boards WHERE id = $1', [boardId]);
  res.json({ message: "Board deleted successfully", id: boardId });
}

/**
 * Get the entire board structure (Columns + Tasks) in one request.
 */
export async function getFullBoard(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: "Invalid Board ID" });

  const boardId = idResult.data;
  const userId = req.user?.userId;

  // This query fetches the board, joins columns, and nests tasks as a JSON array inside each column
  const query = `
    SELECT
      b.id,
      b.name,
      b.project_id, 
      b.created_at,
      (
        SELECT json_agg(col_data)
        FROM (
          SELECT 
            c.id, 
            c.title, 
            c.order_index,
            c.created_at,
            (
              SELECT COALESCE(json_agg(t_data), '[]'::json)
              FROM (
                SELECT t.id, t.title, t.description, t.order_index, t.created_at
                FROM tasks t
                WHERE t.column_id = c.id
                ORDER BY t.order_index ASC
              ) t_data
            ) AS tasks
          FROM columns c
          WHERE c.board_id = b.id
          ORDER BY c.order_index ASC
        ) col_data
      ) AS columns
    FROM boards b
    JOIN project_members pm ON b.project_id = pm.project_id
    WHERE b.id = $1 AND pm.user_id = $2;
  `;

  const result = await pool.query(query, [boardId, userId]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Board not found or access denied" });
  }

  res.json(result.rows[0]);
}