import { Application, renderLogo } from '@discord-mcbe/server';

renderLogo();

const app = new Application();
await app.start();

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err);
});
