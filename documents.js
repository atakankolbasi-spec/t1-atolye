// Yazdırılabilir belge şablonları: T1 taslak (SAD/transit kutu düzeni), CMR (24 kutu), ENS / ICS2 özeti.
// Bunlar resmî tescil belgesi değildir; resmî sistemdeki kayıt için hazırlık ve kontrol çıktısıdır.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nl=v=>esc(v).replace(/\n/g,'<br>');
const v=x=>x===undefined||x===null||x===''?'':x;
const fmt=x=>{const n=Number(String(x??'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)&&String(x).trim()!==''?n.toLocaleString('tr-TR',{maximumFractionDigits:3}):esc(x)};
const sum=(a,k)=>a.reduce((t,g)=>t+(Number(String(g[k]??'').replace(',','.'))||0),0);
const today=()=>new Date().toLocaleDateString('tr-TR');
const CSS=`@page{size:A4;margin:8mm}*{box-sizing:border-box}body{font:10px Arial,sans-serif;color:#111;margin:0}h1{font-size:15px;margin:0 0 6px}
.sheet{width:100%;border:1.5px solid #c1272d;color:#c1272d}.sheet.bk{border-color:#111;color:#111}
.row{display:flex}.box{border:1px solid currentColor;padding:2px 4px;min-height:34px;position:relative;flex:1;overflow:hidden}
.box>i{font-style:normal;font-size:7.5px;display:block;font-weight:700;text-transform:uppercase}.box>div{color:#111;font-size:10.5px;font-weight:600;line-height:1.3;margin-top:1px}
.w2{flex:2}.w3{flex:3}.n{flex:0 0 38px;text-align:center}.tall{min-height:70px}.xt{min-height:120px}
table.g{width:100%;border-collapse:collapse;color:#111}table.g th,table.g td{border:1px solid #888;padding:3px 5px;font-size:9.5px;text-align:left;vertical-align:top}table.g th{background:#eee}
.note{font-size:8px;color:#555;margin-top:6px}.wm{color:#c1272d;font-weight:700;font-size:11px;float:right}`;
const box=(no,label,html,cls='')=>`<div class="box ${cls}"><i>${no?no+' · ':''}${esc(label)}</i><div>${html||'&nbsp;'}</div></div>`;
const party=(name,addr,eori)=>[v(name)&&'<b>'+esc(name)+'</b>',addr&&nl(addr),eori&&'EORI/VKN: '+esc(eori)].filter(Boolean).join('<br>');

export function t1Draft(d,goods,ref){
 const totalP=sum(goods,'packages'),gr=sum(goods,'gross');
 const one=(arr,k)=>[...new Set(arr.map(g=>g[k]).filter(Boolean))];
 const senders=one(goods,'sender'),recvs=one(goods,'receiver');
 const consignor=d.sender||(senders.length===1?senders[0]:senders.length?'ÇOK GÖNDERİCİ — BKZ. EK LİSTE':'');
 const consignee=d.receiver||(recvs.length===1?recvs[0]:recvs.length?'ÇOK ALICI — BKZ. EK LİSTE':'');
 const mrns=goods.map(g=>g.mrn).filter(Boolean);
 return `<h1>${esc(d.docType||'T1')} TRANSİT BEYANNAMESİ — TASLAK <span class="wm">${esc(ref||'')} · ${today()}</span></h1>
<div class="sheet">
<div class="row">${box('1','Beyanname / Tip',esc(d.docType||'T1'),'w2')}${box('2','Gönderici / İhracatçı',party(consignor,d.senderAddress,d.senderEori),'w3 tall')}${box('3','Formlar',esc('1 / 1'),'n')}${box('','LRN / MRN',esc([d.lrn,d.mrn].filter(Boolean).join(' / ')),'w2')}</div>
<div class="row">${box('4','Yükleme listeleri',esc(String(goods.length)),'n')}${box('5','Kalem sayısı',esc(String(goods.length)),'n')}${box('6','Toplam kap sayısı',fmt(totalP),'n')}${box('7','Referans no',esc(d.remoteRef||ref),'w2')}</div>
<div class="row">${box('8','Alıcı',party(consignee,d.receiverAddress,d.receiverEori),'w3 tall')}${box('9','Mali sorumlu / Müşteri',esc(d.customer),'w2')}</div>
<div class="row">${box('14','Beyan sahibi / Asıl sorumlu',esc(d.principal||d.customer||d.carrier),'w2')}${box('15','Çıkış ülkesi',esc(d.dispatchCountry),'')}${box('17','Varış ülkesi',esc(d.destinationCountry),'')}${box('','Yükleme / Boşaltma yeri',esc([d.loadPlace,d.unloadPlace].filter(Boolean).join(' → ')),'')}</div>
<div class="row">${box('18','Taşıt kimliği ve ülkesi (çıkışta)',esc([d.vehicle,d.vehicleCountry].filter(Boolean).join(' ')+(d.trailer?' / '+d.trailer+' '+(d.trailerCountry||''):'')),'w2')}${box('21','Sınırı geçen aktif taşıt',esc([d.borderVehicle,d.borderVehicleCountry].filter(Boolean).join(' ')||'—'),'w2')}${box('25','Taşıma modu',esc(d.transportMode),'')}</div>
<div class="row">${box('29','Çıkış gümrüğü',esc(d.departureOffice),'w2')}${box('30','Eşyanın bulunduğu yer',esc([d.goodsLocation,d.locationAddress].filter(Boolean).join(' · ')),'w2')}</div>
<div class="row">${box('31','Kaplar ve eşyanın tanımı',goods.slice(0,6).map((g,i)=>`${i+1}. ${esc(g.description)} — ${fmt(g.packages)} KAP`).join('<br>')+(goods.length>6?'<br>… (EK LİSTEYE BKZ.)':''),'w3 xt')}${box('32/33','Kalem no / GTİP',goods.slice(0,6).map((g,i)=>`${i+1}. ${esc(g.gtip)}`).join('<br>'),'')}${box('35','Brüt kütle (kg)',fmt(gr),'')}${box('38','Net kütle (kg)',fmt(sum(goods,'net')),'')}</div>
<div class="row">${box('40','Önceki belge / Ekli belgeler',mrns.slice(0,8).map(esc).join('<br>')+(mrns.length>8?'<br>…':''),'w3 tall')}${box('44','Ek bilgi / Belgeler',goods.map(g=>[g.invoice,g.invoiceDate].filter(Boolean).join(' / ')).filter(Boolean).slice(0,5).map(esc).join('<br>'),'w2 tall')}</div>
<div class="row">${box('50','Asıl sorumlu',esc(d.principal||d.customer||d.carrier),'w2')}${box('51','Öngörülen geçiş gümrükleri',esc([...(d.transitOffices||[])].join(', ')),'w2')}${box('53','Varış gümrüğü',esc(d.arrivalOffice),'w2')}</div>
<div class="row">${box('','Teminat',esc(d.aeo?'İZİNLİ GÖNDERİCİ (AEO)':[d.guaranteeType,d.guaranteeRef,d.guaranteeAmount&&fmt(d.guaranteeAmount)+' '+(d.guaranteeCurrency||'')].filter(Boolean).join(' · ')),'w2')}${box('D','Mühür',esc(d.noSeal?'MÜHÜR YOK':d.seal),'')}${box('','Bitiş tarihi',esc(d.transitEnd),'')}${box('','Taşıyıcı',esc([d.carrier,d.carrierEori].filter(Boolean).join(' · ')),'w2')}</div>
</div>
${goods.length>0?`<h1 style="margin-top:12px">Ek liste — eşya kalemleri</h1><table class="g"><tr><th>#</th><th>İhracat MRN</th><th>GTİP</th><th>Tanım</th><th>Gönderici → Alıcı</th><th>Kap</th><th>Brüt</th><th>Net</th><th>Fatura</th><th>Tutar</th></tr>${goods.map((g,i)=>`<tr><td>${i+1}</td><td>${esc(g.mrn)}</td><td>${esc(g.gtip)}</td><td>${esc(g.description)}</td><td>${esc(g.sender)} → ${esc(g.receiver)}</td><td>${fmt(g.packages)}</td><td>${fmt(g.gross)}</td><td>${fmt(g.net)}</td><td>${esc(g.invoice)} ${esc(g.invoiceDate)}</td><td>${fmt(g.amount)} ${esc(g.currency)}</td></tr>`).join('')}<tr><th colspan="5">TOPLAM</th><th>${fmt(totalP)}</th><th>${fmt(gr)}</th><th>${fmt(sum(goods,'net'))}</th><th colspan="2"></th></tr></table>`:''}
<p class="note">Bu çıktı hazırlık taslağıdır; resmî tescil, LRN/MRN veya transit refakat belgesi yerine geçmez. Kutu numaraları SAD / NCTS transit beyannamesi düzenine göredir.</p>`;
}

export function cmr(d,goods,ref){
 const totalP=sum(goods,'packages');
 const desc=goods.map((g,i)=>`${i+1}. ${esc(g.description)}`).join('<br>');
 const consignor=d.sender||goods[0]?.sender||'',consignee=d.receiver||goods[0]?.receiver||'';
 return `<h1>CMR — ULUSLARARASI KARAYOLU TAŞIMA SENEDİ / INTERNATIONAL CONSIGNMENT NOTE <span class="wm">${esc(ref||'')}</span></h1>
<div class="sheet bk">
<div class="row">${box('1','Gönderici / Sender (name, address, country)',party(consignor,d.senderAddress,''),'w3 tall')}${box('','CMR No / Referans',esc(d.remoteRef||ref),'w2 tall')}</div>
<div class="row">${box('2','Alıcı / Consignee (name, address, country)',party(consignee,d.receiverAddress,''),'w3 tall')}${box('','Taşıyıcı / Carrier (16)',party(d.carrier,'',d.carrierEori),'w2 tall')}</div>
<div class="row">${box('3','Teslim yeri / Place of delivery',esc([d.unloadPlace,d.destinationCountry].filter(Boolean).join(', ')),'w3')}${box('17','Ardıl taşıyıcılar / Successive carriers','', 'w2')}</div>
<div class="row">${box('4','Yükleme yeri ve tarihi / Place and date of taking over',esc([d.loadPlace,d.dispatchCountry].filter(Boolean).join(', '))+' · '+today(),'w3')}${box('18','Taşıyıcı çekinceleri / Carrier reservations','', 'w2')}</div>
<div class="row">${box('5','Ekli belgeler / Documents attached',esc([d.docType&&(d.docType+' '+(d.mrn||d.lrn||'')),...goods.map(g=>g.invoice&&('Fat. '+g.invoice))].filter(Boolean).slice(0,6).join(' · ')),'w3')}${box('','Araç / Vehicle',esc([d.vehicle,d.vehicleCountry].filter(Boolean).join(' ')+(d.trailer?' / '+d.trailer+' '+(d.trailerCountry||''):'')),'w2')}</div>
<div class="row">${box('6-9','İşaretler ve numaralar / Marks & Nos · Kap sayısı · Ambalaj · Eşya cinsi / Nature of goods',`${fmt(totalP)} KAP — ${desc}`,'w3 xt')}${box('10-11','İstatistik no (GTİP) · Brüt ağırlık kg',goods.map((g,i)=>`${i+1}. ${esc(g.gtip)} · ${fmt(g.gross)} kg`).join('<br>'),'xt')}${box('12','Hacim m³','','')}</div>
<div class="row">${box('13','Göndericinin talimatları / Sender’s instructions',esc(d.aeo?'İzinli gönderici (AEO) transit':'')+(d.seal&&!d.noSeal?' · Mühür: '+esc(d.seal):''),'w3 tall')}${box('19','Özel anlaşmalar / Special agreements','', 'w2 tall')}</div>
<div class="row">${box('14','Taşıma ücreti ödemesi / Payment','Franko □   Franko değil □','w3')}${box('20','Ödenecek / To be paid by','','w2')}</div>
<div class="row">${box('21','Düzenlendiği yer / Established in',esc(d.loadPlace||'')+' · '+today(),'w2')}${box('22','Gönderici imzası / Sender','', 'tall')}${box('23','Taşıyıcı imzası / Carrier','', 'tall')}${box('24','Alıcı teslim aldı / Goods received','','tall')}</div>
</div>
<p class="note">Bu çıktı CMR taslağıdır; geçerli bir CMR senedi için gönderici ve taşıyıcı imzalı (en az 3 nüsha) olmalıdır.</p>`;
}

export function ensDoc(e){
 const goods=e.goods||[];
 return `<h1>ENS / ICS2 — GİRİŞ ÖZET BEYANI TASLAĞI <span class="wm">${esc(e.ref||'')} · ${today()}</span></h1>
<div class="sheet bk">
<div class="row">${box('','Beyan türü / Filing type',esc(e.filingType||'ICS-2'),'')}${box('','LRN / MRN',esc([e.lrn,e.mrn].filter(Boolean).join(' / ')),'w2')}${box('','Ticari / Acente ref.',esc([e.commercialRef,e.agentRef].filter(Boolean).join(' · ')),'w2')}</div>
<div class="row">${box('','İlk giriş gümrüğü (Customs office of first entry)',esc(e.entryOffice),'w2')}${box('','Çıkış gümrüğü',esc(e.exitOffice),'w2')}${box('','Varış / Tahmini giriş tarihi',esc(e.arrivalDate),'')}</div>
<div class="row">${box('','Çıkış ülkesi / yeri',esc([e.dispatchCountry,e.departurePlace].filter(Boolean).join(' · ')),'w2')}${box('','Varış ülkesi / yeri',esc([e.destinationCountry,e.destinationPlace].filter(Boolean).join(' · ')),'w2')}${box('','Güzergâh ülkeleri',esc((e.routeCountries||[]).join(' → ')),'w2')}</div>
<div class="row">${box('','Taşıyıcı / Carrier',party(e.carrier,'',[e.carrierEori,e.carrierTax].filter(Boolean).join(' · ')),'w2 tall')}${box('','Taşıt / Transport means',esc([e.transitMethod,e.vehicle,e.vehicleCountry].filter(Boolean).join(' ')+(e.trailer?' / '+e.trailer+' '+(e.trailerCountry||''):'')+(e.container?' · KONT: '+e.container:'')),'w2 tall')}${box('','Mühür / Feribot',esc([e.seal,e.ferryBooking].filter(Boolean).join(' · ')),'')}</div>
<div class="row">${box('','Gönderici / Consignor',party(e.consignor,e.consignorAddress,e.consignorEori),'w2 tall')}${box('','Alıcı / Consignee',party(e.consignee,e.consigneeAddress,e.consigneeEori),'w2 tall')}${box('','Bağlı T1 / Taşıma belgesi',esc([e.ncts,e.consignmentNote].filter(Boolean).join(' · ')),'')}</div>
</div>
<h1 style="margin-top:12px">Eşya kalemleri (House consignment / Goods item)</h1>
<table class="g"><tr><th>#</th><th>HS / GTİP</th><th>Eşya tanımı</th><th>Gönderici → Alıcı</th><th>İhracat MRN</th><th>Kap</th><th>Brüt kg</th><th>Net kg</th><th>Tutar</th></tr>
${goods.map((g,i)=>`<tr><td>${i+1}</td><td>${esc(g.gtip)}</td><td>${esc(g.description)}</td><td>${esc(g.consignor)} → ${esc(g.consignee)}</td><td>${esc(g.exportMrn)}</td><td>${fmt(g.packages)} ${esc(g.packageType)}</td><td>${fmt(g.gross)}</td><td>${fmt(g.net)}</td><td>${fmt(g.amount)} ${esc(g.currency)}</td></tr>`).join('')}
<tr><th colspan="5">TOPLAM</th><th>${fmt(sum(goods,'packages'))}</th><th>${fmt(sum(goods,'gross'))}</th><th>${fmt(sum(goods,'net'))}</th><th></th></tr></table>
<p class="note">ICS2 için eşya tanımı net ve 6 haneli HS kodu ile verilmelidir. Bu çıktı hazırlık taslağıdır; resmî ENS gönderimi yetkili sistemden yapılır.</p>`;
}

export function printHtml(title,body){
 const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);
 const doc=f.contentWindow.document;doc.open();doc.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+CSS+'</style></head><body>'+body+'</body></html>');doc.close();
 setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch{}setTimeout(()=>f.remove(),60000)},250);
}
