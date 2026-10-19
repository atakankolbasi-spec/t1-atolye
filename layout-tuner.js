/* Elle düzenleme modu: elemana tıkla, gizle / taşı / boyutlandır; ayarları kopyalayıp gönder. */
const KEY='t1-tune-v1',$=(s,r=document)=>r.querySelector(s);
let rules=[];try{rules=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{}
let on=false,sel=null,drag=null;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(rules))}catch{}css()};
const style=document.createElement('style');style.id='ltCss';document.head.append(style);
function decl(r){const o=[];if(r.hide)o.push('display:none!important');if(r.w)o.push('width:'+r.w+'%!important;max-width:none!important;flex:0 0 '+r.w+'%!important');if(r.fs)o.push('font-size:'+r.fs+'px!important');if(r.order!=null&&r.order!=='')o.push('order:'+r.order+'!important');if(r.mt)o.push('margin-top:'+r.mt+'px!important');if(r.mb)o.push('margin-bottom:'+r.mb+'px!important');if(r.x||r.y)o.push('translate:'+(r.x||0)+'px '+(r.y||0)+'px!important');return o.join(';')}
function css(){style.textContent=rules.map(r=>{const d=decl(r);return d?r.sel+'{'+d+'}':''}).join('\n')}
css();
function path(el){if(el.id&&document.querySelectorAll('#'+CSS.escape(el.id)).length===1)return '#'+CSS.escape(el.id);const parts=[];let n=el;while(n&&n!==document.body&&parts.length<5){let p=n.tagName.toLowerCase();if(n.id&&document.querySelectorAll('#'+CSS.escape(n.id)).length===1){parts.unshift('#'+CSS.escape(n.id));break}const cl=[...n.classList].filter(c=>!/^(lt|current|complete|active|on|open|is)/.test(c)).slice(0,2);if(cl.length)p+='.'+cl.map(CSS.escape).join('.');const sib=n.parentElement&&[...n.parentElement.children].filter(x=>x.tagName===n.tagName);if(sib&&sib.length>1)p+=':nth-of-type('+(sib.indexOf(n)+1)+')';parts.unshift(p);n=n.parentElement}return parts.join(' > ')}
const label=el=>(el.innerText||el.getAttribute('aria-label')||el.title||el.placeholder||'').trim().replace(/\s+/g,' ').slice(0,40);
const ruleOf=el=>{const s=path(el);let r=rules.find(x=>x.sel===s);if(!r){r={sel:s,txt:label(el),note:'',ctx:ctx()};rules.push(r)}return r};
function ctx(){const v=[...document.querySelectorAll('main > section,.view')].find(x=>!x.hidden&&x.offsetParent);const st=$('#stepNumber')?.textContent;return (v?.id||'')+(st&&$('#declarationForm')?.offsetParent?' adım '+st:'')}
const btn=document.createElement('button');btn.id='ltBtn';btn.type='button';btn.innerHTML='🛠 <span>Düzenle</span>';btn.title='Sayfayı elle düzenle';document.body.append(btn);
const panel=document.createElement('div');panel.id='ltPanel';panel.hidden=true;document.body.append(panel);
function ui(){const r=sel?rules.find(x=>x.sel===path(sel))||{}:{};
 panel.innerHTML='<div class="ltHead"><b>🛠 Düzenleme modu</b><button type="button" data-a="close">Kapat</button></div>'+
 (sel?'<div class="ltInfo"><code>'+path(sel).replace(/</g,'&lt;')+'</code><small>'+(label(sel)||'(yazısız alan)').replace(/</g,'&lt;')+'</small></div>'+
 '<div class="ltGrid"><label>Genişlik %<input type="number" data-k="w" min="5" max="100" value="'+(r.w||'')+'"></label><label>Yazı px<input type="number" data-k="fs" min="8" max="40" value="'+(r.fs||'')+'"></label><label>Üst boşluk<input type="number" data-k="mt" value="'+(r.mt||'')+'"></label><label>Alt boşluk<input type="number" data-k="mb" value="'+(r.mb||'')+'"></label><label>Sıra<input type="number" data-k="order" value="'+(r.order??'')+'"></label><label>Sağa/sola px<input type="number" data-k="x" value="'+(r.x||'')+'"></label><label>Aşağı/yukarı px<input type="number" data-k="y" value="'+(r.y||'')+'"></label></div>'+
 '<div class="ltRow"><button type="button" data-a="hide">'+(r.hide?'👁 Göster':'🚫 Gizle')+'</button><button type="button" data-a="up">⬆ Üst elemana</button><button type="button" data-a="reset">↺ Bunu sıfırla</button></div>'+
 '<textarea data-k="note" placeholder="Not: ne olmasını istiyorsun? (örn. bunu sağ üste al)">'+(r.note||'').replace(/</g,'&lt;')+'</textarea><small class="ltHint">Seçili alanı fareyle sürükleyerek de taşıyabilirsin. Ok tuşları 1 px oynatır.</small>'
 :'<p class="ltHelp">Sayfada düzeltmek istediğin yere <b>tıkla</b>. Sonra gizle, taşı, boyutlandır veya not yaz.</p>')+
 (rules.length?'<div class="ltList">'+rules.map((q,i)=>'<div><span title="'+q.sel.replace(/"/g,'&quot;')+'">'+(q.hide?'🚫 ':'')+(q.txt||q.sel).replace(/</g,'&lt;')+'</span><button type="button" data-del="'+i+'">✕</button></div>').join('')+'</div>':'')+'<div class="ltFoot"><span>'+rules.length+' düzenleme</span><button type="button" data-a="copy" class="ltPri">📋 Kopyala ve gönder</button><button type="button" data-a="clear">Hepsini sil</button></div>'}
function hl(el){document.querySelectorAll('.ltHover').forEach(x=>x.classList.remove('ltHover'));if(el)el.classList.add('ltHover')}
const own=e=>e.closest&&e.closest('#ltPanel,#ltBtn');
function toggle(v){on=v;document.documentElement.classList.toggle('ltOn',on);panel.hidden=!on;btn.classList.toggle('on',on);if(!on){sel?.classList.remove('ltSel');sel=null;hl(null)}else ui()}
btn.onclick=()=>toggle(!on);
document.addEventListener('mouseover',e=>{if(!on||own(e.target)||drag)return;hl(e.target)},true);
document.addEventListener('click',e=>{if(!on||own(e.target))return;e.preventDefault();e.stopPropagation()},true);
document.addEventListener('mousedown',e=>{if(!on||own(e.target)||e.button)return;e.preventDefault();e.stopPropagation();const t=e.target;if(t===document.documentElement||t===document.body)return;if(sel&&(t===sel||sel.contains(t))){const r=ruleOf(sel);drag={sx:e.clientX,sy:e.clientY,x:r.x||0,y:r.y||0,r}}else{sel?.classList.remove('ltSel');sel=t;t.classList.add('ltSel');ui()}},true);
document.addEventListener('mousemove',e=>{if(!drag)return;drag.r.x=Math.round(drag.x+e.clientX-drag.sx);drag.r.y=Math.round(drag.y+e.clientY-drag.sy);css()},true);
document.addEventListener('mouseup',()=>{if(drag){drag=null;save();ui()}},true);
document.addEventListener('keydown',e=>{if(!on)return;if(e.key==='Escape'){toggle(false);return}if(!sel||/INPUT|TEXTAREA/.test(document.activeElement?.tagName||''))return;const m={ArrowLeft:['x',-1],ArrowRight:['x',1],ArrowUp:['y',-1],ArrowDown:['y',1]}[e.key];if(m){e.preventDefault();const r=ruleOf(sel);r[m[0]]=(r[m[0]]||0)+m[1]*(e.shiftKey?10:1);save();ui()}});
panel.addEventListener('input',e=>{const k=e.target.dataset.k;if(!k||!sel)return;const r=ruleOf(sel);if(k==='note')r.note=e.target.value;else r[k]=e.target.value===''?undefined:Number(e.target.value);save()});
panel.addEventListener('click',async e=>{const d=e.target.closest('[data-del]');if(d){rules.splice(Number(d.dataset.del),1);save();ui();return}const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;
 if(a==='close')toggle(false);
 else if(a==='hide'){const r=ruleOf(sel);r.hide=!r.hide;save();ui()}
 else if(a==='up'&&sel?.parentElement&&sel.parentElement!==document.body){sel.classList.remove('ltSel');sel=sel.parentElement;sel.classList.add('ltSel');hl(sel);ui()}
 else if(a==='reset'&&sel){const s=path(sel);rules=rules.filter(x=>x.sel!==s);save();ui()}
 else if(a==='clear'){if(confirm('Tüm düzenlemeler silinsin mi?')){rules=[];save();ui()}}
 else if(a==='copy'){const txt=exportText();try{await navigator.clipboard.writeText(txt);flash('Kopyalandı — Claude’a yapıştır.')}catch{const t=document.createElement('textarea');t.value=txt;t.className='ltExport';panel.append(t);t.select();flash('Metni seçip kopyala.')}}});
function exportText(){const live=rules.filter(r=>decl(r)||r.note);return 'SAYFA DÜZENLEME İSTEKLERİ ('+live.length+')\n\n'+live.map((r,i)=>(i+1)+') '+(r.ctx?'['+r.ctx+'] ':'')+'"'+r.txt+'"\n   seçici: '+r.sel+'\n   ayar: '+(decl(r).replace(/!important/g,'')||'—')+(r.note?'\n   not: '+r.note:'')).join('\n\n')}
function flash(m){let f=$('#ltFlash');if(!f){f=document.createElement('div');f.id='ltFlash';document.body.append(f)}f.textContent=m;f.hidden=false;clearTimeout(f.t);f.t=setTimeout(()=>f.hidden=true,2600)}
