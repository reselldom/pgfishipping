import express, { type Express } from 'express';
import { createServer } from 'node:http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { corsOrigins, env, isDev, isProd } from './config/env';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import { logger } from './utils/logger';
import { disconnectPrisma } from './config/database';
import { localUploadRoot } from './services/storage.service';
import { initSupportSocketGateway } from './services/support/socket.gateway';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (corsOrigins.includes(origin)) return cb(null, true);
        // Dev: allow any local browser origin (3000, 3030, Next.js, Vite, etc.)
        if (
          isDev &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return cb(null, true);
        }
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'request');
    next();
  });

  app.use(generalLimiter);
  app.use('/api', routes);

  // Serve locally-stored uploads during dev (when R2 is not configured).
  app.use(
    '/uploads',
    express.static(localUploadRoot, { fallthrough: true, maxAge: '1h' }),
  );

  app.get('/', (_req, res) => {
    res.json({ ok: true, name: env.APP_NAME, version: '0.1.0' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const server = createServer(app);
  initSupportSocketGateway(server);
  server.listen(env.PORT, () => {
    logger.info(
      `🚀 ${env.APP_NAME} API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(() => {
      logger.info('HTTP server closed.');
    });
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

export default createApp;
