// gtb-proxy.js'i Cloudflare yerine sabit IP'li bir sunucuda (Node 18+) çalıştırır.
// Ortam değişkenleri: IGHB_USER, IGHB_PASS, MUSAVIR_TC, MUSAVIR_SIFRE, ACCESS_CODE (isteğe bağlı), PORT (varsayılan 8787)
import http from 'node:http';
import handler from './gtb-proxy.js';
const env=process.env;
http.createServer(async(req,res)=>{
 try{
  const chunks=[];for await(const c of req)chunks.push(c);
  const body=chunks.length&&!['GET','HEAD'].includes(req.method)?Buffer.concat(chunks):undefined;
  const r=await handler.fetch(new Request('http://'+(req.headers.host||'localhost')+req.url,{method:req.method,headers:req.headers,body}),env);
  res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Sunucu hatası: '+String(e?.message||e).slice(0,200)}))}
}).listen(Number(env.PORT)||8787,'127.0.0.1',()=>console.log('gtb-proxy dinliyor: '+(env.PORT||8787)));
