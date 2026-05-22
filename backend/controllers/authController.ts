import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.ts';
import jwt from 'jsonwebtoken';
import { RegisterSchema, LoginSchema } from '../schemas/user.ts';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export async function register(req: Request, res: Response) {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Validation failed", details: z.treeifyError(result.error) });
  }

  const { username, password } = result.data;

  const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (userCheck.rows.length > 0) {
    return res.status(409).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
    [username, hashedPassword]
  );
  
  const user = newUser.rows[0];

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

  res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
  });

  res.status(201).json({ message: "User registered", user: newUser.rows[0] });
}

export async function login(req: Request, res: Response) {
    const result = LoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const { username, password } = result.data;

    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: "Logged in", user: { id: user.id, username: user.username } });
}

export async function logout(req: Request, res: Response) {
  // Overwrite the cookie with an expired date
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0) 
  });
  
  res.json({ message: "Logged out successfully" });
}

export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: req.user });
}
