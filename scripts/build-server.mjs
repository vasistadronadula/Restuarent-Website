import { build, context } from 'esbuild';
import { spawn } from 'node:child_process';

const watch = process.argv.includes('--watch');
const options = {
  entryPoints: ['server/index.ts'],
  outfile: 'build/server/index.cjs',
  platform: 'node', target: 'node22', format: 'cjs',
  bundle: true, packages: 'external', sourcemap: true,
  logLevel: 'info',
  plugins: [{
    name: 'server-only-boundary',
    setup(builder) {
      // This marker is enforced by Next for browser builds. The dedicated
      // Node artifact is already server-only; never change the source guard.
      builder.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'server-boundary' }));
      builder.onLoad({ filter: /.*/, namespace: 'server-boundary' }, () => ({ contents: '', loader: 'js' }));
    },
  }],
};

if (watch) {
  const ctx = await context(options);
  await ctx.rebuild();
  await ctx.watch();
  const child = spawn(process.execPath, ['--watch', 'build/server/index.cjs'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { child.kill(signal); await ctx.dispose(); });
  child.once('exit', async code => { await ctx.dispose(); process.exitCode = code || 0; });
} else {
  await build(options);
}
