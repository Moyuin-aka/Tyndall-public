import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { sensitiveFindings } from './public-safety.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const issues = [];
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/public-sync-manifest.json')));
const publicContent = new Set([
  'src/content/config.ts', 'src/content/blog/CONFIGURATION.md', 'src/content/blog/en/CONFIGURATION.md',
  'src/content/blog/测试文章.md', 'src/content/blog/en/test_post.md',
  'src/content/travel/example-trip/index.md', 'src/content/travel/example-trip/exif.json',
]);
const ignored = new Set(['.git', 'node_modules', 'dist', '.astro', '.vercel', 'temp', '.DS_Store']);
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(e.name)) continue;
    const full = path.join(dir, e.name), rel = path.relative(root, full).split(path.sep).join('/');
    if (e.isSymbolicLink()) { issues.push(`${rel}: symlink requires review`); continue; }
    if (e.isDirectory()) { walk(full); continue; }
    if (/^\.env/.test(e.name) && e.name !== '.env.example') continue; // ignored local config is never inspected/printed
    if (rel.startsWith('src/content/') && !publicContent.has(rel)) issues.push(`${rel}: unreviewed content`);
    if (rel.startsWith('src/data/routes/')) issues.push(`${rel}: private route snapshot must not be exported`);
    if (rel.startsWith('public/images/')) issues.push(`${rel}: personal media directory must not be exported`);
    if (rel === '.gitmodules') issues.push(`${rel}: private content repository must not be linked`);
    if (['scripts/public-adapters.mjs', 'scripts/public-safety.mjs', 'scripts/public-safety.test.mjs'].includes(rel)) continue;
    if (!/\.(?:astro|[cm]?js|ts|json|md|ya?ml|toml|html|css|sql|sh|svg|xml)$/.test(rel) && !rel.endsWith('.env.example')) continue;
    for (const label of sensitiveFindings(fs.readFileSync(full, 'utf8'), { authorFriend: rel === 'src/data/friends.ts' })) issues.push(`${rel}: ${label}`);
  }
}
walk(root);
// Check tracked ignored files too: .gitignore cannot protect already staged secrets.
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const f of tracked) if (/(^|\/)\.env(?:\.|$)/.test(f) && !f.endsWith('.env.example')) issues.push(`${f}: tracked environment file`);
for (const f of manifest.files) if (!fs.existsSync(path.join(root, f))) issues.push(`${f}: missing synced feature`);
if (process.argv.includes('--dist')) {
  const dist = path.join(root, 'dist/client');
  if (!fs.existsSync(dist)) throw new Error('Build first');
  function scan(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) scan(f);
      else if (/\.(html|js|json|xml|css)$/.test(f)) {
        const page = path.relative(dist, f).split(path.sep).join('/');
        for (const label of sensitiveFindings(fs.readFileSync(f, 'utf8'), { authorFriend: ['friends/index.html', 'en/friends/index.html'].includes(page) })) issues.push(`${path.relative(root, f)}: ${label}`);
      }
    }
  }
  scan(dist);
}
if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
else console.log(`Public checks passed: ${manifest.files.length} feature files; only reviewed example content. No matching sensitive patterns.`);
