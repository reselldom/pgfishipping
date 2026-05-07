import { startWorkers, stopWorkers } from './workers';
import { logger } from './utils/logger';
import { logEmailTransportStatus } from './services/email.service';

async function main(): Promise<void> {
  const result = await startWorkers();
  if (!result.started) {
    logger.error({ reason: result.reason }, 'Failed to start workers; exiting');
    process.exit(1);
  }
  logger.info('Worker process running. Ctrl+C to stop.');
  logEmailTransportStatus();
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down workers');
  await stopWorkers();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

main().catch((err) => {
  logger.error({ err }, 'Worker process crashed');
  process.exit(1);
});
