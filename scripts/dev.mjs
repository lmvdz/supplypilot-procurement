import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const port=Number(process.env.PORT||8812);mkdirSync('.local',{recursive:true});const sqlite=new DatabaseSync('.local/local.sqlite');sqlite.exec('CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY NOT NULL,state TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
const DB={prepare(sql){return {bind(...values){return {async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}}},async first(){return sqlite.prepare(sql).get(...values)||null}}}}}};
const worker=(await import(pathToFileURL(process.cwd()+'/dist/server/index.js'))).default;
const server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const request=new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers,...(body.length?{body,duplex:'half'}:{})});const response=await worker.fetch(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){console.error(e);res.writeHead(500);res.end('Development server error')}});server.listen(port,'0.0.0.0',()=>console.log('Local: http://127.0.0.1:'+port));
