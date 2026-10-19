/* Elle düzenleme modu: elemana tıkla; gizle / taşı / boyutlandır; ayarları kopyalayıp gönder. */
const KEY='t1-tune-v2',$=(s,r=document)=>r.querySelector(s);
let rules=[];try{rules=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{}
let on=false,sel=null,drag=null,undo=[],snap=null;
const style=document.createElement('style');style.id='ltCss';document.head.append(style);
const ui$=document.createElement('style');ui$.textContent=`
#ltBtn{position:fixed;left:104px;bottom:14px;z-index:2147483000;display:flex;align-items:center;gap:8px;border:0!important;border-radius:99px!important;padding:9px 16px!important;background:#17233b!important;color:#fff!important;font:800 12px Inter,sans-serif!important;cursor:pointer;box-shadow:0 10px 26px -10px rgba(10,20,50,.6);opacity:.88}
#ltBtn:hover,#ltBtn.on{opacity:1;background:#3b6cff!important}
#ltPanel{position:fixed;right:18px;bottom:18px;width:318px;max-height:calc(100vh - 36px);display:flex;flex-direction:column;z-index:2147483001;background:#10182b;color:#e8eefc;border:1px solid #27345a;border-radius:16px;box-shadow:0 30px 70px -20px rgba(0,0,0,.65);font:12px Inter,sans-serif;overflow:hidden}
#ltPanel[hidden]{display:none}
#ltPanel *{box-sizing:border-box;text-transform:none!important;letter-spacing:normal}.ltSec>h4{text-transform:uppercase!important;letter-spacing:.09em!important}#ltPanel input,#ltPanel textarea{background:#18233f!important;color:#fff!important;height:auto!important;min-height:0!important;box-shadow:none!important;font-weight:500!important}#ltPanel button{box-shadow:none!important}html.dark #ltPanel,html.dark #ltBtn,html.dark #ltFlash{filter:invert(1) hue-rotate(180deg)}
.ltHead{display:flex;align-items:center;gap:8px;padding:11px 14px;background:linear-gradient(135deg,#3b6cff,#2447b5);cursor:grab;user-select:none}
.ltHead b{flex:1;font-size:13px;letter-spacing:.01em}.ltHead small{opacity:.75;font-size:10.5px}
.ltIc{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:8px;width:26px;height:26px;cursor:pointer;font-size:13px;line-height:1;padding:0}
.ltIc:hover{background:rgba(255,255,255,.3)}.ltIc:disabled{opacity:.35;cursor:default}
.ltBody{padding:12px 14px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.ltEmpty{padding:18px 6px;text-align:center;color:#9fb0d6;line-height:1.6}.ltEmpty i{display:block;font-style:normal;font-size:26px;margin-bottom:6px}
.ltCrumb{display:flex;gap:8px;align-items:center;background:#18233f;border:1px solid #27345a;border-radius:10px;padding:8px 10px}
.ltCrumb em{font-style:normal;font-size:10px;font-weight:800;background:#3b6cff;color:#fff;border-radius:6px;padding:2px 6px;text-transform:uppercase}
.ltCrumb span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#d7e1ff}
.ltSec{display:flex;flex-direction:column;gap:7px}.ltSec>h4{margin:0;font-size:10px;letter-spacing:.09em;color:#7f90bb;text-transform:uppercase}
.ltGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.ltF{display:flex;flex-direction:column;gap:3px;color:#9fb0d6;font-size:10.5px;font-weight:600}
#ltPanel input,#ltPanel textarea{width:100%;background:#18233f;border:1px solid #2c3b66;border-radius:8px;color:#fff;padding:6px 8px;font:12px Inter,sans-serif}
#ltPanel input:focus,#ltPanel textarea:focus{outline:2px solid #3b6cff;border-color:transparent}
#ltPanel textarea{min-height:52px;resize:vertical}
.ltPad{display:grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(3,30px);gap:4px;justify-content:center}
.ltPad button{border:1px solid #2c3b66;background:#18233f;color:#cfe0ff;border-radius:8px;cursor:pointer;font-size:12px}.ltPad button:hover{background:#3b6cff;color:#fff}
.ltPad .c{background:transparent;border:0;color:#7f90bb;font-size:10px;cursor:default}
.ltRow{display:flex;gap:6px;flex-wrap:wrap}
.ltBtn{border:1px solid #2c3b66;background:#18233f;color:#d7e1ff;border-radius:9px;padding:7px 10px;font:700 11.5px Inter,sans-serif;cursor:pointer}.ltBtn:hover{background:#22305a}
.ltBtn.on{background:#e0453a!important;border-color:#e0453a!important;color:#fff!important}.ltBtn.pri{background:#3b6cff;border-color:#3b6cff;color:#fff}.ltBtn.pri:hover{background:#4f7bff}
.ltList{max-height:110px;overflow:auto;display:flex;flex-direction:column;gap:3px}
.ltList>div{display:flex;align-items:center;gap:8px;padding:4px 8px;background:#18233f;border-radius:8px;cursor:pointer}.ltList>div:hover{background:#22305a}
.ltList span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#cfe0ff;font-size:11.5px}.ltList button{border:0;background:none;color:#ff8b83;cursor:pointer;font-size:12px}
.ltFoot{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid #27345a;background:#0c1322}.ltFoot span{flex:1;color:#9fb0d6;font-size:11px}
.ltHint{color:#7f90bb;font-size:10.5px;line-height:1.5}
#ltHover,#ltSelBox{position:fixed;z-index:2147482990;pointer-events:none;display:none;border-radius:4px}
#ltHover{border:1.5px solid #3b6cff;background:rgba(59,108,255,.12)}
#ltSelBox{border:2px solid #ff7a1a;background:rgba(255,122,26,.08)}
#ltTag{position:absolute;left:-2px;top:-24px;background:#ff7a1a;color:#fff;font:700 10.5px Inter,sans-serif;padding:3px 8px;border-radius:6px 6px 6px 0;white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis}
#ltHover i{position:absolute;left:-1.5px;top:-21px;background:#3b6cff;color:#fff;font:700 10px Inter,sans-serif;font-style:normal;padding:2px 7px;border-radius:5px;white-space:nowrap;max-width:240px;overflow:hidden;text-overflow:ellipsis}
.ltH{position:absolute;width:11px;height:11px;background:#fff;border:2px solid #ff7a1a;border-radius:3px;pointer-events:auto;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.ltH.e{right:-7px;top:calc(50% - 6px);cursor:ew-resize}.ltH.s{left:calc(50% - 6px);bottom:-7px;cursor:ns-resize}.ltH.se{right:-7px;bottom:-7px;cursor:nwse-resize}
html.ltOn,html.ltOn *{cursor:crosshair!important}html.ltOn #ltPanel,html.ltOn #ltPanel *,html.ltOn #ltBtn{cursor:default!important}html.ltOn #ltPanel button,html.ltOn #ltBtn{cursor:pointer!important}
html.ltOn .ltHead,html.ltOn .ltHead *{cursor:grab!important}
#ltFlash{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:2147483002;background:#10182b;color:#fff;padding:10px 18px;border-radius:12px;font:700 13px Inter,sans-serif;box-shadow:0 14px 34px -12px rgba(0,0,0,.6)}`;
document.head.append(ui$);
function decl(r){const o=[];if(r.hide)o.push('display:none!important');if(r.w)o.push('width:'+r.w+'%!important;max-width:none!important;flex:0 0 '+r.w+'%!important');if(r.h)o.push('height:'+r.h+'px!important');if(r.fs)o.push('font-size:'+r.fs+'px!important');if(r.order!=null&&r.order!=='')o.push('order:'+r.order+'!important');if(r.mt)o.push('margin-top:'+r.mt+'px!important');if(r.mb)o.push('margin-bottom:'+r.mb+'px!important');if(r.x||r.y)o.push('translate:'+(r.x||0)+'px '+(r.y||0)+'px!important');return o.join(';')}
function css(){style.textContent=rules.map(r=>{const d=decl(r);return d?r.sel+'{'+d+'}':''}).join('\n')}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(rules))}catch{}css();place()};
function push(){undo.push(JSON.stringify(rules));if(undo.length>60)undo.shift()}
css();
function path(el){if(el.id&&document.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+CSS.escape(el.id);const parts=[];let n=el;while(n&&n!==document.body&&parts.length<5){let p=n.tagName.toLowerCase();if(n.id&&document.querySelectorAll('#'+CSS.escape(n.id)).length===1){parts.unshift('#'+CSS.escape(n.id));break}const cl=[...n.classList].filter(c=>!/^(lt|current|complete|active|on|open|is|invalid)/.test(c)).slice(0,2);if(cl.length)p+='.'+cl.map(CSS.escape).join('.');const sib=n.parentElement&&[...n.parentElement.children].filter(x=>x.tagName===n.tagName);if(sib&&sib.length>1)p+=':nth-of-type('+(sib.indexOf(n)+1)+')';parts.unshift(p);n=n.parentElement}return parts.join(' > ')}
const label=el=>(el.innerText||el.getAttribute('aria-label')||el.title||el.placeholder||'').trim().replace(/\s+/g,' ').slice(0,40);
const nice=el=>{const t=label(el);return t||('<'+el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.split(' ')[0]:'')+'>')};
function ctx(){const v=[...document.querySelectorAll('.view')].find(x=>!x.hidden&&x.offsetParent);const st=$('#stepNumber')?.textContent;return (v?.id||'')+(st&&$('#declarationForm')?.offsetParent?' adım '+st:'')}
const ruleOf=el=>{const s=path(el);let r=rules.find(x=>x.sel===s);if(!r){r={sel:s,txt:label(el),note:'',ctx:ctx()};rules.push(r)}return r};
const cur=()=>sel?rules.find(x=>x.sel===path(sel)):null;
/* arayüz parçaları */
const btn=document.createElement('button');btn.id='ltBtn';btn.type='button';btn.innerHTML='<span>🛠</span><span>Düzenle</span>';btn.title='Sayfayı elle düzenle';document.body.append(btn);
const hoverBox=document.createElement('div');hoverBox.id='ltHover';hoverBox.innerHTML='<i></i>';document.body.append(hoverBox);
const selBox=document.createElement('div');selBox.id='ltSelBox';selBox.innerHTML='<div id="ltTag"></div><span class="ltH e" data-h="e"></span><span class="ltH s" data-h="s"></span><span class="ltH se" data-h="se"></span>';document.body.append(selBox);
const panel=document.createElement('div');panel.id='ltPanel';panel.hidden=true;document.body.append(panel);
function box(b,el){if(!el||!el.isConnected){b.style.display='none';return}const r=el.getBoundingClientRect();if(!r.width&&!r.height){b.style.display='none';return}b.style.display='block';b.style.left=r.left+'px';b.style.top=r.top+'px';b.style.width=r.width+'px';b.style.height=r.height+'px'}
function place(){box(selBox,sel);if(sel)$('#ltTag').textContent=nice(sel)}
const own=e=>e.closest&&e.closest('#ltPanel,#ltBtn,#ltSelBox,#ltFlash');
function render(){const r=cur()||{};
 panel.innerHTML='<div class="ltHead" data-drag><b>🛠 Düzenleme modu</b><small>Esc ile çık</small><button type="button" class="ltIc" data-a="undo" title="Geri al (Ctrl+Z)" '+(undo.length?'':'disabled')+'>↶</button><button type="button" class="ltIc" data-a="close" title="Kapat">✕</button></div><div class="ltBody">'+
 (sel?'<div class="ltCrumb"><em>'+sel.tagName.toLowerCase()+'</em><span>'+nice(sel).replace(/</g,'&lt;')+'</span><button type="button" class="ltIc" data-a="up" title="Üst elemanı seç">⤴</button></div>'+
 '<div class="ltSec"><h4>Konum</h4><div class="ltPad"><span class="c"></span><button type="button" data-n="y:-1">▲</button><span class="c"></span><button type="button" data-n="x:-1">◀</button><span class="c">'+(r.x||0)+','+(r.y||0)+'</span><button type="button" data-n="x:1">▶</button><span class="c"></span><button type="button" data-n="y:1">▼</button><span class="c"></span></div><div class="ltHint" style="text-align:center">Seçili alanı sürükle · Shift = 10 px</div></div>'+
 '<div class="ltSec"><h4>Boyut ve boşluk</h4><div class="ltGrid"><label class="ltF">Genişlik %<input type="number" data-k="w" min="5" max="100" value="'+(r.w||'')+'"></label><label class="ltF">Yükseklik px<input type="number" data-k="h" min="10" value="'+(r.h||'')+'"></label><label class="ltF">Yazı px<input type="number" data-k="fs" min="8" max="40" value="'+(r.fs||'')+'"></label><label class="ltF">Sıra<input type="number" data-k="order" value="'+(r.order??'')+'"></label><label class="ltF">Üst boşluk<input type="number" data-k="mt" value="'+(r.mt||'')+'"></label><label class="ltF">Alt boşluk<input type="number" data-k="mb" value="'+(r.mb||'')+'"></label></div></div>'+
 '<div class="ltRow"><button type="button" class="ltBtn'+(r.hide?' on':'')+'" data-a="hide">'+(r.hide?'👁 Göster':'🚫 Gizle')+'</button><button type="button" class="ltBtn" data-a="reset">↺ Bunu sıfırla</button></div>'+
 '<div class="ltSec"><h4>Not</h4><textarea data-k="note" placeholder="Ne olmasını istiyorsun? (örn. bunu sağ üste al)">'+(r.note||'').replace(/</g,'&lt;')+'</textarea></div>'
 :'<div class="ltEmpty"><i>👆</i>Düzeltmek istediğin yere <b>tıkla</b>.<br>Sonra sürükle, boyutlandır, gizle veya not yaz.</div>')+
 (rules.length?'<div class="ltSec"><h4>Düzenlenenler ('+rules.length+')</h4><div class="ltList">'+rules.map((q,i)=>'<div data-go="'+i+'"><span title="'+q.sel.replace(/"/g,'&quot;')+'">'+(q.hide?'🚫 ':'')+(q.txt||q.sel).replace(/</g,'&lt;')+'</span><button type="button" data-del="'+i+'" title="Sil">✕</button></div>').join('')+'</div></div>':'')+'</div>'+
 '<div class="ltFoot"><span>'+rules.length+' düzenleme</span><button type="button" class="ltBtn" data-a="clear">Hepsini sil</button><button type="button" class="ltBtn pri" data-a="copy">📋 Kopyala ve gönder</button></div>'}
function pick(el){sel=el;render();place()}
function toggle(v){on=v;document.documentElement.classList.toggle('ltOn',on);panel.hidden=!on;btn.classList.toggle('on',on);if(!on){sel=null;hoverBox.style.display='none';selBox.style.display='none'}else{render();place()}}
btn.onclick=()=>toggle(!on);
document.addEventListener('mouseover',e=>{if(!on||drag)return;if(own(e.target)||e.target===document.documentElement||e.target===document.body){hoverBox.style.display='none';return}box(hoverBox,e.target);hoverBox.firstChild.textContent=nice(e.target)},true);
document.addEventListener('click',e=>{if(!on||own(e.target))return;e.preventDefault();e.stopPropagation()},true);
document.addEventListener('mousedown',e=>{if(!on||e.button)return;const h=e.target.closest&&e.target.closest('[data-h]');if(h&&sel){e.preventDefault();e.stopPropagation();push();const r=ruleOf(sel),b=sel.getBoundingClientRect(),pw=(sel.parentElement||document.body).getBoundingClientRect().width;drag={mode:h.dataset.h,sx:e.clientX,sy:e.clientY,r,bw:b.width,bh:b.height,pw};return}
 if(own(e.target))return;const t=e.target;e.preventDefault();e.stopPropagation();if(t===document.documentElement||t===document.body)return;
 if(sel&&(t===sel||sel.contains(t))){push();const r=ruleOf(sel);drag={mode:'move',sx:e.clientX,sy:e.clientY,x:r.x||0,y:r.y||0,r}}else pick(t)},true);
document.addEventListener('mousemove',e=>{if(!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy,r=drag.r;if(drag.mode==='move'){r.x=Math.round(drag.x+dx);r.y=Math.round(drag.y+dy)}else{if(drag.mode!=='s')r.w=Math.max(5,Math.min(100,Math.round((drag.bw+dx)/drag.pw*100)));if(drag.mode!=='e')r.h=Math.max(10,Math.round(drag.bh+dy))}css();place()},true);
document.addEventListener('mouseup',()=>{if(drag){drag=null;persist();render()}},true);
window.addEventListener('scroll',()=>{if(on)place()},true);window.addEventListener('resize',()=>{if(on)place()});
function nudge(k,v){const r=ruleOf(sel);push();r[k]=(r[k]||0)+v;persist();render()}
function doUndo(){const s=undo.pop();if(s==null)return;rules=JSON.parse(s);persist();render()}
document.addEventListener('keydown',e=>{if(!on)return;if(e.key==='Escape'){toggle(false);return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();doUndo();return}if(!sel||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;const m={ArrowLeft:['x',-1],ArrowRight:['x',1],ArrowUp:['y',-1],ArrowDown:['y',1]}[e.key];if(m){e.preventDefault();nudge(m[0],m[1]*(e.shiftKey?10:1))}});
panel.addEventListener('input',e=>{const k=e.target.dataset.k;if(!k||!sel)return;const r=ruleOf(sel);if(k!=='note')push();if(k==='note')r.note=e.target.value;else r[k]=e.target.value===''?undefined:Number(e.target.value);persist()});
panel.addEventListener('click',async e=>{
 const d=e.target.closest('[data-del]');if(d){e.stopPropagation();push();rules.splice(Number(d.dataset.del),1);persist();render();return}
 const g=e.target.closest('[data-go]');if(g){const q=rules[Number(g.dataset.go)];try{const el=document.querySelector(q.sel);if(el){el.scrollIntoView({block:'center'});pick(el)}else flash('Bu alan şu an ekranda değil.')}catch{}return}
 const n=e.target.closest('[data-n]');if(n&&sel){const [k,v]=n.dataset.n.split(':');nudge(k,Number(v)*(e.shiftKey?10:1));return}
 const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;
 if(a==='close')toggle(false);else if(a==='undo')doUndo();
 else if(a==='hide'&&sel){push();const r=ruleOf(sel);r.hide=!r.hide;persist();render()}
 else if(a==='up'&&sel?.parentElement&&sel.parentElement!==document.body)pick(sel.parentElement);
 else if(a==='reset'&&sel){push();const s=path(sel);rules=rules.filter(x=>x.sel!==s);persist();render()}
 else if(a==='clear'){if(confirm('Tüm düzenlemeler silinsin mi?')){push();rules=[];persist();render()}}
 else if(a==='copy'){const txt=exportText();try{await navigator.clipboard.writeText(txt);flash('Kopyalandı — şimdi Claude’a yapıştır.')}catch{const t=document.createElement('textarea');t.value=txt;panel.querySelector('.ltBody').append(t);t.select();flash('Metni seçip kopyala.')}}});
/* paneli başlığından sürükle */
{let pd=null;panel.addEventListener('mousedown',e=>{if(!e.target.closest('[data-drag]')||e.target.closest('button'))return;const r=panel.getBoundingClientRect();pd={dx:e.clientX-r.left,dy:e.clientY-r.top};e.preventDefault()});document.addEventListener('mousemove',e=>{if(!pd)return;panel.style.left=Math.max(0,e.clientX-pd.dx)+'px';panel.style.top=Math.max(0,e.clientY-pd.dy)+'px';panel.style.right='auto';panel.style.bottom='auto'});document.addEventListener('mouseup',()=>{pd=null})}
function exportText(){const live=rules.filter(r=>decl(r)||r.note);return 'SAYFA DÜZENLEME İSTEKLERİ ('+live.length+')\n\n'+live.map((r,i)=>(i+1)+') '+(r.ctx?'['+r.ctx+'] ':'')+'"'+r.txt+'"\n   seçici: '+r.sel+'\n   ayar: '+(decl(r).replace(/!important/g,'')||'—')+(r.note?'\n   not: '+r.note:'')).join('\n\n')}
function flash(m){let f=$('#ltFlash');if(!f){f=document.createElement('div');f.id='ltFlash';document.body.append(f)}f.textContent=m;f.hidden=false;clearTimeout(f.t);f.t=setTimeout(()=>f.hidden=true,2600)}
