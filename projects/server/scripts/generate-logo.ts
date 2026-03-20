import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderFilled } from 'oh-my-logo';

let data = '';

const originalWrite = process.stdout.write.bind(process.stdout);

// hook
process.stdout.write = (chunk: any, encoding?: any, cb?: any) => {
  data += chunk.toString();

  return originalWrite(chunk, encoding, cb);
};

await renderFilled('DISCORD-MCBE');

const encoded = Buffer.from(data).toString('base64');
fs.writeFileSync(path.join(__dirname, '../src/assets/logo.json'), JSON.stringify({ data: encoded }));
