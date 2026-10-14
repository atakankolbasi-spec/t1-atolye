// Cyrillic/Greek -> Turkish-reading Latin (plain ASCII capitals, like the PCS template data). Latin text is returned unchanged.
const CYR={А:'A',Б:'B',В:'V',Г:'G',Д:'D',Е:'E',Ж:'J',З:'Z',И:'I',Й:'Y',К:'K',Л:'L',М:'M',Н:'N',О:'O',П:'P',Р:'R',С:'S',Т:'T',У:'U',Ф:'F',Х:'H',Ц:'TS',Ч:'C',Ш:'S',Щ:'ST',Ъ:'A',Ь:'',Ю:'YU',Я:'YA',Ы:'I',Э:'E',Ё:'YO',Є:'YE',І:'I',Ї:'YI',Ґ:'G',Ђ:'D',Ј:'Y',Љ:'LJ',Њ:'NJ',Ћ:'C',Џ:'DZ'};
const GRK={Α:'A',Β:'V',Γ:'G',Δ:'D',Ε:'E',Ζ:'Z',Η:'I',Θ:'TH',Ι:'I',Κ:'K',Λ:'L',Μ:'M',Ν:'N',Ξ:'X',Ο:'O',Π:'P',Ρ:'R',Σ:'S',Τ:'T',Υ:'Y',Φ:'F',Χ:'CH',Ψ:'PS',Ω:'O'};
export const hasNonLatin=v=>/[Ͱ-ϿЀ-ӿ]/.test(String(v??''));
export function toLatinTR(value){
 const text=String(value??'').trim();if(!text||!hasNonLatin(text))return text;
 let out='';
 for(const raw of text.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ου/gi,'OU')){
  const up=raw.toLocaleUpperCase('en'),ch=raw==='ς'?'Σ':up;
  if(CYR[ch]!==undefined)out+=CYR[ch];else if(GRK[ch]!==undefined)out+=GRK[ch];
  else if(raw==='№')out+=' NO ';else if('"„“”«»\'`'.includes(raw))out+=' ';else out+=raw;
 }
 return out.toLocaleUpperCase('en').replace(/\s+/g,' ').replace(/\s+([.,;])/g,'$1').trim();
}
const COUNTRIES={AT:'Avusturya',BE:'Belçika',BG:'Bulgaristan',CY:'Kıbrıs',CZ:'Çekya',DE:'Almanya',DK:'Danimarka',EE:'Estonya',EL:'Yunanistan',GR:'Yunanistan',ES:'İspanya',FI:'Finlandiya',FR:'Fransa',HR:'Hırvatistan',HU:'Macaristan',IE:'İrlanda',IT:'İtalya',LT:'Litvanya',LU:'Lüksemburg',LV:'Letonya',MT:'Malta',NL:'Hollanda',PL:'Polonya',PT:'Portekiz',RO:'Romanya',SE:'İsveç',SI:'Slovenya',SK:'Slovakya',XI:'Kuzey İrlanda',TR:'Türkiye',GB:'Birleşik Krallık'};
export const countryTR=code=>COUNTRIES[String(code??'').toUpperCase()]||'';
