import { Application } from '@discord-mcbe/server';

const app = new Application();
app.start().catch((e) => app.logger.error('Failed to start application\n', e));

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err);
});
