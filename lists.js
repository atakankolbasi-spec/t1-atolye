import {attachCombo} from './combo.js';
import {findCompanies} from './directory.js';
import {attachVknButton} from './vkn.js';
import {hay,normalizeSearch} from './directory.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const download=(value,name,type='application/json')=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([value],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const PAGE=25;
// Modaltrans tarzı liste sayfası: arama, filtre, sayfalama, ekle/düzenle/sil, içe/dışa aktar
export function listPage({combos={},extraActions=[],navAfter=null,id,nav,navIcon,navLabel,eyebrow,title,intro,newLabel,importLabel,accept,columns,fields,filters,rows,rowId,match,onSave,onRemove,onImport,exportFile,exportData,toast,confirmAction,anchor,noun}){
 const btn=document.createElement('button');btn.className='nav';btn.id=nav;btn.innerHTML='<span>'+navIcon+'</span>'+navLabel;(navAfter?navAfter.after(btn):anchor.before(btn));
 const view=document.createElement('section');view.id=id+'View';view.className='view';view.hidden=true;
 view.innerHTML=`<div class="pagehead"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${intro}</p></div><div class="plateBtns"><label class="upload">${importLabel}<input type="file" data-act="import" accept="${accept}" hidden></label><button type="button" data-act="export">Dışa aktar ↓</button><button type="button" class="primary" data-act="new">${newLabel}</button></div></div>
 <section class="card"><div class="listcontrols"><label class="search"><span>⌕</span><input data-act="q" type="search" placeholder="Ara…" aria-label="${title} içinde ara"></label><div class="filtercontrols">${filters.map(f=>`<select data-filter="${f.key}" aria-label="${f.label}"><option value="">${f.label}: Tümü</option></select>`).join('')}</div></div>
 <div class="tablewrap"><table class="lstTable"><thead><tr>${columns.map(c=>'<th>'+c.label+'</th>').join('')}<th></th></tr></thead><tbody></tbody></table></div><div class="pagination"><span data-role="info"></span><div><button type="button" data-act="prev" aria-label="Önceki sayfa">‹</button><span data-role="page"></span><button type="button" data-act="next" aria-label="Sonraki sayfa">›</button></div></div></section>`;
 document.querySelector('main footer').before(view);
 const dlg=document.createElement('dialog');dlg.id=id+'Dialog';dlg.innerHTML=`<h2></h2><form class="grid" novalidate>${fields.map(f=>`<label class="field${f.full?' full':''}"><span>${f.label}${f.required?' <em>*</em>':''}</span>${f.type==='textarea'?`<textarea name="${f.name}"></textarea>`:f.options?`<select name="${f.name}"><option value=""></option>${f.options.map(o=>`<option>${o}</option>`).join('')}</select>`:`<input name="${f.name}"${f.max?` maxlength="${f.max}"`:''}${f.placeholder?` placeholder="${f.placeholder}"`:''}>`}</label>`).join('')}<div class="dialogactions full"><button type="button" data-cancel>Vazgeç</button><button type="submit" class="primary">Kaydet</button></div></form>`;document.body.append(dlg);
 const form=dlg.querySelector('form');if(form.elements.taxNo&&form.elements.name)attachVknButton(form,toast);for(const [name,c] of Object.entries(combos))if(form.elements[name])attachCombo(form.elements[name],{minChars:2,search:c.search,item:c.item,onPick:r=>{form.elements[name].value=c.value(r)}});let editing=null,page=0,filtered=[],q='';
 const $=s=>view.querySelector(s);
 function fillFilters(all){for(const f of filters){const sel=$('[data-filter="'+f.key+'"]'),cur=sel.value,vals=[...new Set(all.map(r=>f.get(r)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));sel.innerHTML='<option value="">'+f.label+': Tümü</option>'+vals.map(v=>'<option>'+esc(v)+'</option>').join('');sel.value=vals.includes(cur)?cur:''}}
 function refresh(keepPage=false){
  const all=rows();fillFilters(all);
  const active=filters.map(f=>[f,$('[data-filter="'+f.key+'"]').value]).filter(([,v])=>v);
  filtered=all.filter(r=>active.every(([f,v])=>f.get(r)===v));
  if(q)filtered=filtered.filter(r=>match(r,q));
  if(!keepPage)page=0;
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE));if(page>=pages)page=pages-1;
  const slice=filtered.slice(page*PAGE,page*PAGE+PAGE);
  $('tbody').innerHTML=slice.length?slice.map(r=>'<tr>'+columns.map(c=>'<td>'+(c.html?c.html(r):esc(c.get(r)))+'</td>').join('')+'<td><div class="rowactions"><button type="button" data-edit="'+esc(rowId(r))+'" aria-label="Düzenle" title="Düzenle">✎</button>'+extraActions.map((a,i)=>'<button type="button" data-xa="'+i+'" data-id="'+esc(rowId(r))+'" title="'+esc(a.title)+'" aria-label="'+esc(a.title)+'">'+a.label+'</button>').join('')+'<button type="button" data-del="'+esc(rowId(r))+'" aria-label="Sil" title="Sil">🗑</button></div></td></tr>').join(''):'<tr><td colspan="'+(columns.length+1)+'" class="lstEmpty">'+(all.length?'Aramaya uyan '+noun+' bulunamadı.':'Henüz '+noun+' yok. Sağ üstten içe aktarabilir veya yeni ekleyebilirsin.')+'</td></tr>';
  $('[data-role=info]').textContent=filtered.length?(page*PAGE+1).toLocaleString('tr-TR')+'–'+(page*PAGE+slice.length).toLocaleString('tr-TR')+' / '+filtered.length.toLocaleString('tr-TR')+(filtered.length!==all.length?' (toplam '+all.length.toLocaleString('tr-TR')+')':'')+' kayıt':'0 kayıt';
  $('[data-role=page]').textContent='Sayfa '+(page+1)+' / '+pages.toLocaleString('tr-TR');
  $('[data-act=prev]').disabled=page===0;$('[data-act=next]').disabled=page>=pages-1;
 }
 function openEdit(rec){editing=rec;dlg.querySelector('h2').textContent=rec?title.replace(/lar$|ler$/,'')+' kaydını düzenle':newLabel.replace(/^＋\s*/,'');form.reset();if(rec)for(const f of fields)form.elements[f.name].value=rec[f.name]??'';dlg.showModal();form.elements[fields[0].name].focus()}
 dlg.querySelector('[data-cancel]').onclick=()=>dlg.close();
 form.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));
  for(const f of fields)if(f.required&&!String(data[f.name]||'').trim()){toast(f.label+' gerekli.');form.elements[f.name].focus();return}
  try{await onSave(data,editing);dlg.close();refresh(true);toast('Kayıt kaydedildi.')}catch(err){toast(err.message)}};
 $('[data-act=new]').onclick=()=>openEdit(null);
 $('[data-act=q]').oninput=e=>{q=normalizeSearch(e.target.value);refresh()};
 view.addEventListener('change',e=>{if(e.target.matches('[data-filter]'))refresh()});
 $('[data-act=prev]').onclick=()=>{page--;refresh(true)};$('[data-act=next]').onclick=()=>{page++;refresh(true)};
 $('tbody').onclick=e=>{const xa=e.target.closest('[data-xa]');if(xa){const r=rows().find(x=>rowId(x)===xa.dataset.id);if(r)extraActions[Number(xa.dataset.xa)].fn(r);return}const ed=e.target.closest('[data-edit]'),de=e.target.closest('[data-del]');
  if(ed)openEdit(rows().find(r=>rowId(r)===ed.dataset.edit));
  if(de){const r=rows().find(x=>rowId(x)===de.dataset.del);if(r)confirmAction('Kaydı sil','Bu kayıt rehberden silinecek. Daha önce hazırlanmış beyannameler etkilenmez.',async()=>{try{await onRemove(r);refresh(true);toast('Kayıt silindi.')}catch(err){toast(err.message)}})}};
 $('[data-act=import]').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{toast(await onImport(file));refresh()}catch(err){toast('Dosya alınamadı: '+err.message)}finally{e.target.value=''}};
 $('[data-act=export]').onclick=()=>download(exportData(),exportFile);
 return {nav:btn,view,refresh};
}
export function installLists({references,plates,toast,confirmAction,show,plateDocs}){
 const anchor=document.querySelector('#navReferences');
 const sorted=(()=>{let src=null,n=-1,out=[];return()=>{const cur=references.listCompanies();if(cur!==src||cur.length!==n){src=cur;n=cur.length;out=[...cur].sort((a,b)=>a.name.localeCompare(b.name,'tr'))}return out}})();
 const companies=listPage({id:'companies',nav:'navCompanies',navIcon:'▤',navLabel:'Firmalar',eyebrow:'KAYITLI BİLGİLER',title:'Firmalar',intro:'Gönderici, alıcı ve taşıyıcı firmalar. T1 formlarında firma yazarken buradan önerilir.',newLabel:'＋ Yeni firma',importLabel:'Firma listesi içe aktar',accept:'.json,.csv,.tsv,.xlsx',noun:'firma',
  anchor,toast,confirmAction,
  columns:[{label:'FİRMA ADI',html:c=>'<strong>'+esc(c.name)+'</strong>'+(c.originalName?'<small>'+esc(c.originalName)+'</small>':'')},{label:'VERGİ NO',get:c=>c.taxNo},{label:'EORI',get:c=>c.eori},{label:'ÜLKE',get:c=>c.country},{label:'ŞEHİR',get:c=>c.city},{label:'ADRES',html:c=>'<span class="lstAddr">'+esc(c.address)+'</span>'}],
  fields:[{name:'name',label:'Firma adı',required:true,full:true},{name:'taxNo',label:'Vergi numarası'},{name:'eori',label:'EORI'},{name:'country',label:'Ülke kodu',max:2,placeholder:'TR'},{name:'city',label:'Şehir'},{name:'postal',label:'Posta kodu'},{name:'address',label:'Açık adres',type:'textarea',full:true}],
  filters:[{key:'country',label:'Ülke',get:c=>c.country}],
  rows:sorted,rowId:c=>c.id,match:(c,q)=>hay(c).some(v=>v.includes(q)),
  async onSave(d,old){d.country=(d.country||'').trim().toUpperCase();if(d.country&&!/^[A-Z]{2}$/.test(d.country))throw Error('Ülke kodu iki harf olmalı (TR, RO…).');await references.saveCompany({...(old||{}),...d})},
  onRemove:c=>references.removeCompany(c.id),
  async onImport(f){const r=await references.importFile(f);return r.added.toLocaleString('tr-TR')+' firma eklendi; '+r.skipped.toLocaleString('tr-TR')+' boş veya tekrar kayıt atlandı.'},
  exportFile:'T1_Firma_Rehberi.json',exportData:()=>references.exportJson()});
 const vehicles=listPage({combos:{owner:{search:async(q,limit)=>findCompanies(await references.getCompanies(),q,limit),item:c=>({title:c.name,sub:[c.eori||c.taxNo,c.country].filter(Boolean).join(' · ')}),value:c=>c.name}},id:'vehicles',nav:'navVehicles',navIcon:'⛟',navLabel:'Araçlar',eyebrow:'KAYITLI BİLGİLER',title:'Araçlar',intro:'Çekici ve treyler plakaları. Modaltrans’tan aldığın araç Excel’ini buraya yükle; T1 ve ENS formlarında plaka yazınca ülke ve araç sahibi otomatik gelir.',newLabel:'＋ Yeni araç',importLabel:'Araç listesi içe aktar (Excel)',accept:'.xlsx,.csv,.tsv,.json',noun:'araç',
  anchor,toast,confirmAction,
  columns:[{label:'PLAKA',html:r=>'<strong>'+esc(r.plate)+'</strong>'},{label:'ARAÇ SINIFI',get:r=>r.type},{label:'ÜLKE',get:r=>r.country},{label:'ARAÇ SAHİBİ FİRMA',get:r=>r.owner},{label:'ÖZMAL / KİRALIK',get:r=>r.ownership},{label:'EVRAK',html:r=>'<button type="button" class="pdCount'+(plateDocs&&plateDocs.count(r.plate)?' has':'')+'" data-pd="'+esc(r.plate)+'" title="Evrak arşivi">📎 '+(plateDocs?plateDocs.count(r.plate):0)+'</button>'}],
  fields:[{name:'plate',label:'Plaka',required:true},{name:'type',label:'Araç sınıfı',options:['Çekici','Kamyon','Kamyonet','Minivan','Traktör','Treyler','Römork','Swapbody']},{name:'country',label:'Ülke kodu',max:2,placeholder:'TR'},{name:'ownership',label:'Özmal / Kiralık',options:['Özmal','Kiralık']},{name:'owner',label:'Araç sahibi firma',full:true}],
  filters:[{key:'type',label:'Sınıf',get:r=>r.type},{key:'country',label:'Ülke',get:r=>r.country}],
  rows:()=>plates.all(),rowId:r=>plates.idOf(r),match:(r,q)=>[r.key,r.owner,r.type].some(v=>normalizeSearch(v).includes(q)),
  async onSave(d,old){await plates.upsert(d,old?plates.idOf(old):null)},
  onRemove:r=>plates.remove(plates.idOf(r)),
  async onImport(f){const r=await plates.importFile(f);return r.added.toLocaleString('tr-TR')+' araç eklendi'+(r.updated?', '+r.updated+' güncellendi':'')+'; '+r.skipped.toLocaleString('tr-TR')+' tekrar/boş kayıt atlandı.'},
  exportFile:'T1_Arac_Rehberi.json',exportData:()=>plates.exportJson()});
 companies.nav.onclick=()=>show('companies');vehicles.nav.onclick=()=>show('vehicles');
 references.onChange(()=>{if(!companies.view.hidden)companies.refresh(true)});plates.onChange(()=>{if(!vehicles.view.hidden)vehicles.refresh(true)});if(plateDocs)plateDocs.onChange(()=>{if(!vehicles.view.hidden)vehicles.refresh(true)});
 return {render:name=>(name==='companies'?companies:vehicles).refresh()};
}
