import { Server } from 'socket.io';

export {};

declare global {
  namespace Express {
    interface Request {
      io: Server;
      user?: {
        userId: string;
        username: string;
      };
    }
  }
}

