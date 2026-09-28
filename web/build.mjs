import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const assets = {};
for (const [url, file, type] of [['/', 'index.html', 'text/html; charset=utf-8'], ['/app.js', 'app.js', 'text/javascript; charset=utf-8'], ['/style.css', 'style.css', 'text/css; charset=utf-8'], ['/license.txt', 'LICENSE.txt', 'text/plain; charset=utf-8']]) {
  assets[url] = {body: readFileSync(path.join(root, file), 'utf8'), type};
}
const output = path.join(root, 'dist/server');
mkdirSync(output, {recursive: true});
writeFileSync(path.join(output, 'index.js'), readFileSync(path.join(root, 'worker.mjs'), 'utf8') + '\nconst handler = createHandler({assets: ' + JSON.stringify(assets) + '});\nexport default {fetch: handler};\n');
console.log('Built GHunt email workspace: ' + path.join(output, 'index.js'));
