import { spawn } from 'child_process';
import { logger } from './logger';

let workerProcess: any = null;

/**
 * Starts the extraction worker if not already running
 * Worker will auto-exit after 5 minutes idle
 */
export const ensureWorkerRunning = (): void => {
  // In development, worker runs separately
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Development mode: worker should be started manually');
    return;
  }

  // Check if worker is already running
  if (workerProcess && !workerProcess.killed) {
    logger.info('Worker already running');
    return;
  }

  logger.info('Starting extraction worker...');

  // Spawn worker process
  workerProcess = spawn('node', ['dist/workers/extractionWorker.js'], {
    detached: true, // Run independently
    stdio: 'inherit', // Show worker logs
  });

  // Allow parent to exit independently
  workerProcess.unref();

  workerProcess.on('exit', (code: number) => {
    logger.info(`Worker exited with code ${code}`);
    workerProcess = null;
  });

  workerProcess.on('error', (error: Error) => {
    logger.error('Worker spawn error', {}, error);
    workerProcess = null;
  });

  logger.info('✅ Worker started successfully (will auto-exit after 5min idle)');
};

/**
 * Stop the worker process (graceful shutdown)
 */
export const stopWorker = (): void => {
  if (workerProcess && !workerProcess.killed) {
    logger.info('Stopping worker...');
    workerProcess.kill('SIGTERM');
    workerProcess = null;
  }
};
