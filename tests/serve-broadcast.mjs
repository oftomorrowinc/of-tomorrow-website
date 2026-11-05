// The published site, locally: broadcast/dist/ (npm run broadcast:build) over
// http on PORT, the way Vercel serves it — files by path, nothing rewritten.
// Playwright starts it for tests/broadcast.published.spec.ts.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('broadcast/dist');
const port = Number(process.env.PORT || 4799);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json' };

createServer(async (req, res) => {
	const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
	const file = join(root, path);
	if (!file.startsWith(root)) return res.writeHead(403).end();
	try {
		const body = await readFile(file);
		res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
	} catch {
		res.writeHead(404).end('not found');
	}
}).listen(port, '127.0.0.1', () => console.log(`broadcast/dist on http://127.0.0.1:${port}`));
