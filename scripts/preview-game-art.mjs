import sharp from 'sharp';
import gifenc from 'gifenc';
import fs from 'node:fs/promises';
const {GIFEncoder,quantize,applyPalette}=gifenc;
const folder='public/images/game/';
const manifest=JSON.parse(await fs.readFile(folder+'manifest.json','utf8'));
const actors=[['diver-swim',45,56,150,10],['gold-swim',260,100,56,8],['teal-swim',345,95,66,8],['coral-swim',435,95,66,8],['shark-swim',515,20,260,7],['malia-idle',80,245,128,3],['tane-idle',250,245,128,3],['piko-idle',420,266,104,3]].map(([name,x,y,size,fps])=>[name,x,y,manifest[name].displayFrameSize,fps]);
const cached={};
for(const [name,,,size] of actors){const m=manifest[name];cached[name]=[];for(let i=0;i<m.frames;i++)cached[name].push(await sharp(folder+m.file).extract({left:i%m.columns*256,top:Math.floor(i/m.columns)*256,width:256,height:256}).resize(size,size).png().toBuffer());}
const labels=Buffer.from('<svg width="800" height="430"><g fill="#f5dfad" font-family="Georgia" font-size="16"><text x="28" y="30">REEFKEEPER · ANIMATION + RELATIVE SCALE</text><text x="70" y="225">Diver · 12 poses</text><text x="260" y="225">Fish · 8 poses each</text><text x="580" y="225">Shark · 8 poses</text><text x="80" y="410">Malia · 6 poses</text><text x="250" y="410">Tane · 6 poses</text><text x="420" y="410">Piko · 6 poses</text><text x="590" y="410">Boat + charm</text></g><path d="M28 237H772" stroke="#f5dfad" opacity=".4"/></svg>');
const boat=await sharp(folder+'boat.webp').resize(180,90).png().toBuffer();const charm=await sharp(folder+'charm.webp').resize(28,28).png().toBuffer();const gif=GIFEncoder();
for(let n=0;n<30;n++){
const layers=[{input:labels,left:0,top:0},...actors.map(([name,left,top,size,fps])=>({input:cached[name][Math.floor(n*fps/10)%manifest[name].frames],left,top})),{input:boat,left:580,top:285},{input:charm,left:748,top:345}];
const rgba=await sharp({create:{width:800,height:430,channels:4,background:'#236d69'}}).composite(layers).ensureAlpha().raw().toBuffer();const palette=quantize(rgba,256);gif.writeFrame(applyPalette(rgba,palette),800,430,{palette,delay:100});
}
gif.finish();await fs.writeFile('../outputs/game-art-animation-preview.gif',gif.bytes());console.log('Created animated scale preview.');
