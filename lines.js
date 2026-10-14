export const KOLI_MAX=2,DOC_MAX=2;
const s=v=>String(v??'').trim().slice(0,200);
export const typeCode=v=>s(v).toUpperCase().split(/[\s-]/)[0].slice(0,3);
export const docNumber=v=>(s(v).match(/^N?\s*(\d{3})/i)||[])[1]||'';
const list=v=>{try{const a=typeof v==='string'?JSON.parse(v):v;return Array.isArray(a)?a.filter(x=>x&&typeof x==='object'):null}catch{return null}};
export const defaultKolis=()=>[{count:'',type:'BI-KAP',desc:'ADDR'}];
export const defaultDocs=()=>[{code:'N380-Commercial invoice',ref:'',date:''},{code:'N730-Road consignment note',ref:'CMR',date:''}];
export function parseKolis(g){const a=list(g?.kolis)?.slice(0,KOLI_MAX).map(x=>({count:s(x.count),type:s(x.type),desc:s(x.desc)}));return a?.length?a:defaultKolis()}
export function parseDocs(g){if(g?.docs===undefined||g.docs==='')return defaultDocs();return(list(g.docs)||[]).slice(0,DOC_MAX).map(x=>({code:s(x.code),ref:s(x.ref),date:s(x.date)}))}
