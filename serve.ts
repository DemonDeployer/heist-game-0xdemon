// Tiny static server for local play: serves the game folder on localhost:8080.
// No build step, no dependencies — the game is plain files.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = join(process.cwd(), 'game');
const PORT = 8080;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = join(ROOT, decodeURIComponent(path));
    if (!file.startsWith(ROOT)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`The Gilded Vault is live at http://localhost:${PORT}/`);
});
