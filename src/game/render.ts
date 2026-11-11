import { COLS, ROWS, obstacles } from "./grid";

export type Cell = { col: number; row: number };
export type RenderUnit = Cell & {
  id: string; name: string; role: string; color: string;
  path: Cell[] | null; stepProgress: number; task: string | null;
};
export type RescueSite = {
  id: string; name: string; kind: string; col: number; row: number; survivors: number;
};
export type VillageRenderState = {
  saved: Record<string, number>;
  units: RenderUnit[];
  selected: string;
  target: string | null;
  activePath: Cell[] | null;
};

export const iso = (col: number, row: number) => ({
  x: 450 + (col - row) * 34,
  y: 58 + (col + row) * 17
});

export function unitPosition(unit: RenderUnit) {
  if (unit.path?.length) {
    const next = unit.path[0];
    const t = Math.min(1, unit.stepProgress / 4);
    return iso(unit.col + (next.col - unit.col) * t, unit.row + (next.row - unit.row) * t);
  }
  return iso(unit.col, unit.row);
}

function polygon(ctx: CanvasRenderingContext2D, points: {x:number;y:number}[], fill: string, stroke?: string) {
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function oval(ctx: CanvasRenderingContext2D, x:number,y:number,rx:number,ry:number,fill:string) {
  ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill();
}
function rounded(ctx: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill();
}
function drawTree(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,variant:number) {
  oval(ctx,x+2*s,y+7*s,15*s,5*s,"rgba(20,45,27,.28)");
  ctx.fillStyle="#73553a";ctx.fillRect(x-2*s,y-12*s,4*s,17*s);
  const greens=[["#285d3c","#397b4b","#5a9658"],["#315b3b","#477b43","#71964d"],["#285548","#347b58","#58a06b"]][variant%3];
  oval(ctx,x,y-12*s,13*s,17*s,greens[0]);
  oval(ctx,x-7*s,y-20*s,10*s,13*s,greens[1]);
  oval(ctx,x+7*s,y-23*s,10*s,14*s,greens[2]);
  oval(ctx,x,y-31*s,8*s,12*s,greens[1]);
  oval(ctx,x-3*s,y-24*s,3*s,5*s,"rgba(255,255,255,.12)");
}
function drawBush(ctx:CanvasRenderingContext2D,x:number,y:number,s:number) {
  oval(ctx,x,y+3*s,12*s,4*s,"rgba(18,43,27,.2)");
  oval(ctx,x-5*s,y,7*s,7*s,"#39734a");oval(ctx,x+3*s,y-2*s,8*s,8*s,"#4d8951");
  oval(ctx,x+8*s,y+1*s,5*s,5*s,"#659b57");
}
function drawHouse(ctx:CanvasRenderingContext2D,x:number,y:number,kind:string,label="") {
  const scale=kind==="school"?1.25:kind==="shed"?.72:1;
  const w=25*scale,h=25*scale;
  oval(ctx,x+5,y+8,37*scale,11*scale,"rgba(18,35,23,.24)");
  if(kind==="rubble") {
    polygon(ctx,[{x:x-27,y:y},{x,y:y-13},{x:x+27,y:y},{x,y:y+12}],"#77766b","#55584e");
    polygon(ctx,[{x:x-20,y:y-1},{x:x-5,y:y-21},{x:x+8,y:y-4}],"#a49b85");
    polygon(ctx,[{x:x+2,y:y+1},{x:x+18,y:y-15},{x:x+25,y:y+1}],"#8a8273");
    return;
  }
  const wall=kind==="clinic"?"#e8d8bc":kind==="school"?"#e7dfc8":"#d8c09a";
  const side=kind==="clinic"?"#bba98e":kind==="school"?"#b9b29b":"#ad906c";
  const roof=kind==="clinic"?"#b7473f":kind==="school"?"#486d91":"#8f5942";
  polygon(ctx,[{x:x-w,y:y-8},{x,y:y+4},{x,y:y+h},{x:x-w,y:y+h-11}],wall,"#9a8468");
  polygon(ctx,[{x,y:y+4},{x:x+w,y:y-8},{x:x+w,y:y+h-11},{x,y:y+h}],side,"#806c53");
  polygon(ctx,[{x:x-w-4,y:y-8},{x,y:y-29*scale},{x:x+w+4,y:y-8},{x,y:y+5}],roof,"#714537");
  polygon(ctx,[{x:x-w-4,y:y-8},{x,y:y+5},{x:x-2,y:y+10},{x:x-w-7,y:y-3}],"#704437");
  // roof panels and eaves
  ctx.strokeStyle="rgba(255,225,190,.28)";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x-w+5,y-10);ctx.lineTo(x,y-24*scale);ctx.lineTo(x+w-5,y-10);ctx.stroke();
  // door and windows on the front-facing walls
  rounded(ctx,x-5,y+10,10,15,2,"#654d3c");
  rounded(ctx,x-19,y+5,8,8,1,"#9fc4c0");
  rounded(ctx,x+11,y+2,8,8,1,"#9fc4c0");
  ctx.strokeStyle="rgba(255,255,255,.45)";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x-15,y+9);ctx.lineTo(x-15,y+3);ctx.moveTo(x+15,y+6);ctx.lineTo(x+15,y);ctx.stroke();
  if(kind==="clinic"){rounded(ctx,x-5,y-38,10,10,2,"#fff");ctx.fillStyle="#c8433d";ctx.fillRect(x-1.5,y-36,3,7);ctx.fillRect(x-4,y-33,8,3);}
  if(kind==="school"){ctx.strokeStyle="#e9e7d8";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-30);ctx.lineTo(x,y-48);ctx.stroke();polygon(ctx,[{x,y:y-47},{x:x+16,y:y-44},{x,y:y-39}],"#d94b43");}
  if(label){ctx.font="600 10px Manrope, sans-serif";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.shadowColor="#17251b";ctx.shadowBlur=4;ctx.fillText(label,x,y+h+20);ctx.shadowBlur=0;}
}
function drawRoad(ctx:CanvasRenderingContext2D) {
  const curves=[
    [[78,300],[180,280],[235,330],[320,315],[400,270],[490,290],[570,250],[680,275],[810,220]],
    [[220,155],[285,195],[330,245],[410,265],[490,250],[560,205],[650,185]],
    [[355,390],[420,355],[480,365],[535,340],[600,330]]
  ];
  curves.forEach(points=>{
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.quadraticCurveTo((points[i-1][0]+x)/2,(points[i-1][1]+y)/2,x,y):ctx.moveTo(x,y));
    ctx.strokeStyle="#9a805e";ctx.lineWidth=25;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();
    ctx.strokeStyle="#d5bd91";ctx.lineWidth=19;ctx.stroke();
    ctx.strokeStyle="rgba(255,241,205,.28)";ctx.lineWidth=2;ctx.stroke();
  });
}
function drawVolunteer(ctx:CanvasRenderingContext2D,x:number,y:number,u:RenderUnit,bob:number) {
  oval(ctx,x,y+10,13,5,"rgba(12,25,18,.35)");
  // legs, torso, head and field helmet
  ctx.strokeStyle="#263a32";ctx.lineWidth=4;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(x-3,y+1+bob);ctx.lineTo(x-5,y+9+bob);ctx.moveTo(x+3,y+1+bob);ctx.lineTo(x+5,y+9+bob);ctx.stroke();
  rounded(ctx,x-7,y-12+bob,14,16,4,u.color);
  ctx.fillStyle="#d5a77f";ctx.beginPath();ctx.arc(x,y-17+bob,5.5,0,Math.PI*2);ctx.fill();
  oval(ctx,x,y-22+bob,7,3.5,"#e5c59a");
  ctx.fillStyle="#e9e3d5";ctx.fillRect(x-4,y-12+bob,8,2);
  if(u.role==="Medical"){ctx.fillStyle="#fff";ctx.fillRect(x-2,y-10+bob,4,7);ctx.fillRect(x-4,y-8+bob,8,3);}
  else if(u.role==="Supply"){rounded(ctx,x+5,y-10+bob,7,7,1,"#9b7449");}
  else {ctx.strokeStyle="#f4eee2";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+5,y-7+bob);ctx.lineTo(x+10,y-14+bob);ctx.stroke();}
}
export function drawWorld(canvas:HTMLCanvasElement|null,game:VillageRenderState,timeMs:number,sites:RescueSite[],camera={x:0,y:0,zoom:1}) {
  const ctx=canvas?.getContext("2d");if(!ctx)return;
  ctx.clearRect(0,0,900,520);
  ctx.save();ctx.translate(450+camera.x,260+camera.y);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-450,-260);
  // Layered ground, soft atmospheric light and edge vignette.
  const bg=ctx.createLinearGradient(0,0,0,520);bg.addColorStop(0,"#9abf79");bg.addColorStop(.48,"#76a963");bg.addColorStop(1,"#477e55");
  ctx.fillStyle=bg;ctx.fillRect(0,0,900,520);
  const light=ctx.createRadialGradient(320,90,10,350,180,520);light.addColorStop(0,"rgba(255,245,207,.35)");light.addColorStop(1,"rgba(255,245,207,0)");
  ctx.fillStyle=light;ctx.fillRect(0,0,900,520);
  // Meadow patches and subtle isometric terrain facets.
  for(let i=0;i<54;i++){const x=(i*137+31)%900,y=(i*83+19)%520;oval(ctx,x,y,18+(i%5)*5,7+(i%3)*3,i%2?"rgba(185,207,117,.13)":"rgba(35,103,63,.10)");}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const p=iso(c,r);polygon(ctx,[{x:p.x,y:p.y},{x:p.x+34,y:p.y+17},{x:p.x,y:p.y+34},{x:p.x-34,y:p.y+17}],(r+c)%2?"rgba(182,207,124,.13)":"rgba(43,112,65,.08)");
  }
  // Flood channel with banks, highlights and moving current.
  ctx.beginPath();ctx.moveTo(0,366);ctx.bezierCurveTo(155,325,210,402,350,365);ctx.bezierCurveTo(495,325,575,282,710,319);ctx.bezierCurveTo(790,341,850,288,900,278);ctx.lineTo(900,520);ctx.lineTo(0,520);ctx.closePath();
  const water=ctx.createLinearGradient(0,320,0,520);water.addColorStop(0,"#4e9ba2");water.addColorStop(.5,"#337d91");water.addColorStop(1,"#285e79");ctx.fillStyle=water;ctx.fill();
  ctx.strokeStyle="#b2c58a";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,366);ctx.bezierCurveTo(155,325,210,402,350,365);ctx.bezierCurveTo(495,325,575,282,710,319);ctx.bezierCurveTo(790,341,850,288,900,278);ctx.stroke();
  for(let i=0;i<13;i++){const x=(i*79+(timeMs*.018)%79)%900,y=390+(i%4)*25;ctx.strokeStyle="rgba(202,235,220,.24)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+10,y-3,x+23,y);ctx.stroke();}
  drawRoad(ctx);
  // A small timber footbridge crossing the flooded lane.
  const bridge={x:690,y:327};oval(ctx,bridge.x,bridge.y+10,42,10,"rgba(13,33,28,.28)");
  polygon(ctx,[{x:650,y:322},{x:690,y:303},{x:731,y:322},{x:690,y:342}],"#806044","#59412e");
  polygon(ctx,[{x:650,y:315},{x:690,y:296},{x:731,y:315},{x:690,y:334}],"#b98a58","#725337");
  for(let i=0;i<6;i++){const x=659+i*12;ctx.strokeStyle="#e0bb82";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,311-(Math.abs(x-690)*.45));ctx.lineTo(x,328-(Math.abs(x-690)*.45));ctx.stroke();}
  // Tree line and undergrowth, behind buildings.
  [[28,125],[86,190],[135,92],[205,132],[280,85],[720,90],[790,135],[850,90],[875,185],[830,245],[75,265],[140,430],[235,455],[790,455],[860,420],[745,455],[35,465]].forEach(([x,y],i)=>drawTree(ctx,x,y,.75+(i%4)*.13,i));
  for(let i=0;i<38;i++){const x=(i*113+53)%890,y=(i*71+211)%485;if(y<315||x<150||x>760)drawBush(ctx,x,y,.65+(i%3)*.16);}
  // Fixed obstacles, rubble and flooded tiles.
  obstacles.forEach(o=>{
    const p=iso(o.col,o.row);
    if(o.kind==="water"){
      oval(ctx,p.x,p.y+12,33,12,"rgba(16,56,68,.24)");
      polygon(ctx,[{x:p.x,y:p.y},{x:p.x+34,y:p.y+17},{x:p.x,y:p.y+34},{x:p.x-34,y:p.y+17}],"#367f91","#2b6577");
      for(let k=0;k<2;k++){ctx.strokeStyle="rgba(220,246,237,.36)";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(p.x-13+k*7,p.y+16+Math.sin(timeMs/450+k)*2);ctx.lineTo(p.x+12+k*7,p.y+16);ctx.stroke();}
    } else drawHouse(ctx,p.x,p.y,o.kind);
  });
  // Village buildings.
  sites.forEach(site=>{const p=iso(site.col,site.row);drawHouse(ctx,p.x,p.y,site.kind,site.name);});
  // Small field details.
  for(let i=0;i<44;i++){const x=(i*97+18)%890,y=(i*59+280)%480;if(y<360){oval(ctx,x,y,1.5,1.5,i%3?"#e5d99c":"#e6eee0");}}
  // Dispatch route and moving units.
  if(game.activePath&&game.activePath.length>1){
    ctx.setLineDash([7,6]);ctx.strokeStyle="rgba(255,248,218,.92)";ctx.lineWidth=3;ctx.beginPath();
    game.activePath.forEach((cell,i)=>{const p=iso(cell.col,cell.row);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.stroke();ctx.setLineDash([]);
    game.activePath.forEach(cell=>{const p=iso(cell.col,cell.row);oval(ctx,p.x,p.y,2.5,2.5,"#fff1bd");});
  }
  sites.forEach(site=>{
    const p=iso(site.col,site.row),done=game.saved[site.id]||0,remaining=site.survivors-done;
    oval(ctx,p.x,p.y-47,17,17,remaining<=0?"#286746":"#b43e38");
    ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y-47,17,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#fff";ctx.font="bold 12px Manrope";ctx.textAlign="center";ctx.fillText(remaining<=0?"✓":String(remaining),p.x,p.y-43);
    if(game.target===site.id){ctx.beginPath();ctx.arc(p.x,p.y-47,25,0,Math.PI*2);ctx.strokeStyle="#fff5b8";ctx.lineWidth=2;ctx.stroke();}
  });
  game.units.forEach(unit=>{
    const p=unitPosition(unit),bob=unit.task?Math.sin(timeMs/170+unit.col+unit.row)*1.8:0;
    drawVolunteer(ctx,p.x,p.y,unit,bob);
    if(game.selected===unit.id){ctx.beginPath();ctx.ellipse(p.x,p.y+1,19,9,0,0,Math.PI*2);ctx.strokeStyle="#fff1a8";ctx.lineWidth=2.5;ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y-18,13,Math.PI,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.stroke();}
  });
  // In-world sector label and soft vignette.
  rounded(ctx,18,16,248,34,9,"rgba(18,38,28,.76)");
  ctx.fillStyle="#e9f0df";ctx.font="600 11px Manrope";ctx.textAlign="left";ctx.fillText("CHATKHIL  /  FLOOD RESPONSE ZONE",31,38);
  const vignette=ctx.createRadialGradient(450,260,210,450,260,560);vignette.addColorStop(0,"rgba(5,20,13,0)");vignette.addColorStop(1,"rgba(5,20,13,.28)");ctx.fillStyle=vignette;ctx.fillRect(0,0,900,520);
  ctx.restore();
}
