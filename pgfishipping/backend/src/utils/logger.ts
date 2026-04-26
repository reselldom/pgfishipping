import pino from 'pino';
import { isDev, isTest } from '../config/env';

export const logger = pino(
  isDev
    ? {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {
        level: isTest ? 'silent' : 'info',
      },
);

export default logger;
