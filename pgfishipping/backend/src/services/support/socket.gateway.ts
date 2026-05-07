import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { JwtClaims } from '../../middleware/auth';
import { verifyToken } from '../../middleware/auth';
import { logger } from '../../utils/logger';

let io: Server | null = null;

function resolveToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim().length > 0) return authToken;

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return null;
}

export function initSupportSocketGateway(server: HttpServer): Server | null {
  if (io) return io;
  try {
    io = new Server(server, {
      cors: { origin: true, credentials: true },
      path: '/socket.io',
    });

    io.use((socket, next) => {
      try {
        const token = resolveToken(socket);
        if (!token) return next(new Error('UNAUTHORIZED'));
        const claims = verifyToken(token) as JwtClaims;
        socket.data.userId = claims.sub;
        socket.data.role = claims.role;
        next();
      } catch {
        next(new Error('UNAUTHORIZED'));
      }
    });

    io.on('connection', (socket) => {
      socket.join(`user:${socket.data.userId}`);
      // Staff users also join a global staff room so unassigned (WAITING)
      // conversations can broadcast a "new message" pulse to anyone who can pick
      // it up, instead of only the assigned-staff socket.
      if (
        socket.data.role === 'SUPER_ADMIN' ||
        socket.data.role === 'MANAGER' ||
        socket.data.role === 'SUPPORT'
      ) {
        socket.join('staff');
      }

      socket.on('support:join', (conversationId: unknown) => {
        if (typeof conversationId === 'string' && conversationId.length > 0) {
          socket.join(`conversation:${conversationId}`);
        }
      });
    });

    return io;
  } catch (err) {
    logger.warn({ err }, 'Failed to init support socket gateway');
    io = null;
    return null;
  }
}

export function getSupportSocket(): Server | null {
  return io;
}
