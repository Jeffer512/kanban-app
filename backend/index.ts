import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pool from './db.ts';
import authRouter from './routes/auth.ts';
import projectRouter from './routes/project.ts';
import boardRouter from './routes/board.ts';
import type { Request, Response, NextFunction } from 'express';
import columnRouter from './routes/column.ts';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRouter);

app.use('/api/projects', projectRouter);

app.use('/api/boards', boardRouter);

app.use('/api/columns', columnRouter);

// Catch and format all application errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);

  const status = err.status || 500;
  const message = err.message || "An unexpected error occurred";

  res.status(status).json({
    error: status === 500 ? "Internal Server Error" : "Request Error",
    message: message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

