import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'art/source');
const dest=path.join(root,'public/images/game');
await fs.mkdir(dest,{recursive:true});
const sheets={ 'diver-swim':[4,3], 'gold-swim':[4,2], 'teal-swim':[4,2], 'coral-swim':[4,2], 'shark-swim':[4,2], 'malia-idle':[3,2], 'tane-idle':[3,2], 'piko-idle':[3,2], 'shore-walk':[4,2] };
const manifest={};
for(const [name,[cols,rows]] of Object.entries(sheets)){
 const file=path.join(source,name+'.png');
 await fs.access(file);
 const {width,height}=await sharp(file).metadata();
 const raw=await sharp(file).ensureAlpha().raw().toBuffer();let clear=0;for(let i=3;i<raw.length;i+=4)if(raw[i]<16)clear++;
 if(clear/(width*height)<.2)throw Error(name+' fails alpha validation');
 let frames=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const left=Math.round(x*width/cols),top=Math.round(y*height/rows);
  const frame=await sharp(file).extract({left,top,width:Math.round((x+1)*width/cols)-left,height:Math.round((y+1)*height/rows)-top}).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  frames.push(frame);
 }
 if(name.endsWith('-idle')||name==='shore-walk') frames=await registerFeet(frames);
 await sharp({create:{width:cols*256,height:rows*256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames.map((input,i)=>({input,left:(i%cols)*256,top:Math.floor(i/cols)*256}))).webp({lossless:true}).toFile(path.join(dest,name+'.webp'));
 const frameBounds=[];
 for(const frame of frames){const {data}=await sharp(frame).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=256,r=0,t=256,b=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]>128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}frameBounds.push({width:r-l+1,height:b-t+1});}
 const targetFishLength={'gold-swim':48,'teal-swim':54,'coral-swim':58}[name];
 const maxVisibleWidth=Math.max(...frameBounds.map(b=>b.width));
 const displaySize=targetFishLength?Math.round(targetFishLength*256/maxVisibleWidth):{'diver-swim':150,'shark-swim':260,'malia-idle':128,'tane-idle':128,'piko-idle':104,'shore-walk':116}[name];
 manifest[name]={file:name+'.webp',kind:'animation',frameWidth:256,frameHeight:256,frames:cols*rows,columns:cols,rows,fps:name==='diver-swim'?10:name==='shark-swim'?7:name.endsWith('-idle')?3:8,displayFrameSize:displaySize,visibleMaxWidth:Math.round(maxVisibleWidth*displaySize/256),visibleMaxHeight:Math.round(Math.max(...frameBounds.map(b=>b.height))*displaySize/256)};
 if(name==='diver-swim'){
  const gif=GIFEncoder();
  for(const frame of frames){const rgba=await sharp(frame).flatten({background:'#236d69'}).ensureAlpha().raw().toBuffer();const palette=quantize(rgba,256);const index=applyPalette(rgba,palette);gif.writeFrame(index,256,256,{palette,delay:110});}
  gif.finish();await fs.mkdir(path.resolve(root,'../outputs'),{recursive:true});await fs.writeFile(path.resolve(root,'../outputs/diver-swim-preview.gif'),gif.bytes());
 }
}
for(const [name,w,h] of [['reef',1620,540],['village-night',960,540],['town-panorama',1800,600],['town-restored',1800,600]]){
 await fs.access(path.join(source,name+'.png'));
 await sharp(path.join(source,name+'.png')).resize(w,h).webp({quality:92}).toFile(path.join(dest,name+'.webp'));
 manifest[name]={file:name+'.webp',kind:'environment',width:w,height:h};
}
for(const name of ['boat','charm']){
 await fs.access(path.join(source,name+'.png'));
 await sharp(path.join(source,name+'.png')).trim().resize(name==='boat'?384:96,name==='boat'?192:96,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true}).toFile(path.join(dest,name+'.webp'));
 manifest[name]={file:name+'.webp',kind:'prop',displaySize:name==='boat'?[180,90]:[28,28]};
}
await fs.writeFile(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2));console.log('Prepared animation atlases:',Object.keys(manifest).join(', '));

async function registerFeet(frames){
 const boxes=[];
 for(const frame of frames){
  const {data,info}=await sharp(frame).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=256,t=256,r=0,b=0;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]>192){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  if(l===256)throw Error('Empty actor frame');
  if(t===0||b===255)throw Error('Clipped actor frame: regenerate source');
  let feetLeft=256,feetRight=0;
  for(let y=Math.max(t,b-10);y<=b;y++)for(let x=l;x<=r;x++)if(data[(y*256+x)*4+3]>192){feetLeft=Math.min(feetLeft,x);feetRight=Math.max(feetRight,x);}
  boxes.push({l,t,r,b,feet:(feetLeft+feetRight)/2});
 }
 const scale=Math.min(218/Math.max(...boxes.map(b=>b.b-b.t+1)),230/Math.max(...boxes.map(b=>b.r-b.l+1)));
 return Promise.all(frames.map(async(frame,i)=>{
  const b=boxes[i],width=Math.round((b.r-b.l+1)*scale),height=Math.round((b.b-b.t+1)*scale);
  const input=await sharp(frame).extract({left:b.l,top:b.t,width:b.r-b.l+1,height:b.b-b.t+1}).resize(width,height).png().toBuffer();
  return sharp({create:{width:256,height:256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left:Math.round(128-(b.feet-b.l)*scale),top:240-height}]).png().toBuffer();
 }));
}
