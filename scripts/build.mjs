import {stripTypeScriptTypes} from 'node:module';
import {readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
const modules=['lib/procurement/domain.ts','lib/procurement/paypal.ts','lib/procurement/ai.ts','lib/procurement/store.ts','worker/index.ts'];
let bundle='';
for(const path of modules){let source=await readFile(path,'utf8');source=source.replace(/^import[^\n]*;\s*$/gm,'');source=stripTypeScriptTypes(source,{mode:'transform'});if(path!=='worker/index.ts')source=source.replace(/\bexport\s+(?=(async\s+)?(function|class|const|let|var))/g,'');bundle+='\n// '+path+'\n'+source;}
const html=await readFile('public-ui/index.html','utf8');const css=await readFile('public-ui/style.css','utf8');const client=await readFile('public-ui/client.js','utf8');
bundle='const PAGE_HTML='+JSON.stringify(html.replace('/* APP_STYLES */',css).replace('/* APP_CLIENT */',client))+';\n'+bundle;
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await writeFile('dist/server/index.js',bundle);await cp('drizzle','dist/drizzle',{recursive:true});console.log('Built dependency-free Worker, embedded UI and D1 migrations.');
