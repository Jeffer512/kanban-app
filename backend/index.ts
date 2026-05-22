import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pool from './db.ts';
import authRouter from './routes/auth.ts';
import projectRouter from './routes/project.ts';
import boardRouter from './routes/board.ts';
import type { Request, Response, NextFunction } from 'express';
import columnRouter from './routes/column.ts';
import taskRouter from './routes/task.ts';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 3000;

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }
});

// Handle Socket Connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  const getUserId = () => {
    const cookies = cookie.parse(socket.request.headers.cookie || '');
    if (!cookies.token) return null;
    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET!) as { userId: string };
      return decoded.userId;
    } catch {
      return null;
    }
  };

  socket.on('join-user-room', () => {
    const userId = getUserId();
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on('leave-user-room', () => {
    const userId = getUserId();
    if (userId) socket.leave(`user:${userId}`);
  });

  // Allow the frontend to join a specific project room
  socket.on('join-project', (projectId) => {
    socket.join(`project:${projectId}`);
    console.log(`User ${socket.id} joined project ${projectId}`);
  });

  socket.on('leave-project', (projectId) => {
    socket.leave(`project:${projectId}`);
    console.log(`User ${socket.id} left project ${projectId}`);
  });

  // Allow the frontend to join a specific board room
  socket.on('join-board', (boardId) => {
    socket.join(`board:${boardId}`);
    console.log(`User ${socket.id} joined board ${boardId}`);
  });

  socket.on('leave-board', (boardId) => {
    socket.leave(`board:${boardId}`);
    console.log(`User ${socket.id} left board ${boardId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Middleware: Attach the 'io' instance to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

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

app.use('/api/tasks', taskRouter);  

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

httpServer.listen(PORT, () => {
  console.log(`Server & WebSockets running on port ${PORT}`);
});