export const TILE=16;
export const WORLD_COLS=50;
export const WORLD_ROWS=32;
export const VIEW_W=480;
export const VIEW_H=300;
export const WORLD_W=WORLD_COLS*TILE;
export const WORLD_H=WORLD_ROWS*TILE;

export type Point={x:number;y:number};
export type ZoneId='guide'|'wheel'|'staking'|'rent'|'trade'|'mint';
export type Zone={id:ZoneId;name:string;short:string;x:number;y:number;accent:string;description:string};
export const ZONES:Zone[]=[
  {id:'guide',name:'Pip the Guide',short:'PIP',x:25.5*TILE,y:15.5*TILE,accent:'#f9e19a',description:'Your first friend in the Squeek neighborhood.'},
  {id:'wheel',name:'Wheelhouse',short:'WHEEL',x:9.5*TILE,y:11.5*TILE,accent:'#ffce78',description:'A place to play Wheel Circuit and collect arcade work pulses.'},
  {id:'staking',name:'Staking Grove',short:'STAKE',x:40.5*TILE,y:11.5*TILE,accent:'#8cf4cc',description:'Learn how official Squeekchain staking works.'},
  {id:'rent',name:'Rental Burrow',short:'RENT',x:9.5*TILE,y:20.5*TILE,accent:'#c4b6ff',description:'Find temporary VeilHub usage rights.'},
  {id:'trade',name:'Trade Market',short:'TRADE',x:40.5*TILE,y:20.5*TILE,accent:'#ff9e98',description:'Browse real on-chain Squeek NFT sales.'},
  {id:'mint',name:'Test Claim Gate',short:'CLAIM',x:25.5*TILE,y:4.5*TILE,accent:'#a7dbff',description:'Visit the official Sepolia test claim page if your wallet is eligible.'}
];
const BUILDINGS=[
  {x:6,y:5,w:7,h:5,roof:'#ab704b',wall:'#ddbb86',trim:'#713f3e',label:'WHEELHOUSE',kind:'wheel'},
  {x:37,y:5,w:7,h:5,roof:'#4b9683',wall:'#bbdcb7',trim:'#346259',label:'STAKING',kind:'staking'},
  {x:6,y:22,w:7,h:5,roof:'#8972a3',wall:'#d8c9de',trim:'#5e5077',label:'RENTAL BURROW',kind:'rent'},
  {x:37,y:22,w:7,h:5,roof:'#b9756e',wall:'#e6c6af',trim:'#784c50',label:'TRADE MARKET',kind:'trade'}
] as const;
const TREES=[{x:3,y:3},{x:15,y:3},{x:21,y:7},{x:30,y:6},{x:46,y:3},{x:2,y:11},{x:17,y:12},{x:32,y:12},{x:46,y:12},{x:3,y:19},{x:16,y:20},{x:47,y:19},{x:2,y:27},{x:17,y:28},{x:29,y:29},{x:46,y:28},{x:34,y:3},{x:46,y:26}];
const PONDS=[{x:14,y:5,w:6,h:5},{x:30,y:22,w:6,h:5}];
const hash=(x:number,y:number)=>{let n=(x*374761393+y*668265263)>>>0;n=(n^(n>>>13))*1274126177;return (n^(n>>>16))>>>0};
const inRect=(x:number,y:number,r:{x:number;y:number;w:number;h:number})=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h;
const path=(x:number,y:number)=>
  (y>=14&&y<=17)||(x>=23&&x<=26)||
  (x>=8&&x<=10&&y>=10&&y<=22)||
  (x>=39&&x<=41&&y>=10&&y<=22);
export function solidAt(x:number,y:number){
  if(x<8||y<8||x>=WORLD_W-8||y>=WORLD_H-8)return true;
  const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
  return BUILDINGS.some(b=>inRect(tx,ty,b))||PONDS.some(p=>inRect(tx,ty,p))||TREES.some(t=>Math.abs(tx-t.x)<=0&&Math.abs(ty-t.y)<=0);
}
export function canStand(x:number,y:number){return ![[-5,-5],[5,-5],[-5,5],[5,5]].some(([dx,dy])=>solidAt(x+dx,y+dy))}
export function nearestZone(player:Point){let best:Zone|undefined;let bestDistance=30;for(const zone of ZONES){const d=Math.hypot(zone.x-player.x,zone.y-player.y);if(d<bestDistance){best=zone;bestDistance=d}}return best}
export function cameraFor(player:Point){return {x:Math.max(0,Math.min(WORLD_W-VIEW_W,Math.round(player.x-VIEW_W/2))),y:Math.max(0,Math.min(WORLD_H-VIEW_H,Math.round(player.y-VIEW_H/2)))}}
function rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function label(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,color:string){ctx.font='bold 6px monospace';const width=ctx.measureText(text).width;rect(ctx,x-width/2-4,y-9,width+8,12,'#161b29');rect(ctx,x-width/2-4,y+2,width+8,1,color);ctx.fillStyle=color;ctx.fillText(text,Math.round(x-width/2),Math.round(y))}
function drawTerrain(ctx:CanvasRenderingContext2D,camera:Point,time:number){
  const minX=Math.max(0,Math.floor(camera.x/TILE)-1),maxX=Math.min(WORLD_COLS,Math.ceil((camera.x+VIEW_W)/TILE)+1);
  const minY=Math.max(0,Math.floor(camera.y/TILE)-1),maxY=Math.min(WORLD_ROWS,Math.ceil((camera.y+VIEW_H)/TILE)+1);
  for(let ty=minY;ty<maxY;ty++)for(let tx=minX;tx<maxX;tx++){
    const x=tx*TILE-camera.x,y=ty*TILE-camera.y,h=hash(tx,ty);
    const pond=PONDS.some(p=>inRect(tx,ty,p));
    if(pond){rect(ctx,x,y,16,16,h%3===0?'#336f84':'#295b72');rect(ctx,x+2,y+3,6,1,'#68abc0');if((Math.floor(time/550)+tx+ty)%4===0)rect(ctx,x+9,y+9,4,1,'#9ad5d2');continue}
    const road=path(tx,ty);
    rect(ctx,x,y,16,16,road?(h%3===0?'#806b70':'#75656e'):(h%4===0?'#2b5045':h%4===1?'#2a493f':'#305447'));
    if(road){rect(ctx,x+1,y+1,14,1,'#9d8a86');if(h%3===0)rect(ctx,x+10,y+10,3,2,'#a88b82')}
    else if(h%7===0){rect(ctx,x+4,y+7,2,2,'#a8c589');rect(ctx,x+6,y+6,2,2,h%2?'#ecc4a0':'#e6b7d4')}
    else if(h%5===0){rect(ctx,x+3,y+11,1,3,'#6e9b6b');rect(ctx,x+11,y+3,2,1,'#67a17b')}
  }
}
function drawTree(ctx:CanvasRenderingContext2D,x:number,y:number){rect(ctx,x-2,y+4,5,9,'#593f41');rect(ctx,x-9,y-8,18,14,'#173e3b');rect(ctx,x-7,y-11,14,5,'#306855');rect(ctx,x-5,y-8,9,3,'#4b8a6b');rect(ctx,x-10,y-3,4,6,'#2a5f4d');rect(ctx,x+7,y-3,4,6,'#2a5f4d')}
function drawBuilding(ctx:CanvasRenderingContext2D,b:typeof BUILDINGS[number],camera:Point,time:number){
  const x=b.x*TILE-camera.x,y=b.y*TILE-camera.y,w=b.w*TILE,h=b.h*TILE;
  rect(ctx,x-4,y+h-6,w+8,10,'#161c29');
  rect(ctx,x,y+20,w,h-19,b.wall);rect(ctx,x+4,y+25,w-8,h-29,'#ab958f');
  rect(ctx,x-5,y+2,w+10,27,b.trim);rect(ctx,x-2,y-2,w+4,23,b.roof);rect(ctx,x+4,y+3,w-8,4,'#ffffff30');
  for(let i=0;i<3;i++)rect(ctx,x+8+i*30,y+11,13,3,'#171b29');
  rect(ctx,x+12,y+39,13,16,'#314b58');rect(ctx,x+15,y+42,7,7,'#b5d4cb');
  rect(ctx,x+w-25,y+39,13,16,'#314b58');rect(ctx,x+w-22,y+42,7,7,'#b5d4cb');
  rect(ctx,x+w/2-9,y+h-25,18,25,b.trim);rect(ctx,x+w/2-6,y+h-22,12,22,'#232433');rect(ctx,x+w/2+3,y+h-12,2,2,'#ffd16a');
  const glow=(Math.sin(time/430)+1)/2;rect(ctx,x+w/2-2,y+h-5,4,2,glow>.5?'#ffda7d':'#b48264');
  label(ctx,b.label,x+w/2,y-8,b.kind==='staking'?'#8cf4cc':b.kind==='wheel'?'#ffce78':b.kind==='trade'?'#ffaaa0':'#d9c6ff');
}
function drawSpot(ctx:CanvasRenderingContext2D,z:Zone,camera:Point,time:number,visited:boolean){
  if(z.id==='guide')return;
  const x=Math.round(z.x-camera.x),y=Math.round(z.y-camera.y);
  const bob=Math.round(Math.sin(time/350)*2);
  rect(ctx,x-8,y-2,16,5,'#131a25');rect(ctx,x-6,y-7+bob,12,10,visited?'#607b7e':z.accent);
  rect(ctx,x-3,y-4+bob,6,4,'#233444');rect(ctx,x-2,y-3+bob,4,2,'#f6efd7');
}
function drawGuide(ctx:CanvasRenderingContext2D,camera:Point,time:number){const z=ZONES[0],x=Math.round(z.x-camera.x),y=Math.round(z.y-camera.y);rect(ctx,x-6,y+3,12,3,'#172425');rect(ctx,x-4,y-8,8,12,'#e4a982');rect(ctx,x-6,y-7,12,7,'#e5be91');rect(ctx,x-4,y-10,3,4,'#d89489');rect(ctx,x+1,y-10,3,4,'#d89489');rect(ctx,x-2,y-4,1,1,'#172327');rect(ctx,x+2,y-4,1,1,'#172327');if(Math.floor(time/800)%2===0)rect(ctx,x+7,y-13,2,2,'#ffd16a');label(ctx,'PIP',x,y-15,'#f9e19a')}
function drawPlayer(ctx:CanvasRenderingContext2D,player:Point,camera:Point,time:number,staked:boolean,direction:string){
  const x=Math.round(player.x-camera.x),y=Math.round(player.y-camera.y)+Math.round(Math.sin(time/120)*.5);
  rect(ctx,x-6,y+5,12,3,'#10221e');
  if(direction==='left')rect(ctx,x+6,y+1,6,2,'#ff9b83');else rect(ctx,x-11,y+1,6,2,'#ff9b83');
  rect(ctx,x-7,y-8,5,6,'#1e3436');rect(ctx,x+2,y-8,5,6,'#1e3436');rect(ctx,x-6,y-7,3,4,'#e8a995');rect(ctx,x+3,y-7,3,4,'#e8a995');
  rect(ctx,x-7,y-3,14,11,'#1b3332');rect(ctx,x-6,y-4,12,10,'#88edcb');rect(ctx,x-5,y+3,10,4,'#c7ffe4');
  rect(ctx,x-4,y-1,2,2,'#152b2c');rect(ctx,x+2,y-1,2,2,'#152b2c');rect(ctx,x-1,y+2,2,2,'#ff9d94');
  rect(ctx,x-6,y+7,4,2,'#f9b59b');rect(ctx,x+2,y+7,4,2,'#f9b59b');
  if(staked){rect(ctx,x+6,y-9,4,4,'#ffd16a');rect(ctx,x+7,y-8,2,2,'#fff5c1')}
}
export function drawWorld(ctx:CanvasRenderingContext2D,player:Point,camera:Point,time:number,visited:Set<ZoneId>,staked:boolean,direction:string){
  ctx.imageSmoothingEnabled=false;rect(ctx,0,0,VIEW_W,VIEW_H,'#1c3440');drawTerrain(ctx,camera,time);
  for(const tree of TREES)drawTree(ctx,(tree.x+.5)*TILE-camera.x,(tree.y+.5)*TILE-camera.y);
  for(const b of BUILDINGS)drawBuilding(ctx,b,camera,time);
  for(const z of ZONES)drawSpot(ctx,z,camera,time,visited.has(z.id));
  drawGuide(ctx,camera,time);drawPlayer(ctx,player,camera,time,staked,direction);
  rect(ctx,0,0,VIEW_W,1,'#8ab6aa');rect(ctx,0,VIEW_H-1,VIEW_W,1,'#162128');
}
