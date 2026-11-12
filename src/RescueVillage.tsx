// @ts-nocheck
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,Radio,Shield,Users,Zap} from "lucide-react";
import {COLS,ROWS,obstacles} from "./game/grid";
import {findPath} from "./game/pathfinding";
import ThreeVillage from "./game/ThreeVillage";

const STEP_TICKS=4;
const rescueCapacity=(unit,site)=>unit.role==="Medical"&&(site.kind==="clinic"||site.kind==="school")?2:1;
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
export default function RescueVillage({onBack,user,api,onProgress}){
 const gameRef=useRef(null),logRef=useRef([]),submittedRef=useRef(false),cameraRef=useRef({x:0,y:0,zoom:1}),dragRef=useRef({active:false,moved:false,x:0,y:0,pointerId:null});
 const [selected,setSelected]=useState("alpha"),[saved,setSaved]=useState({}),[unitsState,setUnitsState]=useState(unitsSeed.map(u=>({...u,task:null,path:null,stepProgress:0}))),[supplies,setSupplies]=useState({kits:6,water:8}),[seconds,setSeconds]=useState(180),[running,setRunning]=useState(true),[message,setMessage]=useState("Select a team below or on the map, then dispatch it to a rescue marker. Drag to explore the village. Teams route around rubble and flood water."),[target,setTarget]=useState(null),[submission,setSubmission]=useState(null);
 const totalSaved=Object.values(saved).reduce((a,b)=>a+b,0),totalNeeded=sites.reduce((a,s)=>a+s.survivors,0),complete=totalSaved>=totalNeeded,allIdle=unitsState.every(u=>!u.task),failed=seconds===0||((supplies.kits===0||supplies.water===0)&&allIdle&&!complete);
 const activeUnit=unitsState.find(u=>u.id===selected);
 const game={saved,units:unitsState,selected,target,floodLevel:seconds<=90,activePath:activeUnit&&activeUnit.task?[{col:activeUnit.col,row:activeUnit.row},...(activeUnit.path||[])]:null};
 useEffect(()=>{gameRef.current=game;});
 useEffect(()=>{
  let raf=0;
  function loop(t){drawWorld(canvasRef.current,gameRef.current,t,sites,cameraRef.current);raf=requestAnimationFrame(loop);}
  raf=requestAnimationFrame(loop);
  return ()=>cancelAnimationFrame(raf);
 },[]);
 useEffect(()=>{if(!running||complete||failed||seconds<=0)return;const id=setInterval(()=>{setSeconds(s=>Math.max(0,s-1));const finished=[];setUnitsState(prev=>prev.map(u=>{if(!u.task||!u.path||u.path.length===0)return u;const stepProgress=u.stepProgress+(u.role==="Medical"?1.35:u.role==="Supply"?.85:1);if(stepProgress>=STEP_TICKS){const nextCell=u.path[0];const rest=u.path.slice(1);if(rest.length===0){const site=sites.find(x=>x.id===u.task);finished.push({unit:u.name,site,rescued:rescueCapacity(u,site),role:u.role});return {...u,col:nextCell.col,row:nextCell.row,task:null,path:null,stepProgress:0};}return {...u,col:nextCell.col,row:nextCell.row,path:rest,stepProgress:0};}return {...u,stepProgress};}));if(finished.length){setSaved(old=>finished.reduce((next,item)=>({...next,[item.site.id]:Math.min(item.site.survivors,(next[item.site.id]||0)+item.rescued)}),old));const supplyBonus=finished.filter(x=>x.role==="Supply").length*2;if(supplyBonus)setSupplies(v=>({...v,water:Math.min(12,v.water+supplyBonus)}));setMessage(finished.map(x=>x.unit+" evacuated "+x.rescued+" survivor"+(x.rescued===1?"":"s")+" from "+x.site.name+(x.role==="Supply"?" and recovered 2 water crates":"")+".").join(" "));}},1000);return()=>clearInterval(id);},[running,complete,failed,seconds]);
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
  const capacity=rescueCapacity(u,site),reserved=unitsState.filter(x=>x.task===site.id).reduce((sum,team)=>sum+rescueCapacity(team,site),0);
  if((saved[site.id]||0)+reserved>=site.survivors){setMessage("All survivors at this location are already assigned or evacuated.");return;}
  const route=findPath({col:u.col,row:u.row},{col:site.col,row:site.row});
  if(route===null){setMessage(u.name+" can't find a safe route to "+site.name+" \u2014 rubble or flood water is blocking every path right now.");return;}
  const travelPath=route.slice(1);
  if(travelPath.length===0){setMessage(u.name+" is already at "+site.name+".");return;}
  const baseWaterCost=1+Math.floor(travelPath.length/4)+(seconds<=90?1:0),waterCost=u.role==="Supply"?Math.max(1,Math.ceil(baseWaterCost*.5)):baseWaterCost;
  if(supplies.kits<=0||supplies.water<waterCost){setMessage("Not enough supplies for a route that long ("+waterCost+" water crates needed).");return;}
  setTarget(site.id);
  setSupplies(v=>({...v,kits:v.kits-1,water:v.water-waterCost}));
  setUnitsState(prev=>prev.map(x=>x.id===selected?{...x,task:site.id,path:travelPath,stepProgress:0}:x));
  logRef.current=[...logRef.current,{unitId:selected,siteId:site.id,atSecond:180-seconds}];
  setMessage(u.name+" dispatched to "+site.name+" via a "+travelPath.length+"-tile route. "+(capacity>1?"Medical team capacity: 2 survivors. ":"")+"1 kit and "+waterCost+" water crate(s) assigned."+(seconds<=90?" Flood surge active — routes now cost more water.":""));
 }
 function clickMap(e){if(dragRef.current.moved){dragRef.current.moved=false;return;}const rect=canvasRef.current.getBoundingClientRect();let x=(e.clientX-rect.left)*900/rect.width,y=(e.clientY-rect.top)*520/rect.height;const cam=cameraRef.current;x=(x-450-cam.x)/cam.zoom+450;y=(y-260-cam.y)/cam.zoom+260;const unit=unitsState.find(u=>{const p=unitPosition(u);return Math.hypot(p.x-x,p.y-7-y)<24;});if(unit){setSelected(unit.id);setMessage(unit.name+" selected. Choose a red rescue marker.");return;}const site=sites.find(s=>{const p=iso(s.col,s.row);return Math.hypot(p.x-x,p.y-43-y)<28;});if(site){dispatchSite(site);return;}setMessage("Tap a volunteer or a red rescue marker.");}
 function pointerDown(e){if(e.pointerType==="mouse"&&e.button!==0)return;const el=canvasRef.current;el?.setPointerCapture?.(e.pointerId);dragRef.current={active:true,moved:false,x:e.clientX,y:e.clientY,pointerId:e.pointerId};}
 function pointerMove(e){const d=dragRef.current;if(!d.active||d.pointerId!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>3)d.moved=true;if(d.moved){const rect=canvasRef.current.getBoundingClientRect();cameraRef.current={...cameraRef.current,x:Math.max(-360,Math.min(360,cameraRef.current.x+dx*900/rect.width)),y:Math.max(-220,Math.min(220,cameraRef.current.y+dy*520/rect.height))};}d.x=e.clientX;d.y=e.clientY;}
 function pointerUp(e){const d=dragRef.current;if(d.pointerId===e.pointerId){d.active=false;d.pointerId=null;}}
 function zoomMap(delta){cameraRef.current={...cameraRef.current,zoom:Math.max(.8,Math.min(1.65,Number((cameraRef.current.zoom+delta).toFixed(2))))};}
 function restart(){setSaved({});setUnitsState(unitsSeed.map(u=>({...u,task:null,path:null,stepProgress:0})));setSupplies({kits:6,water:8});setSeconds(180);setRunning(true);setTarget(null);setMessage("New operation started. Select a volunteer and assign a rescue.");logRef.current=[];submittedRef.current=false;setSubmission(null);}
 const time=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
 return <section className="rescue-shell">
  <div className="rescue-heading"><span className="section-kicker">MISSION ZERO / CAMPAIGN 01 · CHATKHIL SECTOR 04</span><h1>FLOOD <em>RESPONSE</em></h1><p>Command your teams. Evacuate the village. Every second matters.</p><button className="rescue-pause" type="button" onClick={()=>setRunning(v=>!v)}>{running?"Ⅱ  PAUSE OPERATION":"▶  RESUME OPERATION"}</button></div>
  <div className="rescue-hud"><div><span>MISSION TIME</span><b>{time}</b></div><div><span>SURVIVORS SAFE</span><b>{totalSaved}/{totalNeeded}</b></div><div><span>RESCUE KITS</span><b>{supplies.kits}</b></div><div><span>WATER CRATES</span><b>{supplies.water}</b></div></div>
  <div className="rescue-map-wrap"><div className="rescue-map-tools" aria-label="Map controls"><span>DRAG TO PAN · SCROLL TO ZOOM</span></div><ThreeVillage game={game} sites={sites} onUnitSelect={id=>{setSelected(id);setMessage(unitsState.find(u=>u.id===id)?.name+" selected. Choose a red rescue beacon.");}} onSiteSelect={id=>{const site=sites.find(s=>s.id===id);if(site)dispatchSite(site);}}/><div className="map-legend"><span><i className="legend-unit"/> VOLUNTEER</span><span><i className="legend-target"/> RESCUE SITE</span><span><i className="legend-safe"/> CLEARED</span></div></div>
  <div className="rescue-site-actions" aria-label="Rescue locations">{sites.map(site=><button key={site.id} className="rescue-site-button" onClick={()=>dispatchSite(site)} disabled={(saved[site.id]||0)+unitsState.filter(u=>u.task===site.id).reduce((sum,u)=>sum+rescueCapacity(u,site),0)>=site.survivors||unitsState.find(u=>u.id===selected)?.task!=null}><b>{site.name}</b><span>{Math.max(0,site.survivors-(saved[site.id]||0))} survivors remaining</span></button>)}</div>
  <div className="rescue-control-grid"><div className="rescue-panel"><div className="rescue-panel-head"><Users size={17}/> VOLUNTEER TEAMS</div>{unitsState.map(u=><button key={u.id} className={"rescue-unit "+(selected===u.id?"active":"")} onClick={()=>setSelected(u.id)}><span className="unit-avatar">{u.id.slice(0,1).toUpperCase()}</span><span><b>{u.name}</b><small>{u.role} \u00b7 {u.task?"ON ROUTE":"AVAILABLE"}</small></span><span className="unit-state">{u.task?(u.path?u.path.length+" tiles left":"ARRIVING"):"READY"}</span></button>)}</div><div className="rescue-panel"><div className="rescue-panel-head"><Radio size={17}/> FIELD INTEL</div><p className="rescue-message">{message}</p><div className="rescue-objective"><b>PRIMARY OBJECTIVE</b><span>Evacuate all {totalNeeded} survivors from four marked locations before the operation timer expires. Medical teams can evacuate two people at the school or clinic. Supply teams move slower, spend less water and replenish two crates on arrival. A flood surge begins in the final 90 seconds.</span></div><div className="rescue-progress"><i style={{width:(totalSaved/totalNeeded*100)+"%"}}/></div><small>{Math.round(totalSaved/totalNeeded*100)}% AREA SECURED</small></div></div>
  {(complete||failed)&&<div className="rescue-result"><div className="section-kicker">{complete?"OPERATION COMPLETE":"OPERATION ENDED"}</div><h2>{complete?"Village evacuation successful.":"Mission needs another attempt."}</h2><p>{totalSaved} of {totalNeeded} survivors evacuated. {submission?.error?"Could not save this result: "+submission.error+".":submission?.guest?"Sign in to save this result to your profile and earn XP.":submission?"Saved to your profile \u00b7 +"+submission.xpAwarded+" XP"+(submission.completed?" \u00b7 Operation fully cleared.":"")+".":"Saving your result\u2026"}</p><button className="primary-button" onClick={restart}>RESTART OPERATION <Zap size={15}/></button></div>}
  <p className="rescue-disclaimer"><Shield size={13}/> GAMEPLAY PROTOTYPE \u00b7 SIMULATED SCENARIO \u00b7 NOT REAL-WORLD DEPLOYMENT GUIDANCE.</p>
 </section>;
}
