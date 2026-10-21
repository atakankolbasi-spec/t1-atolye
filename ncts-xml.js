// T1 beyannamesinden NCTS CC015B (IE015B) XML'i üretir. Şema: NCWS_V2.1/XSD/CC015B.xsd (Türkiye eklentileriyle).
import {parseKolis,parseDocs,typeCode,docNumber} from './lines.js';
import {num} from './excel.js';

const esc=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const t=v=>String(v??'').trim();
const first=v=>t(v).split(/\s+/)[0];
const up=v=>t(v).toUpperCase();
const cut=(v,n)=>t(v).slice(0,n);
const ymd=v=>t(v).replace(/\D/g,'').replace(/^(\d{2})(\d{2})(\d{4})$/,'$3$2$1');
const dec=(v,d=3)=>{const n=num(v);return Number.isFinite(n)&&n>=0?n.toFixed(d):''};
const el=(n,v)=>v===''||v===undefined||v===null?'':'<'+n+'>'+esc(v)+'</'+n+'>';
const lang='tr';
const zip=v=>t(v).replace(/[^\w -]/g,'').slice(0,9);
// "Firma adı\nSokak 5" gibi tek satırlık adresi şemadaki 35 karakterlik sokak alanına sığdır
const street=a=>cut(t(a).split(/\r?\n|,/)[0],35);

function party(prefix,suffix,name,addr,city,postal,country,tin,withLng,opt){
 if(!t(name)&&opt)return '';
 const n=prefix;
 return el(n.name,cut(name,35))+el(n.street,street(addr)||'-')+el(n.post,zip(postal)||'-')+el(n.city,cut(city,35)||'-')+el(n.country,up(country).slice(0,2)||'TR')+(withLng&&n.lng?el(n.lng,lang):'')+el(n.tin,cut(tin,17));
}

export function mrnPlate(v){return up(v).replace(/[^A-Z0-9]/g,'')}

// d: beyanname değerleri (schema.js alanları), goods: eşya satırları, o: {sender,receiver (NCTS kimlikleri), now, lrn}
export function buildCC015B(d,goods,o={}){
 const now=o.now||new Date(),p2=n=>String(n).padStart(2,'0');
 const date8=now.getFullYear()+p2(now.getMonth()+1)+p2(now.getDate()),date6=date8.slice(2),time=p2(now.getHours())+p2(now.getMinutes());
 const lrn=cut(o.lrn||d.lrn||('PCS'+date8+time+String(Math.floor(Math.random()*900)+100)),22);
 const tot=goods.reduce((s,g)=>s+(Number.isFinite(num(g.gross))?num(g.gross):0),0);
 const pkgs=goods.reduce((s,g)=>s+parseKolis(g).reduce((a,k)=>a+(parseInt(k.count,10)||0),0),0);
 const mode={Karayolu:'3','Ro-Ro':'3',Tren:'2',Havayolu:'4',Kurye:'4',Deniz:'1'}[d.transportMode]||'3';
 const plate=cut(mrnPlate(d.borderVehicle||d.vehicle),27),plateC=up(d.borderVehicleCountry||d.vehicleCountry).slice(0,2)||'TR';
 const sec=first(d.security);
 let x='<?xml version="1.0" encoding="UTF-8"?>\n<CC015B>'+
 el('SynIdeMES1','UNOC')+el('SynVerNumMES2','3')+el('MesSenMES3',cut(o.sender||'NTA.TR',35))+el('MesRecMES6',cut(o.receiver||'NTA.TR',35))+
 el('DatOfPreMES9',date6)+el('TimOfPreMES10',time)+el('IntConRefMES11',cut(lrn,14))+el('MesIdeMES19',cut(lrn,14))+el('MesTypMES20','CC015B')+
 '<HEAHEA>'+el('RefNumHEA4',lrn)+el('TypOfDecHEA24',up(d.docType)||'T1')+el('CouOfDesCodHEA30',up(d.destinationCountry).slice(0,2))+
 el('AgrLocOfGooCodHEA38',d.aeo?cut(d.goodsLocation,17):'')+el('AutLocOfGooCodHEA41',d.aeo?cut(d.facilityCode,17):'')+
 el('PlaOfLoaCodHEA46',cut(d.loadPlace,17))+el('CouOfDisCodHEA55',up(d.dispatchCountry).slice(0,2)||'TR')+
 el('InlTraModHEA75',mode)+el('TraModAtBorHEA76',mode)+el('IdeOfMeaOfTraAtDHEA78',plate)+el('IdeOfMeaOfTraAtDHEA78LNG',plate?lang:'')+el('NatOfMeaOfTraAtDHEA80',plate?plateC:'')+
 el('ConIndHEA96',d.inContainer==='Evet'?'1':'0')+el('NCTSAccDocHEA601LNG',lang)+el('TotNumOfIteHEA305',goods.length)+el('TotNumOfPacHEA306',pkgs||undefined)+
 el('TotGroMasHEA307',dec(tot))+el('DecDatHEA383',date8)+el('DecPlaHEA394',cut(d.loadPlace||d.departureOffice&&String(d.departureOffice).split(/\s+/).slice(1).join(' ')||'TURKIYE',35))+el('DecPlaHEA394LNG',lang)+
 el('ComRefNumHEA',cut(d.remoteRef,70))+el('SecHEA358',sec==='1'?'1':'')+
 el('TruckId2',cut(mrnPlate(d.trailer),50))+el('DamgaVergi',d.stampDuty&&Number.isFinite(num(String(d.stampDuty).replace(/[^\d.,]/g,'')))?dec(String(d.stampDuty).replace(/[^\d.,]/g,''),2):'')+
 '</HEAHEA>'+
 '<TRAPRIPC1>'+party({name:'NamPC17',street:'StrAndNumPC122',post:'PosCodPC123',city:'CitPC124',country:'CouPC125',lng:'NADLNGPC',tin:'TINPC159'},'',d.principal||d.customer,d.principalAddress||'',d.principalCity||'',d.principalPostal||'',d.principalCountry||'TR',d.principalTin||'',true)+'</TRAPRIPC1>';
 if(t(d.sender))x+='<TRACONCO1>'+party({name:'NamCO17',street:'StrAndNumCO122',post:'PosCodCO123',city:'CitCO124',country:'CouCO125',lng:'NADLNGCO',tin:'TINCO159'},'',d.sender,d.senderAddress,'', '',d.senderCountry||'TR',d.senderEori,true)+'</TRACONCO1>';
 if(t(d.receiver))x+='<TRACONCE1>'+party({name:'NamCE17',street:'StrAndNumCE122',post:'PosCodCE123',city:'CitCE124',country:'CouCE125',lng:'NADLNGCE',tin:'TINCE159'},'',d.receiver,d.receiverAddress,'', '',d.destinationCountry||'',d.receiverEori,true)+'</TRACONCE1>';
 x+='<CUSOFFDEPEPT>'+el('RefNumEPT1',first(d.departureOffice))+'</CUSOFFDEPEPT>';
 const tr=(Array.isArray(d.transitOffices)?d.transitOffices:[]).map(v=>first(typeof v==='string'?v:v?.office||v?.code)).filter(Boolean).slice(0,9);
 tr.forEach(c=>{x+='<CUSOFFTRARNS>'+el('RefNumRNS1',c)+'</CUSOFFTRARNS>'});
 x+='<CUSOFFDESEST>'+el('RefNumEST1',first(d.arrivalOffice))+'</CUSOFFDESEST>';
 if(t(d.seal)&&!d.noSeal){const seals=t(d.seal).split(/[,;\n]+/).map(t).filter(Boolean).slice(0,99);if(seals.length)x+='<SEAINFSLI>'+el('SeaNumSLI2',seals.length)+seals.map(s=>'<SEAIDSID>'+el('SeaIdeSID1',cut(s,20))+el('SeaIdeSID1LNG',lang)+'</SEAIDSID>').join('')+'</SEAINFSLI>'}
 const gt=first(d.guaranteeType).slice(0,1)||'0';
 x+='<GUAGUA>'+el('GuaTypGUA1',/^[0-9A-Z]$/.test(gt)?gt:'0')+(t(d.guaranteeRef)?'<GUAREFREF>'+el('GuaRefNumGRNREF1',cut(d.guaranteeRef,24))+'<VALLIMECVLE>'+el('NotValForECVLE1','0')+'</VALLIMECVLE>'+'</GUAREFREF>':'')+'</GUAGUA>';
 goods.forEach((g,i)=>{
  const kol=parseKolis(g).filter(k=>k.type||k.count||k.desc);
  const docs=parseDocs(g).filter(c=>docNumber(c.code));
  const gtip=t(g.gtip).replace(/\D/g,'').slice(0,8);
  x+='<GOOITEGDS>'+el('IteNumGDS7',i+1)+el('ComCodTarCodGDS10',gtip)+el('GooDesGDS23',cut(g.description,280)||'-')+el('GooDesGDS23LNG',lang)+
   el('GroMasGDS46',dec(g.gross))+el('NetMasGDS48',dec(g.net));
  const exp=t(g.mrn);
  if(exp)x+=el('IhrBeyanNo',cut(exp,25))+el('IhrBeyanTip','I')+el('IhrBeyanParcali',/^(evet|y|yes|1)$/i.test(t(g.partial))?'Y':'N');
  docs.forEach(c=>{x+='<PRODOCDC2>'+el('DocTypDC21','N'+docNumber(c.code))+el('DocRefDC23',cut(c.ref,35))+el('DocRefDCLNG',c.ref?lang:'')+'</PRODOCDC2>'});
  if(t(g.invoice)&&!docs.some(c=>docNumber(c.code)==='380'))x+='<PRODOCDC2>'+el('DocTypDC21','N380')+el('DocRefDC23',cut(g.invoice,35))+el('DocRefDCLNG',lang)+'</PRODOCDC2>';
  if(t(g.sender)&&t(g.sender)!==t(d.sender))x+='<TRACONCO2>'+party({name:'NamCO27',street:'StrAndNumCO222',post:'PosCodCO223',city:'CitCO224',country:'CouCO225',lng:'NADLGTCO',tin:'TINCO259'},'',g.sender,g.senderAddress,g.senderCity,g.senderPostal,g.senderCountry||'TR',g.senderEori||g.senderTax,false)+'</TRACONCO2>';
  if(t(g.receiver)&&t(g.receiver)!==t(d.receiver))x+='<TRACONCE2>'+party({name:'NamCE27',street:'StrAndNumCE222',post:'PosCodCE223',city:'CitCE224',country:'CouCE225',lng:'NADLNGGICE',tin:'TINCE259'},'',g.receiver,g.receiverAddress,g.receiverCity,g.receiverPostal,g.receiverCountry||d.destinationCountry,g.receiverEori||g.receiverTax,false)+'</TRACONCE2>';
  (kol.length?kol:[{count:g.packages,type:'BI',desc:'ADDR'}]).forEach(k=>{x+='<PACGS2>'+el('MarNumOfPacGS21',cut(k.desc||'ADDR',42))+el('MarNumOfPacGS21LNG',lang)+el('KinOfPacGS23',typeCode(k.type)||'BI')+el('NumOfPacGS24',parseInt(k.count,10)||'')+'</PACGS2>'});
  x+='</GOOITEGDS>';
 });
 (Array.isArray(d.routeCountries)?d.routeCountries:[]).map(v=>up(typeof v==='string'?v:v?.country||v?.code).slice(0,2)).filter(Boolean).slice(0,99).forEach(c=>{x+='<ITI>'+el('CouOfRouCodITI1',c)+'</ITI>'});
 if(t(d.carrier)){x+='<CARTRA100>'+el('NamCARTRA121',cut(d.carrier,35))+el('TINCARTRA254',cut(d.carrierEori,17))+'</CARTRA100>'}
 return x+'</CC015B>';
}
