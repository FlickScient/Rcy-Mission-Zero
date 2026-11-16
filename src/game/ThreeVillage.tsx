// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { COLS, ROWS, obstacles } from "./grid";

const TILE = 2.15;
const point = (col, row, y = 0) => new THREE.Vector3((col - (COLS - 1) / 2) * TILE, y, (row - (ROWS - 1) / 2) * TILE);
const mat = (color, roughness = .86, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const makeTexture = (base, accent, count = 40) => {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  let seed = base.length * 97 + accent.length * 31;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = .08 + rand() * .2; ctx.fillStyle = accent;
    const x = rand() * 256, y = rand() * 256, w = 2 + rand() * 18, h = 1 + rand() * 5;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4; return texture;
};
const grassTexture = makeTexture("#789b5e", "#385f3c", 180);
const wallTexture = makeTexture("#d7c39d", "#8c7759", 90);
const roofTexture = makeTexture("#854e3b", "#492b25", 120);
const roadTexture = makeTexture("#c5ad82", "#776347", 150);
const waterTexture = makeTexture("#347f9b", "#b3e1d9", 75);
const groundMats = ["#719b58", "#789f5e", "#6c9254", "#82a564"].map(c => mat(c, .96, { map: grassTexture }));
const obstacleMap = new Map(obstacles.map(o => [o.col + "," + o.row, o.kind]));

function addBox(parent, w, h, d, material, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function addRoadRibbon(parent, curve, width, y, material) {
  const points = curve.getPoints(100), vertices = [], indices = [];
  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
    const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1;
    const nx = -dz / length, nz = dx / length, p = points[i];
    vertices.push(p.x + nx * width / 2, y, p.z + nz * width / 2, p.x - nx * width / 2, y, p.z - nz * width / 2);
    if (i < points.length - 1) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; mesh.position.y = .005; parent.add(mesh); return mesh;
}
function addTree(parent, x, z, scale = 1, variant = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.11, .17, 1.25, 7), mat("#765238"));
  trunk.position.y = .62; trunk.castShadow = true; g.add(trunk);
  const greens = ["#285a3e", "#34734a", "#4b8751", "#5d9658"];
  for (let i = 0; i < 4; i++) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.72 - i * .075, 1), mat(greens[(variant + i) % greens.length]));
    crown.position.set((i % 2 ? .22 : -.18), 1.45 + i * .34, (i % 3 - 1) * .12);
    crown.scale.set(1.08, 1.15, .96); crown.castShadow = true; g.add(crown);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.72, 16), mat("#38553a"));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .025; shadow.scale.set(1.2, .8, 1); g.add(shadow);
  return g;
}
function addCityBuilding(parent, x, z, width, depth, floors, variant = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const palettes = [
    ["#d5d0c1","#a9a493","#4e6874"], ["#c6b69d","#96866f","#8d5947"],
    ["#b9c7c2","#899d98","#526f72"], ["#d9c7a9","#a68e70","#647d87"]
  ];
  const palette = palettes[variant % palettes.length], height = floors * 1.65;
  const wall = mat(palette[0], .88), side = mat(palette[1], .9), glass = new THREE.MeshStandardMaterial({color:palette[2],metalness:.28,roughness:.24});
  addBox(g,width,height,depth,wall,0,height/2,0);
  addBox(g,.12,height,depth+.04,side,width/2+.02,height/2,0);
  // Repeated window bays and floor slabs make the blocks read as real multi-storey buildings.
  for(let floor=0;floor<floors;floor++){
    const y=.48+floor*1.65;
    addBox(g,width+.12,.12,depth+.12,side,0,y,0,false);
    const bays=Math.max(2,Math.floor(width/1.15));
    for(let bay=0;bay<bays;bay++){
      const wx=-width/2+.55+(bay*(width-1.1)/Math.max(1,bays-1));
      addBox(g,.55,.76,.055,glass,wx,y+.48,depth/2+.035,false);
      addBox(g,.55,.76,.055,glass,wx,y+.48,-depth/2-.035,false);
      addBox(g,.045,.82,.075,side,wx,y+.48,depth/2+.07,false);
    }
    for(let bay=0;bay<2;bay++){
      const wz=-depth/2+.65+bay*(depth-1.3);
      addBox(g,.055,.76,.52,glass,width/2+.04,y+.48,wz,false);
      addBox(g,.055,.76,.52,glass,-width/2-.04,y+.48,wz,false);
    }
  }
  // Flat roof, parapet, rooftop equipment and a small water tank.
  addBox(g,width+.25,.18,depth+.25,mat("#77776d"),0,height+.08,0);
  for(const edge of [-1,1]){
    addBox(g,width+.25,.42,.12,side,0,height+.32,edge*(depth/2+.04));
    addBox(g,.12,.42,depth+.25,side,edge*(width/2+.04),height+.32,0);
  }
  addBox(g,.85,.42,.72,mat("#747d79"),width*.22,height+.36,-depth*.18);
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.62,12),mat("#8a9b99"));
  tank.position.set(-width*.22,height+.48,depth*.18);tank.castShadow=true;g.add(tank);
  // Ground-floor shopfront and awning.
  addBox(g,width*.48,.72,.07,glass,0,.72,depth/2+.055,false);
  addBox(g,width*.58,.14,.72,mat(variant%2?"#a94e40":"#d2a85f"),0,1.24,depth/2+.32);
  addBox(g,.78,.1,.08,mat("#f0e6d2"),0,1.68,depth/2+.08,false);
  return {group:g,x,z,width,depth};
}
function addCityCar(parent,x,z,color="#b9c4c1",rotation=0){
  const g=new THREE.Group();g.position.set(x,.08,z);g.rotation.y=rotation;parent.add(g);
  addBox(g,1.05,.42,2.05,mat(color,.48,{metalness:.22}),0,.42,0);
  addBox(g,.88,.42,1.02,new THREE.MeshStandardMaterial({color:"#77949b",metalness:.3,roughness:.2,transparent:true,opacity:.88}),0,.78,-.12);
  for(const side of [-1,1])for(const end of [-1,1]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.13,12),mat("#202522"));
    wheel.rotation.z=Math.PI/2;wheel.position.set(side*.55,.23,end*.67);wheel.castShadow=true;g.add(wheel);
  }
  addBox(g,.22,.12,.06,mat("#f2dfaa"),-.3,.42,1.04,false);addBox(g,.22,.12,.06,mat("#f2dfaa"),.3,.42,1.04,false);
  return g;
}
function addHouse(parent, col, row, kind = "home", label = "") {
  const p = point(col, row), g = new THREE.Group(); g.position.set(p.x, .02, p.z); parent.add(g);
  const shed = kind === "shed", clinic = kind === "clinic", school = kind === "school";
  const width = shed ? 1.42 : 1.78, depth = shed ? 1.35 : 1.72, floors = shed ? 1 : school ? 2 : 2;
  const floorH = shed ? 1.35 : school ? 1.42 : 1.28, height = floorH * floors;
  const wallColor = clinic ? "#d9d4c6" : school ? "#d0c9ad" : shed ? "#9b8b70" : "#c7c3b5";
  const sideColor = clinic ? "#a9aaa0" : school ? "#8f9b91" : "#8b8e83";
  const glassColor = clinic ? "#78a8aa" : "#668c98";
  const wall = mat(wallColor,.88,{map:wallTexture}), side = mat(sideColor,.9);
  const glass = new THREE.MeshStandardMaterial({color:glassColor,metalness:.24,roughness:.28});
  addBox(g,width,height,depth,wall,0,height/2,0);
  addBox(g,.09,height,depth+.04,side,width/2+.02,height/2,0);
  for(let floor=0;floor<floors;floor++){
    const y=.28+floor*floorH;
    addBox(g,width+.06,.09,depth+.06,side,0,y,0,false);
    for(let bay=0;bay<2;bay++){
      const x=(bay-.5)*.78;
      addBox(g,.48,.57,.055,glass,x,y+.48,depth/2+.035,false);
      addBox(g,.045,.61,.075,side,x,y+.48,depth/2+.07,false);
      addBox(g,.48,.57,.055,glass,x,y+.48,-depth/2-.035,false);
    }
    for(const sideSign of [-1,1])for(let bay=0;bay<2;bay++){
      const z=(bay-.5)*.72;
      addBox(g,.055,.54,.43,glass,sideSign*(width/2+.035),y+.46,z,false);
    }
  }
  addBox(g,width+.22,.14,depth+.22,mat("#6f7770"),0,height+.07,0);
  for(const sideSign of [-1,1]){
    addBox(g,width+.22,.27,.09,side,0,height+.19,sideSign*(depth/2+.055));
    addBox(g,.09,.27,depth+.22,side,sideSign*(width/2+.055),height+.19,0);
  }
  addBox(g,.36,.72,.07,mat("#594b3c"),-.48,.38,depth/2+.045);
  addBox(g,width*.7,.12,.38,mat(clinic?"#b74e45":school?"#d2ad62":"#9c7650"),0,.98,depth/2+.2);
  if(!shed){
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.42,10),mat("#87928c"));
    tank.position.set(width*.22,height+.38,-depth*.18);tank.castShadow=true;g.add(tank);
    addBox(g,.48,.1,.42,mat("#747d79"),-width*.22,height+.18,depth*.18);
  }
  if(clinic){
    addBox(g,.42,.38,.05,mat("#fff8e8"),0,height+.34,depth/2+.06,false);
    addBox(g,.075,.28,.07,mat("#c84640"),0,height+.34,depth/2+.1,false);
    addBox(g,.25,.075,.07,mat("#c84640"),0,height+.34,depth/2+.1,false);
  }
  if(school){
    addBox(g,.035,.85,.035,mat("#594b3c"),.55,height+.48,-.18);
    const flag=new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.025),mat("#d34b42"));
    flag.position.set(.74,height+.72,-.18);g.add(flag);
  }
  if(label){
    const marker=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.35,6),mat("#e8d7ae"));
    marker.position.y=height+.45;g.add(marker);
  }
  return g;
}
function addRubble(parent, col, row) {
  const p = point(col, row); const g = new THREE.Group(); g.position.set(p.x, 0, p.z); parent.add(g);
  for (let i = 0; i < 8; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.22 + (i % 3) * .09, 0), mat(["#77766a", "#999181", "#b0a38d"][i % 3]));
    rock.position.set(Math.sin(i * 4.1) * .55, .16 + (i % 2) * .12, Math.cos(i * 3.7) * .48);
    rock.rotation.set(i, i * .7, i * .4); rock.castShadow = true; g.add(rock);
  }
}
function addSurvivor(parent, x, z, index) {
  const g = new THREE.Group(); g.position.set(x, .04, z); parent.add(g);
  const clothes = mat(index % 2 ? "#e0a66d" : "#d8c7a4"), skin = mat("#bd8d6d"), dark = mat("#35433a");
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.14, .25, 3, 7), clothes); body.position.y = .48; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), skin); head.position.y = .82; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.125, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), dark); hair.position.y = .88; g.add(hair);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .22, 3, 5), clothes); arm.position.set(.18, .5, 0); arm.rotation.z = -.5; g.add(arm);
  g.userData.phase = index * 1.7; return g;
}
function addPedestrian(parent, index) {
  const g=new THREE.Group();g.userData.pedestrianId=index;parent.add(g);
  const clothes=["#c56e51","#567c91","#b89b5c","#6d8060","#8c6b83","#d0b7a0"][index%6];
  const shirt=mat(clothes),skin=mat("#bd8d70"),pants=mat(index%2?"#394b51":"#4c4941");
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.27,3,7),shirt);torso.position.y=.52;torso.castShadow=true;g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.115,10,8),skin);head.position.y=.83;head.castShadow=true;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.12,10,7,0,Math.PI*2,0,Math.PI/2),mat(index%2?"#342c28":"#514238"));hair.position.y=.88;g.add(hair);
  const limbs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.17,.65,0);g.add(arm);
    const a=new THREE.Mesh(new THREE.CapsuleGeometry(.04,.19,3,5),shirt);a.position.y=-.12;arm.add(a);limbs.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.075,.34,0);g.add(leg);
    const l=new THREE.Mesh(new THREE.CapsuleGeometry(.052,.2,3,5),pants);l.position.y=-.13;leg.add(l);limbs.push(leg);
  }
  const alert=new THREE.Mesh(new THREE.SphereGeometry(.075,8,7),mat("#f0a64f",.4,{emissive:"#a94d22",emissiveIntensity:.65}));
  alert.position.y=1.12;alert.visible=false;g.add(alert);
  g.userData.limbs=limbs;g.userData.alert=alert;g.userData.state="walking";return g;
}
function addVolunteer(parent, unit) {
  const g = new THREE.Group(); g.userData.unitId = unit.id; parent.add(g);
  const uniform = mat(unit.color || "#e9e4d7"), dark = mat("#263b32"), skin = mat("#c99470"), helmet = mat(unit.role === "Medical" ? "#f0e9d7" : "#d5b96c");
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .38, 4, 7), uniform); torso.position.y = .86; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), skin); head.position.y = 1.36; head.castShadow = true; g.add(head);
  const eyeMat = mat("#27342e", .55);
  for (const side of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.022, 7, 6), eyeMat); eye.position.set(side * .065, 1.39, .145); g.add(eye); }
  const hat = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), helmet); hat.position.y = 1.48; hat.castShadow = true; g.add(hat);
  const pack = addBox(g, .27, .35, .16, mat(unit.role === "Supply" ? "#a47b45" : "#344f43"), 0, .92, -.25);
  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .105, .55, 0); g.add(leg);
    const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .28, 3, 6), dark); legMesh.position.y = -.2; legMesh.castShadow = true; leg.add(legMesh);
    const boot = addBox(leg, .17, .11, .27, mat("#34372f"), 0, -.38, .045); boot.castShadow = true; limbs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .25, 1.02, 0); g.add(arm);
    const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.065, .25, 3, 6), uniform); armMesh.rotation.z = side * -.16; armMesh.position.y = -.18; arm.add(armMesh);
    const cuff = addBox(arm, .13, .1, .14, helmet, 0, -.31, .01, false); limbs.push(arm);
  }
  if (unit.role === "Medical") {
    addBox(g, .18, .18, .035, mat("#fff"), .24, .91, .02);
    addBox(g, .045, .14, .045, mat("#c8423c"), .24, .91, .05, false);
    addBox(g, .12, .045, .045, mat("#c8423c"), .24, .91, .05, false);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.38, .48, 32), mat("#f2d77e", .5, { emissive: "#8b6721", emissiveIntensity: .18 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .035; ring.visible = false; g.add(ring);
  const chestPatch = addBox(g, .16, .2, .025, mat(unit.role === "Medical" ? "#f8eee0" : "#d8c36d"), -.12, .91, .22, false);
  // A visible passenger model appears once a team has stabilized and lifted a survivor.
  const carried = new THREE.Group(); carried.position.set(0, .72, -.34); carried.visible = false; g.add(carried);
  const passengerBody = new THREE.Mesh(new THREE.CapsuleGeometry(.105, .25, 3, 6), mat("#d8b78c")); passengerBody.rotation.z = Math.PI / 2; passengerBody.castShadow = true; carried.add(passengerBody);
  const passengerHead = new THREE.Mesh(new THREE.SphereGeometry(.105, 9, 8), skin); passengerHead.position.set(.25, .025, 0); passengerHead.castShadow = true; carried.add(passengerHead);
  const passengerBlanket = addBox(carried, .38, .055, .2, mat("#b85e50"), -.04, .015, 0, false);
  // Treatment ring and floating medical cross are only shown while the team is working.
  const workRing = new THREE.Mesh(new THREE.TorusGeometry(.58, .045, 7, 28), mat("#7ed5c0", .4, { emissive: "#287d70", emissiveIntensity: .5 }));
  workRing.rotation.x = Math.PI / 2; workRing.position.y = .045; workRing.visible = false; g.add(workRing);
  const workCross = new THREE.Group(); workCross.position.set(0, 2.05, 0); workCross.visible = false; g.add(workCross);
  addBox(workCross, .12, .42, .08, mat("#f2eee0", .4, { emissive: "#b8e4d1", emissiveIntensity: .35 }), 0, 0, 0, false);
  addBox(workCross, .42, .12, .08, mat("#f2eee0", .4, { emissive: "#b8e4d1", emissiveIntensity: .35 }), 0, 0, 0, false);
  g.userData.limbs = limbs; g.userData.ring = ring; g.userData.pack = pack; g.userData.carried = carried; g.userData.workRing = workRing; g.userData.workCross = workCross;
  return g;
}

export default function ThreeVillage({ game, sites, onUnitSelect, onSiteSelect }) {
  const hostRef = useRef(null), liveRef = useRef({ game, onUnitSelect, onSiteSelect }), sceneRef = useRef(null), civilianStatusRef = useRef(null); const controlsRef = useRef({ x: 0, z: 0, sprint: false }); const actionRef = useRef(() => {}); const [interactionMessage,setInteractionMessage] = useState("Find a civilian and get close to offer help.");
  liveRef.current = { game, onUnitSelect, onSiteSelect };
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#9bb4a1"); scene.fog = new THREE.Fog("#9bb4a1", 25, 58);
    const camera = new THREE.OrthographicCamera(-15, 15, 9, -9, .1, 120);
    camera.position.set(18, 24, 23); camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
    renderer.setSize(host.clientWidth, host.clientHeight); renderer.domElement.className = "three-village-canvas"; host.appendChild(renderer.domElement);
    const hemi = new THREE.HemisphereLight("#e7f2df", "#52684e", 2.1); scene.add(hemi);
    const sun = new THREE.DirectionalLight("#fff0cf", 3.1); sun.position.set(-13, 25, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -19; sun.shadow.camera.right = 19; sun.shadow.camera.top = 19; sun.shadow.camera.bottom = -19; sun.shadow.bias = -.00025; scene.add(sun);
    const fill = new THREE.DirectionalLight("#a8d4e3", .8); fill.position.set(14, 9, -12); scene.add(fill);
    const world = new THREE.Group(); scene.add(world);
    // Raised earth plinth and a continuous, textured-looking tile field.
    const base = new THREE.Mesh(new THREE.BoxGeometry(68, .55, 52), mat("#665e45"));
    base.position.y = -.32; base.receiveShadow = true; base.castShadow = true; world.add(base);
    const fieldMaterial=mat("#788d68",.98,{map:grassTexture}); fieldMaterial.map.repeat.set(12,9);
    const cityGround = new THREE.Mesh(new THREE.PlaneGeometry(68,52),fieldMaterial);
    cityGround.rotation.x=-Math.PI/2;cityGround.position.y=-.045;cityGround.receiveShadow=true;world.add(cityGround);
    // Connected outer neighbourhood: urban streets, sidewalks, mixed-use blocks and parked vehicles.
    const asphalt=mat("#555b59",.96), pavement=mat("#b8b19e",.94), lane=mat("#e5d5a9",.75);
    for(const z of [-18,-9,9,18]){
      const road=new THREE.Mesh(new THREE.PlaneGeometry(66,5.2),asphalt);road.rotation.x=-Math.PI/2;road.position.set(0,.012,z);road.receiveShadow=true;world.add(road);
      for(let x=-31;x<32;x+=4.2)addBox(world,2.1,.018,.075,lane,x,.03,z,false);
      for(const side of [-1,1]){const walk=new THREE.Mesh(new THREE.BoxGeometry(66,.12,1.05),pavement);walk.position.set(0,.04,z+side*3.05);walk.receiveShadow=true;world.add(walk);}
    }
    for(const x of [-24,-12,0,12,24]){
      const road=new THREE.Mesh(new THREE.PlaneGeometry(5.2,48),asphalt);road.rotation.x=-Math.PI/2;road.position.set(x,.016,0);road.receiveShadow=true;world.add(road);
      for(let z=-22;z<23;z+=4.2)addBox(world,.075,.018,2.1,lane,x,.035,z,false);
    }
    // Real CC0 Kenney GLB assets replace the old box-built skyline and toy cars.
    // The models are served from the public CC0 model library; lightweight local geometry remains as a fallback.
    const assetLoader = new GLTFLoader();
    assetLoader.setCrossOrigin("anonymous");
    const assetRoot = "https://hidencod.github.io/tge-assets/";
    const loadCharacterVisual=(group,file,height,keep=[])=>{
      assetLoader.load(assetRoot+"packs/mini-characters/"+file,gltf=>{
        if(!host.isConnected){gltf.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});return;}
        const model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
        const scale=height/Math.max(size.y,.001);
        group.children.forEach(child=>{if(!keep.includes(child))child.visible=false;});
        model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
        group.add(model);
      },undefined,()=>{});
    };
    const cityBuildingSpecs=[
      {x:-25,z:-14,width:6.2,depth:5.2,floors:3,file:"building-a.glb"},
      {x:-15,z:-14,width:5.4,depth:5.4,floors:2,file:"building-b.glb"},
      {x:-25,z:0,width:6.4,depth:5.8,floors:4,file:"building-c.glb"},
      {x:-15,z:14,width:6.2,depth:5.2,floors:3,file:"building-d.glb"},
      {x:-25,z:14,width:5.5,depth:5.4,floors:2,file:"building-e.glb"},
      {x:15,z:-14,width:6.5,depth:5.4,floors:3,file:"building-f.glb"},
      {x:25,z:-14,width:5.6,depth:5.5,floors:2,file:"building-g.glb"},
      {x:15,z:0,width:6.4,depth:5.8,floors:4,file:"building-h.glb"},
      {x:25,z:0,width:5.4,depth:5.4,floors:3,file:"building-i.glb"},
      {x:15,z:14,width:6.2,depth:5.2,floors:3,file:"building-j.glb"},
      {x:25,z:14,width:5.8,depth:5.4,floors:2,file:"building-k.glb"},
      {x:-5,z:-19,width:5.4,depth:4.8,floors:2,file:"building-l.glb"}
    ];
    const cityBuildings=cityBuildingSpecs.map(({x,z,width,depth})=>({x,z,width,depth}));
    cityBuildingSpecs.forEach(spec=>{
      assetLoader.load(assetRoot+"packs/city-kit-commercial/"+spec.file,gltf=>{
        if(!host.isConnected){gltf.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});return;}
        const model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
        const sx=spec.width/Math.max(size.x,.001),sy=(spec.floors*1.65)/Math.max(size.y,.001),sz=spec.depth/Math.max(size.z,.001);
        const wrapper=new THREE.Group();wrapper.position.set(spec.x,0,spec.z);
        model.scale.set(sx,sy,sz);model.position.set(-center.x*sx,-box.min.y*sy,-center.z*sz);
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.roughness=Math.max(m.roughness??.8,.58);});}}});
        wrapper.add(model);world.add(wrapper);
      },undefined,()=>{if(host.isConnected)addCityBuilding(world,spec.x,spec.z,spec.width,spec.depth,spec.floors,cityBuildingSpecs.indexOf(spec)%4);});
    });
    const cityCarSpecs=[
      {x:-20,z:-9,file:"firetruck.glb",rotation:Math.PI/2},
      {x:20,z:-9,file:"ambulance.glb",rotation:-Math.PI/2},
      {x:-20,z:9,file:"sedan.glb",rotation:Math.PI/2},
      {x:20,z:9,file:"suv.glb",rotation:-Math.PI/2},
      {x:-7,z:19,file:"police.glb",rotation:0},
      {x:7,z:-19,file:"van.glb",rotation:Math.PI}
    ];
    const cityCars=cityCarSpecs.map(spec=>({position:new THREE.Vector3(spec.x,.08,spec.z)}));
    cityCarSpecs.forEach(spec=>{
      assetLoader.load(assetRoot+"packs/car-kit/"+spec.file,gltf=>{
        if(!host.isConnected){gltf.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});return;}
        const model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
        const scale=2.05/Math.max(size.z,.001);model.scale.setScalar(scale);
        model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
        const wrapper=new THREE.Group();wrapper.position.set(spec.x,.08,spec.z);wrapper.rotation.y=spec.rotation;
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});wrapper.add(model);world.add(wrapper);
      },undefined,()=>{if(host.isConnected)addCityCar(world,spec.x,spec.z,"#b7c4bf",spec.rotation);});
    });
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const p = point(col, row), kind = obstacleMap.get(col + "," + row);
      // The playable block is one continuous terrain surface, not a checkerboard of raised square tiles.
      if (kind === "water") {
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(TILE * .98, TILE * .98), mat("#397e91", .28, { metalness: .08, map: waterTexture }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(p.x, .035, p.z); pool.receiveShadow = true; world.add(pool);
        const ripple = new THREE.Mesh(new THREE.TorusGeometry(.48, .018, 5, 28), mat("#b8e5df", .25, { transparent: true, opacity: .55 }));
        ripple.rotation.x = Math.PI / 2; ripple.position.set(p.x, .06, p.z); ripple.userData.ripple = true; world.add(ripple);
      } else if (kind === "rubble") addRubble(world, col, row);
      else if (kind === "shed") addHouse(world, col, row, "shed");
    }
    // Winding raised village road with a lighter gravel shoulder.
    const roadPoints = [[-12,-4.5],[-8,-4.2],[-5,-2.8],[-2,-2.3],[1,-.5],[4,-1.2],[7,-2.8],[11,-2.2],[12,-1.5]].map(([x,z]) => new THREE.Vector3(x,.075,z));
    const roadCurve = new THREE.CatmullRomCurve3(roadPoints);
    addRoadRibbon(world, roadCurve, 1.55, .085, mat("#9d8966", .96, { map: roadTexture }));
    addRoadRibbon(world, roadCurve, 1.12, .12, mat("#c5ad82", .94, { map: roadTexture }));
    // Flood channel at the south edge, with banks, current ribbons and a timber crossing.
    const river = new THREE.Mesh(new THREE.BoxGeometry(29, .11, 3.2), mat("#347f9b", .2, { metalness: .16, transparent: true, opacity: .94 }));
    river.position.set(0, .11, 8.0); world.add(river);
    for (let i = 0; i < 16; i++) {
      const ripple = new THREE.Mesh(new THREE.TorusGeometry(.34 + (i % 3) * .12, .018, 4, 20), mat("#b6e3d8", .22, { transparent: true, opacity: .42 }));
      ripple.rotation.x = Math.PI / 2; ripple.position.set(-13 + i * 1.7, .19, 7.5 + Math.sin(i) * .55); ripple.userData.waterLine = true; world.add(ripple);
    }
    const bridge = new THREE.Group(); bridge.position.set(7.8, .28, 8.0); world.add(bridge);
    addBox(bridge, 1.5, .22, 4.1, mat("#806044"), 0, .25, 0);
    for (let i = 0; i < 9; i++) addBox(bridge, 1.43, .035, .38, mat("#c49a68"), 0, .38, -1.8 + i * .45, false);
    for (const side of [-1, 1]) addBox(bridge, .12, .12, 4.1, mat("#614a35"), side * .72, .62, 0);
    // Densely planted tree belts, palms, shrubs and scattered village greenery.
    const treeSpots = [[-13,-7],[-10,-6],[-7,-7],[-3,-7],[1,-7],[5,-7],[9,-7],[13,-6],[-14,-2],[-13,2],[-12,6],[-10,7],[-7,6],[-4,7],[-1,7],[2,7],[5,7],[10,7],[13,5],[13,1],[12,-3],[-9,1],[-6,3],[10,1],[4,3],[-2,4]];
    const trees = treeSpots.map(([x,z], i) => addTree(world, x, z, .76 + (i % 4) * .11, i));
    // Distinctive public buildings and homes across the sector.
    const buildingKinds = new Map([[2 + "," + 2,"home"],[8 + "," + 1,"school"],[9 + "," + 5,"clinic"],[3 + "," + 6,"home"],[4 + "," + 1,"home"],[10 + "," + 2,"home"],[1 + "," + 3,"home"],[4 + "," + 5,"home"],[10 + "," + 6,"home"],[0 + "," + 1,"home"]]);
    for (const [key, kind] of buildingKinds) { const [c,r] = key.split(",").map(Number); addHouse(world, c, r, kind); }
    const siteNodes = new Map();
    const siteMeshes = [];
    const lastSaved = Object.fromEntries(sites.map(site => [site.id, 0]));
    for (const site of sites) {
      const p = point(site.col, site.row);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .055, 8, 40), mat("#e85d50", .45, { emissive: "#5b100d", emissiveIntensity: .22 }));
      ring.rotation.x = Math.PI / 2; ring.position.set(p.x, .17, p.z); ring.userData.siteId = site.id; world.add(ring); siteMeshes.push(ring);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1.1, 8), mat("#e5e0c9"));
      beacon.position.set(p.x, .68, p.z); world.add(beacon);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), mat("#ef5b4e", .3, { emissive: "#d72d24", emissiveIntensity: .5 }));
      cap.position.set(p.x, 1.28, p.z); cap.userData.siteId = site.id; world.add(cap); siteMeshes.push(cap);
      const civilians = [];
      for (let i = 0; i < site.survivors; i++) {
        const civilian = addSurvivor(world, p.x + (i - (site.survivors - 1) / 2) * .52, p.z + .95, i);
        civilians.push(civilian);
      }
      siteNodes.set(site.id, { ring, cap, civilians });
    }
    // Safe extraction base: teams must return here with a survivor before the rescue is counted.
    const extractionCell = { col: 5, row: 7 }, extractionPoint = point(extractionCell.col, extractionCell.row);
    const extractionBase = new THREE.Group(); extractionBase.position.set(extractionPoint.x, .04, extractionPoint.z); world.add(extractionBase);
    const extractionRing = new THREE.Mesh(new THREE.TorusGeometry(.9, .075, 8, 36), mat("#8fe0a0", .35, { emissive: "#3d9b5d", emissiveIntensity: .7 }));
    extractionRing.rotation.x = Math.PI / 2; extractionBase.add(extractionRing);
    const extractionPole = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 2.1, 8), mat("#e4e9d6", .45)); extractionPole.position.y = 1.05; extractionBase.add(extractionPole);
    const extractionFlag = new THREE.Mesh(new THREE.BoxGeometry(.72, .38, .045), mat("#63b77c", .45, { emissive: "#286c42", emissiveIntensity: .25 }));
    extractionFlag.position.set(.34, 1.78, 0); extractionBase.add(extractionFlag);
    const extractionCross = new THREE.Group(); extractionCross.position.set(0, 2.2, 0); extractionBase.add(extractionCross);
    addBox(extractionCross, .12, .48, .08, mat("#f7f3df"), 0, 0, 0, false);
    addBox(extractionCross, .42, .12, .08, mat("#f7f3df"), 0, 0, 0, false);
    const unitNodes = new Map();
    for (const unit of liveRef.current.game.units) {
      const g = addVolunteer(world, unit); unitNodes.set(unit.id, g);
      loadCharacterVisual(g,unit.id==="alpha"?"character-male-a.glb":unit.id==="bravo"?"character-female-a.glb":"character-male-b.glb",1.55,[g.userData.ring,g.userData.pack,g.userData.carried,g.userData.workRing,g.userData.workCross]);
    }
    // Controllable player character for free exploration.
    const player = new THREE.Group(); player.position.set(0, .04, -.5); world.add(player);
    loadCharacterVisual(player,"character-male-c.glb",1.62);
    const bodyMat = mat("#315d91"), trimMat = mat("#e7c66e"), skinMat = mat("#bd8d6d");
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .42, 5, 9), bodyMat); body.position.y = .78; body.castShadow = true; player.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 14, 12), skinMat); head.position.y = 1.27; head.castShadow = true; player.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), trimMat); helmet.position.y = 1.38; player.add(helmet);
    addBox(player, .3, .34, .18, mat("#263f35"), 0, .78, -.25);
    const limbs = [];
    for (const side of [-1,1]) {
      const arm = new THREE.Group(); arm.position.set(side*.25,.95,0); player.add(arm);
      const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.065,.27,4,7),bodyMat); armMesh.position.y=-.18; arm.add(armMesh); limbs.push(arm);
      const leg = new THREE.Group(); leg.position.set(side*.11,.43,0); player.add(leg);
      const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.08,.27,4,7),mat("#26333b")); legMesh.position.y=-.17; leg.add(legMesh); limbs.push(leg);
    }
    const keys = new Set();
    const keyDown = e => { const k=e.key.toLowerCase(); if(k==="e"){actionRef.current();return;} if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(k)){keys.add(k); if(k.startsWith("arrow"))e.preventDefault();} };
    const keyUp = e => keys.delete(e.key.toLowerCase());
    const clearKeys = () => { keys.clear(); controlsRef.current={x:0,z:0,sprint:false}; };
    window.addEventListener("keydown",keyDown); window.addEventListener("keyup",keyUp); window.addEventListener("blur",clearKeys);
    const buildingCells=[[2,2],[8,1],[9,5],[3,6],[4,1],[10,2],[1,3],[4,5],[10,6],[0,1]];
    const collides=(x,z)=>{
      if(x < -31.5 || x > 31.5 || z < -23.5 || z > 23.5)return true;
      // Flood channel is a hard traversal hazard; only the marked timber crossing is passable.
      if(z > 6.3 && z < 9.8 && Math.abs(x) < 14.5 && !(x > 5.7 && x < 9.9))return true;
      for(const [c,r] of buildingCells){const p=point(c,r);if(Math.abs(x-p.x)<1.12&&Math.abs(z-p.z)<.98)return true;}
      for(const [tx,tz] of treeSpots)if(Math.hypot(x-tx,z-tz)<.78)return true;
      for(const b of cityBuildings)if(Math.abs(x-b.x)<b.width/2+.55&&Math.abs(z-b.z)<b.depth/2+.55)return true;
      for(const car of cityCars){const dx=x-car.position.x,dz=z-car.position.z;if(Math.abs(dx)<.8&&Math.abs(dz)<1.25)return true;}
      for(const o of obstacles)if(o.kind==="rubble"||o.kind==="water"){const p=point(o.col,o.row);if(Math.abs(x-p.x)<.78&&Math.abs(z-p.z)<.78)return true;}
      return false;
    };
    const cameraOffset=new THREE.Vector3(18,24,23);
    let lastFrameTime=0;
    // Independent civilians use a small waypoint network on the central safe streets.
    const pedestrianRoutes=[
      [[-9.5,-9],[9.5,-9]], [[9,-8.3],[-9,-8.3]],
      [[-8.5,-10.2],[8.5,-10.2]], [[8,-7.6],[-8,-7.6]],
      [[-9.5,-9],[0,-6.8],[9.5,-9]], [[9.5,-9],[0,-11.2],[-9.5,-9]],
      [[-7.5,-6.9],[7.5,-6.9]], [[7.5,-11],[-7.5,-11]]
    ];
    const pedestrians=pedestrianRoutes.map((route,i)=>{
      const person=addPedestrian(world,i),start=route[0];person.position.set(start[0],.04,start[1]);
      loadCharacterVisual(person,i%2===0?"character-female-b.glb":"character-male-d.glb",1.28,[person.userData.alert]);
      person.userData.route=route;person.userData.waypoint=1;person.userData.speed=1.05+(i%3)*.12;
      person.userData.phase=i*1.9;person.userData.homeX=start[0];person.userData.homeZ=start[1];
      person.userData.injured=i===3;
      if(person.userData.injured){person.userData.state="injured";person.userData.alert.visible=true;person.userData.alert.material.color.set("#e45c50");person.userData.alert.material.emissive.set("#9b2924");}
      return person;
    });
    const evacuationPoint = new THREE.Vector3(0,.04,-13.2);
    const safeMarker = new THREE.Group(); safeMarker.position.copy(evacuationPoint); world.add(safeMarker);
    const safeRing = new THREE.Mesh(new THREE.RingGeometry(1.15,1.42,36),mat("#8bd39a",.45,{emissive:"#397c4d",emissiveIntensity:.5}));
    safeRing.rotation.x=-Math.PI/2;safeRing.position.y=.04;safeMarker.add(safeRing);
    const safeBeacon = new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.2,8),mat("#9ee6a6",.4,{emissive:"#4b9b61",emissiveIntensity:.65}));
    safeBeacon.position.y=1.15;safeMarker.add(safeBeacon);
    actionRef.current=()=>{
      const playerAtSafe=Math.hypot(player.position.x-evacuationPoint.x,player.position.z-evacuationPoint.z)<3.1;
      if(playerAtSafe){
        let checkedIn=0,stillFollowing=0;
        for(const person of pedestrians)if(person.userData.state==="following"){
          const distance=Math.hypot(person.position.x-evacuationPoint.x,person.position.z-evacuationPoint.z);
          if(distance<=1.9){
            person.userData.state="sheltered";person.userData.alert.visible=false;person.userData.safeAt=performance.now();
            person.traverse(child=>{if(child.material?.color&&child.material.color.set)child.material.color.set("#79a879");});
            checkedIn++;
          }else stillFollowing++;
        }
        setInteractionMessage(checkedIn?checkedIn+" civilian(s) safely checked in."+ (stillFollowing?" "+stillFollowing+" still catching up — wait at the beacon.":"") : stillFollowing?"Your civilian(s) are still catching up. Stay at the green beacon and press HELP again.":"Safe zone reached. No civilians are following you.");
        return;
      }
      let nearest=null,nearestDistance=2.8;
      for(const person of pedestrians){
        if(person.userData.state==="sheltered"||person.userData.state==="following")continue;
        const distance=Math.hypot(person.position.x-player.position.x,person.position.z-player.position.z);
        if(distance<nearestDistance){nearest=person;nearestDistance=distance;}
      }
      if(!nearest){setInteractionMessage("No civilian nearby. Move within reach, or escort followers to the green safe-zone beacon.");return;}
      const wasInjured=nearest.userData.injured;
      nearest.userData.state="following";nearest.userData.injured=false;nearest.userData.alert.visible=true;nearest.userData.followOffset=(pedestrians.indexOf(nearest)%3-1)*.7;
      nearest.traverse(child=>{if(child.material?.color&&child.material.color.set)child.material.color.set("#d7bd79");});
      setInteractionMessage(wasInjured?"You stabilized the injured civilian. Escort them to the green evacuation beacon and press HELP to check them in.":"Civilian is following you. Lead them to the green evacuation beacon and press HELP to check them in.");
    };


    // Ambient floating pollen and flood spray, intentionally sparse for phones.
    const particles = [];
    for (let i = 0; i < 28; i++) {
      const dust = new THREE.Mesh(new THREE.SphereGeometry(.025 + (i % 3) * .012, 5, 5), mat("#f1e6bd", .5, { transparent: true, opacity: .48 }));
      dust.position.set(-14 + (i * 1.91) % 28, 1.2 + (i % 5) * .5, -8 + (i * 2.7) % 16); dust.userData.baseX = dust.position.x; world.add(dust); particles.push(dust);
    }
    const rain = [];
    for (let i = 0; i < 44; i++) {
      const streak = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .34, 4), mat("#d5e8e7", .3, { transparent: true, opacity: .3 }));
      streak.position.set(-16 + (i * 2.37) % 32, 5 + (i % 9) * .8, -10 + (i * 1.73) % 20);
      streak.rotation.z = -.18; streak.visible = false; streak.userData.speed = .055 + (i % 5) * .012;
      world.add(streak); rain.push(streak);
    }
    const routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#fff0b8", transparent: true, opacity: .92 }));
    world.add(routeLine); let routeSignature = "";
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let down = null, moved = false, frame = 0, disposed = false, pinchStart = 0, pinchZoom = 1;
    const activePointers = new Map();
    const target = new THREE.Vector3(0, 0, 0);
    function resize() {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight), aspect = w / h, view = aspect < 1.15 ? 38 : 22.5;
      camera.left = -view * aspect / 2; camera.right = view * aspect / 2; camera.top = view / 2; camera.bottom = -view / 2; camera.zoom = 1.14; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    function pointerStart(e) { activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); renderer.domElement.setPointerCapture(e.pointerId); if (activePointers.size === 2) { const pts = [...activePointers.values()]; pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); pinchZoom = camera.zoom; down = null; moved = true; return; } down = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved = false; }
    function pointerMove(e) {
      if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size >= 2) { const pts = [...activePointers.values()]; const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); if (pinchStart > 0) { camera.zoom = THREE.MathUtils.clamp(pinchZoom * distance / pinchStart, .72, 1.8); camera.updateProjectionMatrix(); } return; }
      if (!down || down.id !== e.pointerId) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (moved) { cameraOffset.x -= dx * .026 / camera.zoom; cameraOffset.z -= dy * .026 / camera.zoom; camera.position.copy(target).add(cameraOffset); camera.lookAt(target); }
      down.x = e.clientX; down.y = e.clientY;
    }
    function pointerEnd(e) {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) pinchStart = 0;
      if (!down || down.id !== e.pointerId) { if (activePointers.size === 0) down = null; return; }
      if (!moved) {
        const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const unitHits = raycaster.intersectObjects([...unitNodes.values()], true);
        const hitUnit = unitHits.find(hit => hit.object.parent?.userData?.unitId || hit.object.userData?.unitId);
        if (hitUnit) {
          let node = hitUnit.object; while (node && !node.userData.unitId) node = node.parent;
          if (node) liveRef.current.onUnitSelect?.(node.userData.unitId);
        } else {
          const siteHits = raycaster.intersectObjects(siteMeshes, false);
          const siteHit = siteHits.find(hit => hit.object.userData.siteId);
          if (siteHit) liveRef.current.onSiteSelect?.(siteHit.object.userData.siteId);
        }
      }
      down = null;
    }
    function wheel(e) { e.preventDefault(); camera.zoom = THREE.MathUtils.clamp(camera.zoom * (e.deltaY > 0 ? .91 : 1.09), .72, 1.8); camera.updateProjectionMatrix(); }
    renderer.domElement.addEventListener("pointerdown", pointerStart);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerEnd);
    renderer.domElement.addEventListener("pointercancel", pointerEnd);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    function animate(t) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const state = liveRef.current.game;
      const dt=lastFrameTime?Math.min((t-lastFrameTime)/1000,.05):0; lastFrameTime=t;
      let mx=(keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("a")||keys.has("arrowleft")?1:0)+controlsRef.current.x;
      let mz=(keys.has("s")||keys.has("arrowdown")?1:0)-(keys.has("w")||keys.has("arrowup")?1:0)+controlsRef.current.z;
      const mag=Math.hypot(mx,mz);if(mag>1){mx/=mag;mz/=mag;}
      const walking=mag>.05,speed=(keys.has("shift")||controlsRef.current.sprint)?5.2:3.35;
      if(walking){const dx=mx*speed*dt,dz=mz*speed*dt;if(!collides(player.position.x+dx,player.position.z))player.position.x+=dx;if(!collides(player.position.x,player.position.z+dz))player.position.z+=dz;player.rotation.y=Math.atan2(mx,mz);}
      const gait=walking?Math.sin(t*(speed>4? .018:.013))*.48:0;
      const gaitPhases=[1,-1,-1,1];limbs.forEach((limb,i)=>{limb.rotation.x=walking?gait*gaitPhases[i]:0;});
      player.position.y=.04+(walking?Math.abs(Math.sin(t*.014))*.035:0);
      // Civilian state machine: patrol, panic, follow the player, and shelter at the safe zone.
      safeMarker.rotation.y=t*.00035;safeRing.material.emissiveIntensity=.38+Math.sin(t*.004)*.2;
      for(const person of pedestrians){
        const evacuating=!!state.floodLevel;
        if(person.userData.state==="sheltered"){person.userData.alert.visible=false;continue;}
        if(evacuating&&(person.userData.state==="walking"||person.userData.state==="injured"))person.userData.state="evacuating";
        if(person.userData.state==="injured"&&!evacuating){person.userData.alert.visible=true;person.userData.alert.position.y=1.12+Math.sin(t*.008+person.userData.phase)*.07;continue;}
        if(person.userData.state==="following"&&!evacuating){
          const offset=person.userData.followOffset||0;
          destinationForPerson: {
            const destination=new THREE.Vector3(player.position.x+Math.sin(player.rotation.y)*1.15+offset,.04,player.position.z-Math.cos(player.rotation.y)*1.15);
            const dx=destination.x-person.position.x,dz=destination.z-person.position.z,dist=Math.hypot(dx,dz);
            if(dist>.7){const step=Math.min(dist,2.8*dt);person.position.x+=dx/dist*step;person.position.z+=dz/dist*step;person.rotation.y=Math.atan2(dx,dz);}
            person.userData.alert.visible=true;
            const gait=Math.sin(t*.02+person.userData.phase)*.38;person.userData.limbs.forEach((limb,i)=>{limb.rotation.x=gait*(i%2?-1:1);});
            person.position.y=.04+Math.abs(Math.sin(t*.014+person.userData.phase))*.025;
          }
          continue;
        }
        person.userData.alert.visible=evacuating||person.userData.state==="following";
        let destination;
        if(evacuating)destination=new THREE.Vector3((person.userData.pedestrianId%5-2)*.32,.04,evacuationPoint.z+(person.userData.pedestrianId%3-1)*.24);
        else {const route=person.userData.route,wp=route[person.userData.waypoint%route.length];destination=new THREE.Vector3(wp[0],.04,wp[1]);}
        const dx=destination.x-person.position.x,dz=destination.z-person.position.z,dist=Math.hypot(dx,dz);
        if(dist<.22){
          if(evacuating){person.userData.state="sheltered";person.userData.alert.visible=false;person.userData.safeAt=t;}
          else person.userData.waypoint=(person.userData.waypoint+1)%person.userData.route.length;
        }else{
          const speed=evacuating?(person.userData.injured?1.05:2.45):person.userData.speed,step=Math.min(dist,speed*dt);
          person.position.x+=dx/dist*step;person.position.z+=dz/dist*step;person.rotation.y=Math.atan2(dx,dz);
          const gait=Math.sin(t*(evacuating?.022:.014)+person.userData.phase)*.42;
          person.userData.limbs.forEach((limb,i)=>{limb.rotation.x=gait*(i%2?-1:1);});
          person.position.y=.04+Math.abs(Math.sin(t*.014+person.userData.phase))*.025;
        }
        person.userData.alert.position.y=1.12+Math.sin(t*.008+person.userData.phase)*.07;
      }
      if(civilianStatusRef.current && frame % 20 === 0){
        const counts=pedestrians.reduce((acc,person)=>{const status=person.userData.state||"walking";acc[status]=(acc[status]||0)+1;return acc;},{});
        civilianStatusRef.current.textContent="CIVILIANS  ·  "+(counts.walking||0)+" walking  ·  "+(counts.injured||0)+" injured  ·  "+(counts.following||0)+" following  ·  "+(counts.evacuating||0)+" evacuating  ·  "+(counts.sheltered||0)+" safe";
      }
      const followTarget=player.position.clone();followTarget.y=0;target.lerp(followTarget,Math.min(1,dt*4.5));
      camera.position.copy(target).add(cameraOffset);camera.lookAt(target);
      river.position.y = state.floodLevel ? .2 : .11; river.scale.z = state.floodLevel ? 1.22 : 1;
      river.material.color.set(state.floodLevel ? "#286f91" : "#347f9b");
      sun.intensity = state.floodLevel ? 2.05 : 3.1;
      rain.forEach((drop, i) => {
        drop.visible = state.floodLevel;
        if (state.floodLevel) {
          drop.position.y -= drop.userData.speed;
          drop.position.x -= .012;
          if (drop.position.y < .2) {
            drop.position.y = 10 + (i % 6);
            drop.position.x = -16 + (i * 2.37) % 32;
          }
        }
      });
      trees.forEach((tree, i) => {
        tree.rotation.z = Math.sin(t * .0007 + i * 1.9) * .018;
        tree.rotation.x = Math.cos(t * .00055 + i) * .012;
      });
      extractionRing.rotation.z = t * .00055; extractionRing.scale.setScalar(1 + Math.sin(t * .004) * .07); extractionFlag.rotation.y = Math.sin(t * .0014) * .12;
      for (const [id, node] of unitNodes) {
        const unit = state.units.find(u => u.id === id); if (!unit) continue;
        let x = point(unit.col, unit.row).x, z = point(unit.col, unit.row).z, moving = !!(unit.path && unit.path.length);
        if (moving) {
          const next = unit.path[0], a = point(unit.col, unit.row), b = point(next.col, next.row), progress = Math.min(1, unit.stepProgress / 4);
          x = THREE.MathUtils.lerp(a.x, b.x, progress); z = THREE.MathUtils.lerp(a.z, b.z, progress);
          node.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        }
        node.position.set(x, moving ? .04 + Math.abs(Math.sin(t * .012)) * .045 : 0, z);
        const phase = t * (moving ? .014 : .002) + (id.length * 1.7);
        node.userData.limbs.forEach((limb, i) => { limb.rotation.x = moving ? Math.sin(phase + (i % 2) * Math.PI) * .55 : Math.sin(phase + i) * .035; });
        node.userData.ring.visible = state.selected === id;
        node.userData.carried.visible = !!unit.carrying;
        node.userData.workRing.visible = unit.phase === "treating";
        node.userData.workCross.visible = unit.phase === "treating";
        if (unit.phase === "treating") { node.userData.workRing.rotation.z = t * .002; node.userData.workCross.position.y = 2.05 + Math.sin(t * .006) * .09; }
        node.userData.ring.scale.setScalar(state.selected === id ? 1 + Math.sin(t * .006) * .06 : 1);
      }
      for (const site of sites) {
        const saved = state.saved[site.id] || 0, node = siteNodes.get(site.id);
        if (node) {
          node.ring.material.color.set(saved >= site.survivors ? "#6dbb79" : "#e85d50");
          node.ring.rotation.z = t * .00025; node.ring.scale.setScalar(state.target === site.id ? 1.18 : 1);
          node.cap.material.emissiveIntensity = .35 + Math.sin(t * .006) * .2;
          if (saved < lastSaved[site.id]) {
            node.civilians.forEach(person => {
              person.userData.rescuing = false; person.userData.rescued = false; person.visible = true;
              person.traverse(child => { if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => { material.transparent = false; material.opacity = 1; }); });
            });
          }
          node.civilians.forEach((person, i) => {
            if (i < saved && !person.userData.rescuing && !person.userData.rescued) {
              person.userData.rescuing = true; person.userData.rescueAt = t; person.userData.rescueOrigin = person.position.clone();
              person.traverse(child => { if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => { material.transparent = true; material.opacity = 1; }); });
            }
            if (person.userData.rescuing) {
              const progress = THREE.MathUtils.clamp((t - person.userData.rescueAt) / 1250, 0, 1);
              const origin = person.userData.rescueOrigin;
              person.position.set(origin.x + .55 * progress, .04 + Math.sin(progress * Math.PI) * .9, origin.z - .35 * progress);
              person.traverse(child => { if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => { material.opacity = 1 - progress; }); });
              if (progress >= 1) { person.userData.rescuing = false; person.userData.rescued = true; person.visible = false; }
            } else if (i >= saved) {
              person.visible = true; person.position.y = .04; person.rotation.y = Math.sin(t * .001 + person.userData.phase) * .08;
            }
          });
          lastSaved[site.id] = saved;
        }
      }
      particles.forEach((p, i) => { p.position.y = 1.2 + (i % 5) * .5 + Math.sin(t * .0008 + i) * .12; p.position.x = p.userData.baseX + Math.sin(t * .0003 + i) * .12; });
      world.children.filter(o => o.userData.ripple || o.userData.waterLine).forEach((o, i) => { o.rotation.z = Math.sin(t * .001 + i) * .15; });
      const route = state.activePath;
      const signature = route && route.length > 1 ? route.map(cell => cell.col + "," + cell.row).join("|") : "";
      if (signature !== routeSignature) {
        routeSignature = signature;
        routeLine.geometry.dispose();
        routeLine.geometry = signature ? new THREE.BufferGeometry().setFromPoints(route.map(cell => point(cell.col, cell.row, .24))) : new THREE.BufferGeometry();
      }
      routeLine.visible = !!signature;
      renderer.render(scene, camera);
    }
    animate(0);
    sceneRef.current = { renderer, scene, camera };
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("keydown",keyDown);window.removeEventListener("keyup",keyUp);window.removeEventListener("blur",clearKeys);
      renderer.domElement.removeEventListener("pointerdown", pointerStart); renderer.domElement.removeEventListener("pointermove", pointerMove); renderer.domElement.removeEventListener("pointerup", pointerEnd); renderer.domElement.removeEventListener("pointercancel", pointerEnd); renderer.domElement.removeEventListener("wheel", wheel);
      renderer.dispose(); routeLine.geometry.dispose(); host.removeChild(renderer.domElement); sceneRef.current = null;
      scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose()); });
    };
  }, [sites]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera); }, [game]);
  const setDirection=(x,z)=>{controlsRef.current={...controlsRef.current,x,z};};
  const hold=(e,x,z)=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);setDirection(x,z);};
  const release=(e)=>{if(e){e.preventDefault?.();e.stopPropagation?.();}setDirection(0,0);};
  const stopLongPress=(e)=>{e.preventDefault();e.stopPropagation();};
  return <div ref={hostRef} className="three-village-host" onContextMenu={stopLongPress} aria-label="Interactive 3D rescue village. Move with WASD, arrow keys or touch controls. Drag to pan and pinch or scroll to zoom.">
    <div className="player-control-pad" onContextMenu={stopLongPress} onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()}>
      <button aria-label="Move forward" onContextMenu={stopLongPress} onPointerDown={e=>hold(e,0,-1)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>▲</button>
      <div><button aria-label="Move left" onContextMenu={stopLongPress} onPointerDown={e=>hold(e,-1,0)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>◀</button><button aria-label="Move backward" onContextMenu={stopLongPress} onPointerDown={e=>hold(e,0,1)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>▼</button><button aria-label="Move right" onContextMenu={stopLongPress} onPointerDown={e=>hold(e,1,0)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>▶</button></div>
    </div>
    <button className="player-sprint" aria-label="Hold to sprint" onContextMenu={stopLongPress} onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);controlsRef.current.sprint=true;}} onPointerUp={e=>{e.preventDefault();controlsRef.current.sprint=false;}} onPointerCancel={()=>{controlsRef.current.sprint=false;}} onLostPointerCapture={()=>{controlsRef.current.sprint=false;}}>SPRINT</button>
    <div className="civilian-status" ref={civilianStatusRef}>CIVILIANS  ·  8 in area</div>
    <div className="civilian-interaction" onContextMenu={stopLongPress} onPointerDown={e=>e.stopPropagation()}><span>{interactionMessage}</span><button onContextMenu={stopLongPress} onClick={()=>actionRef.current()}>HELP NEARBY · E</button></div>
    <div className="player-control-hint">MOVE · TAP VOLUNTEER → RED INCIDENT · WALK TO CIVILIAN + HELP</div>
  </div>;
}
