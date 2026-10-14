import {packageTypes,documentCodes,currencies} from './schema.js';
import {parseKolis,parseDocs,defaultKolis,docNumber,KOLI_MAX,DOC_MAX} from './lines.js';
import {attachCombo} from './combo.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeLabel=([code,name])=>code+'-'+name,docLabel=([code,name])=>code+'-'+name;
const match=(items,q,label)=>{const n=q.toLocaleLowerCase('tr-TR');return items.filter(x=>label(x).toLocaleLowerCase('tr-TR').includes(n)||String(x[2]||'').toLocaleLowerCase('tr-TR').includes(n))};
// Editable package (koli) and document rows for the goods form; state lives in the hidden "kolis" and "docs" inputs.
export function installGoodLines(form){
 const koliBox=form.querySelector('#koliRows'),docBox=form.querySelector('#docRows'),addKoli=form.querySelector('#addKoli'),addDoc=form.querySelector('#addDoc');
 const whBox=form.querySelector('#warehouseRows'),addWh=form.querySelector('#addWarehouse'),INCO=['','EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'],WH_MAX=10;
 let K=defaultKolis(),D=[],W=[];
 const sync=()=>{form.elements.kolis.value=JSON.stringify(K);form.elements.docs.value=JSON.stringify(D);form.elements.warehouse.value=JSON.stringify(W);const w=W[0]||{};form.elements.warehouseDoc.value=w.doc||'';form.elements.warehouseLine.value=w.line||'';form.elements.warehouseQuantity.value=w.qty||'';form.elements.delivery.value=w.delivery||''};
 const opts=(list,v)=>list.map(x=>'<option'+(x===v?' selected':'')+'>'+esc(x)+'</option>').join('');
 function renderWh(){
  whBox.innerHTML=W.length?W.map((w,i)=>'<div class="lineRow whRow" data-i="'+i+'"><label class="field"><span>Doküman no</span><input data-f="doc" value="'+esc(w.doc)+'"></label><label class="field"><span>Satır no</span><input data-f="line" inputmode="numeric" value="'+esc(w.line)+'"></label><label class="field"><span>Açılacak miktar</span><input data-f="qty" inputmode="decimal" value="'+esc(w.qty)+'"></label><label class="field"><span>Açıklama</span><input data-f="desc" value="'+esc(w.desc)+'"></label><label class="field"><span>Kıymet bedeli</span><input data-f="value" inputmode="decimal" placeholder="0,00" value="'+esc(w.value)+'"></label><label class="field"><span>Döviz</span><select data-f="currency">'+opts(['',...currencies],w.currency)+'</select></label><label class="field"><span>Teslim şekli</span><select data-f="delivery">'+opts(INCO,w.delivery)+'</select></label><button type="button" class="lineRemove" data-rm="'+i+'" aria-label="Antrepo satırını kaldır">✕</button></div>').join(''):'<p class="lineHint">Antrepo veya özet beyandan düşüm yoksa bu bölümü boş bırak.</p>';
  addWh.disabled=W.length>=WH_MAX;
 }
 whBox.addEventListener('input',e=>{const row=e.target.closest('[data-i]'),f=e.target.dataset.f;if(row&&f){W[Number(row.dataset.i)][f]=e.target.value;sync()}});whBox.addEventListener('change',e=>{const row=e.target.closest('[data-i]'),f=e.target.dataset.f;if(row&&f){W[Number(row.dataset.i)][f]=e.target.value;touch()}});
 whBox.addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(b){W.splice(Number(b.dataset.rm),1);renderWh();touch()}});
 addWh.onclick=()=>{if(W.length<WH_MAX){W.push({doc:'',line:'',qty:'',desc:'',value:'',currency:'',delivery:''});renderWh();touch()}};
 const parseWh=g=>{try{const a=JSON.parse(g?.warehouse||'[]');if(Array.isArray(a)&&a.length)return a.slice(0,WH_MAX).map(x=>({doc:String(x.doc??''),line:String(x.line??''),qty:String(x.qty??''),desc:String(x.desc??''),value:String(x.value??''),currency:String(x.currency??''),delivery:String(x.delivery??'')}))}catch{}return g?.warehouseDoc||g?.warehouseLine||g?.warehouseQuantity||g?.delivery?[{doc:g.warehouseDoc||'',line:g.warehouseLine||'',qty:g.warehouseQuantity||'',desc:'',value:'',currency:'',delivery:g.delivery||''}]:[]};
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
 return {load(g){K=parseKolis(g);D=parseDocs(g);W=parseWh(g);renderWh();if(K.length===1&&!K[0].count&&g.packages)K[0].count=String(g.packages);const inv=D.find(d=>docNumber(d.code)==='380');if(inv){inv.ref=inv.ref||g.invoice||'';inv.date=inv.date||g.invoiceDate||''}renderKoli();renderDocs();sync()}};
}
