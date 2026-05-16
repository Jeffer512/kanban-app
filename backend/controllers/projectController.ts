import type { Request, Response, NextFunction } from 'express';
import pool from '../db.ts';
import { CreateProjectSchema, UpdateProjectSchema, IdSchema, AddUsersSchema } from '../schemas/kanban.ts';
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
      'INSERT INTO project_members (project_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
      [newProject.id, userId, 'owner', 'accepted']
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
    WHERE pm.user_id = $1 AND pm.status = 'accepted'
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
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = $3',
    [projectId, userId, 'accepted']
  );

  if (memberCheck.rows.length === 0 || (memberCheck.rows[0].role !== 'owner' && memberCheck.rows[0].role !== 'admin')) {
    return res.status(403).json({ error: "Only the project owner or an admin can modify this project" });
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
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = $3',
    [projectId, userId, 'accepted']
  );

  if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'owner') {
    return res.status(403).json({ error: "Only the project owner can delete this project" });
  }

  await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  res.json({ message: "Project deleted successfully", id: projectId });
}

export async function inviteUsersToProject(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
   if (!idResult.success) return res.status(400).json({ error: "Invalid Project ID" });
  
  const bodyResult = AddUsersSchema.safeParse(req.body);
  if (!bodyResult.success) return res.status(400).json({ error: "Invalid data", details: bodyResult.error.issues });
  
  const newUsers = bodyResult.data.newUsers;
  
  const projectId = idResult.data;

  const userId = req.user?.userId;
  
  const roleCheck = await pool.query(
    'SELECT role FROM project_members WHERE user_id = $1 AND project_id = $2',
    [userId, projectId]
  );

  if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'owner') {
    return res.status(403).json({ error: "Only the project owner can add new users" });
  }

  const usernames = newUsers.map(u => u[0]);

  const userRows = await pool.query(
    'SELECT id, username FROM users WHERE username = ANY($1)',
    [usernames]
  );

  if (userRows.rows.length === 0) {
    return res.status(404).json({ error: "None of the provided usernames exist" });
  }  

  const userMap = new Map(userRows.rows.map(r => [r.username, r.id]));
  
  const insertValues: string[] = [];
  const valuePlaceholders: string[] = [];
  let paramIndex = 1;

  newUsers.forEach(([username, role]) => {
    const foundId = userMap.get(username);
    if (foundId && foundId !== userId) {
      insertValues.push(projectId, foundId, role);
      // Generates ($1, $2, $3), ($4, $5, $6), etc.
      valuePlaceholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
      paramIndex += 3;
    }
  });

  if (insertValues.length === 0) {
    return res.status(404).json({ error: "Can't invite yourself" });
  }

  const query = `
    INSERT INTO project_members (project_id, user_id, role)
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role
    RETURNING *
  `;

  const result = await pool.query(query, insertValues);

  res.json({
    message: `Successfully added/updated ${result.rows.length} members`,
    members: result.rows
  });
}

export async function getInvitations(req: Request, res: Response) {
  const userId = req.user?.userId;

  const query = `
    SELECT p.id as project_id, p.name as project_name, u.username as inviter
    FROM project_members pm
    JOIN projects p ON pm.project_id = p.id
    JOIN project_members pm_owner ON p.id = pm_owner.project_id AND pm_owner.role = 'owner'
    JOIN users u ON pm_owner.user_id = u.id
    WHERE pm.user_id = $1 AND pm.status = 'pending'
  `;

  const result = await pool.query(query, [userId]);
  res.json(result.rows);
}

export async function respondToInvitation(req: Request, res: Response) {
  const idResult = IdSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: "Invalid Project ID" });

  const { status } = req.body;
  const userId = req.user?.userId;
  const project_id = idResult.data;

  if (status !== 'accepted' && status !== 'rejected') {
    return res.status(400).json({ error: "Invalid status" });
  }

  let result;
  if (status === 'accepted') {
    result = await pool.query(
      `UPDATE project_members 
       SET status = 'accepted' 
       WHERE project_id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING project_id`,
      [project_id, userId]
    );
  } else {
    result = await pool.query(
      `DELETE FROM project_members 
       WHERE project_id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING project_id`,
      [project_id, userId]
    );
  }
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Invitation not found" });
  }

  res.json({ message: `Invitation ${status} successfully`, project_id });
}