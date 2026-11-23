// Bundles the React app into ./www (used by the PWA and by Capacitor/Android).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

await build({
  entryPoints: [join(root, 'src/main.jsx')],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: join(www, 'app.js'),
  logLevel: 'info',
});
// esbuild writes app.css next to app.js because main.jsx imports styles.css
cpSync(join(root, 'public'), www, { recursive: true });

// Single-file version (everything inlined) – handy to share and open straight from a phone.
const js = readFileSync(join(www, 'app.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(www, 'app.css'), 'utf8');
let html = readFileSync(join(root, 'public/index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="app.css" />', `<style>${css}</style>`)
  .replace('<script src="app.js"></script>', () => `<script>${js}</script>`)
  .replace(/<link rel="manifest"[^>]*>\n?/, '');
writeFileSync(join(root, 'dist-standalone.html'), html);
console.log('Built www/ and dist-standalone.html');
