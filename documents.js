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
 const t=String(text||'').replace(/[^\x20-\x7e]/g,'');if(!t)return '';
 const vals=[104];let sumv=104;[...t].forEach((ch,i)=>{const v=ch.charCodeAt(0)-32;vals.push(v);sumv+=v*(i+1)});vals.push(sumv%103);
 let bits=vals.map(v=>C128[v]).join('')+'1100011101011';let x=0,out='';
 for(let i=0;i<bits.length;){let j=i;while(bits[j]===bits[i])j++;if(bits[i]==='1')out+='<rect x="'+x+'" y="0" width="'+(j-i)+'" height="'+h+'"/>';x+=j-i;i=j}
 return '<svg class="bc" viewBox="0 0 '+x+' '+h+'" preserveAspectRatio="none" height="'+h+'" fill="#000">'+out+'</svg>';
}
const CSS=`@page{size:A4;margin:8mm}*{box-sizing:border-box}html,body{margin:0}body{font:9.5px Arial,Helvetica,sans-serif;color:#000}
.pg{page-break-after:always}.pg:last-child{page-break-after:auto}
.hd{font-size:13px;margin:0 0 3px}.row{display:flex}.col{display:flex;flex-direction:column}
.b{border:.8px solid #555;padding:2px 4px;position:relative;min-height:22px;overflow:hidden;flex:1}
.b>i{font-style:normal;font-size:7.5px;color:#222;display:block}.b>div{font-size:9.5px;line-height:1.25;margin-top:1px;word-break:break-word}.b.t>div{font-size:9px}
.nb{display:inline-block;margin-left:8px}
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
// Firma adresi: eşya satırındaki adres + posta kodu + şehir + ülke
const addrOf=(g,side)=>{const a=g[side+'Address']||'',pc=[g[side+'Postal'],g[side+'City']].filter(Boolean).join(' '),c=g[side+'Country']||'';return [a,pc,c].filter(Boolean).join('\n')};
const sideInfo=(goods,side,d)=>{const names=[...new Set(goods.map(g=>g[side]).filter(Boolean))];const dn=side==='sender'?d.sender:d.receiver,da=side==='sender'?d.senderAddress:d.receiverAddress;
 if(names.length===1){const g=goods.find(x=>x[side]===names[0]);return {name:names[0],addr:addrOf(g,side)||da||'',no:g[side+'Eori']||g[side+'Tax']||(side==='sender'?d.senderEori:d.receiverEori)||''}}
 if(names.length>1)return {name:'ÇOK ('+names.length+') — KALEM LİSTESİNE BKZ.',addr:'',no:''};
 return {name:dn||'',addr:da||'',no:(side==='sender'?d.senderEori:d.receiverEori)||''}};
const one=(goods,k)=>{const a=[...new Set(goods.map(g=>g[k]).filter(Boolean))];return a.length===1?a[0]:a.length?'ÇOK ('+a.length+') — KALEM LİSTESİNE BKZ.':''};

// ---- T1 TASLAK: Transit Refakat Belgesi + Kalem Listesi ----
export function t1Draft(d,goods,ref){
 const mrn=d.mrn||'',lrn=d.lrn||'',S=sideInfo(goods,'sender',d),R=sideInfo(goods,'receiver',d);
 const veh=[d.vehicle,d.vehicleCountry].filter(Boolean).join(' ')+(d.trailer?' / '+d.trailer+' '+(d.trailerCountry||''):'');
 const bar=mrn||lrn||ref;
 const docs=[...new Set(goods.map(g=>g.invoice&&('N380 / '+g.invoice+(g.invoiceDate?' / '+g.invoiceDate:''))).filter(Boolean))];
 const prev=goods.filter(g=>g.mrn).map(g=>'TCGB / '+g.mrn+' / Hayır / 1');
 const p1=`<div class="pg"><div class="hd">TÜRKİYE CUMHURİYETİ</div>
<div class="row"><div class="side">TRANSİT REFAKAT BELGESİ</div><div class="col" style="flex:1.45">
${B('Gönderici/İhracatçı [13 02]',party(S.name,S.addr,S.no),'','min-height:78px')}
${B('Alıcı [13 01]',party(R.name,R.addr,R.no),'','min-height:78px')}
${B('Rejim Hak Sahibi [13 07]',party(d.principal||d.customer||d.carrier,'',''),'','min-height:44px')}
${B('Temsilci [13 06]',party(d.customer||'','',''),'','min-height:34px')}
${B('Taşıyıcı [13 12]',party(d.carrier,'',d.carrierEori),'','min-height:50px')}
${B('Arz Zinciri İlave Aktör [13 13]','')}
${B('Hareketteki Taşıma Aracı [19 05]',esc(veh))}
${B('Sınırdaki Aktif Taşıma Aracı [19 08]',esc([d.borderVehicle,d.borderVehicleCountry].filter(Boolean).join(' ')))}
${B('Taşıma Referans Numarası [19 02]',esc(d.remoteRef||ref))}
${B('Taşıma Ekipmanı [19 07]',esc(d.container||'')+(d.inContainer==='Evet'?'':''),'','min-height:26px')}
${B('Önceki Belgeler [12 01]',prev.slice(0,6).map(esc).join('<br>'),'','min-height:50px')}
${B('Destekleyici Belgeler [12 03]',docs.slice(0,6).map(esc).join('<br>'),'','min-height:50px')}
${B('Terminal [99 02 - 99 03 - 99 04]','')}
</div><div class="col" style="flex:1.1">
<div class="row">${B('Beyan Türü [11 01] / Ek Beyan Türü [11 02]','<b>'+esc(d.docType||'T1')+'</b> &nbsp;&nbsp; A','','flex:.9')}<div class="b" style="flex:1.5;text-align:center"><div style="font-size:10px">${esc(stamp())}</div>${barcode(bar,40)}<div class="bcw">${esc(bar)}</div></div></div>
<div class="row">${B('Kalemler',String(goods.length))}${B('Toplam Kap Adedi',fmt(sum(goods,'packages')))}${B('Toplam Brüt Ağırlık',fmt3(sum(goods,'gross')))}${B('Güvenlik [11 07]',esc(String(d.security||'').slice(0,1)||'0'))}</div>
${B('LRN [12 09] / MRN',esc(lrn)+(lrn&&mrn?' &nbsp; ':'')+esc(mrn))}
${B('Yükleme Yeri [16 13]',esc(d.loadPlace||''),'','min-height:46px')}
${B('Eşyanın Bulunduğu Yer [16 15]',esc([d.goodsLocation,d.locationAddress].filter(Boolean).join(' · ')),'','min-height:46px')}
${B('Boşaltma Yeri [16 14]',esc(d.unloadPlace||''),'','min-height:46px')}
<div class="row">${B('Sınırdaki Taşıma Şekli [19 03]',esc(code(d.transportMode)==='Karayolu'?'3':esc(d.transportMode||'')))}${B('Dahili Taşıma Şekli [19 04]','3')}</div>
${B('Mühür [19 10]',d.noSeal?'MÜHÜR YOK':esc(d.seal?'1 '+d.seal:''))}
${B('Taşıma Belgeleri [12 05]',esc(d.consignmentNote||''),'','min-height:40px')}
${B('Ek Referans [12 04]','','','min-height:26px')}
<div class="row">${B('Ek Bilgi [12 02]',esc(d.notes||''),'','flex:2;min-height:30px')}${B('Taşıma Ücreti [14 02]','')}</div>
<div class="row">${B('İzin [12 12]',d.aeo?'İZİNLİ GÖNDERİCİ':'','','flex:2')}${B('Azaltılmış Veri Seti [11 08]','0')}</div>
</div></div>
<div class="row">${B('TRANSİT GÜMRÜK İDARESİ [17 04]',esc([...(d.transitOffices||[])].join(', ')),'','flex:1;min-height:34px')}${B('TRANSİT İÇİN ÇIKIŞ GÜMRÜK İDARESİ [17 06]',esc(d.borderOffice||''),'','flex:1;min-height:34px')}</div>
<div class="row">${B('HAREKET GÜMRÜK İDARESİ [17 03]',esc(d.departureOffice),'','min-height:40px')}${B('VARIŞ GÜMRÜK İDARESİ [17 05]',esc(d.arrivalOffice),'','min-height:40px')}${B('Sevk Ülkesi [16 06]',esc(d.dispatchCountry),'','flex:.35')}${B('Varış Ülkesi [16 03]',esc(d.destinationCountry),'','flex:.35')}${B('Belirlenmiş Güzergâh [16 17]',esc((d.routeCountries||[]).join(' ')),'','flex:.5')}</div>
<div class="row">${B('HAREKET GÜMRÜK İDARESİ KONTROLÜ',['Sonuç: ','Takılan Mühürlerin Adedi: '+(d.noSeal?0:(d.seal?1:0)),'Süre Sınırı [15 11]: '+esc(d.transitEnd||'')].map(x=>x).join('<br>'),'','min-height:70px')}${B('VARIŞ GÜMRÜK İDARESİ KONTROLÜ','Varış Tarihi:<br>Mühürlerin Kontrolü:<br>Açıklamalar:','','min-height:70px')}${B('','<b>İŞ BU BELGE ELEKTRONİK İMZA İLE İMZALANMIŞTIR.</b>','','text-align:center;min-height:70px')}${B('','İade Nüshası<br><br>geri gönderilmiştir<br>İmza: Mühür:','','min-height:70px')}</div>
<p class="note">Hazırlık taslağıdır; resmî tescil / transit refakat belgesi yerine geçmez.</p></div>`;
 const items=goods.map((g,i)=>`<div class="pg"><div class="row">${B('','<span style="font-size:13px;display:block;text-align:center">TRANSİT KALEM LİSTESİ</span>','','flex:2')}${B('Formlar [3]','')}<div class="b" style="flex:2.3"><div class="row" style="align-items:center"><span style="font-size:11px">MRN</span>&nbsp;<div style="flex:1">${barcode(bar,34)}<div class="bcw">${esc(bar)}</div></div></div></div></div>
<div class="row"><div class="col" style="flex:1">
<div class="row">${B('Eşya Kalem Numarası [11 11]',String(i+1),'','flex:.6')}${B('Kalem Numarası [11 09]',String(i+1),'','flex:.6')}${B('Kapların türü, sayısı ve nakliyeişaretleri [18 06]','Kap Cinsi:'+esc(g.packageType||'BI')+' &nbsp; Kap Adedi:'+fmt(g.packages),'','flex:1.2')}</div>
${B('Gönderici/İhracatçı [13 02]',party(g.sender||S.name,addrOf(g,'sender'),g.senderEori||g.senderTax),'','min-height:70px')}
${B('Alıcı [13 03]',party(g.receiver||R.name,addrOf(g,'receiver'),g.receiverEori||g.receiverTax),'','min-height:70px')}
${B('Arz Zinciri İlave Aktör [13 14]','','','min-height:50px')}
${B('Hareketteki Taşıma Aracı [19 05]',esc([d.vehicle,d.vehicleCountry].filter(Boolean).join(' ')))}
<div class="row">${B('BM Tehlikeli Eşya Kodu[18 07]:','')}${B('CUS Kodu[18 08]:','')}${B('Taşıma Ücretleri[14 02]:','')}</div>
</div><div class="col" style="flex:1.45">
${B('Eşya Tanımı [18 05]:',esc(g.description),'','min-height:26px')}
${B('Önceki Belgeler [12 01]:',g.mrn?'TCGB / '+esc(g.mrn)+' / Hayır / 1':'','','min-height:34px')}
${B('Destekleyici Belgeler [12 03]:',g.invoice?'N380 / '+esc(g.invoice)+(g.invoiceDate?' / '+esc(g.invoiceDate):''):'','','min-height:34px')}
${B('Ek Referans [12 04]:','','','min-height:34px')}
${B('Ek Bilgi [12 02]:','','','min-height:34px')}
${B('Taşıma Belgeleri [12 05]:','','','min-height:34px')}
<div class="row">${B('UCR Numarası [12 08]:','','','flex:2')}${B('Brüt Ağırlık (Kg) [18 04]:',fmt3(g.gross),'','')}</div>
<div class="row">${B('Eşya Kodu [18 09]:',esc(String(g.gtip||'').replace(/\D/g,'')),'','flex:2')}${B('Net Ağırlık (Kg) [18 01]:',fmt3(g.net))}</div>
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
${B(L(1,'Gönderen (İsim, Adres, Ülke)','Sender (Name, Address, Country)'),party(S.name,S.addr,''),'','min-height:84px')}
</div><div style="flex:1.3;border:.8px solid #555;padding:3px 6px"><div class="red">YÜKLEME VE İSTİFLEMEDEN OLUŞACAK HASARLARDAN TAŞIYICI SORUMLU TUTULMAZ.</div><div class="redS">The carrier is subject, notwithstanding any clause to contrary, to the Convention on the Contract for the International Carriage of goods by road (CMR)</div></div>
<div style="flex:.9;border:.8px solid #555;padding:3px 6px"><div class="ttl">INTERNATIONAL CONSIGNMENT NOTE<br>ULUSLARARASI HAMULE SENEDİ</div><div style="text-align:center"><span class="cmrLogo">CMR</span></div><div class="redS" style="font-size:6.5px">İş bu irsaliye karşıt kloz lara rağmen, karayolu ile emtianın uluslararası taşıması ile ilgili anlaşılan kon vansiyon düzenlenmiştir.</div></div></div>
<div class="row"><div class="col" style="flex:1.35">
${B(L(2,'Alacak Olan (İsim, Adres, Ülke)','Consignee (Name, Address, Country)'),party(R.name,R.addr,''),'','min-height:82px')}
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
<div class="row" style="min-height:310px"><div class="b" style="flex:5.9"><div>${rows}</div><div style="margin-top:10px;color:#555;font-size:8px">${goods.length?'Toplam kap: '+fmt(sum(goods,'packages')):''}</div></div><div class="b" style="flex:1"><div>${goods.map(g=>fmt(g.gross)+' KG').join('<br>')}<br><b>${goods.length>1?fmt(sum(goods,'gross'))+' KG':''}</b></div></div><div class="b" style="flex:.9"></div></div>
<div class="row"><div class="b" style="flex:1"><i>Class / Sınıf</i></div><div class="b" style="flex:1"><i>Number / Numbera</i></div><div class="b" style="flex:1"><i>Letter / Harf</i></div><div class="b" style="flex:1.2"><i>(ADR)</i></div><div class="b" style="flex:2.3"></div></div>
<div class="row"><div class="col" style="flex:1.35">
${B(L(13,'Gönderenin Talimatı','Sender\'s instructions'),d.aeo?'İZİNLİ GÖNDERİCİ (AEO)':'','','min-height:74px')}
${B(L(14,'Navlunun Ödeme şekli','Instructions as to payment for carriage'),'','','min-height:60px')}
${B(L(21,'Tanzim yeri','Established in')+'<span class="nb">On / Tarih</span>',esc(d.loadPlace||'')+'<span class="nb" style="margin-left:70px">'+date+'</span>','','min-height:44px')}
</div><div class="col" style="flex:1.35">
${B(L(19,'Özel anlaşma','Special agreements'),'*Yükleme ve Boşaltmalarda 48 saatten sonra beher gün için 180,-EUR bekleme ücreti alınır.<br>* Delays after 48 hours of arrival (for discharging) or of loading) at final destination are subject to a demorrage of 180,-EUR each trailer per day.','','min-height:74px;font-size:8px')}
<div class="row"><div class="col" style="flex:1.4">${B(L(20,'Ödeyecek','To be paid by'),'')}${B('Productions<br>Yük','','','min-height:18px')}${B('Supplements<br>Ara Yekün','','','min-height:18px')}${B('Total<br>Toplam','','','min-height:18px')}${B('Reimbursement / cash on delivery<br><b>15</b>Teslimatta ödenecek mebla','','','min-height:30px')}</div><div class="col" style="flex:.8">${B('Senders<br>Gönderen','')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}</div><div class="col" style="flex:.7">${B('Amount<br>Mebla','')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}</div><div class="col" style="flex:.7">${B('Consignee<br>Alacak olan','')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}${B('','','','min-height:18px')}</div></div>
</div></div>
<div class="row">${B(L(22,'Gönderenin imza ve kaşesi','Signature and stamp of the sender'),party(S.name,S.addr,''),'','min-height:78px;flex:1')}${B(L(23,'Taşıyıcının imza ve kaşesi','Signature and stamp of the carrier'),party(d.carrier,'',''),'','min-height:78px;flex:1')}${B(L(24,'Mallar Teslim Alan','Received Goods')+'<span class="nb">On<br>Tarih</span>','<div style="margin-top:34px;font-size:8px;text-align:center">Signature and stamp of the consignee<br>Alıcının imza ve kaşesi</div>','','min-height:78px;flex:1')}</div>
<p class="note">CMR taslağıdır; geçerli senet için gönderici ve taşıyıcı imzalı nüshalar gerekir. Referans: ${esc(ref||'')}</p></div>`;
}

// ---- ICS2 ENS beyanı ----
export function ensDoc(e){
 const goods=e.goods||[];
 const d=new Date(),p=v=>String(v).padStart(2,'0'),date=p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes());
 const plate=[e.vehicle,e.trailer].filter(Boolean).join(' / ');
 return `<div class="pg ens"><div class="logo"><span>P</span><b>C</b><span>S</span><small>TRANSİT GÜMRÜKLEME</small></div>
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
