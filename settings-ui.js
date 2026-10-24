import * as S from './settings.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SECTIONS=[
 {id:'look',icon:'🎨',title:'Görünüm',desc:'Renk, tema ve genel çalışma hissi',items:[
  {k:'theme',t:'seg',l:'Tema',h:'Aydınlık, karanlık ya da cihaz ayarını izle',o:[['light','Aydınlık'],['dark','Karanlık'],['auto','Otomatik']]},
  {k:'accent',t:'accent',l:'Vurgu rengi',h:'Düğmeler, menü ve ana sayfa bandının rengi'},
  {k:'density',t:'seg',l:'Yoğunluk',h:'Ekranda ne kadar bilgi sığsın',o:[['compact','Sıkı'],['normal','Normal'],['roomy','Ferah']]},
  {k:'fontScale',t:'seg',l:'Yazı boyutu',h:'Tüm sayfayı büyütür veya küçültür',o:[[90,'%90'],[100,'%100'],[110,'%110'],[120,'%120']]},
  {k:'radius',t:'seg',l:'Köşe yuvarlaklığı',h:'Kartların köşe biçimi',o:[['sharp','Keskin'],['soft','Yumuşak'],['round','Yuvarlak']]},
  {k:'bold',t:'sw',l:'Kalın yazı',h:'Kapatırsan metinler normal kalınlıkta görünür'},
  {k:'motion',t:'sw',l:'Animasyonlar',h:'Geçişler, hareketli bant ve efektler'},
  {k:'loginScreen',t:'sw',l:'Giriş ekranı',h:'Siteyi açarken karşılama / PIN ekranı (oturum başına bir kez)'},
  {k:'splash',t:'sw',l:'Açılış ekranı',h:'Giriş ekranı kapalıyken kısa logo animasyonu'}]},
 {id:'layout',icon:'🧭',title:'Yerleşim',desc:'Menü ve ana sayfa düzeni',items:[
  {k:'navDefault',t:'seg',l:'Sol menü',h:'Menü başlangıçta dar mı geniş mi olsun',o:[['narrow','Dar (ikon)'],['wide','Geniş']]},
  {k:'heroOn',t:'sw',l:'Karşılama bandı',h:'Ana sayfanın üstündeki büyük renkli bölüm'},
  {k:'dashOn',t:'sw',l:'Panel (grafikler)',h:'Ana sayfadaki dört grafik kartı'},
  {k:'todayOn',t:'sw',l:'Bugün şeridi',h:'Süre, hat ve yedek uyarıları'},
  {k:'defaultView',t:'seg',l:'Liste görünümü',h:'Beyanname listesi tablo mu kart mı açılsın',o:[['table','Tablo'],['cards','Kart']]},
  {k:'pageSize',t:'seg',l:'Sayfa başına kayıt',h:'Listede bir sayfada kaç beyanname görünsün',o:[[10,'10'],[20,'20'],[50,'50'],[100,'100']]},
  {k:'greetName',t:'text',l:'Selamlama adı',h:'Ana sayfada “İyi günler, …” yazısında görünür',ph:'Örn. Atakan'}]},
 {id:'decl',icon:'📄',title:'Beyanname',desc:'Yeni beyannamede kendiliğinden gelen değerler',items:[
  {k:'refPrefix',t:'text',l:'Referans öneki',h:'Yeni kayıtlar bu önekle numaralanır (örn. PCS202600001)',ph:'PCS',max:6,upper:true},
  {k:'defType',t:'seg',l:'Beyanname tipi',h:'Yeni beyannamede ilk seçili tip',o:[['T1','T1'],['T2','T2'],['TR','TR']]},
  {k:'defDispatch',t:'text',l:'Çıkış ülkesi',h:'İki harfli ülke kodu',ph:'TR',max:2,upper:true},
  {k:'defTransport',t:'sel',l:'Taşıma modu',h:'Yeni beyannamede ilk seçili mod',o:['Karayolu','Ro-Ro','Tren','Havayolu','Kurye','Deniz']},
  {k:'defCurrency',t:'sel',l:'Teminat dövizi',h:'Yeni beyannamede ilk seçili döviz',o:['EUR','USD','TRY','GBP']},
  {k:'defGuarantor',t:'text',l:'Varsayılan garantör',h:'Teminat adımında boşsa kendiliğinden yazılır',ph:'Firma ünvanı'},
  {k:'facilityCode',t:'text',l:'Tesis kodu (AEO)',h:'İzinli gönderici seçilince kendiliğinden yazılır',ph:'Z34089',max:12,upper:true},
  {k:'aeoAutoHat',t:'sw',l:'AEO’da otomatik hat bildirimi',h:'AEO işaretli beyanname kaydedilince hat kaydı açılır'},
  {k:'dueDays',t:'seg',l:'Süre uyarısı',h:'Transit bitişine kaç gün kala uyarı çıksın',o:[[1,'1 gün'],[2,'2 gün'],[3,'3 gün'],[5,'5 gün'],[7,'7 gün']]},
  {k:'backupDays',t:'seg',l:'Yedek hatırlatma',h:'Son yedekten kaç gün sonra uyarı çıksın',o:[[3,'3 gün'],[7,'7 gün'],[14,'14 gün'],[30,'30 gün']]}]},
 {id:'wa',icon:'💬',title:'WhatsApp',desc:'Hat bildirimi mesajı',items:[
  {k:'waAuto',t:'sw',l:'Hat düşünce mesaj hazırla',h:'Hat kaydına Mavi / Sarı / Kırmızı seçilince WhatsApp mesajı hazırlanır'},
  {k:'waNumbers',t:'text',l:'Varsayılan numara(lar)',h:'Müşterinin kendi numarası yoksa buraya gider. Müşteri numarasını Firmalar sayfasında yaz. Ülke koduyla, virgülle ayır.',ph:'905321234567'},
  {k:'waTemplate',t:'area',l:'Mesaj metni',h:'{ref} beyanname no, {hat} hat rengi, {mrn} MRN, {plaka} çekici / treyler yazılabilir',ph:'{ref} Hat bildirimi yapılmıştır. {hat} Hattan işlem görecektir.'},
  {k:'waProxy',t:'text',l:'Otomatik gönderim servisi (isteğe bağlı)',h:'Boşsa mesaj WhatsApp’ta hazır açılır, sen “Gönder”e basarsın. Servis adresi yazılırsa arka planda kendiliğinden gider.',ph:'https://…workers.dev/'}]},
 {id:'gtb',icon:'🛰',title:'PORTAL-BİLGE bağlantısı',desc:'BİLGE hazırlığı ve yetkili servis bağlantısı',items:[
  {k:'gtbProxy',t:'text',l:'Güvenli aracı servis adresi',h:'BİLGE web servisine bağlanan Worker adresi. Kullanıcı adı, şifre ve e-imza bilgileri bu sayfaya yazılmaz.',ph:'https://…workers.dev'},
  {k:'gtbVergiNo',t:'text',l:'İzinli gönderici vergi no',h:'Hat bildiriminde gönderilir (10 hane)',ph:'1234567890',max:11},
  {k:'gtbEposta',t:'text',l:'Bildirim e-postası (isteğe bağlı)',h:'Hat bildirimi ile birlikte gönderilir',ph:'ad@firma.com'}]},
 {id:'seal',icon:'🔒',title:'Mühür',desc:'Mühür stoğu ve uyarılar',items:[
  {k:'sealLow',t:'num',l:'Düşük stok uyarısı',h:'Stok bu sayının altına inince ana sayfa kartı kırmızı olur',min:0,max:1000},
  {t:'act',l:'Mühür stoğunu yönet',h:'Aralık ekle, kalan mühürleri gör',a:[['seals','STOĞU AÇ']]}]},
 {id:'rates',icon:'💱',title:'Kurlar',desc:'Döviz kurlarının otomatik güncellenmesi',items:[
  {k:'ratesAuto',t:'sw',l:'Otomatik kur güncelleme',h:'Açılışta internetten kurlar alınır'},
  {k:'ratesHours',t:'seg',l:'Güncelleme sıklığı',h:'Kurlar en az bu kadar saatte bir yenilenir',o:[[1,'1 saat'],[6,'6 saat'],[12,'12 saat'],[24,'24 saat']]},
  {t:'act',l:'Kurları şimdi güncelle',h:'Hemen internetten alır',a:[['rates','ŞİMDİ GÜNCELLE']]}]},
 {id:'docs',icon:'🖨',title:'Çıktılar',desc:'T1, CMR ve ENS belgeleri',items:[
  {k:'docHeader',t:'text',l:'ENS belgesi başlığı',h:'ENS / ICS2 çıktısının üstündeki firma yazısı',ph:'PCS TRANSİT GÜMRÜKLEME'},
  {k:'docBarcode',t:'sw',l:'Barkodlar',h:'T1 ve ENS çıktılarında MRN barkodu göster'},
  {k:'cmrAgreement',t:'area',l:'CMR özel anlaşma metni',h:'CMR’ın 19. kutusuna yazılır',ph:'Bekleme ücreti notu…'}]},
 {id:'ident',icon:'🏷',title:'Kimlik',desc:'Uygulamanın adı ve kullanıcı bilgisi',items:[
  {k:'appName',t:'text',l:'Uygulama adı',h:'Sol üstte ve sekme başlığında görünür',ph:'TRANSİT',max:20},
  {k:'appSub',t:'text',l:'Alt başlık',h:'Uygulama adının altındaki küçük yazı',ph:'BEYAN ÇALIŞMA ALANI',max:30},
  {k:'userName',t:'text',l:'Kullanıcı / firma adı',h:'Sol alttaki kart ve avatar',ph:'PCS TRANSİT',max:30},
  {k:'userRole',t:'text',l:'Unvan',h:'Kullanıcı adının altındaki yazı',ph:'Yazım & Kontrol',max:30}]},
 {id:'data',icon:'💾',title:'Veri ve yedek',desc:'Kayıtların güvenliği',items:[
  {t:'storage',l:'Depolama kullanımı',h:'Tarayıcının bu site için ayırdığı alan'},
  {t:'act',l:'Yedekle ve geri yükle',h:'Tüm kayıtları tek dosyada indir veya yükle',a:[['backup','YEDEK İNDİR'],['restore','YEDEKTEN YÜKLE']]},
  {t:'act',l:'Ayarları aktar',h:'Sadece bu sayfadaki tercihleri dosyaya al veya yükle',a:[['setExport','AYARLARI İNDİR'],['setImport','AYARLARI YÜKLE']]},
  {t:'act',l:'Ayarları sıfırla',h:'Tüm tercihleri fabrika değerlerine döndürür (kayıtlara dokunmaz)',a:[['resetAll','SIFIRLA']],danger:true},
  {t:'act',l:'Tüm verileri sil',h:'Beyannameler, firmalar, mühürler dahil her şey silinir. Önce yedek al!',a:[['wipe','HER ŞEYİ SİL']],danger:true}]},
 {id:'keys',icon:'⌨',title:'Kısayollar',desc:'Klavye ile hızlı çalış',items:[{t:'keys'}]},
 {id:'about',icon:'ℹ',title:'Hakkında',desc:'Sürüm ve bilgiler',items:[{t:'about'}]}
];
export function installSettings({anchor,toast,confirmAction,actions={}}){
 const btn=document.createElement('button');btn.className='nav';btn.id='navSettings';btn.innerHTML='<span>⚙</span>Ayarlar';anchor.before(btn);
 const view=document.createElement('section');view.id='settingsView';view.className='view';view.hidden=true;(document.querySelector('main>footer')||document.querySelector('main')).before(view);
 let cur='look',q='';
 const val=k=>S.get(k);
 const ctl=it=>{const v=val(it.k);switch(it.t){
  case 'sw':return '<label class="swt"><input type="checkbox" data-k="'+it.k+'"'+(v?' checked':'')+'><i></i></label>';
  case 'seg':return '<div class="segc" data-seg="'+it.k+'">'+it.o.map(([a,b])=>'<button type="button" data-v="'+esc(a)+'" class="'+(String(v)===String(a)?'on':'')+'">'+esc(b)+'</button>').join('')+'</div>';
  case 'sel':return '<select data-k="'+it.k+'">'+it.o.map(x=>'<option'+(x===v?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
  case 'text':return '<input data-k="'+it.k+'" value="'+esc(v)+'" placeholder="'+esc(it.ph||'')+'"'+(it.max?' maxlength="'+it.max+'"':'')+(it.upper?' data-up="1"':'')+'>';
  case 'num':return '<input type="number" data-k="'+it.k+'" value="'+esc(v)+'" min="'+(it.min??0)+'" max="'+(it.max??9999)+'" class="numI">';
  case 'area':return '<textarea data-k="'+it.k+'" rows="3" placeholder="'+esc(it.ph||'')+'">'+esc(v)+'</textarea>';
  case 'accent':return '<div class="accs">'+S.ACCENTS.map(([k,n,c])=>'<button type="button" data-acc="'+k+'" class="'+(v===k?'on':'')+'" style="--c:'+c+'" title="'+n+'"><i></i><span>'+n+'</span></button>').join('')+'</div>';
  case 'act':return '<div class="acts">'+it.a.map(([a,l])=>'<button type="button" data-act="'+a+'" class="'+(it.danger?'danger':'')+'">'+esc(l)+'</button>').join('')+'</div>';
  case 'storage':{let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);n+=(k.length+(localStorage.getItem(k)||'').length)*2}}catch{}const mb=n/1048576,pct=Math.min(100,mb/5*100);return '<div class="stor"><div class="storBar"><i style="width:'+pct.toFixed(1)+'%"></i></div><small>'+mb.toFixed(2)+' MB / yaklaşık 5 MB</small></div>'}
  case 'keys':return '';case 'about':return ''}return ''};
 const row=it=>{if(it.t==='keys')return '<ul class="kbdL big"><li><kbd>CTRL</kbd><kbd>K</kbd><span>Hızlı ara</span></li><li><kbd>ALT</kbd><kbd>N</kbd><span>Yeni T1 yaz</span></li><li><kbd>ALT</kbd><kbd>L</kbd><span>Beyanname listesi</span></li><li><kbd>ALT</kbd><kbd>H</kbd><span>Hat bildirimleri</span></li><li><kbd>ALT</kbd><kbd>E</kbd><span>ENS beyannameleri</span></li><li><kbd>?</kbd><span>Kısayol penceresi</span></li><li><kbd>ESC</kbd><span>Pencereyi kapat</span></li></ul>';
  if(it.t==='about')return '<div class="aboutBox"><div class="abLogo">PCS</div><div><b>'+esc(S.get('appName'))+'</b><p>Tarayıcıda çalışan T1 / ENS / hat hazırlık çalışma alanı. Veriler yalnızca bu tarayıcıda saklanır; düzenli yedek almayı unutma.</p><small>Resmî gönderim yapmaz; hazırlık ve kontrol aracıdır.</small></div></div>';
  return '<div class="srow'+(it.danger?' dng':'')+'"><div class="sl"><b>'+esc(it.l)+'</b><small>'+esc(it.h||'')+'</small></div><div class="sc">'+ctl(it)+'</div></div>'};
 function draw(){const needle=q.trim().toLocaleLowerCase('tr');
  const nav=SECTIONS.map(s=>'<button type="button" class="sTab'+(s.id===cur&&!needle?' on':'')+'" data-tab="'+s.id+'"><span>'+s.icon+'</span><div><b>'+esc(s.title)+'</b><small>'+esc(s.desc)+'</small></div></button>').join('');
  let body;if(needle){const hits=SECTIONS.flatMap(s=>s.items.filter(i=>i.l&&(i.l+' '+(i.h||'')+' '+s.title).toLocaleLowerCase('tr').includes(needle)).map(i=>({s,i})));body='<div class="sCard"><h2>Arama sonuçları <small>'+hits.length+'</small></h2>'+(hits.length?hits.map(x=>'<div class="hitTag">'+esc(x.s.title)+'</div>'+row(x.i)).join(''):'<p class="dcEmpty">Eşleşen ayar yok.</p>')+'</div>'}
  else{const s=SECTIONS.find(x=>x.id===cur);body='<div class="sCard"><div class="sHead"><span>'+s.icon+'</span><div><h2>'+esc(s.title)+'</h2><p>'+esc(s.desc)+'</p></div>'+(s.items.some(i=>i.k)?'<button type="button" class="quiet" data-reset="'+s.id+'">BU BÖLÜMÜ SIFIRLA</button>':'')+'</div>'+s.items.map(row).join('')+'</div>'}
  view.innerHTML='<div class="pagehead"><div><div class="eyebrow">TERCİHLER</div><h1>Ayarlar</h1></div><label class="search sSearch"><span>⌕</span><input id="sQ" placeholder="Ayar ara…" value="'+esc(q)+'"></label></div><div class="sLayout"><nav class="sNav">'+nav+'</nav><div class="sBody">'+body+'</div></div>'}
 const keep=()=>{const y=window.scrollY;draw();window.scrollTo(0,y)};
 view.addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t){cur=t.dataset.tab;q='';draw();return}
  const sg=e.target.closest('[data-seg] button');if(sg){const k=sg.parentElement.dataset.seg;let v=sg.dataset.v;if(/^\d+$/.test(v))v=Number(v);S.set(k,v);keep();return}
  const ac=e.target.closest('[data-acc]');if(ac){S.set('accent',ac.dataset.acc);keep();return}
  const rs=e.target.closest('[data-reset]');if(rs){const s=SECTIONS.find(x=>x.id===rs.dataset.reset);S.reset(s.items.filter(i=>i.k).map(i=>i.k));draw();toast('“'+s.title+'” ayarları sıfırlandı.');return}
  const a=e.target.closest('[data-act]');if(a){const fn=actions[a.dataset.act];if(fn)fn(draw)}});
 view.addEventListener('change',e=>{const el=e.target.closest('[data-k]');if(!el)return;const k=el.dataset.k;let v=el.type==='checkbox'?el.checked:el.value;if(el.type==='number'){v=Number(v);if(!Number.isFinite(v))return}if(el.dataset.up)v=String(v).toLocaleUpperCase('tr').trim();else if(typeof v==='string')v=v.trim();if(k==='refPrefix'&&!/^[A-Z0-9]{1,6}$/.test(v)){toast('Referans öneki 1–6 harf/rakam olmalı.');draw();return}S.set(k,v);toast('Ayar kaydedildi.')});
 view.addEventListener('input',e=>{if(e.target.id==='sQ'){q=e.target.value;const p=e.target.selectionStart;draw();const n=view.querySelector('#sQ');n.focus();n.setSelectionRange(p,p)}});
 return {nav:btn,view,show:()=>{draw()},refresh:draw}}
