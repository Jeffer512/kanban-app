import type { Request, Response, NextFunction } from 'express';
import pool from '../db.ts';
import { CreateProjectSchema, UpdateProjectSchema, IdSchema } from '../schemas/kanban.ts';
import { z } from 'zod';

/**
 * Create a project and assign the creator as owner.
 */
export async function createProject(req: Request, res: Response, next: NextFunction) {
  const bodyResult = CreateProjectSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const { name } = bodyResult.data;
  const userId = req.user?.userId;

  const client = await pool.connect();
  try {
    
    await client.query('BEGIN');

    const projectResult = await client.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING *',
      [name]
    );
    const newProject = projectResult.rows[0];

    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [newProject.id, userId, 'owner']
    );

    await client.query('COMMIT');
    res.status(201).json(newProject);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Retrieve all projects associated with the authenticated user.
 */
export async function getProjects(req: Request, res: Response) {
  const userId = req.user?.userId;

  const query = `
    SELECT p.*, pm.role 
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = $1
    ORDER BY p.created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  res.json(result.rows);
}

/**
 * Update project metadata.
 */
export async function updateProject(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  const bodyResult = UpdateProjectSchema.safeParse(req.body);

  if (!idResult.success) return res.status(400).json({ error: "Invalid ID format" });
  if (!bodyResult.success) {
    return res.status(400).json({ error: "Invalid data", details: z.treeifyError(bodyResult.error) });
  }

  const updates = bodyResult.data;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No update data provided" });
  }

  const projectId = idResult.data;
  const userId = req.user?.userId;

  const memberCheck = await pool.query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );

  if (memberCheck.rows.length === 0) {
    return res.status(403).json({ error: "Access denied" });
  }

  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');

  const query = `
    UPDATE projects 
    SET ${setClause} 
    WHERE id = $${fields.length + 1} 
    RETURNING *
  `;

  const result = await pool.query(query, [...values, projectId]);
  res.json(result.rows[0]);
}

/**
 * Delete a project and all associated data.
 */
export async function deleteProject(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: "Invalid ID format" });

  const projectId = idResult.data;
  const userId = req.user?.userId;

  const roleCheck = await pool.query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );

  if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'owner') {
    return res.status(403).json({ error: "Only the project owner can delete this project" });
  }

  await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  res.json({ message: "Project deleted successfully", id: projectId });
}