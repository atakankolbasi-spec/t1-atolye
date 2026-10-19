/* PDF'i arka planda parçalara böler (ana sayfa donmasın). */
self.onmessage=async e=>{
 const {buf,partPages,maxBytes}=e.data;
 try{
  importScripts('vendor/pdf-lib.min.js');
  const {PDFDocument}=self.PDFLib;
  const src=await PDFDocument.load(new Uint8Array(buf),{ignoreEncryption:true}),total=src.getPageCount();
  self.postMessage({total});
  let n=0;
  for(let start=0;start<total;){
   let end=Math.min(total,start+partPages);
   for(;;){
    const out=await PDFDocument.create(),idx=[];for(let i=start;i<end;i++)idx.push(i);
    (await out.copyPages(src,idx)).forEach(pg=>out.addPage(pg));
    const bytes=await out.save();
    if(bytes.length>maxBytes&&end-start>1){end=start+Math.max(1,Math.floor((end-start)/2));continue}
    self.postMessage({part:bytes.buffer,n:++n,upto:end,total},[bytes.buffer]);break;
   }
   if(end>=total)break;start=Math.max(start+1,end-1);
  }
  self.postMessage({done:true});
 }catch(err){self.postMessage({error:String(err&&err.message||err)})}
};
