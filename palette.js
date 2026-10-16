// Üst çubuktaki hızlı arama (Ctrl+K): beyanname, plaka, MRN, firma, hat bildirimi ve sayfalar
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'')??d}catch{return d}};
const PAGES=[['＋ Yeni T1 yaz','navNew'],['▦ Beyannameler','navList'],['⚑ Hat bildirimleri','navHat'],['⚓ ENS beyannameleri','navEns'],['₺ Fiyat ayarları','navFinance'],['≣ Muhasebe','navAccounting'],['⛟ Araçlar','navVehicles'],['▤ Firmalar','navCompanies'],['↓ Yedekleme','navBackup']];
function data(){const db=read('t1-ncts-v2',{declarations:[]}),out=[];
 for(const d of db.declarations||[]){const goods=read('t1-goods-'+d.id,{records:[]}).records||[];const hay=norm([d.ref,d.vehicle,d.trailer,d.customer,d.carrier,d.lrn,d.mrn,d.tags,d.notes,...goods.map(g=>g.mrn+' '+g.sender+' '+g.receiver)].join(' '));
  out.push({kind:'Beyanname',title:d.ref+' · '+(d.customer||'Müşteri yok'),sub:[d.vehicle,d.trailer].filter(Boolean).join(' / ')+(goods.length?' · '+goods.length+' kalem':''),hay,go:()=>{location.hash='edit/'+d.id}})}
 for(const h of read('t1-hat-v1',[])){out.push({kind:'Hat',title:h.mrn,sub:h.status+(h.vehicle?' · '+h.vehicle:''),hay:norm([h.mrn,h.vehicle,h.trailer,h.declarationRef].join(' ')),go:()=>document.getElementById('navHat')?.click()})}
 for(const [label,id] of PAGES)if(document.getElementById(id))out.push({kind:'Sayfa',title:label,sub:'',hay:norm(label),go:()=>document.getElementById(id).click()});
 return out}
function open(){let d=document.getElementById('palette');if(!d){d=document.createElement('dialog');d.id='palette';d.innerHTML='<div class="pHead"><span>⌕</span><input id="pInput" placeholder="Beyanname, plaka, MRN, firma veya sayfa ara…" autocomplete="off"><kbd>ESC</kbd></div><div id="pList" class="pList"></div>';document.body.append(d);
  const input=d.querySelector('#pInput'),list=d.querySelector('#pList');let items=[],sel=0;
  const render=()=>{const q=norm(input.value).trim();const all=data();items=(q?all.filter(x=>q.split(/\s+/).every(w=>x.hay.includes(w))):all.filter(x=>x.kind==='Sayfa'||x.kind==='Beyanname').slice(0,9)).slice(0,30);if(sel>=items.length)sel=0;
   list.innerHTML=items.length?items.map((x,i)=>'<button type="button" class="pItem'+(i===sel?' on':'')+'" data-i="'+i+'"><b>'+esc(x.title)+'</b><small>'+esc(x.sub)+'</small><i>'+x.kind.toLocaleUpperCase('tr')+'</i></button>').join(''):'<p class="pEmpty">Sonuç bulunamadı.</p>'};
  const go=i=>{const x=items[i];if(!x)return;d.close();x.go()};
  input.addEventListener('input',()=>{sel=0;render()});
  input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){sel=Math.min(items.length-1,sel+1);render();e.preventDefault()}else if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);render();e.preventDefault()}else if(e.key==='Enter'){go(sel);e.preventDefault()}});
  list.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)go(Number(b.dataset.i))});
  d.addEventListener('click',e=>{if(e.target===d)d.close()});d._render=render}
 d.querySelector('#pInput').value='';d._render();d.showModal();d.querySelector('#pInput').focus()}
function help(){let d=document.getElementById('kbdHelp');if(!d){d=document.createElement('dialog');d.id='kbdHelp';d.innerHTML='<h2>KISAYOLLAR</h2><ul class="kbdL"><li><kbd>CTRL</kbd><kbd>K</kbd><span>Hızlı ara</span></li><li><kbd>ALT</kbd><kbd>N</kbd><span>Yeni T1 yaz</span></li><li><kbd>ALT</kbd><kbd>L</kbd><span>Beyanname listesi</span></li><li><kbd>ALT</kbd><kbd>H</kbd><span>Hat bildirimleri</span></li><li><kbd>ALT</kbd><kbd>E</kbd><span>ENS beyannameleri</span></li><li><kbd>?</kbd><span>Bu pencere</span></li><li><kbd>ESC</kbd><span>Pencereyi kapat</span></li></ul><div class="dialogactions"><button type="button" data-kc>KAPAT</button></div>';document.body.append(d);d.onclick=e=>{if(e.target===d||e.target.closest('[data-kc]'))d.close()}}d.showModal()}
export function installPalette(){
 const top=document.querySelector('.topbar');if(top&&!document.getElementById('topSearch')){const b=document.createElement('button');b.type='button';b.id='topSearch';b.className='topSearch';b.innerHTML='<span>⌕</span> HIZLI ARA <kbd>CTRL K</kbd>';b.onclick=open;const bc=top.querySelector('.breadcrumb');bc?.after(b)}
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();return}
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
  if(e.altKey&&!e.ctrlKey){const m={n:'navNew',l:'navList',h:'navHat',e:'navEns'}[e.key.toLowerCase()];if(m){e.preventDefault();document.getElementById(m)?.click()}return}
  if(e.key==='?'&&!typing&&!document.querySelector('dialog[open]')){e.preventDefault();help()}});
}
