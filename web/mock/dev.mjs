// npm run dev:mock — 목 서버를 켜고, 그 서버에 붙는 Vite 개발 서버(--mode mock → .env.mock)를 함께 띄운다.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

await import('./server.mjs');
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const child = spawn(process.execPath, [vite, '--mode', 'mock'], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
