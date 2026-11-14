import sharp from 'sharp';
import assert from 'node:assert/strict';
// The old idle sheet had thousands of translucent background pixels in its first four frames.
const file=new URL('../public/images/game/diver-float.webp',import.meta.url);
const {data,info}=await sharp(file.pathname).ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.equal(info.width,1024);assert.equal(info.height,512);
for(let frame=0;frame<8;frame++){
 const alpha=(x,y)=>data[((Math.floor(frame/4)*256+y)*info.width+(frame%4)*256+x)*4+3];
 let residue=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const a=alpha(x,y);
  if((x<16||x>=240)&&(y<16||y>=240))assert.ok(a<16,`Frame ${frame}: nontransparent corner`);
  if(a<16||a>=192)continue;
  let nearSilhouette=false;
  for(let dy=-3;dy<=3&&!nearSilhouette;dy++)for(let dx=-3;dx<=3;dx++)if(x+dx>=0&&x+dx<256&&y+dy>=0&&y+dy<256&&alpha(x+dx,y+dy)>=192){nearSilhouette=true;break;}
  if(!nearSilhouette)residue++;
 }
 assert.equal(residue,0,`Frame ${frame}: stray translucent background pixels`);
}
console.log('Diver art passed: eight clean idle frames, transparent corners, no background residue.');
