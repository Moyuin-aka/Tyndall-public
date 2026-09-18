/** Explicit, reviewable upstream export. Default is a read-only plan.
 * Never exports content, personal data, credentials, deployment state or history.
 * New upstream files require an explicit manifest entry before they can be copied.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { adaptPublic } from './public-adapters.mjs';
import { sensitiveFindings } from './public-safety.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.resolve(process.argv.find(a => a.startsWith('--source='))?.slice(9) || path.join(root, '../Tyndall'));
const manifestPath = path.join(root, 'scripts/public-sync-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const apply = process.argv.includes('--apply');
const check = process.argv.includes('--check');
const hash = value => createHash('sha256').update(value).digest('hex');
const plans = [];
const conflicts = [];
for (const file of manifest.files) {
  if (path.isAbsolute(file) || file.split('/').includes('..') || /(^|\/)\.env|^src\/content\/(?!config\.ts$)|^src\/data\/(?!now\.ts$|tech-stack\.ts$)/.test(file)) {
    throw new Error(`Forbidden export path: ${file}`);
  }
  const src = path.join(source, file), dest = path.join(root, file);
  if (fs.lstatSync(src).isSymbolicLink()) throw new Error(`Symlink not allowed: ${file}`);
  const raw = fs.readFileSync(src);
  const output = /\.(woff2?|ttf|png|ico)$/.test(file) ? raw : Buffer.from(adaptPublic(file, raw.toString('utf8')));
  if (!/\.(woff2?|ttf|png|ico)$/.test(file) && sensitiveFindings(output.toString('utf8')).length) throw new Error(`Sensitive pattern in adapted output; review ${file}`);
  const current = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  const changed = !current?.equals(output);
  if (changed && current && manifest.outputs?.[file] && hash(current) !== manifest.outputs[file]) conflicts.push(file);
  plans.push({ file, dest, output, changed, sourceHash: hash(raw) });
}
const tracked = execFileSync('git', ['-C', source, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const uncategorized = tracked.filter(f => /^(src\/(components|layouts|pages|styles|utils|types|integrations)\/|\.github\/|workers\/)/.test(f) && !manifest.files.includes(f) && !(manifest.excluded || []).includes(f));
console.log(`Upstream: ${execFileSync('git', ['-C', source, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}`);
console.log(`${plans.length} reviewed files; ${plans.filter(p => p.changed).length} changes; ${uncategorized.length} unreviewed upstream files.`);
for (const p of plans.filter(p => p.changed)) console.log(`UPDATE ${p.file}`);
for (const f of uncategorized) console.log(`REVIEW ${f}`);
if (conflicts.length) throw new Error(`Public-side edits would be overwritten; move adaptations into public-adapters.mjs first:\n${conflicts.join('\n')}`);
if (uncategorized.length && (apply || check)) throw new Error('Review new upstream files before exporting.');
if (check && plans.some(p => p.changed)) process.exitCode = 1;
if (apply) {
  // Validate the entire plan before writing any target.
  for (const p of plans.filter(p => p.changed)) {
    fs.mkdirSync(path.dirname(p.dest), { recursive: true });
    fs.writeFileSync(p.dest, p.output);
  }
  manifest.upstreamCommit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  manifest.outputs = Object.fromEntries(plans.map(p => [p.file, hash(p.output)]));
  manifest.sources = Object.fromEntries(plans.map(p => [p.file, p.sourceHash]));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
