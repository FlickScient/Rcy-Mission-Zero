// @ts-nocheck
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Radio,Shield,Users,Zap} from "lucide-react";
import {COLS,ROWS,obstacles} from "./game/grid";
import {findPath} from "./game/pathfinding";

const STEP_TICKS=4;
const sites=[
  {id:"north",name:"North Hamlet",kind:"homes",col:2,row:2,survivors:2,need:"Rescue team"},
  {id:"school",name:"Village School",kind:"school",col:8,row:1,survivors:1,need:"Medical kit"},
  {id:"clinic",name:"Riverside Clinic",kind:"clinic",col:9,row:5,survivors:2,need:"Safe evacuation"},
  {id:"market",name:"Market Road",kind:"homes",col:3,row:6,survivors:1,need:"Rescue team"}
];
const unitsSeed=[
  {id:"alpha",name:"Team Alpha",role:"Rescue",col:5,row:3,color:"#f3eee3"},
  {id:"bravo",name:"Team Bravo",role:"Medical",col:6,row:4,color:"#e9b7b5"},
  {id:"charlie",name:"Team Charlie",role:"Supply",col:4,row:4,color:"#b9d5c7"}
];
const iso=(c,r)=>({x:450+(c-r)*34,y:58+(c+r)*17});
function unitPosition(u){
  if(u.path&&u.path.length){
    const next=u.path[0];
    const t=Math.min(1,u.stepProgress/STEP_TICKS);
    return iso(u.col+(next.col-u.col)*t,u.row+(next.row-u.row)*t);
  }
  return iso(u.col,u.row);
}
function poly(ctx,pts,fill,stroke){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function ellipse(ctx,x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function tree(ctx,x,y,s=1){ellipse(ctx,x,y+8*s,13*s,5*s,"#285d43");poly(ctx,[{x:x-10*s,y:y},{x,y:y-28*s},{x:x+10*s,y:y}], "#397e51");poly(ctx,[{x:x-8*s,y:y-12*s},{x,y:y-38*s},{x:x+8*s,y:y-12*s}], "#4b9860");}
function building(ctx,p,kind,label){
 if(kind==="rubble"){
  poly(ctx,[{x:p.x-22,y:p.y-4},{x:p.x,y:p.y-12},{x:p.x+22,y:p.y-4},{x:p.x,y:p.y+6}],"#746a5c","#4a443c");
  poly(ctx,[{x:p.x-14,y:p.y-2},{x:p.x,y:p.y-18},{x:p.x+11,y:p.y-4}],"#8a7f6e");
  return;
 }
 const w=kind==="school"?39:kind==="shed"?22:32,h=kind==="school"?26:kind==="shed"?16:22;
 const roof=kind==="clinic"?"#d94b43":kind==="school"?"#3d6fa8":kind==="shed"?"#6b6b63":"#a74742";
 poly(ctx,[{x:p.x-w,y:p.y-7},{x:p.x,y:p.y-19},{x:p.x+w,y:p.y-7},{x:p.x,y:p.y+5}],"#b7a17d","#78654c");
 poly(ctx,[{x:p.x-w,y:p.y-7},{x:p.x,y:p.y+5},{x:p.x,y:p.y+h},{x:p.x-w,y:p.y+h-12}],"#c9b18a");
 poly(ctx,[{x:p.x,y:p.y+5},{x:p.x+w,y:p.y-7},{x:p.x+w,y:p.y+h-12},{x:p.x,y:p.y+h}],"#92795d");
 poly(ctx,[{x:p.x-w-3,y:p.y-7},{x:p.x,y:p.y-26},{x:p.x+w+3,y:p.y-7},{x:p.x,y:p.y+4}],roof,"#5c3a38");
 if(kind==="clinic"){ctx.fillStyle="#fff";ctx.fillRect(p.x-4,p.y-34,8,8);ctx.fillStyle="#d94b43";ctx.fillRect(p.x-1,p.y-33,2,6);ctx.fillRect(p.x-3,p.y-31,6,2);}
 if(kind==="school"){ctx.strokeStyle="#e8edf2";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y-26);ctx.lineTo(p.x,p.y-38);ctx.stroke();ctx.fillStyle="#e8edf2";ctx.fillRect(p.x,p.y-38,10,6);}
 if(label){ctx.fillStyle="#f4e9d4";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText(label,p.x,p.y+h+14);}
}
function drawWorld(canvas,game,timeMs){
 const ctx=canvas.getContext("2d");if(!ctx)return;
 ctx.clearRect(0,0,900,520);
 const bg=ctx.createLinearGradient(0,0,0,520);bg.addColorStop(0,"#a8c982");bg.addColorStop(1,"#6f9c63");ctx.fillStyle=bg;ctx.fillRect(0,0,900,520);
 const sun=ctx.createRadialGradient(760,55,0,760,55,170);sun.addColorStop(0,"rgba(255,246,218,0.5)");sun.addColorStop(1,"rgba(255,246,218,0)");ctx.fillStyle=sun;ctx.fillRect(0,0,900,520);
 poly(ctx,[{x:0,y:360},{x:95,y:322},{x:210,y:350},{x:330,y:300},{x:440,y:327},{x:565,y:270},{x:680,y:300},{x:900,y:235},{x:900,y:520},{x:0,y:520}],"#6a9b72");
 poly(ctx,[{x:0,y:410},{x:120,y:370},{x:220,y:394},{x:330,y:355},{x:440,y:385},{x:570,y:328},{x:700,y:358},{x:900,y:295},{x:900,y:360},{x:700,y:420},{x:570,y:390},{x:440,y:445},{x:300,y:420},{x:170,y:455},{x:0,y:470}],"#4e9eb0");
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const p=iso(c,r);poly(ctx,[{x:p.x,y:p.y},{x:p.x+34,y:p.y+17},{x:p.x,y:p.y+34},{x:p.x-34,y:p.y+17}],(r+c)%2?"#83b66d":"#8cbd73","#78a965");}
 obstacles.forEach(o=>{
  const p=iso(o.col,o.row);
  if(o.kind==="water"){
   const wob=Math.sin(timeMs/420+o.col*1.3+o.row*0.7)*3;
   poly(ctx,[{x:p.x,y:p.y+wob},{x:p.x+34,y:p.y+17+wob},{x:p.x,y:p.y+34+wob},{x:p.x-34,y:p.y+17+wob}],"#3f8aa0","#2c6478");
   ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-16,p.y+17+wob);ctx.lineTo(p.x+16,p.y+17+wob);ctx.stroke();
  } else {
   building(ctx,p,o.kind,"");
  }
 });
 const road=(a,b)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle="#c7b58d";ctx.lineWidth=17;ctx.lineCap="round";ctx.stroke();ctx.strokeStyle="#e0d1ad";ctx.lineWidth=11;ctx.stroke();};
 road(iso(1,4),iso(10,4));road(iso(5,1),iso(5,7));road(iso(1,2),iso(9,5));
 [[0,1],[1,0],[10,0],[11,2],[0,6],[10,7],[2,7],[7,7],[11,6],[3,0]].forEach(([c,r],i)=>{const p=iso(c,r);tree(ctx,p.x,p.y,0.8+(i%3)*.12)});
 sites.forEach(site=>{const p=iso(site.col,site.row);building(ctx,p,site.kind,site.name);});
 if(game.activePath&&game.activePath.length>1){
  ctx.setLineDash([5,6]);ctx.strokeStyle="rgba(255,255,255,0.85)";ctx.lineWidth=2;ctx.beginPath();
  game.activePath.forEach((cell,i)=>{const pp=iso(cell.col,cell.row);i?ctx.lineTo(pp.x,pp.y):ctx.moveTo(pp.x,pp.y);});
  ctx.stroke();ctx.setLineDash([]);
 }
 sites.forEach(site=>{const p=iso(site.col,site.row);const done=game.saved[site.id]||0;ellipse(ctx,p.x,p.y-43,15,15,done>=site.survivors?"#285d43":"#d94b43");ctx.fillStyle="#fff";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText(done>=site.survivors?"\u2713":String(site.survivors-done),p.x,p.y-39);if(game.target===site.id){ctx.beginPath();ctx.arc(p.x,p.y-43,22,0,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}});
 game.units.forEach(u=>{
  const p=unitPosition(u);const bob=u.task?Math.sin(timeMs/180+u.col+u.row)*2:0;const y=p.y+bob;
  ellipse(ctx,p.x,y+8,15,6,"rgba(20,30,22,0.45)");
  ellipse(ctx,p.x,y-7,9,9,u.color);
  ctx.fillStyle="#29332b";ctx.fillRect(p.x-5,y-1,10,12);
  ctx.fillStyle="#fff";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.fillText(u.id[0].toUpperCase(),p.x,y+3);
  if(u.role==="Medical"){ctx.fillStyle="#fff";ctx.fillRect(p.x-6,y-23,7,7);ctx.fillStyle="#d94b43";ctx.fillRect(p.x-3.5,y-22,2,5);ctx.fillRect(p.x-5.5,y-20,6,2);}
  else if(u.role==="Supply"){ctx.fillStyle="#b9935a";ctx.fillRect(p.x+1,y-23,8,7);ctx.strokeStyle="#8a6a3c";ctx.strokeRect(p.x+1,y-23,8,7);}
  else {ctx.strokeStyle="#f3eee3";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(p.x+1,y-25);ctx.lineTo(p.x+8,y-18);ctx.stroke();}
  if(game.selected===u.id){ctx.beginPath();ctx.arc(p.x,y-5,17,0,Math.PI*2);ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}
 });
 ctx.fillStyle="rgba(18,34,27,.72)";ctx.fillRect(16,16,220,40);ctx.fillStyle="#fff";ctx.font="bold 12px sans-serif";ctx.textAlign="left";ctx.fillText("CHATKHIL \u00b7 FLOOD RESPONSE ZONE",28,41);
 const vg=ctx.createRadialGradient(450,260,170,450,260,540);vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(6,18,12,0.35)");ctx.fillStyle=vg;ctx.fillRect(0,0,900,520);
}
export default function RescueVillage({onBack,user,api,onProgress}){
 const canvasRef=useRef(null),gameRef=useRef(null),logRef=useRef([]),submittedRef=useRef(false);
 const [selected,setSelected]=useState("alpha"),[saved,setSaved]=useState({}),[unitsState,setUnitsState]=useState(unitsSeed.map(u=>({...u,task:null,path:null,stepProgress:0}))),[supplies,setSupplies]=useState({kits:6,water:8}),[seconds,setSeconds]=useState(180),[running,setRunning]=useState(true),[message,setMessage]=useState("Select a volunteer, then tap a marked location to assign a task. Teams route around rubble and flood water."),[target,setTarget]=useState(null),[submission,setSubmission]=useState(null);
 const totalSaved=Object.values(saved).reduce((a,b)=>a+b,0),totalNeeded=sites.reduce((a,s)=>a+s.survivors,0),complete=totalSaved>=totalNeeded,allIdle=unitsState.every(u=>!u.task),failed=seconds===0||((supplies.kits===0||supplies.water===0)&&allIdle&&!complete);
 const activeUnit=unitsState.find(u=>u.id===selected);
 const game={saved,units:unitsState,selected,target,activePath:activeUnit&&activeUnit.task?[{col:activeUnit.col,row:activeUnit.row},...(activeUnit.path||[])]:null};
 useEffect(()=>{gameRef.current=game;});
 useEffect(()=>{
  let raf=0;
  function loop(t){drawWorld(canvasRef.current,gameRef.current,t);raf=requestAnimationFrame(loop);}
  raf=requestAnimationFrame(loop);
  return ()=>cancelAnimationFrame(raf);
 },[]);
 useEffect(()=>{if(!running||complete||failed||seconds<=0)return;const id=setInterval(()=>{setSeconds(s=>Math.max(0,s-1));const finished=[];setUnitsState(prev=>prev.map(u=>{if(!u.task||!u.path||u.path.length===0)return u;const stepProgress=u.stepProgress+1;if(stepProgress>=STEP_TICKS){const nextCell=u.path[0];const rest=u.path.slice(1);if(rest.length===0){const site=sites.find(x=>x.id===u.task);finished.push({unit:u.name,site});return {...u,col:nextCell.col,row:nextCell.row,task:null,path:null,stepProgress:0};}return {...u,col:nextCell.col,row:nextCell.row,path:rest,stepProgress:0};}return {...u,stepProgress};}));if(finished.length){setSaved(old=>finished.reduce((next,item)=>({...next,[item.site.id]:Math.min(item.site.survivors,(next[item.site.id]||0)+1)}),old));setMessage(finished.map(x=>x.unit+" evacuated one survivor from "+x.site.name+".").join(" "));}},1000);return()=>clearInterval(id);},[running,complete,failed,seconds]);
 useEffect(()=>{
  if(!(complete||failed)||submittedRef.current)return;
  submittedRef.current=true;
  if(!user||!api){setSubmission({guest:true});return;}
  api("/api/rescue/attempts",{method:"POST",body:JSON.stringify({attemptId:crypto.randomUUID(),dispatches:logRef.current})}).then(d=>{setSubmission({xpAwarded:d.xpAwarded,survivorsRescued:d.survivorsRescued,completed:d.completed});onProgress?.();}).catch(e=>setSubmission({error:e.message}));
 },[complete,failed]);
 function dispatchSite(site){
  if(complete||failed){setMessage("This operation has ended. Restart to play again.");return;}
  const u=unitsState.find(x=>x.id===selected);
  if(!u){setMessage("Select a volunteer first.");return;}
  if(u.task){setMessage(u.name+" is already on a task.");return;}
  if((saved[site.id]||0)+unitsState.filter(x=>x.task===site.id).length>=site.survivors){setMessage("All survivors at this location are already assigned or evacuated.");return;}
  const route=findPath({col:u.col,row:u.row},{col:site.col,row:site.row});
  if(route===null){setMessage(u.name+" can't find a safe route to "+site.name+" \u2014 rubble or flood water is blocking every path right now.");return;}
  const travelPath=route.slice(1);
  if(travelPath.length===0){setMessage(u.name+" is already at "+site.name+".");return;}
  const waterCost=1+Math.floor(travelPath.length/4);
  if(supplies.kits<=0||supplies.water<waterCost){setMessage("Not enough supplies for a route that long ("+waterCost+" water crates needed).");return;}
  setTarget(site.id);
  setSupplies(v=>({...v,kits:v.kits-1,water:v.water-waterCost}));
  setUnitsState(prev=>prev.map(x=>x.id===selected?{...x,task:site.id,path:travelPath,stepProgress:0}:x));
  logRef.current=[...logRef.current,{unitId:selected,siteId:site.id,atSecond:180-seconds}];
  setMessage(u.name+" dispatched to "+site.name+" via a "+travelPath.length+"-tile route. 1 kit and "+waterCost+" water crate(s) assigned.");
 }
 function clickMap(e){const rect=canvasRef.current.getBoundingClientRect(),x=(e.clientX-rect.left)*900/rect.width,y=(e.clientY-rect.top)*520/rect.height;const unit=unitsState.find(u=>{const p=unitPosition(u);return Math.hypot(p.x-x,p.y-7-y)<24;});if(unit){setSelected(unit.id);setMessage(unit.name+" selected. Choose a red rescue marker.");return;}const site=sites.find(s=>{const p=iso(s.col,s.row);return Math.hypot(p.x-x,p.y-43-y)<28;});if(site){dispatchSite(site);return;}setMessage("Tap a volunteer or a red rescue marker.");}
 function restart(){setSaved({});setUnitsState(unitsSeed.map(u=>({...u,task:null,path:null,stepProgress:0})));setSupplies({kits:6,water:8});setSeconds(180);setRunning(true);setTarget(null);setMessage("New operation started. Select a volunteer and assign a rescue.");logRef.current=[];submittedRef.current=false;setSubmission(null);}
 const time=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 return <section className="rescue-shell">
  <div className="rescue-heading"><button className="back-link" onClick={onBack}><ArrowLeft size={15}/> BACK TO BASE</button><span className="section-kicker">LIVE OPERATION / CHATKHIL SECTOR 04</span><h1>RESCUE <em>COMMANDER.</em></h1><p>Flood-hit village \u00b7 Isometric field simulation</p></div>
  <div className="rescue-hud"><div><span>MISSION TIME</span><b>{time}</b></div><div><span>SURVIVORS SAFE</span><b>{totalSaved}/{totalNeeded}</b></div><div><span>RESCUE KITS</span><b>{supplies.kits}</b></div><div><span>WATER CRATES</span><b>{supplies.water}</b></div></div>
  <div className="rescue-map-wrap"><canvas ref={canvasRef} width="900" height="520" onClick={clickMap} role="img" aria-label="Isometric flood-hit village map with rubble and flood-water obstacles. Use the rescue location buttons below to dispatch the selected team."/><div className="map-legend"><span><i className="legend-unit"/> VOLUNTEER</span><span><i className="legend-target"/> RESCUE SITE</span><span><i className="legend-safe"/> CLEARED</span></div></div>
  <div className="rescue-site-actions" aria-label="Rescue locations">{sites.map(site=><button key={site.id} className="rescue-site-button" onClick={()=>dispatchSite(site)} disabled={(saved[site.id]||0)+unitsState.filter(u=>u.task===site.id).length>=site.survivors||unitsState.find(u=>u.id===selected)?.task!=null}><b>{site.name}</b><span>{Math.max(0,site.survivors-(saved[site.id]||0))} survivors remaining</span></button>)}</div>
  <div className="rescue-control-grid"><div className="rescue-panel"><div className="rescue-panel-head"><Users size={17}/> VOLUNTEER TEAMS</div>{unitsState.map(u=><button key={u.id} className={"rescue-unit "+(selected===u.id?"active":"")} onClick={()=>setSelected(u.id)}><span className="unit-avatar">{u.id.slice(0,1).toUpperCase()}</span><span><b>{u.name}</b><small>{u.role} \u00b7 {u.task?"ON ROUTE":"AVAILABLE"}</small></span><span className="unit-state">{u.task?(u.path?u.path.length+" tiles left":"ARRIVING"):"READY"}</span></button>)}</div><div className="rescue-panel"><div className="rescue-panel-head"><Radio size={17}/> FIELD INTEL</div><p className="rescue-message">{message}</p><div className="rescue-objective"><b>PRIMARY OBJECTIVE</b><span>Evacuate all {totalNeeded} survivors from four marked locations before the operation timer expires. Route teams around rubble and flood water.</span></div><div className="rescue-progress"><i style={{width:(totalSaved/totalNeeded*100)+"%"}}/></div><small>{Math.round(totalSaved/totalNeeded*100)}% AREA SECURED</small></div></div>
  {(complete||failed)&&<div className="rescue-result"><div className="section-kicker">{complete?"OPERATION COMPLETE":"OPERATION ENDED"}</div><h2>{complete?"Village evacuation successful.":"Mission needs another attempt."}</h2><p>{totalSaved} of {totalNeeded} survivors evacuated. {submission?.error?"Could not save this result: "+submission.error+".":submission?.guest?"Sign in to save this result to your profile and earn XP.":submission?"Saved to your profile \u00b7 +"+submission.xpAwarded+" XP"+(submission.completed?" \u00b7 Operation fully cleared.":"")+".":"Saving your result\u2026"}</p><button className="primary-button" onClick={restart}>RESTART OPERATION <Zap size={15}/></button></div>}
  <p className="rescue-disclaimer"><Shield size={13}/> GAMEPLAY PROTOTYPE \u00b7 SIMULATED SCENARIO \u00b7 NOT REAL-WORLD DEPLOYMENT GUIDANCE.</p>
 </section>;
}
