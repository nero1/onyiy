import fs from 'node:fs';
import ts from 'typescript';
const text=fs.readFileSync(new URL('../lib/i18n.ts',import.meta.url),'utf8');
const source=ts.createSourceFile('i18n.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
if(source.parseDiagnostics.length)throw new Error('Invalid translation source');
function unwrap(node){while(node && (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)))node=node.expression;return node}
function name(node){if(ts.isIdentifier(node) || ts.isStringLiteral(node))return node.text;throw new Error('Language pack keys must be literal names')}
let packs;
for(const statement of source.statements){
 if(!ts.isVariableStatement(statement))continue;
 for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name) && declaration.name.text==='copy')packs=unwrap(declaration.initializer);
}
if(!packs || !ts.isObjectLiteralExpression(packs))throw new Error('Could not locate language packs');
const locales=new Map();
for(const pack of packs.properties){
 if(!ts.isPropertyAssignment(pack))throw new Error('Language packs must be literal objects');
 const locale=name(pack.name);const values=unwrap(pack.initializer);
 if(!ts.isObjectLiteralExpression(values) || locales.has(locale))throw new Error('Invalid or duplicate language pack');
 const keys=new Set();
 for(const property of values.properties){
  if(!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer))throw new Error('Translation values must be literal strings');
  const key=name(property.name);if(keys.has(key))throw new Error(`Duplicate ${locale} key: ${key}`);keys.add(key);
 }
 locales.set(locale,keys);
}
const en=locales.get('en'),fr=locales.get('fr');if(!en || !fr)throw new Error('Could not locate both language packs');
const missingFr=[...en].filter(key=>!fr.has(key)),missingEn=[...fr].filter(key=>!en.has(key));
if(missingFr.length || missingEn.length)throw new Error(`i18n mismatch. Missing fr=${missingFr.join(',')} missing en=${missingEn.join(',')}`);
console.log(`i18n key parity ok (${en.size} keys).`);
