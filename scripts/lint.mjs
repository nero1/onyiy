import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p);
  }
}
for (const dir of ['packages', 'app', 'components', 'lib', 'server', 'workers']) walk(path.join(root, dir));
const errors = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  // Types may reference service results because TypeScript erases them. Every
  // executable import/re-export must respect client and transaction boundaries.
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const client=file.includes('/components/')||file.includes('/lib/');
  function inspect(node){
    if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){
      const specifier=node.moduleSpecifier;
      const typeOnly=ts.isImportDeclaration(node)?node.importClause?.isTypeOnly:node.isTypeOnly;
      if(specifier&&ts.isStringLiteral(specifier)&&!typeOnly){
        const source=specifier.text;
        if(client&&(/(?:^|\/)server(?:\/|$)|(?:^|\/)workers(?:\/|$)/.test(source)||source==='@gifters/db'||source==='@gifters/chains'||source==='postgres'))errors.push(`${file}: client runtime imports a service/DB/chain boundary`);
        // The SSR page renderer may reuse these two presentation-only views.
        if(file.includes('/server/')&&!(file.endsWith('/server/public-pages.tsx')&&['@/components/profile-disclosure','@/components/scheduled-launch'].includes(source))&&/(?:^|\/)components(?:\/|$)/.test(source))errors.push(`${file}: service runtime imports a UI component`);
      }
    }
    if(client&&(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)){
      const source=node.arguments[0];
      if(source&&ts.isStringLiteral(source)&&/(?:^|\/)(?:server|workers)(?:\/|$)|^@gifters\/(?:db|chains)$|^postgres$/.test(source.text))errors.push(`${file}: client dynamically imports a service/DB/chain boundary`);
    }
    ts.forEachChild(node,inspect);
  }
  inspect(ast);

  if ((file.includes('/server/')||file.includes('/components/')||file.includes('/app/')||file.includes('/lib/'))&&/from ['"][^'"]*workers\/(?:signer|prices)/.test(text)) errors.push(`${file}: web imports isolated signing/pricing worker`);
  if (file.includes('/packages/domain/') && /(from ['"](postgres|next|react|ioredis|@vercel))/.test(text)) errors.push(`${file}: domain imports vendor SDK`);
  if ((file.includes('/components/') || file.includes('/lib/')) && /(SIGNED_PAYLOAD|PRIVATE_KEY|MFA_ENCRYPTION_KEY|PLATFORM_DEV_ADDRESS)/.test(text)) errors.push(`${file}: client-capable code references server secret name`);
  if (/parseFloat\(|Number\([^\n]*(amount|balance|fee)/i.test(text) && !file.endsWith('dashboard-app.tsx')) errors.push(`${file}: review floating money conversion`);
  if (file.includes('/components/') && /from ['"]postgres['"]/.test(text)) errors.push(`${file}: client imports postgres driver`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`custom lint/import-boundary checks passed (${files.length} files).`);
