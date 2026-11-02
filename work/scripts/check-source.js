// Checks JS and JSX syntax with TypeScript compiler available on maintainer's environment.
const fs=require('fs'),path=require('path');
let ts;try{ts=require('typescript')}catch{console.log('Skip: TypeScript global package not installed.');process.exit(0)}
let errors=[];
function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else if(/\.(jsx|js)$/.test(f.name)){
  const src=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,f.name.endsWith('.jsx')?ts.ScriptKind.JSX:ts.ScriptKind.JS);
  for(const d of src.parseDiagnostics)errors.push(p+': '+d.messageText)
 }
}}
walk(path.join(__dirname,'../frontend/src'));
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Frontend JS/JSX syntax OK');
