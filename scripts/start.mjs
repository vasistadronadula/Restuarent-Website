import { spawn } from 'node:child_process';

// Works on Windows and Linux; production never depends on tsx or concurrently.
const webOnly = process.argv.includes('--web-only');
const serverOnly = process.argv.includes('--server-only');
const children = [];
const env = { ...process.env, NODE_ENV: 'production' };
if (!webOnly) children.push(spawn(process.execPath, ['build/server/index.cjs'], { stdio: 'inherit', env }));
if (!serverOnly) children.push(spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start'], { stdio: 'inherit', env }));
let stopping = false;
const stop = (signal = 'SIGTERM') => {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill(signal);
};
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => stop(signal));
for (const child of children) {
  child.on('error', error => { console.error(error); process.exitCode = 1; stop(); });
  child.on('exit', code => { if (!stopping) { process.exitCode = code || 1; stop(); } });
}
