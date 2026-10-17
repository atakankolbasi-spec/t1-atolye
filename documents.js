import {get as setting} from './settings.js';
// Yazdırılabilir belgeler: Transit Refakat Belgesi (T1 taslak), CMR, ICS2 ENS beyanı.
// Düzenler, gerçek örnek belgelere (NCTS refakat belgesi, CMR, ICS2 ENS özeti) göre hazırlandı.
// Bunlar hazırlık çıktısıdır; resmî tescil yerine geçmez.
const C128=['11011001100','11001101100','11001100110','10010011000','10010001100','10001001100','10011001000','10011000100','10001100100','11001001000','11001000100','11000100100','10110011100','10011011100','10011001110','10111001100','10011101100','10011100110','11001110010','11001011100','11001001110','11011100100','11001110100','11101101110','11101001100','11100101100','11100100110','11101100100','11100110100','11100110010','11011011000','11011000110','11000110110','10100011000','10001011000','10001000110','10110001000','10001101000','10001100010','11010001000','11000101000','11000100010','10110111000','10110001110','10001101110','10111011000','10111000110','10001110110','11101110110','11010001110','11000101110','11011101000','11011100010','11011101110','11101011000','11101000110','11100010110','11101101000','11101100010','11100011010','11101111010','11001000010','11110001010','10100110000','10100001100','10010110000','10010000110','10000101100','10000100110','10110010000','10110000100','10011010000','10011000010','10000110100','10000110010','11000010010','11001010000','11110111010','11000010100','10001111010','10100111100','10010111100','10010011110','10111100100','10011110100','10011110010','11110100100','11110010100','11110010010','11011011110','11011110110','11110110110','10101111000','10100011110','10001011110','10111101000','10111100010','11110101000','11110100010','10111011110','10111101110','11101011110','11110101110','11010000100','11010010000','11010011100'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nl=v=>esc(v).replace(/\n/g,'<br>');
const num=x=>{const s=String(x??'').trim();if(!s)return NaN;return Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s)};
const fmt=(x,d=3)=>{const n=num(x);return Number.isFinite(n)?n.toLocaleString('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:d}):esc(x)};
const fmt3=x=>{const n=num(x);return Number.isFinite(n)?n.toLocaleString('tr-TR',{minimumFractionDigits:3,maximumFractionDigits:3}):esc(x)};
const sum=(a,k)=>a.reduce((t,g)=>t+(Number.isFinite(num(g[k]))?num(g[k]):0),0);
const stamp=()=>{const n=new Date(),p=v=>String(v).padStart(2,'0');return p(n.getDate())+'-'+p(n.getMonth()+1)+'-'+n.getFullYear()+' '+p(n.getHours())+':'+p(n.getMinutes())+':'+p(n.getSeconds())};
const dmy=()=>new Date().toLocaleDateString('tr-TR').replace(/\./g,'.');
const code=s=>String(s||'').split(/\s*[-–]\s*/)[0].trim();
// Code 128-B barkod (SVG)
export function barcode(text,h=44){
 if(!setting('docBarcode'))return '';
 const t=String(text||'').replace(/[^\x20-\x7e]/g,'');if(!t)return '';
 const vals=[104];let sumv=104;[...t].forEach((ch,i)=>{const v=ch.charCodeAt(0)-32;vals.push(v);sumv+=v*(i+1)});vals.push(sumv%103);
 let bits=vals.map(v=>C128[v]).join('')+'1100011101011';let x=0,out='';
 for(let i=0;i<bits.length;){let j=i;while(bits[j]===bits[i])j++;if(bits[i]==='1')out+='<rect x="'+x+'" y="0" width="'+(j-i)+'" height="'+h+'"/>';x+=j-i;i=j}
 return '<svg class="bc" viewBox="0 0 '+x+' '+h+'" preserveAspectRatio="none" height="'+h+'" fill="#000">'+out+'</svg>';
}
const CSS=`@page{size:A4;margin:6mm}*{box-sizing:border-box}html,body{margin:0}body{font:9.5px Arial,Helvetica,sans-serif;color:#000}
.pg{page-break-after:always;break-inside:avoid}.pg:last-child{page-break-after:auto}.cmr{max-height:276mm;overflow:hidden}.t1 .b>div{font-size:9px}.t1{zoom:.92}
.hd{font-size:13px;margin:0 0 3px}.row{display:flex}.col{display:flex;flex-direction:column}
.b{border:.8px solid #555;padding:2px 4px;position:relative;min-height:22px;overflow:hidden;flex:1}
.b>i{font-style:normal;font-size:7.5px;color:#222;display:block}.b>div{font-size:9.5px;line-height:1.25;margin-top:1px;word-break:break-word}.b.t>div{font-size:9px}
.nb{display:inline-block;margin-left:8px}.b>i .no{position:absolute;top:2px;left:52%;font-size:8px}.cpc{display:flex;justify-content:space-between;padding:0 10px 0 0;margin-top:2px;font-size:9px}.cpc span{flex:1}.cpc span:first-child{flex:2.2}.cpc span:last-child{text-align:right}.sd{writing-mode:horizontal-tb;font-size:6.5px;font-weight:700;text-align:center;border:.8px solid #555;padding:2px;line-height:1.15}.cb{display:inline-block;width:16px;height:10px;border:.8px solid #333;vertical-align:middle;margin:0 4px}.bd{font-weight:700;font-size:11px}
.side{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:700;letter-spacing:5px;font-size:11px;text-align:center;border:.8px solid #555;border-right:0;padding:4px}
.bc{width:100%;display:block}.bcw{text-align:center;font-size:10px}
table.g{width:100%;border-collapse:collapse}table.g th,table.g td{border:.8px solid #777;padding:3px 5px;font-size:9px;text-align:left;vertical-align:top}table.g th{background:#eee}
.note{font-size:8px;color:#555;margin-top:6px}
/* CMR */
.cmr .b>i{font-size:7px;line-height:1.15}.cmr .b>i b{font-size:11px;margin-right:2px}.cmr .b>div{font-size:9.5px}
.red{color:#e1251b;font-weight:700;font-size:12px;line-height:1.15}.redS{color:#222;font-size:7px;font-weight:400}
.cmrLogo{font:700 20px Georgia,serif;color:#8a9bb6;border:2px solid #8a9bb6;border-radius:50%;padding:4px 12px;display:inline-block;margin:4px}
.ttl{text-align:right;font-weight:700;font-size:11px;line-height:1.2}
/* ENS */
.ens{font-family:Helvetica,Arial,sans-serif}.logo{font:800 34px Arial;letter-spacing:-2px;margin:6px 0 24px}.logo span{color:#1a3a9c}.logo b{color:#d3212d}.logo small{display:block;font-size:8px;letter-spacing:1px;color:#555;font-weight:400}
.ens h2{font-size:14px;border-bottom:1px solid #b9d0e8;padding-bottom:6px;margin:0 0 6px}.kv{display:grid;grid-template-columns:110px 1fr;row-gap:9px;font-size:11px;padding:6px 0}.kv dt{color:#7388a8;font-weight:700}.kv dd{margin:0;font-weight:700}
.ensBc{width:290px;margin:34px auto 0;text-align:center;font-size:11px}`;
const B=(label,html,cls='',style='')=>`<div class="b ${cls}"${style?` style="${style}"`:''}><i>${label}</i><div>${html||'&nbsp;'}</div></div>`;
const party=(name,addr,no)=>[name&&esc(name),addr&&nl(addr),no&&('Numara: '+esc(no))].filter(Boolean).join('<br>');
// Firma bilgisi: ad, sokak, şehir, posta kodu, ülke, numara
const infoOf=(g,side,d)=>{const sd=side==='sender';return {name:g[side]||(sd?d.sender:d.receiver)||'',street:g[side+'Address']||(sd?d.senderAddress:d.receiverAddress)||'',city:g[side+'City']||'',postal:g[side+'Postal']||'',country:g[side+'Country']||'',no:g[side+'Eori']||g[side+'Tax']||(sd?d.senderEori:d.receiverEori)||''}};
const sideInfo=(goods,side,d)=>{const names=[...new Set(goods.map(g=>g[side]).filter(Boolean))];
 if(names.length===1)return infoOf(goods.find(x=>x[side]===names[0]),side,d);
 if(names.length>1)return {name:'ÇOK ('+names.length+') — KALEM LİSTESİNE BKZ.',street:'',city:'',postal:'',country:'',no:''};
 return infoOf({},side,d)};
const flat=i=>[i.street,[i.postal,i.city].filter(Boolean).join(' '),i.country].filter(Boolean).join('\n');
// T1 kutusu: ad + sokak, altta şehir / posta kodu / ülke sütunları
const pbox=(label,i,style='')=>`<div class="b" style="${style}"><i>${label}<span class="no">Numara: ${esc(i.no)}</span></i><div>${esc(i.name)}<br>${nl(i.street)}</div><div class="cpc"><span>${esc(i.city)}</span><span>${esc(i.postal)}</span><span>${esc(i.country)}</span></div></div>`;
// Eski çağrılar için
const addrOf=(g,side)=>flat(infoOf(g,side,{}));
const one=(goods,k)=>{const a=[...new Set(goods.map(g=>g[k]).filter(Boolean))];return a.length===1?a[0]:a.length?'ÇOK ('+a.length+') — KALEM LİSTESİNE BKZ.':''};

// ---- T1 TASLAK: Transit Refakat Belgesi + Kalem Listesi (NCTS örneğiyle aynı düzen) ----
export function t1Draft(d,goods,ref){
 const mrn=d.mrn||'',lrn=d.lrn||'',S=sideInfo(goods,'sender',d),R=sideInfo(goods,'receiver',d);
 const veh=[d.vehicle,d.vehicleCountry].filter(Boolean).join(' ')+(d.trailer?' / '+d.trailer+' '+(d.trailerCountry||''):'');
 const bar=mrn||lrn||ref;
 const docs=[...new Set(goods.map(g=>g.invoice&&('N380 / '+g.invoice+(g.invoiceDate?' / '+g.invoiceDate:''))).filter(Boolean))];
 const prev=goods.filter(g=>g.mrn).map(g=>'TCGB / '+g.mrn+' / Hayır / 1');
 const emp={street:'',city:'',postal:'',country:'',no:''};
 const P={...emp,name:d.principal||d.customer||d.carrier||''},Tc={...emp,name:d.carrier||'',no:d.carrierEori||''};
 const seal=d.noSeal?'':(d.seal||'');
 const ctr=t=>`<div style="text-align:center;margin-top:8px;font-size:10px">${t}</div>`;
 const olay=`<div class="row"><div class="b" style="flex:1.5"><i>OLAY KAYDI GÜMRÜK İDARESİ</i><div></div></div><div class="b" style="flex:.5"><i>Olay Kodu</i></div></div>${B('Yeni taşıma aracının kimliği ve ülkesi','','','min-height:18px')}${B('Konteyner Numarası [19 07]','','','min-height:18px')}${B('Taşıma sırasındaki diğer olaylar/açıklamalar ve alınan önlemler','','','min-height:46px')}<div class="b" style="min-height:76px"><i>Yeni Mühürler: 1 Adet<span class="no" style="left:55%">Numara: ACK00000000</span></i><div style="margin-top:4px">İmza:<span style="margin-left:48%">Mühür:</span></div><div style="margin-top:14px"><span class="cb"></span>Verileri sistemde kayıtlıdır</div></div>`;
 const p1=`<div class="pg t1"><div class="hd">TÜRKİYE CUMHURİYETİ</div>
<div class="row"><div class="side">TRANSİT REFAKAT BELGESİ</div>
<div class="col" style="flex:1.2">
${pbox('Gönderici/İhracatçı[13 02]',S,'min-height:86px')}
${pbox('Alıcı[13 03]',R,'min-height:78px')}
${pbox('Rejim Hak Sahibi [13 07]',P,'min-height:62px')}
<div class="b" style="min-height:48px"><i>Temsilci [13 06]<span class="no">Numara:</span></i><div>${esc(d.customer||'')}</div><div style="font-size:8px;margin-top:6px">İrtibat Kişisi [13 06 074]</div></div>
${pbox('Taşıyıcı [13 12]',Tc,'min-height:74px')}
${B('Arz Zinciri İlave Aktör[13 12]<span class="no">Numara:</span>','','','min-height:34px')}
${B('Hareketteki Taşıma Aracı [19 05]',esc(veh),'','min-height:30px')}
${B('Sınırdaki Aktif Taşıma Aracı [19 08]',esc([d.borderVehicle,d.borderVehicleCountry].filter(Boolean).join(' ')),'','min-height:28px')}
${B('Taşıma Referans Numara [19 02] '+esc(d.remoteRef||''),'','','min-height:22px;flex:0 0 auto')}
<div class="b" style="min-height:46px"><i>Taşıma Ekipmanı[19 07]<span class="no" style="left:70%">Konteyner [19 01] <span class="cb"></span></span></i><div>${esc(d.container||'')}</div></div>
${B('Önceki Belgeler [12 01]',prev.slice(0,5).map(esc).join('<br>'),'','min-height:60px')}
${B('Destekleyici Belgeler [12 03]',docs.slice(0,5).map(esc).join('<br>'),'','min-height:60px')}
${B('Teminat [99 02 - 99 03 - 99 04]',d.aeo?'İZİNLİ GÖNDERİCİ':esc([d.guaranteeType,d.guaranteeRef,d.guaranteeAmount&&fmt(d.guaranteeAmount)+' '+(d.guaranteeCurrency||'')].filter(Boolean).join(' · ')),'','min-height:34px')}
</div><div class="col" style="flex:1">
<div class="row" style="flex:0 0 auto"><div class="col" style="flex:1"><div class="b" style="min-height:22px;flex:0 0 auto"><div class="bd">BEYAN TÜRÜ</div></div><div class="row" style="flex:0 0 auto"><div class="b"><i>Türü[11 01]</i><div style="text-align:center;font-size:11px;margin-top:4px"><b>${esc(d.docType||'T1')}</b></div></div><div class="b"><i>Ek Beyan Türü[11 02]</i><div style="text-align:center;font-size:11px;margin-top:4px">A</div></div></div><div class="row" style="flex:0 0 auto"><div class="b"><i>Formlar</i></div><div class="b"><i>SCI[11 04]</i></div></div></div>
<div class="b" style="flex:1.6;text-align:center"><div style="font-size:11px;margin-bottom:3px">${esc(stamp())}</div>${barcode(bar,36)}<div class="bcw" style="font-size:11px">${esc(bar)}</div></div></div>
<div class="row" style="flex:0 0 auto">${B('Kalemler',ctr(goods.length),'','flex:.8;min-height:58px')}${B('Toplam Kap Adedi',ctr(fmt(sum(goods,'packages'))),'','flex:1.1')}${B('Toplam Brüt Ağırlık',ctr(fmt3(sum(goods,'gross'))),'','flex:1.3')}${B('Güvenlik [11 07]',ctr(esc(String(d.security||'').slice(0,1)||'0')),'','flex:1')}</div>
<div class="row" style="flex:0 0 auto">${B('LRN[12 09]',ctr(esc(lrn)),'','flex:1.6;min-height:40px')}${B('UCR Numarası [12 08]','','','flex:1.3')}${B('TIR [12 06]','','','flex:1')}</div>
<div class="b" style="flex:0 0 auto;min-height:58px"><div style="margin-top:6px"><b>Kağıt usul:</b><span class="cb" style="width:24px;height:14px;margin:0 30px 0 26px"></span><b>İade nüshası aşağıdaki gümrük adresine<br><span style="margin-left:132px">gönderilmelidir:</span></b></div></div>
<div class="row" style="flex:1"><div class="col" style="flex:1.45">${B('Yükleme Yeri [16 13]',esc(d.loadPlace||''),'','min-height:70px')}${B('Boşaltma Yeri [16 14]',esc(d.unloadPlace||''),'','min-height:70px')}<div class="b" style="flex:0 0 auto;min-height:20px"><i style="font-size:8.5px">Sınırdaki Taşıma Şekli [19 03] ${esc(code(d.transportMode)==='Karayolu'?'3':d.transportMode||'')}</i></div><div class="b" style="flex:0 0 auto;min-height:20px"><i style="font-size:8.5px">Dahili Taşıma Şekli [19 04] 3</i></div></div><div class="b" style="flex:1"><i>Eşyanın Bulunduğu Yer [16 15]</i><div>${esc(d.goodsLocation||d.facilityCode||'')}<br>${esc(d.locationAddress||'')}</div><div style="position:absolute;bottom:60px;font-size:8px">İrtibat Kişisi [16 15 074]</div></div></div>
${B('Mühür [19 10]',d.noSeal?'MÜHÜR YOK':esc(seal?'1 '+seal:''),'','flex:0 0 auto;min-height:58px')}
${B('Taşıma Belgeleri [12 05]',esc(d.consignmentNote||''),'','flex:0 0 auto;min-height:62px')}
${B('Ek Referans [12 04]','','','flex:0 0 auto;min-height:34px')}
<div class="row" style="flex:0 0 auto"><div class="b" style="flex:2;min-height:34px"><i>Ek Bilgi [12 02]</i><div>${esc(d.notes||'')}</div></div><div class="b" style="flex:1.2"><i style="text-align:right">Taşıma Ücretleri[14 02]</i></div></div>
<div class="b" style="flex:1;min-height:62px"><i>İzin [12 12]<span class="no" style="left:62%">Azaltılmış Veri Seti [11 08] &nbsp;0</span></i><div>${d.aeo?'İZİNLİ GÖNDERİCİ':''}</div></div>
</div></div>
<div class="row"><div class="col" style="flex:0 0 5%"><div class="sd" style="flex:1">Teminatın geçerli olmadığı ülkeler</div><div class="sd" style="flex:2.1">TAŞIMA SIRASINDAKİ OLAYLAR (KAĞIT USUL)</div><div class="sd" style="flex:1.3">YETKİLİ MAKAMLARIN ONAYI</div></div>
<div class="col" style="flex:1.2">${B('','','','min-height:30px;flex:0 0 auto')}${olay}</div><div class="col" style="flex:1">${B('','','','min-height:30px;flex:0 0 auto')}${olay}</div></div>
<div class="row"><div class="col" style="flex:0 0 5%"></div><div class="b" style="flex:1.2;min-height:34px"><i>Güzergahtaki Ülke(ler)</i><div>${esc((d.routeCountries||[]).join(' '))}</div></div><div class="b" style="flex:1;min-height:34px"><i style="text-align:right;margin-top:10px">Belirlenmiş Güzergah [16 17]<span class="cb" style="width:24px;height:14px;margin-left:20px"></span></i></div></div>
<div class="row"><div class="col" style="flex:0 0 5%"></div><div class="b" style="flex:1.2;min-height:40px"><i>TRANSİT GÜMRÜK İDARESİ [17 04]</i><div>${esc([...(d.transitOffices||[])].join(', '))}</div></div><div class="b" style="flex:1;min-height:40px"><i>TRANSİT İÇİN ÇIKIŞ GÜMRÜK İDARESİ [17 06]</i><div>${esc(d.borderOffice||'')}</div></div></div>
<div class="row"><div class="col" style="flex:0 0 5%"></div><div class="b" style="flex:1.2;min-height:46px"><i>HAREKET GÜMRÜK İDARESİ [17 03]</i><div>${esc(d.departureOffice||'')}</div></div><div class="col" style="flex:1"><div class="b" style="min-height:30px"><i>VARIŞ GÜMRÜK İDARESİ [17 05]</i><div>${esc(d.arrivalOffice||'')}</div></div><div class="row"><div class="b"><i>Sevk Ülkesi [16 06]</i><div>${esc(d.dispatchCountry||'')}</div></div><div class="b"><i>Varış Ülkesi [16 03]</i><div>${esc(d.destinationCountry||'')}</div></div></div></div></div>
<div class="row">${B('HAREKET GÜMRÜK İDARESİ KONTROLÜ','Sonuç:<br>Takılan Mühürlerin Adedi: '+(seal?1:0)+'<br>Numarası: '+esc(seal)+'<br>Süre Sınırı [15 11]: '+esc(d.transitEnd||''),'','flex:1.05;min-height:76px')}${B('VARIŞ GÜMRÜK İDARESİ KONTROLÜ','Varış Tarihi:<br>Mühürlerin Kontrolü:<br><br>Açıklamalar:','','flex:1;min-height:76px')}${B('','<div style="text-align:center;margin-top:4px"><b>İŞ BU BELGE ELEKTRONİK İMZA<br>İLE İMZALANMIŞTIR.</b></div>','','flex:.9')}${B('','İade Nüshası<br><span style="margin-left:60%">tarihinde,</span><br><span style="margin-left:60%">kayıt no. ile</span><br>geri gönderilmiştir<br>İmza: Mühür:','','flex:1.05')}</div>
</div>`;
 const items=goods.map((g,i)=>`<div class="pg t1"><div class="row">${B('','<span style="font-size:14px;display:block;text-align:center">TRANSİT KALEM LİSTESİ</span>','','flex:2')}${B('Formlar(3)','')}<div class="b" style="flex:2.3"><div class="row" style="align-items:center"><span style="font-size:11px">MRN</span>&nbsp;<div style="flex:1">${barcode(bar,34)}<div class="bcw">${esc(bar)}</div></div></div></div></div>
<div class="row"><div class="col" style="flex:1">
<div class="row">${B('Eşya Kalem Numarası[11 11]',ctr(i+1),'','flex:.6')}${B('Kalem Numarası[11 09]',ctr(i+1),'','flex:.6')}${B('Kapların türü, sayısı ve nakliyeişaretleri [18 06]','Kap Cinsi:'+esc(g.packageType||'BI')+' &nbsp; Kap Adedi:'+fmt(g.packages),'','flex:1.2')}</div>
${pbox('Gönderici/İhracatçı[13 02]',infoOf(g,'sender',d),'min-height:84px')}
${pbox('Alıcı[13 03]',infoOf(g,'receiver',d),'min-height:84px')}
${B('Arz Zinciri İlave Aktör [13 14]<span class="no">Numara:</span>','','','min-height:50px')}
${B('Hareketteki Taşıma Aracı [19 05]:',esc([d.vehicle,d.vehicleCountry].filter(Boolean).join(' ')),'','min-height:34px')}
<div class="row"><div class="b"><i>BM Tehlikeli Eşya Kodu[18 07]:</i></div><div class="b"><i>CUS Kodu[18 08]:</i></div><div class="b"><i>Taşıma Ücretleri[14 02]:</i></div></div>
</div><div class="col" style="flex:1.45">
${B('Eşya Tanımı [18 05]:',esc(g.description),'','min-height:28px')}
${B('Önceki Belgeler [12 01]:',g.mrn?'TCGB / '+esc(g.mrn)+' / Hayır / 1':'','','min-height:36px')}
${B('Destekleyici Belgeler [12 03]:',g.invoice?'N380 / '+esc(g.invoice)+(g.invoiceDate?' / '+esc(g.invoiceDate):''):'','','min-height:36px')}
${B('Ek Referans [12 04]:','','','min-height:36px')}
${B('Ek Bilgi [12 02]:','','','min-height:36px')}
${B('Taşıma Belgeleri [12 05]:','','','min-height:36px')}
<div class="row">${B('UCR Numarası [12 08]:','','','flex:2')}${B('Brüt Ağırlık (Kg) [18 04]:',ctr(fmt3(g.gross)),'','')}</div>
<div class="row">${B('Eşya Kodu [18 09]:',esc(String(g.gtip||'').replace(/\D/g,'')),'','flex:2')}${B('Net Ağırlık (Kg) [18 01]:',ctr(fmt3(g.net)))}</div>
<div class="row">${B('Türü [11 01]:',esc(d.docType==='T2'?'T2':'T'),'','flex:.5')}${B('Sevk Ülkesi [16 06]:',esc(d.dispatchCountry))}${B('Varış Ülkesi [16 03]:',esc(d.destinationCountry))}${B('Tamamlayıcı Birimler [18 02]:','')}</div>
</div></div></div>`).join('');
 return p1+items;
}

// ---- CMR ----
export function cmr(d,goods,ref){
 const S=sideInfo(goods,'sender',d),R=sideInfo(goods,'receiver',d);
 const rows=goods.map((g,i)=>`<div style="display:flex;gap:8px"><span style="width:22px">${i+1}</span><span style="width:28px">${esc(g.packageType||'BI')}</span><span style="flex:1">${esc(g.description)}</span></div>`).join('');
 const docs=goods.map(g=>g.invoice&&('N380 '+g.invoice+(g.invoiceDate?' '+g.invoiceDate:''))).filter(Boolean);
 const mrns=goods.map(g=>g.mrn).filter(Boolean);
 const L=(n,tr,en)=>`<b>${n}</b>${en}<br>&nbsp;&nbsp;${tr}`;
 const date=dmy();
 return `<div class="pg cmr"><div class="row"><div class="col" style="flex:1.35">
${B(L(1,'Gönderen (İsim, Adres, Ülke)','Sender (Name, Address, Country)'),party(S.name,flat(S),''),'','min-height:76px')}
</div><div style="flex:1.3;border:.8px solid #555;padding:3px 6px"><div class="red">YÜKLEME VE İSTİFLEMEDEN OLUŞACAK HASARLARDAN TAŞIYICI SORUMLU TUTULMAZ.</div><div class="redS">The carrier is subject, notwithstanding any clause to contrary, to the Convention on the Contract for the International Carriage of goods by road (CMR)</div></div>
<div style="flex:.9;border:.8px solid #555;padding:3px 6px"><div class="ttl">INTERNATIONAL CONSIGNMENT NOTE<br>ULUSLARARASI HAMULE SENEDİ</div><div style="text-align:center"><span class="cmrLogo">CMR</span></div><div class="redS" style="font-size:6.5px">İş bu irsaliye karşıt kloz lara rağmen, karayolu ile emtianın uluslararası taşıması ile ilgili anlaşılan kon vansiyon düzenlenmiştir.</div></div></div>
<div class="row"><div class="col" style="flex:1.35">
${B(L(2,'Alacak Olan (İsim, Adres, Ülke)','Consignee (Name, Address, Country)'),party(R.name,flat(R),''),'','min-height:82px')}
${B(L(3,'Malların alındığı yer ( Şehir, Ülke )','Place and Date of taking over goods ( Place, Country)')+'<span class="nb">Date / Tarih</span>',esc(d.loadPlace||'')+(d.dispatchCountry?', '+esc(d.dispatchCountry):'')+'<span class="nb" style="margin-left:80px">'+date+'</span>','','min-height:66px')}
${B(L(4,'Malları teslim edildiği yer ( Şehir, Ülke )','Place of delivery goods ( Place, Country) Maln /')+'<span class="nb">Date / Tarih</span>',esc(d.unloadPlace||'')+(d.destinationCountry?', '+esc(d.destinationCountry):''),'','min-height:40px')}
${B(L(5,'Ekli Belgeler','Documents attached'),docs.concat(mrns.length?['EXP MRN: '+mrns.slice(0,3).join(', ')]:[]).map(esc).join('<br>'),'','min-height:40px')}
</div><div class="col" style="flex:1.35">
${B(L(16,'Transporteur (nom, aresse, pays)','Carrier (Name, Address, Country)'),party(d.carrier,'',''),'','min-height:84px')}
${B(L(17,'Müteakip/İkinci taşıyıcı firma (İsmi, Adresi, Ülkesi)','Successive Carrier (Name, Address, Country)'),'','','min-height:96px')}
${B(L(18,'Taşıyıcı firmanın mülahazat ve müşahadeleri','Carriers , Reservations and Observations'),'<span style="margin-left:14px">Plate no / Plaka no : &nbsp; '+esc([d.vehicle,d.trailer].filter(Boolean).join(' / '))+'</span>','','min-height:86px')}
</div></div>
<div class="row" style="margin-top:0">
${B('<b>6</b>Marks and No<br>&nbsp;Marka No','','','flex:1.0;min-height:32px')}${B('<b>7</b>Number of Packages<br>&nbsp;Koli / Paket adedi','','','flex:1.05')}${B('<b>8</b>Method of packaging<br>&nbsp;Ambalaj ekli/Metodu','','','flex:1.1')}${B('<b>9</b>Nature of the goods<br>&nbsp;Malın Muhteviyatı(Cinsi)','','','flex:1.5')}${B('<b>10</b>Statistical Number<br>&nbsp;İstatistik numarası','','','flex:1.1')}${B('<b>11</b>Gross weight in Kg<br>&nbsp;Kg. olarak Brüt','','','flex:1')}${B('<b>12</b>Volume in m³<br>&nbsp;m³ brüt hacim','','','flex:.9')}</div>
<div class="row" style="min-height:190px"><div class="b" style="flex:5.9"><div>${rows}</div><div style="margin-top:10px;color:#555;font-size:8px">${goods.length?'Toplam kap: '+fmt(sum(goods,'packages')):''}</div></div><div class="b" style="flex:1"><div>${goods.map(g=>fmt(g.gross)+' KG').join('<br>')}<br><b>${goods.length>1?fmt(sum(goods,'gross'))+' KG':''}</b></div></div><div class="b" style="flex:.9"></div></div>
<div class="row"><div class="b" style="flex:1"><i>Class / Sınıf</i></div><div class="b" style="flex:1"><i>Number / Numbera</i></div><div class="b" style="flex:1"><i>Letter / Harf</i></div><div class="b" style="flex:1.2"><i>(ADR)</i></div><div class="b" style="flex:2.3"></div></div>
<div class="row"><div class="col" style="flex:1.35">
${B(L(13,'Gönderenin Talimatı','Sender\'s instructions'),d.aeo?'İZİNLİ GÖNDERİCİ (AEO)':'','','min-height:74px')}
${B(L(14,'Navlunun Ödeme şekli','Instructions as to payment for carriage'),'','','min-height:60px')}
${B(L(21,'Tanzim yeri','Established in')+'<span class="nb">On / Tarih</span>',esc(d.loadPlace||'')+'<span class="nb" style="margin-left:70px">'+date+'</span>','','min-height:44px')}
</div><div class="col" style="flex:1.35">
${B(L(19,'Özel anlaşma','Special agreements'),nl(setting('cmrAgreement')),'','min-height:74px;font-size:8px')}
<div class="row"><div class="col" style="flex:1.4">${B(L(20,'Ödeyecek','To be paid by'),'')}${B('Productions<br>Yük','','','min-height:18px')}${B('Supplements<br>Ara Yekün','','','min-height:18px')}${B('Total<br>Toplam','','','min-height:18px')}${B('Reimbursement / cash on delivery<br><b>15</b>Teslimatta ödenecek mebla','','','min-height:30px')}</div><div class="col" style="flex:.8">${B('Senders<br>Gönderen','')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}</div><div class="col" style="flex:.7">${B('Amount<br>Mebla','')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}</div><div class="col" style="flex:.7">${B('Consignee<br>Alacak olan','')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}</div></div>
</div></div>
<div class="row">${B(L(22,'Gönderenin imza ve kaşesi','Signature and stamp of the sender'),party(S.name,flat(S),''),'','min-height:78px;flex:1')}${B(L(23,'Taşıyıcının imza ve kaşesi','Signature and stamp of the carrier'),party(d.carrier,'',''),'','min-height:78px;flex:1')}${B(L(24,'Mallar Teslim Alan','Received Goods')+'<span class="nb">On<br>Tarih</span>','<div style="margin-top:34px;font-size:8px;text-align:center">Signature and stamp of the consignee<br>Alıcının imza ve kaşesi</div>','','min-height:78px;flex:1')}</div>
<p class="note">CMR taslağıdır; geçerli senet için gönderici ve taşıyıcı imzalı nüshalar gerekir. Referans: ${esc(ref||'')}</p></div>`;
}

// ---- ICS2 ENS beyanı ----
// Gönderici + alıcı çiftlerine göre CMR grupları (çok kalemli T1 için her çift ayrı CMR)
export function cmrGroups(goods,d={}){const m=new Map();for(const g of goods){const k=(g.sender||d.sender||'')+'||'+(g.receiver||d.receiver||'');if(!m.has(k))m.set(k,{key:k,sender:g.sender||d.sender||'',receiver:g.receiver||d.receiver||'',goods:[]});m.get(k).goods.push(g)}return [...m.values()]}
export function cmrAll(d,groups,ref){return groups.map(gr=>cmr(d,gr.goods,ref)).join('')}
export function ensDoc(e){
 const goods=e.goods||[];
 const d=new Date(),p=v=>String(v).padStart(2,'0'),date=p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes());
 const plate=[e.vehicle,e.trailer].filter(Boolean).join(' / ');
 return `<div class="pg ens"><div class="logo"><span>${esc(setting('docHeader'))}</span></div>
<h2>ICS2 ENS Declaration</h2>
<dl class="kv"><dt>Date</dt><dd>${esc(date)}</dd><dt>Plate Number</dt><dd>${esc(plate)}</dd><dt>Carrier Name</dt><dd>${esc(e.carrier)}</dd><dt>Carrier EORI</dt><dd>${esc(e.carrierEori)}</dd><dt>ICS2 ENS MRN</dt><dd>${esc(e.mrn)}</dd><dt>REFERENCE</dt><dd>${esc(e.commercialRef||e.agentRef||e.lrn||e.ref)}</dd></dl>
${e.mrn?`<div class="ensBc"><b>MRN</b> ${esc(e.mrn)}${barcode(e.mrn,50)}</div>`:''}
${goods.length?`<h2 style="margin-top:34px">Goods</h2><table class="g"><tr><th>#</th><th>HS</th><th>Description</th><th>Consignor → Consignee</th><th>Packages</th><th>Gross kg</th></tr>${goods.map((g,i)=>`<tr><td>${i+1}</td><td>${esc(g.gtip)}</td><td>${esc(g.description)}</td><td>${esc(g.consignor)} → ${esc(g.consignee)}</td><td>${fmt(g.packages)} ${esc(g.packageType)}</td><td>${fmt(g.gross)}</td></tr>`).join('')}</table>`:''}
<p class="note">Hazırlık çıktısıdır; resmî ENS gönderimi yetkili sistemden yapılır. Giriş: ${esc(e.entryOffice)} · Varış tarihi: ${esc(e.arrivalDate)}</p></div>`;
}

export function printHtml(title,body){
 const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);
 const doc=f.contentWindow.document;doc.open();doc.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+CSS+'</style></head><body>'+body+'</body></html>');doc.close();
 setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch{}setTimeout(()=>f.remove(),60000)},250);
}
export const documentCss=CSS;
