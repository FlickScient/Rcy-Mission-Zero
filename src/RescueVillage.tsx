// @ts-nocheck
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Heart,Package,Radio,Shield,Users,Zap} from "lucide-react";

const COLS=12,ROWS=8;
const sites=[
  {id:"north",name:"North Hamlet",kind:"homes",col:2,row:2,survivors:2,need:"Rescue team"},
  {id:"school",name:"Village School",kind:"school",col:8,row:1,survivors:1,need:"Medical kit"},
  {id:"clinic",name:"Riverside Clinic",kind:"clinic",col:9,row:5,survivors:2,need:"Safe evacuation"},
  {id:"market",name:"Market Road",kind:"homes",col:3,row:6,survivors:1,need:"Rescue team"}
];
const units=[
  {id:"alpha",name:"Team Alpha",role:"Rescue",col:5,row:3,color:"#f3eee3"},
  {id:"bravo",name:"Team Bravo",role:"Medical",col:6,row:4,color:"#e9b7b5"},
  {id:"charlie",name:"Team Charlie",role:"Supply",col:4,row:4,color:"#b9d5c7"}
];
const iso=(c,r)=>({x:450+(c-r)*34,y:58+(c+r)*17});
function poly(ctx,pts,fill,stroke){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function ellipse(ctx,x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function tree(ctx,x,y,s=1){ellipse(ctx,x,y+8*s,13*s,5*s,"#285d43");poly(ctx,[{x:x-10*s,y:y},{x,y:y-28*s},{x:x+10*s,y:y}], "#397e51");poly(ctx,[{x:x-8*s,y:y-12*s},{x,y:y-38*s},{x:x+8*s,y:y-12*s}], "#4b9860");}
function building(ctx,p,kind,label){
 const w=kind==="school"?39:32,h=kind==="school"?26:22;
 poly(ctx,[{x:p.x-w,y:p.y-7},{x:p.x,y:p.y-19},{x:p.x+w,y:p.y-7},{x:p.x,y:p.y+5}],"#b7a17d","#78654c");
 poly(ctx,[{x:p.x-w,y:p.y-7},{x:p.x,y:p.y+5},{x:p.x,y:p.y+h},{x:p.x-w,y:p.y+h-12}],"#c9b18a");
 poly(ctx,[{x:p.x,y:p.y+5},{x:p.x+w,y:p.y-7},{x:p.x+w,y:p.y+h-12},{x:p.x,y:p.y+h}],"#92795d");
 poly(ctx,[{x:p.x-w-3,y:p.y-7},{x:p.x,y:p.y-26},{x:p.x+w+3,y:p.y-7},{x:p.x,y:p.y+4}],"#a74742");
 ctx.fillStyle="#f4e9d4";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText(label,p.x,p.y+h+14);
}
function drawWorld(canvas,game){
 const ctx=canvas.getContext("2d");if(!ctx)return;
 ctx.clearRect(0,0,900,520);
 const bg=ctx.createLinearGradient(0,0,0,520);bg.addColorStop(0,"#a8c982");bg.addColorStop(1,"#6f9c63");ctx.fillStyle=bg;ctx.fillRect(0,0,900,520);
 // distant river and grassy terrain
 poly(ctx,[{x:0,y:360},{x:95,y:322},{x:210,y:350},{x:330,y:300},{x:440,y:327},{x:565,y:270},{x:680,y:300},{x:900,y:235},{x:900,y:520},{x:0,y:520}],"#6a9b72");
 poly(ctx,[{x:0,y:410},{x:120,y:370},{x:220,y:394},{x:330,y:355},{x:440,y:385},{x:570,y:328},{x:700,y:358},{x:900,y:295},{x:900,y:360},{x:700,y:420},{x:570,y:390},{x:440,y:445},{x:300,y:420},{x:170,y:455},{x:0,y:470}],"#4e9eb0");
 // isometric grass tiles
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const p=iso(c,r);poly(ctx,[{x:p.x,y:p.y},{x:p.x+34,y:p.y+17},{x:p.x,y:p.y+34},{x:p.x-34,y:p.y+17}],(r+c)%2?"#83b66d":"#8cbd73","#78a965");}
 // roads
 const road=(a,b)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle="#c7b58d";ctx.lineWidth=17;ctx.lineCap="round";ctx.stroke();ctx.strokeStyle="#e0d1ad";ctx.lineWidth=11;ctx.stroke();};
 road(iso(1,4),iso(10,4));road(iso(5,1),iso(5,7));road(iso(1,2),iso(9,5));
 // decorative trees
 [[0,1],[1,0],[10,0],[11,2],[0,6],[10,7],[2,7],[7,7],[11,6],[3,0]].forEach(([c,r],i)=>{const p=iso(c,r);tree(ctx,p.x,p.y,0.8+(i%3)*.12)});
 sites.forEach(site=>{const p=iso(site.col,site.row);building(ctx,p,site.kind,site.name);});
 // rescue markers
 sites.forEach(site=>{const p=iso(site.col,site.row);const done=game.saved[site.id]||0;ellipse(ctx,p.x,p.y-43,15,15,done>=site.survivors?"#285d43":"#d94b43");ctx.fillStyle="#fff";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText(done>=site.survivors?"✓":String(site.survivors-done),p.x,p.y-39);if(game.target===site.id){ctx.beginPath();ctx.arc(p.x,p.y-43,22,0,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}});
 // volunteer units
 game.units.forEach(u=>{const p=iso(u.col,u.row);ellipse(ctx,p.x,p.y+8,15,6,"#41633e");ellipse(ctx,p.x,p.y-7,9,9,u.color);ctx.fillStyle="#29332b";ctx.fillRect(p.x-5,p.y-1,10,12);ctx.fillStyle="#fff";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.fillText(u.id[0].toUpperCase(),p.x,p.y+3);if(game.selected===u.id){ctx.beginPath();ctx.arc(p.x,p.y-5,17,0,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}});
 ctx.fillStyle="rgba(18,34,27,.72)";ctx.fillRect(16,16,220,40);ctx.fillStyle="#fff";ctx.font="bold 12px sans-serif";ctx.textAlign="left";ctx.fillText("CHATKHIL · FLOOD RESPONSE ZONE",28,41);
}
export default function RescueVillage({onBack,user}){
 const canvasRef=useRef(null),[selected,setSelected]=useState("alpha"),[saved,setSaved]=useState({}),[unitsState,setUnitsState]=useState(units.map(u=>({...u,task:null,progress:0}))),[supplies,setSupplies]=useState({kits:5,water:8}),[seconds,setSeconds]=useState(180),[running,setRunning]=useState(true),[message,setMessage]=useState("Select a volunteer, then tap a marked location to assign a task."),[target,setTarget]=useState(null);
 const totalSaved=Object.values(saved).reduce((a,b)=>a+b,0),totalNeeded=sites.reduce((a,s)=>a+s.survivors,0),complete=totalSaved>=totalNeeded;
 const game={saved,units:unitsState,selected,target};
 useEffect(()=>{if(!running||complete||seconds<=0)return;const id=setInterval(()=>{setSeconds(s=>Math.max(0,s-1));setUnitsState(prev=>prev.map(u=>{if(!u.task)return u;const progress=u.progress+1;if(progress>=8){const site=sites.find(x=>x.id===u.task);setSaved(old=>({...old,[site.id]:Math.min(site.survivors,(old[site.id]||0)+1)}));setMessage(u.name+" evacuated one survivor from "+site.name+".");return {...u,task:null,progress:0};}return {...u,progress};}));},1000);return()=>clearInterval(id);},[running,complete,seconds]);
 useEffect(()=>{if(canvasRef.current)drawWorld(canvasRef.current,game);});
 function clickMap(e){const rect=canvasRef.current.getBoundingClientRect(),x=(e.clientX-rect.left)*900/rect.width,y=(e.clientY-rect.top)*520/rect.height;
  const unit=unitsState.find(u=>{const p=iso(u.col,u.row);return Math.hypot(p.x-x,p.y-7-y)<24;});
  if(unit){setSelected(unit.id);setMessage(unit.name+" selected. Choose a red rescue marker.");return;}
  const site=sites.find(s=>{const p=iso(s.col,s.row);return Math.hypot(p.x-x,p.y-43-y)<28;});
  if(site){const u=unitsState.find(x=>x.id===selected);if(!u){setMessage("Select a volunteer first.");return;}if(u.task){setMessage(u.name+" is already on a task.");return;}if((saved[site.id]||0)>=site.survivors){setMessage("This location is already cleared.");return;}if(supplies.kits<=0){setMessage("No rescue kits remaining. Mission failed.");return;}setTarget(site.id);setSupplies(v=>({...v,kits:v.kits-1}));setUnitsState(prev=>prev.map(x=>x.id===selected?{...x,task:site.id,progress:0}:x));setMessage(u.name+" dispatched to "+site.name+". Stay focused.");return;}
  setMessage("Tap a volunteer or a red rescue marker.");
 }
 function restart(){setSaved({});setUnitsState(units.map(u=>({...u,task:null,progress:0})));setSupplies({kits:5,water:8});setSeconds(180);setRunning(true);setTarget(null);setMessage("New operation started. Select a volunteer and assign a rescue.");}
 const time=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 return <section className="rescue-shell">
  <div className="rescue-heading"><button className="back-link" onClick={onBack}><ArrowLeft size={15}/> BACK TO BASE</button><span className="section-kicker">LIVE OPERATION / CHATKHIL SECTOR 04</span><h1>RESCUE <em>COMMANDER.</em></h1><p>Flood-hit village · Isometric field simulation</p></div>
  <div className="rescue-hud"><div><span>MISSION TIME</span><b>{time}</b></div><div><span>SURVIVORS SAFE</span><b>{totalSaved}/{totalNeeded}</b></div><div><span>RESCUE KITS</span><b>{supplies.kits}</b></div><div><span>WATER CRATES</span><b>{supplies.water}</b></div></div>
  <div className="rescue-map-wrap"><canvas ref={canvasRef} width="900" height="520" onClick={clickMap} aria-label="Interactive isometric village map. Select a volunteer and click a rescue marker."/><div className="map-legend"><span><i className="legend-unit"/> VOLUNTEER</span><span><i className="legend-target"/> RESCUE SITE</span><span><i className="legend-safe"/> CLEARED</span></div></div>
  <div className="rescue-control-grid"><div className="rescue-panel"><div className="rescue-panel-head"><Users size={17}/> VOLUNTEER TEAMS</div>{unitsState.map(u=><button key={u.id} className={"rescue-unit "+(selected===u.id?"active":"")} onClick={()=>setSelected(u.id)}><span className="unit-avatar">{u.id.slice(0,1).toUpperCase()}</span><span><b>{u.name}</b><small>{u.role} · {u.task?"ON ASSIGNMENT":"AVAILABLE"}</small></span><span className="unit-state">{u.task?u.progress+"/8s":"READY"}</span></button>)}</div><div className="rescue-panel"><div className="rescue-panel-head"><Radio size={17}/> FIELD INTEL</div><p className="rescue-message">{message}</p><div className="rescue-objective"><b>PRIMARY OBJECTIVE</b><span>Evacuate all {totalNeeded} survivors from four marked locations before the operation timer expires.</span></div><div className="rescue-progress"><i style={{width:(totalSaved/totalNeeded*100)+"%"}}/></div><small>{Math.round(totalSaved/totalNeeded*100)}% AREA SECURED</small></div></div>
  {(complete||seconds===0||supplies.kits===0)&&<div className="rescue-result"><div className="section-kicker">{complete?"OPERATION COMPLETE":"OPERATION ENDED"}</div><h2>{complete?"Village evacuation successful.":"Mission needs another attempt."}</h2><p>{totalSaved} of {totalNeeded} survivors evacuated. This prototype is a local gameplay demo; results are not yet added to your account XP or leaderboard.</p><button className="primary-button" onClick={restart}>RESTART OPERATION <Zap size={15}/></button></div>}
  <p className="rescue-disclaimer"><Shield size={13}/> GAMEPLAY PROTOTYPE · SIMULATED SCENARIO · NOT REAL-WORLD DEPLOYMENT GUIDANCE.</p>
 </section>;
}
