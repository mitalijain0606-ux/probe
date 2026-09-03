import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';
import { verifyToken } from '../modules/auth/service/token.service.js';

let io: Server | undefined;

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
    path: '/socket.io',
  });

  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.cookie?.match(new RegExp(`${env.COOKIE_NAME}=([^;]+)`))?.[1] as
        | string
        | undefined);

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired session'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    socket.join(userRoom(userId));
    logger.info({ event: 'ws.connected', userId, socketId: socket.id }, 'client connected');

    socket.on('disconnect', () => {
      logger.info({ event: 'ws.disconnected', userId, socketId: socket.id }, 'client disconnected');
    });
  });

  return io;
}

export function getIO(): Server | undefined {
  return io;
}
