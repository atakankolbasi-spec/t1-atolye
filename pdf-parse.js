import {normalizeSearch} from './directory.js';
// Satırlardan (pdf-reader.js çıktısı) ihracat beyannamesi bilgilerini çıkarır. Saf fonksiyonlar: tarayıcıya bağlı değildir.
const NUM='\\d{1,3}(?:\\.\\d{3})*,\\d{2,3}|\\d+,\\d{2,3}',NUM_RE=new RegExp('^(?:'+NUM+')$');
const CUR='EUR|USD|GBP|TRY|TL|CHF|RON|BGN|PLN|HUF|RSD|CNY|AED|RUB|UAH|GEL|ALL|MKD|BAM|HRK|SEK|NOK|DKK|CZK|JPY|CAD|AUD|SAR|KWD|IQD|AZN|KZT';
const SUFFIX=/(?:^|[\s.,])(?:LTD|LİMİTED|LIMITED|ŞTİ|STI|ŞİRKETİ|SIRKETI|A\.?\s?Ş|AŞ|ANONİM|SHPK|SH\.P\.K|SRL|S\.R\.L|GMBH|LLC|OOD|EOOD|DOO|D\.O\.O|S\.A|SA|AD|KG|INC|CO|KOLL\.?|ŞTİ\.)\.?\s*$/i;
const EN={ALBANIA:'AL',BULGARIA:'BG',ROMANIA:'RO',GERMANY:'DE',FRANCE:'FR',ITALY:'IT',SPAIN:'ES',GREECE:'GR',HUNGARY:'HU',SERBIA:'RS',GEORGIA:'GE',AZERBAIJAN:'AZ',IRAQ:'IQ',KOSOVO:'XK',MACEDONIA:'MK',MONTENEGRO:'ME',CROATIA:'HR',SLOVENIA:'SI',AUSTRIA:'AT',POLAND:'PL',NETHERLANDS:'NL',BELGIUM:'BE',UKRAINE:'UA',MOLDOVA:'MD',RUSSIA:'RU',IRAN:'IR',KAZAKHSTAN:'KZ',UZBEKISTAN:'UZ',TURKMENISTAN:'TM',BOSNIA:'BA',SLOVAKIA:'SK',CZECHIA:'CZ'};
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const alnum=s=>String(s).replace(/[^\p{L}\p{N}]/gu,'');
const text=p=>p.lines.map(l=>l.text).join('\n');
export function findMrn(t){const m=String(t).match(/(\d{8})\s?(?:EX|E[XK]|[0-9A-Z]X)\s?(\d{8})/i);return m?m[1]+'EX'+m[2]:''}
const hasDecl=t=>/Ticari\s+tan[ıi]m[ıi]/i.test(t)&&/\b\d{8}\s+\d{2}\s+\d{2}\b|\b\d{8}\s+\d{2}\b/.test(t);
const isEkli=t=>/EKL[İI]\s*L[İI]STES/i.test(t);
const lastNum=l=>{const s=l.segs[l.segs.length-1];return s&&NUM_RE.test(s.text)?s.text:''};
function leftLines(p,frac=.42){const lim=p.w*frac,wl=p.w*.535;return p.lines.map(l=>({y:l.y,h:l.h,t:clean(l.segs.filter(s=>s.x0<lim).map(s=>s.words?s.words.filter(w=>w.x<wl).map(w=>w.s).join(' '):s.text).join(' ')).replace(/^[\s|;!.,:—–\-_*~"'`]+/,'')})).filter(l=>alnum(l.t).length>=2)}
function splitBlocks(lines){const hs=lines.map(l=>l.h).sort((a,b)=>a-b),med=hs[Math.floor(hs.length/2)]||9,gap=Math.max(16,med*2.1),out=[];let cur=null,prev=null;for(const l of lines){if(!cur||l.y-prev.y>gap){cur=[];out.push(cur)}cur.push(l);prev=l}return out}
const stripCode=a=>{if(a.length)a[a.length-1]=a[a.length-1].replace(/\s+\d{3}$/,'');return a};
function splitName(lines){let n=0;for(let i=0;i<Math.min(3,lines.length);i++){if(SUFFIX.test(lines[i])){n=i+1;break}}if(!n)n=1;return {name:clean(lines.slice(0,n).join(' ')),address:clean(lines.slice(n).join(', '))}}
function parties(p){
 const t=text(p),old=/(?:^|\n|\s)2\s+G[öo]nderici/i.test(t)||/G[öo]nderici\/\s*Ihracat/i.test(t),L=leftLines(p),H=p.h;let senderLines=[],receiverLines=[],taxNo='';
 if(old){
  const iS=L.findIndex(l=>/^2\s+G[öo]nderici/i.test(l.t)),iR=L.findIndex(l=>/^8\s+Al[ıi]c[ıi]/i.test(l.t)),iE=L.findIndex((l,i)=>i>iR&&/^(?:14|9|10)\s+[A-ZÇĞİÖŞÜa-zçğıöşü]/.test(l.t));
  const take=(a,b)=>L.slice(a+1,b<0?a+8:b).map(l=>l.t).filter(x=>!/^(?:No|x)$/i.test(x));
  if(iS>=0&&iR>iS){senderLines=take(iS,iR);receiverLines=take(iR,iE)}
  const tl=senderLines.findIndex(x=>/^\d{10,11}$/.test(x));if(tl>=0){taxNo=senderLines[tl];senderLines.splice(tl,1)}
 }else{
  const top=L.filter(l=>l.y<H*.3),iD=top.findIndex(l=>/^\d{2}-\d{3,6}\b/.test(l.t)),use=iD>=0?top.slice(0,iD):top,ti=use.findIndex(l=>/^\d{10,11}\b/.test(l.t));
  if(ti>=0){taxNo=use[ti].t.match(/^\d{10,11}/)[0];use.splice(ti,1)}
  const blocks=splitBlocks(use);senderLines=(blocks[0]||[]).map(l=>l.t);receiverLines=(blocks[1]||[]).map(l=>l.t);
 }
 stripCode(senderLines);stripCode(receiverLines);
 return {senderLines,receiverLines,taxNo};
}
function countryOf(p,countries,receiverLines){
 const idx=new Map;for(const c of countries){const k=normalizeSearch(c.name);if(k.length>=4)idx.set(k,c.code)}for(const [n,c] of Object.entries(EN))idx.set(normalizeSearch(n),c);idx.delete('turkiye');
 const find=s=>{const k=normalizeSearch(s);if(idx.has(k))return idx.get(k);return ''};
 for(const l of p.lines){if(l.y>p.h*.33)break;for(const s of l.segs){const c=find(s.text);if(c)return c}}
 const last=receiverLines[receiverLines.length-1]||'';for(const w of last.split(/[\s,./]+/).reverse()){const c=find(w);if(c)return c}return '';
}
function parseDecl(p,countries){
 const t=text(p),old=/G[öo]nderici\/\s*Ihracat/i.test(t)||/(?:^|\s)2\s+G[öo]nderici/i.test(t),f={},L=p.lines;
 const g=t.match(/\b(\d{8})\s+(\d{2})\s+(\d{2})\b/)||t.match(/\b(\d{8})\s+(\d{2})\b/);if(g){f.gtip=g[1];f.gtipFull=g[1]+g[2]+(g[3]||'00')}
 const cur=t.match(new RegExp('\\b('+CUR+')\\s+('+NUM+')\\b'));if(cur){f.currency=cur[1]==='TL'?'TRY':cur[1];f.amount=cur[2]}
 for(const l of L){if(l.y>p.h*.2)break;const ints=l.segs.filter(s=>/^\d{1,4}$/.test(s.text)&&s.x0>p.w*.48&&s.x0<p.w*.72);if(ints.length===2){f.kalemCount=Number(ints[0].text);f.packages=ints[1].text;break}}
 if(!f.packages){const kap=t.match(/(\d+)\s*KAP\b/i);if(kap)f.packages=kap[1]}
 // brüt / net
 if(old){
  const iB=L.findIndex(l=>/35\s*Br[üu]t/i.test(l.text)),iN=L.findIndex(l=>/38\s*Net/i.test(l.text));
  const after=(i)=>{for(let k=i+1;k<Math.min(L.length,i+5);k++){const n=lastNum(L[k]);if(n)return n}return ''};
  if(iB>=0)f.gross=after(iB);if(iN>=0)f.net=after(iN);
 }else{
  for(const l of L){const m=l.text.match(/(?:^|\s)(\d{3,4})\s+(\d{1,3}(?:\.\d{3})*,\d{2,3})\s*$/);if(!m)continue;if(/^10\d{2}$/.test(m[1])){if(!f.net)f.net=m[2]}else if(m[1].length===3&&!f.gross&&!/Ticari tan[ıi]m[ıi]:?$/.test(l.text.split(m[0])[0]===''?'':'')){f.gross=m[2]}}
 }
 // ticari tanım (birinci kalem): satırın devamını da al
 const di=L.findIndex(l=>/Ticari\s+tan[ıi]m[ıi]\s*:/i.test(l.text));
 if(di>=0){let d=L[di].text.replace(/^.*?Ticari\s+tan[ıi]m[ıi]\s*:\s*/i,'');d=d.replace(/\s{2,}\d{3,4}\s+(?:\d[\d.,]*)\s*$/,'').replace(/\s{2,}/g,' ');
  const nx=L[di+1];if(nx){const lt=clean(nx.segs.filter(s=>s.x0<p.w*.42).map(s=>s.text).join(' '));if(lt.length>2&&/\p{L}/u.test(lt)&&!/^\d+\s*-|^No\s*:|^EK BELGE|^TED=|^\d{6,}|^\d+[.,]\d/i.test(lt)&&nx.y-L[di].y<16)d+=' '+lt}
  f.description=clean(d).replace(/\s*[-–]\s*$/,'')}
 const pr=parties(p);f.sender=splitName(pr.senderLines);f.receiver=splitName(pr.receiverLines);f.senderTax=pr.taxNo;f.receiverCountry=countryOf(p,countries,pr.receiverLines);
 const kutu44=t.replace(/\s+/g,' ').match(/Fatura\s+Var\s+(\d{2})\.(\d{2})\.(\d{4})\s*\/\s*([A-Z0-9][A-Z0-9 ]{6,24}?)(?=\s+(?:DB|TPS|EUR|\*|$|[A-Z]{2,}\s))/i);
 if(kutu44){f.invoiceAlt=kutu44[4].replace(/\s/g,'');f.invoiceDateAlt=kutu44[3]+'-'+kutu44[2]+'-'+kutu44[1]}
 else{const hm=t.replace(/\s+/g,'').match(/([A-Z]{3}20\d{2}\d{9})/);if(hm)f.invoiceAlt=hm[1]}
 return f;
}
function parseEkli(p){
 const rows=[],t=text(p);let totals=null;
 for(const l of p.lines){
  const s=l.segs,m1=s.length>=2&&/^\d{1,3}$/.test(s[0].text)&&s[1].text.match(/^\d{4},\d{2},?\s*(.*)$/);if(m1){let d=m1[1]||(s[2]?s[2].text:'');d=d.replace(/\s+\d[\d.,]*\s*(?:AD|KG|KGM|M2|MT|ADET|ÇİFT|CIFT)?\s*$/i,'');rows.push({no:Number(s[0].text),desc:clean(d)})}
  const m=l.text.match(/Toplam\s*:?\s*(.*)$/i);if(m){const nums=[...m[1].matchAll(new RegExp(NUM,'g'))].map(x=>x[0]);if(nums.length>=3)totals=nums}}
 return {rows,totals};
}
function parseInvoice(p){
 const t=text(p),f={};
 let m=t.match(/Fatura\s*No\s*:?\s*([A-Za-z0-9]{8,25})/i)||t.match(/INVOICE\s*N[O0]\.?\s*:?\s*([A-Za-z0-9\-\/]{4,25})/i);if(m)f.invoice=m[1];
 m=t.match(/Fatura\s*Tarihi\s*:?\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{4})/i)||t.match(/DATE\s*:?\s*(\d{1,2})[-./](\d{1,2})[-./](\d{4})/i);if(m)f.invoiceDate=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
 return f;
}
// pages: readPdf çıktısı, countries: [{code,name}] (customs.json)
const dist=(a,b)=>{let d=Math.abs(a.length-b.length);for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])d++;return d};
export function analyze(pages,countries=[]){
 const groups=[];let cur=null;
 for(const p of pages){
  const t=text(p),mrn=findMrn(t);
  if(mrn){cur=groups.find(g=>g.mrn===mrn);
   if(!cur&&!hasDecl(t)&&!isEkli(t)){const near=groups.find(g=>dist(g.mrn,mrn)<=3);if(near)cur=near}
   if(!cur){cur={mrn,pages:[],decl:null,ekli:[],other:[]};groups.push(cur)}}
  if(!cur)continue;cur.pages.push(p);
  if(isEkli(t))cur.ekli.push(p);else if(mrn&&hasDecl(t)&&!cur.decl)cur.decl=p;else cur.other.push(p);
 }
 return groups.filter(g=>g.decl||g.ekli.length).map(g=>{
  const fields={mrn:g.mrn},warnings=[],ocr=g.pages.some(p=>p.ocr);
  if(g.decl){Object.assign(fields,parseDecl(g.decl,countries))}else warnings.push('Beyanname sayfası bulunamadı; yalnızca MRN okundu.');
  let kalem=1;const descs=fields.description?[fields.description]:[];
  for(const e of g.ekli){const r=parseEkli(e);for(const row of r.rows){kalem=Math.max(kalem,row.no);if(row.desc)descs.push(row.desc)}if(r.totals&&r.totals.length>=3){fields.gross=r.totals[1];fields.net=r.totals[2]}}
  if(g.ekli.length&&descs.length>1)fields.description=descs.join(' - ');
  fields.kalemCount=Math.max(kalem,fields.kalemCount||1);
  const invs=g.other.filter(o=>!o.ocr).map(parseInvoice).filter(x=>x.invoice),invsO=g.other.filter(o=>o.ocr).map(parseInvoice).filter(x=>x.invoice);
  if(invs.length){fields.invoice=invs[0].invoice;fields.invoiceDate=invs[0].invoiceDate||fields.invoiceDateAlt}
  else if(fields.invoiceAlt){fields.invoice=fields.invoiceAlt;fields.invoiceDate=fields.invoiceDateAlt||(invsO[0]&&invsO[0].invoiceDate)||''}
  else if(invsO.length){fields.invoice=invsO[0].invoice;fields.invoiceDate=invsO[0].invoiceDate}
  if(fields.invoiceAlt&&fields.invoice&&fields.invoice!==fields.invoiceAlt)warnings.push('Fatura no iki yerde farklı okundu ('+fields.invoice+' / '+fields.invoiceAlt+'). Kontrol et.');
  delete fields.invoiceAlt;delete fields.invoiceDateAlt;
  const need=[['gtip','GTİP'],['gross','Brüt'],['net','Net'],['amount','Fatura tutarı'],['invoice','Fatura no'],['description','Ticari tanım']];
  for(const [k,n] of need)if(!fields[k])warnings.push(n+' okunamadı.');
  if(ocr)warnings.push('Bazı sayfalar taranmış görüntüydü; yazı tanıma ile okundu. Değerleri belgeyle karşılaştır.');
  return {mrn:g.mrn,pageNumbers:g.pages.map(p=>p.n),ocr,fields,warnings};
 });
}
