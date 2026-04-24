import type { Request, Response } from 'express';
import pool from '../db.ts';
import { CreateProjectSchema, UpdateProjectSchema, IdSchema } from '../schemas/kanban.ts';
import { z } from 'zod';


// Create a project and automatically assign the creator as 'owner'

export async function createProject(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const result = CreateProjectSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid data", details: z.treeifyError(result.error) });
    }

    const { name } = result.data;
    const userId = req.user?.userId;

    await client.query('BEGIN');

    // Insert the project data
    const projectResult = await client.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING *',
      [name]
    );
    const newProject = projectResult.rows[0];

    // Link the user to the project in the members table
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [newProject.id, userId, 'owner']
    );

    await client.query('COMMIT');
    res.status(201).json(newProject);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Create project error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}

// Get all projects where the user is a member

export async function getProjects(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    // Join with project_members to find all projects this user has access to
    const query = `
      SELECT p.*, pm.role 
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = $1
      ORDER BY p.created_at DESC
    `;
    
    const projects = await pool.query(query, [userId]);
    res.json(projects.rows);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Update project data (Requires membership)

export async function updateProject(req: Request, res: Response) {
  try {
    const idResult = IdSchema.safeParse(req.params.id);
    const bodyResult = UpdateProjectSchema.safeParse(req.body);

    if (!idResult.success || !bodyResult.success) {
      return res.status(400).json({ error: "Invalid ID or data" });
    }

    const projectId = idResult.data;
    const updates = bodyResult.data;
    const userId = req.user?.userId;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }

    // Authorization: Check if user is a member of the project
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Dynamic Update Logic
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
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Delete project (Only allowed for 'owner')

export async function deleteProject(req: Request, res: Response) {
  try {
    const idResult = IdSchema.safeParse(req.params.id);
    if (!idResult.success) return res.status(400).json({ error: "Invalid ID" });

    const projectId = idResult.data;
    const userId = req.user?.userId;

    // Authorization: Check if user is the 'owner'
    const roleCheck = await pool.query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'owner') {
      return res.status(403).json({ error: "Only the project owner can delete this project" });
    }

    // Delete (Cascade handles project_members, boards, etc.)
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);

    res.json({ message: "Project deleted successfully", id: projectId });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}