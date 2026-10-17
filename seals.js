// Mühür stoğu: aralık ekle, listeden seç; seçilen mühür stoktan düşer, serbest bırakılırsa geri döner.
const KEY='t1-seals-v1',SEED_FROM='İG01361763',SEED_TO='İG01362000';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').trim().toLocaleUpperCase('tr').replace(/\s+/g,'');
const split=s=>{const m=norm(s).match(/^(.*?)(\d+)$/);return m?{p:m[1],n:m[2]}:null};
export function expand(a,b){const x=split(a),y=split(b||a);if(!x||!y||x.p!==y.p)return null;const w=Math.max(x.n.length,y.n.length),lo=Number(x.n),hi=Number(y.n);if(!(hi>=lo)||hi-lo>20000)return null;const out=[];for(let i=lo;i<=hi;i++)out.push(x.p+String(i).padStart(w,'0'));return out}
const cmp=(a,b)=>a.localeCompare(b,'tr',{numeric:true});
let st;
function load(){if(st)return st;try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.avail)){st={avail:[...new Set(v.avail.map(norm))].sort(cmp),seeded:true,total:Number(v.total)||0};st.total=Math.max(st.total,st.avail.length);return st}}catch{}st={avail:(expand(SEED_FROM,SEED_TO)||[]),seeded:true};st.total=st.avail.length;save();return st}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch{}}
export const available=()=>load().avail.slice();
export const count=()=>load().avail.length;
export const total=()=>Math.max(load().total||0,load().avail.length);
export function add(a,b){const r=expand(a,b);if(!r)return 0;const s=load(),set=new Set(s.avail);let n=0;for(const x of r)if(!set.has(x)){set.add(x);n++}s.avail=[...set].sort(cmp);s.total=(s.total||0)+n;save();return n}
export function take(list){const s=load(),t=new Set(list.map(norm));s.avail=s.avail.filter(x=>!t.has(x));save()}
export function giveBack(list){const s=load(),set=new Set(s.avail);for(const x of list)set.add(norm(x));s.avail=[...set].filter(Boolean).sort(cmp);save()}
export function clearAll(){load().avail=[];save()}
export function exportData(){return load().avail}
export function importData(a){if(!Array.isArray(a))return 0;const s=load(),set=new Set(s.avail);let n=0;for(const x of a){const k=norm(x);if(k&&!set.has(k)){set.add(k);n++}}s.avail=[...set].sort(cmp);save();return n}
export function summary(){const a=load().avail;if(!a.length)return 'Stok boş';const g=[];let s=a[0],prev=a[0];for(let i=1;i<=a.length;i++){const x=a[i],px=split(prev),cx=x&&split(x);if(x&&px&&cx&&px.p===cx.p&&Number(cx.n)===Number(px.n)+1){prev=x;continue}g.push(s===prev?s:s+' – '+prev);s=x;prev=x}return g.slice(0,6).join('  ·  ')+(g.length>6?'  · …':'')}
// Seçim penceresi: onPick(seçilenListe) çağrılır, seçilenler stoktan düşer
export function openPicker({toast,onPick,already=[]}){let d=document.getElementById('sealPicker');if(!d){d=document.createElement('dialog');d.id='sealPicker';document.body.append(d)}
 const sel=new Set();let q='';
 const draw=()=>{const av=available(),f=av.filter(x=>!q||x.includes(norm(q))).slice(0,120);
  d.innerHTML='<h2>MÜHÜR SEÇ</h2><p class="tgHint">Stokta <b>'+av.length+'</b> mühür var. Seçtiklerin kullanıldıkça stoktan düşer.</p><div class="spTools"><input id="spQ" placeholder="Numara ara…" value="'+esc(q)+'"><input id="spN" type="number" min="1" max="50" value="1" aria-label="Adet"><button type="button" data-first>İLK N TANESİNİ SEÇ</button></div><div class="spGrid">'+(f.length?f.map(x=>'<button type="button" class="spChip'+(sel.has(x)?' on':'')+'" data-s="'+esc(x)+'">'+esc(x)+'</button>').join(''):'<p class="dcEmpty">Stokta uygun mühür yok.</p>')+'</div><div class="dialogactions"><span class="spCount">'+sel.size+' SEÇİLİ</span><button type="button" data-no>VAZGEÇ</button><button type="button" class="primary" data-ok'+(sel.size?'':' disabled')+'>KULLAN</button></div>';
  const qi=d.querySelector('#spQ');qi.oninput=()=>{q=qi.value;const p=qi.selectionStart;draw();const n=d.querySelector('#spQ');n.focus();n.setSelectionRange(p,p)}};
 d.onclick=e=>{const c=e.target.closest('[data-s]');if(c){const k=c.dataset.s;sel.has(k)?sel.delete(k):sel.add(k);draw();return}
  if(e.target.closest('[data-first]')){const n=Math.max(1,Math.min(50,Number(d.querySelector('#spN').value)||1));sel.clear();available().filter(x=>!q||x.includes(norm(q))).slice(0,n).forEach(x=>sel.add(x));draw();return}
  if(e.target.closest('[data-no]')){d.close();return}
  if(e.target.closest('[data-ok]')&&sel.size){const list=[...sel].sort(cmp);take(list);d.close();onPick(list);if(toast)toast(list.length+' mühür kullanıldı, stoktan düşüldü. Kalan: '+count())}};
 draw();d.showModal()}
// Stok yönetimi penceresi
export function openManager({toast,onChange=()=>{}}){let d=document.getElementById('sealMgr');if(!d){d=document.createElement('dialog');d.id='sealMgr';document.body.append(d)}
 const draw=()=>{d.innerHTML='<h2>MÜHÜR STOĞU</h2><div class="smBig"><strong>'+count()+'</strong><span>MÜHÜR KALDI</span></div><p class="smRange">'+esc(summary())+'</p><div class="spTools"><input id="smA" placeholder="Başlangıç  (örn. İG01361763)"><input id="smB" placeholder="Bitiş  (örn. İG01362000)"><button type="button" data-add>ARALIK EKLE</button></div><div class="dialogactions"><button type="button" class="danger" data-clear>STOĞU BOŞALT</button><button type="button" data-close>KAPAT</button></div>'};
 d.onclick=e=>{if(e.target.closest('[data-close]')){d.close();return}
  if(e.target.closest('[data-add]')){const a=d.querySelector('#smA').value,b=d.querySelector('#smB').value;const n=add(a,b||a);if(!n){toast('Aralık eklenemedi: ön ek aynı olmalı (örn. İG0136…).');return}toast(n+' mühür stoğa eklendi.');draw();onChange();return}
  if(e.target.closest('[data-clear]')){if(confirm('Stoktaki tüm mühürler silinsin mi?')){clearAll();draw();onChange()}}};
 draw();d.showModal()}
