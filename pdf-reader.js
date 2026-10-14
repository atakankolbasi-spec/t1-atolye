// PDF → satırlar. Yazı katmanı varsa doğrudan okunur; taranmış sayfalar tarayıcıda OCR ile okunur (vendor/ altındaki kendi dosyalarımız, internet gerekmez).
const abs=p=>new URL(p,import.meta.url).href;
let pdfjs=null,ocrWorker=null,ocrPromise=null;
async function loadPdfjs(){if(pdfjs)return pdfjs;pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=abs('./vendor/pdfjs/pdf.worker.min.mjs');return pdfjs}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(Error('OCR bileşeni yüklenemedi.'));document.head.append(s)})}
async function getOcr(onStatus){
 if(ocrWorker)return ocrWorker;
 return ocrPromise??=(async()=>{onStatus?.('Yazı tanıma bileşeni hazırlanıyor (ilk seferde biraz sürer)…');if(!window.Tesseract)await loadScript(abs('./vendor/tesseract/tesseract.min.js'));
  ocrWorker=await window.Tesseract.createWorker('tur',1,{workerPath:abs('./vendor/tesseract/worker.min.js'),corePath:abs('./vendor/tesseract/'),langPath:abs('./vendor/tesseract/lang/'),gzip:true,cacheMethod:'none'});return ocrWorker})().catch(e=>{ocrPromise=null;throw e});
}
// Öğeleri (x,y,w,h) satırlara ve bölmelere (sütunlara) çevirir. y yukarıdan aşağı.
export function buildLines(items,pageW){
 const its=items.filter(i=>i.s.trim()).sort((a,b)=>a.y-b.y||a.x-b.x),lines=[];
 for(const it of its){const l=lines.find(l=>Math.abs(l.y-it.y)<Math.max(2,Math.min(l.h,it.h)*.55));if(l){l.items.push(it);l.y=(l.y*(l.items.length-1)+it.y)/l.items.length;l.h=Math.max(l.h,it.h)}else lines.push({y:it.y,h:it.h||8,items:[it]})}
 return lines.sort((a,b)=>a.y-b.y).map(l=>{l.items.sort((a,b)=>a.x-b.x);const segs=[];let cur=null;
  for(const it of l.items){const gap=cur?it.x-(cur.x1):0,cw=Math.max(1,(it.w||1)/Math.max(1,it.s.length));if(!cur||gap>Math.max(14,cw*4)){cur={x0:it.x,x1:it.x+it.w,text:it.s.trim(),words:[{x:it.x,s:it.s.trim()}]};segs.push(cur)}else{cur.text+=(gap>cw*.6?' ':'')+it.s.trim();cur.x1=it.x+it.w;cur.words.push({x:it.x,s:it.s.trim()})}}
  return {y:l.y,h:l.h,segs,text:segs.map(s=>s.text).join('   ')}});
}
// Sayfa döndürülmüş (yatay basılmış) olabilir: metni okuma yönüne göre düzeltir. Sonuç: x sağa, y aşağı artar.
function orient(raw,vp,lib){
 const T=raw.map(i=>({i,t:lib.Util.transform(vp.transform,i.transform)}));
 const dir=t=>{const a=Math.atan2(t[1],t[0])*180/Math.PI;return Math.round(a/90)*90};
 const cnt={};for(const {i,t} of T)if(i.str.trim()){const k=dir(t);cnt[k]=(cnt[k]||0)+i.str.trim().length}
 const dom=Number(Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]?.[0]??0),rad=dom*Math.PI/180,ux=Math.round(Math.cos(rad)),uy=Math.round(Math.sin(rad));
 const pts=T.filter(({t,i})=>dir(t)===dom).map(({i,t})=>({s:i.str,X:t[4]*ux+t[5]*uy,Y:-t[4]*uy+t[5]*ux,w:i.width,h:Math.hypot(t[2],t[3])||8}));
 const minX=Math.min(0,...pts.map(p=>p.X)),minY=Math.min(0,...pts.map(p=>p.Y)),out=pts.map(p=>({s:p.s,x:p.X-minX,y:p.Y-minY,w:p.w,h:p.h}));out.swap=dom===90||dom===-90;return out;
}
export async function readPdf(file,{onProgress,onStatus}={}){
 if(file.size>60*1024*1024)throw Error('PDF dosyası 60 MB altında olmalı.');
 const lib=await loadPdfjs(),doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),wasmUrl:abs('./vendor/pdfjs/wasm/')}).promise,pages=[];
 for(let n=1;n<=doc.numPages;n++){
  onProgress?.(n,doc.numPages);const page=await doc.getPage(n),vp=page.getViewport({scale:1});
  const tc=await page.getTextContent();let items=orient(tc.items.filter(i=>i.str!==undefined),vp,lib);let pw=vp.width,ph=vp.height;if(items.swap){pw=vp.height;ph=vp.width}
  const chars=items.reduce((a,i)=>a+i.s.trim().length,0);let ocr=false;
  if(chars<40){
   try{const worker=await getOcr(onStatus);onStatus?.('Sayfa '+n+' taranmış görüntü; yazı okunuyor…');const scale=3,v=page.getViewport({scale}),cv=document.createElement('canvas');cv.width=Math.ceil(v.width);cv.height=Math.ceil(v.height);const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);await page.render({canvasContext:ctx,viewport:v}).promise;
    const res=await worker.recognize(cv,{},{blocks:true});const words=[];for(const b of res.data.blocks||[])for(const p of b.paragraphs||[])for(const l of p.lines||[])for(const w of l.words||[])if(w.text.trim())words.push({s:w.text,x:w.bbox.x0/scale,y:(w.bbox.y0+w.bbox.y1)/2/scale,w:(w.bbox.x1-w.bbox.x0)/scale,h:(w.bbox.y1-w.bbox.y0)/scale});
    items=words;ocr=true;cv.width=cv.height=0}catch(err){pages.push({n,w:vp.width,h:vp.height,lines:[],ocr:false,error:err.message});continue}
  }
  pages.push({n,w:pw,h:ph,lines:buildLines(items,pw),ocr});
 }
 try{await doc.destroy()}catch{}
 return pages;
}
export async function stopOcr(){try{await ocrWorker?.terminate()}catch{}ocrWorker=null;ocrPromise=null}
