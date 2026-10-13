import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const errors = [];
const warnings = [];

for (const name of fs.readdirSync(root)) {
  const p = path.join(root, name);
  if (fs.statSync(p).isFile() && /\.md$/i.test(name)) {
    warnings.push(`root-level Markdown found: ${name}; prefer project documentation under /docs`);
  }
}

const docs = path.join(root, 'docs');
let statusFiles = [];
let handoverFiles = [];
let bugReportFiles = [];
let bugPlanFiles = [];

if (!fs.existsSync(docs)) {
  errors.push('missing required docs directory');
} else {
  const entries = fs.readdirSync(docs, { withFileTypes: true });
  const names = entries.filter((e) => e.isFile()).map((e) => e.name);

  for (const required of ['PRD.md', 'SETUP.md', 'HOW-IT-WORKS.md']) {
    if (!names.includes(required)) errors.push(`missing required core doc: docs/${required}`);
  }

  statusFiles = names.filter((n) => /^PROJECT-STATUS_v\d+\.md$/i.test(n));
  handoverFiles = names.filter((n) => /^LLM-HANDOVER_v\d+\.md$/i.test(n));
  bugReportFiles = names.filter((n) => /^custom-bugs-report_v\d+\.md$/i.test(n));
  bugPlanFiles = names.filter((n) => /^custom-bugs-fix-plan_v\d+\.md$/i.test(n));
  for (const obsolete of ['custom-bugs-report.md', 'custom-bugs-fix-plan.md']) {
    if (names.includes(obsolete)) errors.push(`bug documentation must use a versioned filename: docs/${obsolete}`);
  }

  if (!statusFiles.length) errors.push('missing versioned project status doc: docs/PROJECT-STATUS_vN.md');
  if (!handoverFiles.length) errors.push('missing versioned LLM handover doc: docs/LLM-HANDOVER_vN.md');

  if (statusFiles.length > 1) warnings.push(`multiple project status versions found: ${statusFiles.join(', ')}`);
  if (handoverFiles.length > 1) warnings.push(`multiple LLM handover versions found: ${handoverFiles.join(', ')}`);

  for (const entry of entries) {
    if (entry.isDirectory()) warnings.push(`nested docs directory found: docs/${entry.name}`);
  }
}

function versionOf(name, prefix) {
  const m = name.match(new RegExp(`^${prefix}_v(\\d+)\\.md$`, 'i'));
  return m ? Number(m[1]) : null;
}

const latestStatus = statusFiles
  .map((name) => ({ name, version: versionOf(name, 'PROJECT-STATUS') }))
  .sort((a, b) => b.version - a.version)[0];
const latestHandover = handoverFiles
  .map((name) => ({ name, version: versionOf(name, 'LLM-HANDOVER') }))
  .sort((a, b) => b.version - a.version)[0];

if (latestStatus && latestHandover && latestStatus.version !== latestHandover.version) {
  warnings.push(`current filename versions differ (${latestStatus.name} vs ${latestHandover.name}); matching versions are preferred but not required`);
}

if (bugReportFiles.length || bugPlanFiles.length) {
  for (const [prefix, files] of [['custom-bugs-report', bugReportFiles], ['custom-bugs-fix-plan', bugPlanFiles]]) {
    const latest = files.map((name) => ({ name, version: versionOf(name, prefix) })).sort((a, b) => b.version - a.version)[0];
    if (!latest || latest.version !== latestStatus?.version || latest.version !== latestHandover?.version) {
      errors.push(`current ${prefix} filename version must match current status and handover`);
    }
  }
}

for (const current of [latestStatus, latestHandover].filter(Boolean)) {
  const text = fs.readFileSync(path.join(docs, current.name), 'utf8').trimEnd();
  const finalLine = text.split(/\r?\n/).at(-1)?.trim() ?? '';
  const expected = `v${current.version}`;
  if (finalLine !== expected) {
    warnings.push(`${current.name} final line is ${JSON.stringify(finalLine)}; optional mirrored marker ${expected} is preferred`);
  }
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`documentation check passed (status=${latestStatus?.name ?? 'missing'}; handover=${latestHandover?.name ?? 'missing'}; ${warnings.length} warning(s)).`);
