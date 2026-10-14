import {packageTypes,documentCodes} from './schema.js';
import {parseKolis,parseDocs,defaultKolis,docNumber,KOLI_MAX,DOC_MAX} from './lines.js';
import {attachCombo} from './combo.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeLabel=([code,name])=>code+'-'+name,docLabel=([code,name])=>code+'-'+name;
const match=(items,q,label)=>{const n=q.toLocaleLowerCase('tr-TR');return items.filter(x=>label(x).toLocaleLowerCase('tr-TR').includes(n)||String(x[2]||'').toLocaleLowerCase('tr-TR').includes(n))};
// Editable package (koli) and document rows for the goods form; state lives in the hidden "kolis" and "docs" inputs.
export function installGoodLines(form){
 const koliBox=form.querySelector('#koliRows'),docBox=form.querySelector('#docRows'),addKoli=form.querySelector('#addKoli'),addDoc=form.querySelector('#addDoc');
 let K=defaultKolis(),D=[];
 const sync=()=>{form.elements.kolis.value=JSON.stringify(K);form.elements.docs.value=JSON.stringify(D)};
 const touch=()=>{sync();form.dispatchEvent(new Event('input'))};
 function renderKoli(){
  koliBox.innerHTML=K.map((k,i)=>'<div class="lineRow koliRow" data-i="'+i+'"><label class="field"><span>Paket sayısı / paket içi adedi</span><input data-f="count" inputmode="numeric" placeholder="Örn. 40" value="'+esc(k.count)+'"></label><label class="field"><span>Paket tipi</span><input data-f="type" autocomplete="off" value="'+esc(k.type)+'"></label><label class="field"><span>Açıklama</span><input data-f="desc" value="'+esc(k.desc)+'"></label><button type="button" class="lineRemove" data-rm="'+i+'" aria-label="Koli satırını sil" '+(K.length<2?'disabled':'')+'>✕</button></div>').join('');
  koliBox.querySelectorAll('[data-f=type]').forEach(input=>{const i=Number(input.closest('[data-i]').dataset.i);attachCombo(input,{minChars:1,emptyText:'Tip bulunamadı. İki harfli kodu elle yazabilirsin.',search:(q,limit)=>(q?match(packageTypes,q,typeLabel):packageTypes).slice(0,limit),item:t=>({title:typeLabel(t)}),onPick:t=>{input.value=typeLabel(t);K[i].type=input.value;touch()}})});
  addKoli.disabled=K.length>=KOLI_MAX;
 }
 function renderDocs(){
  docBox.innerHTML=D.length?D.map((d,i)=>'<div class="lineRow docRow" data-i="'+i+'"><label class="field"><span>Döküman kodu</span><input data-f="code" autocomplete="off" value="'+esc(d.code)+'"></label><label class="field"><span>Referans</span><input data-f="ref" value="'+esc(d.ref)+'"></label><label class="field"><span>Evrak tarihi</span><input data-f="date" type="date" value="'+esc(d.date)+'"></label><button type="button" class="lineRemove" data-rm="'+i+'" aria-label="Belge satırını sil">✕</button></div>').join(''):'<p class="lineHint">Belge satırı yok. Excel’e belge bilgisi yazılmaz.</p>';
  docBox.querySelectorAll('[data-f=code]').forEach(input=>{const i=Number(input.closest('[data-i]').dataset.i);attachCombo(input,{minChars:1,emptyText:'Kod bulunamadı. N380 gibi kodu elle yazabilirsin.',search:(q,limit)=>(q?match(documentCodes,q,docLabel):documentCodes).slice(0,limit),item:t=>({title:docLabel(t),sub:t[2]}),onPick:t=>{input.value=docLabel(t);D[i].code=input.value;touch()}})});
  addDoc.disabled=D.length>=DOC_MAX;
 }
 const edit=(box,rows)=>e=>{const row=e.target.closest('[data-i]'),f=e.target.dataset.f;if(row&&f){rows()[Number(row.dataset.i)][f]=e.target.value;sync()}};
 koliBox.addEventListener('input',edit(koliBox,()=>K));docBox.addEventListener('input',edit(docBox,()=>D));
 koliBox.addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b&&K.length>1){K.splice(Number(b.dataset.rm),1);renderKoli();touch()}});
 docBox.addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b){D.splice(Number(b.dataset.rm),1);renderDocs();touch()}});
 addKoli.onclick=()=>{if(K.length<KOLI_MAX){K.push({count:'',type:'BI-KAP',desc:'ADDR'});renderKoli();touch()}};
 addDoc.onclick=()=>{if(D.length<DOC_MAX){D.push({code:'',ref:'',date:''});renderDocs();touch()}};
 return {load(g){K=parseKolis(g);D=parseDocs(g);if(K.length===1&&!K[0].count&&g.packages)K[0].count=String(g.packages);const inv=D.find(d=>docNumber(d.code)==='380');if(inv){inv.ref=inv.ref||g.invoice||'';inv.date=inv.date||g.invoiceDate||''}renderKoli();renderDocs();sync()}};
}
