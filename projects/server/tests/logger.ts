// logger test
import { Logger } from '../src/util/logger';

const logger = new Logger('TestLogger', { debug: true });

logger.log('This is a log message');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message', new Error('Test'));
logger.debug('This is a debug message', { some: 'data', nested: { key: 'value' } }, 0);