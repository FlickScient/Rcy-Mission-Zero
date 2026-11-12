// @ts-nocheck
import { useEffect, useRef } from "react";
import * as THREE from "three";
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
    if (i < points.length - 1) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
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
function addHouse(parent, col, row, kind = "home", label = "") {
  const p = point(col, row); const g = new THREE.Group(); g.position.set(p.x, .03, p.z); parent.add(g);
  const scale = kind === "school" ? 1.22 : kind === "shed" ? .78 : kind === "clinic" ? 1.08 : 1;
  const wall = mat(kind === "clinic" ? "#e5d9bd" : kind === "school" ? "#e6dfc8" : "#d7c39d", .94, { map: wallTexture });
  const side = mat(kind === "clinic" ? "#b9aa8f" : "#ae936e", .95, { map: wallTexture });
  const roof = mat(kind === "clinic" ? "#a9413c" : kind === "school" ? "#3d6380" : "#854e3b", .78, { map: roofTexture });
  const base = addBox(g, 1.62 * scale, 1.05 * scale, 1.42 * scale, wall, 0, .63 * scale, 0);
  base.material = wall;
  addBox(g, .12, .92 * scale, 1.44 * scale, side, .82 * scale, .62 * scale, 0);
  // Four-sided pitched roof with visible eaves and ridge.
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(1.22 * scale, .9 * scale, 4), roof);
  roofMesh.rotation.y = Math.PI / 4; roofMesh.position.y = 1.55 * scale; roofMesh.castShadow = true; g.add(roofMesh);
  addBox(g, 1.9 * scale, .09, 1.68 * scale, mat("#6d4938"), 0, 1.13 * scale, 0);
  const door = addBox(g, .34 * scale, .64 * scale, .055, mat("#654735"), -.28 * scale, .35 * scale, .74 * scale);
  door.position.z = .74 * scale;
  const windowMat = new THREE.MeshStandardMaterial({ color: "#8ebdc0", metalness: .18, roughness: .25 });
  for (const x of [-.62, .45]) {
    addBox(g, .32 * scale, .28 * scale, .06, windowMat, x * scale, .76 * scale, .73 * scale);
    addBox(g, .36 * scale, .045, .075, mat("#f1e4c8"), x * scale, .76 * scale, .77 * scale, false);
  }
  if (kind === "clinic") {
    addBox(g, .42, .42, .05, mat("#fff8e8"), 0, 1.95 * scale, .74);
    addBox(g, .09, .31, .07, mat("#c84640"), 0, 1.95 * scale, .78, false);
    addBox(g, .28, .09, .07, mat("#c84640"), 0, 1.95 * scale, .78, false);
  }
  if (kind === "school") {
    addBox(g, .045, .9, .045, mat("#574b3d"), .62, 2.05, -.15);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(.48, .26, .025), mat("#d34b42"));
    flag.position.set(.86, 2.35, -.15); flag.castShadow = true; g.add(flag);
  }
  if (label) {
    // Floating label is represented by a clean, readable marker in the HUD;
    // keep the 3D scene uncluttered at phone scale.
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .35, 6), mat("#e8d7ae"));
    marker.position.set(0, 2.05 * scale, 0); g.add(marker);
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
function addVolunteer(parent, unit) {
  const g = new THREE.Group(); g.userData.unitId = unit.id; parent.add(g);
  const uniform = mat(unit.color || "#e9e4d7"), dark = mat("#263b32"), skin = mat("#c99470"), helmet = mat(unit.role === "Medical" ? "#f0e9d7" : "#d5b96c");
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.22, .38, 4, 7), uniform); torso.position.y = .86; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), skin); head.position.y = 1.36; head.castShadow = true; g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), helmet); hat.position.y = 1.48; hat.castShadow = true; g.add(hat);
  const pack = addBox(g, .27, .35, .16, mat(unit.role === "Supply" ? "#a47b45" : "#344f43"), 0, .92, -.25);
  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .105, .55, 0); g.add(leg);
    const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .28, 3, 6), dark); legMesh.position.y = -.2; legMesh.castShadow = true; leg.add(legMesh); limbs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .25, 1.02, 0); g.add(arm);
    const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.065, .25, 3, 6), uniform); armMesh.rotation.z = side * -.16; armMesh.position.y = -.18; arm.add(armMesh); limbs.push(arm);
  }
  if (unit.role === "Medical") {
    addBox(g, .18, .18, .035, mat("#fff"), .24, .91, .02);
    addBox(g, .045, .14, .045, mat("#c8423c"), .24, .91, .05, false);
    addBox(g, .12, .045, .045, mat("#c8423c"), .24, .91, .05, false);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.38, .48, 32), mat("#f2d77e", .5, { emissive: "#8b6721", emissiveIntensity: .18 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .035; ring.visible = false; g.add(ring);
  g.userData.limbs = limbs; g.userData.ring = ring; g.userData.pack = pack;
  return g;
}

export default function ThreeVillage({ game, sites, onUnitSelect, onSiteSelect }) {
  const hostRef = useRef(null), liveRef = useRef({ game, onUnitSelect, onSiteSelect }), sceneRef = useRef(null);
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
    const base = new THREE.Mesh(new THREE.BoxGeometry(COLS * TILE + 1, .55, ROWS * TILE + 1), mat("#665e45"));
    base.position.y = -.32; base.receiveShadow = true; base.castShadow = true; world.add(base);
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const p = point(col, row), kind = obstacleMap.get(col + "," + row);
      const tile = new THREE.Mesh(new THREE.BoxGeometry(TILE - .025, .12, TILE - .025), kind === "water" ? mat("#397e91", .28, { metalness: .08, map: waterTexture }) : groundMats[(col * 7 + row * 3) % groundMats.length]);
      tile.position.set(p.x, -.025, p.z); tile.receiveShadow = true; world.add(tile);
      if (kind === "water") {
        const ripple = new THREE.Mesh(new THREE.TorusGeometry(.48, .018, 5, 28), mat("#b8e5df", .25, { transparent: true, opacity: .55 }));
        ripple.rotation.x = Math.PI / 2; ripple.position.set(p.x, .06, p.z); ripple.userData.ripple = true; world.add(ripple);
      } else if (kind === "rubble") addRubble(world, col, row);
      else if (kind === "shed") addHouse(world, col, row, "shed");
    }
    // Winding raised village road with a lighter gravel shoulder.
    const roadPoints = [[-12,-4.5],[-8,-4.2],[-5,-2.8],[-2,-2.3],[1,-.5],[4,-1.2],[7,-2.8],[11,-2.2],[12,-1.5]].map(([x,z]) => new THREE.Vector3(x,.075,z));
    const roadCurve = new THREE.CatmullRomCurve3(roadPoints);
    const shoulder = new THREE.Mesh(new THREE.TubeGeometry(roadCurve, 90, .66, 8, false), mat("#9d8966")); shoulder.receiveShadow = true; world.add(shoulder);
    const road = new THREE.Mesh(new THREE.TubeGeometry(roadCurve, 90, .48, 8, false), mat("#c5ad82")); road.receiveShadow = true; road.position.y = .045; world.add(road);
    // Flood channel at the south edge, with banks, current ribbons and a timber crossing.
    const river = new THREE.Mesh(new THREE.BoxGeometry(29, .11, 3.2), mat("#347f9b", .2, { metalness: .16, transparent: true, opacity: .94 }));
    river.position.set(0, .11, 8.0); world.add(river);
    for (let i = 0; i < 16; i++) {
      const ripple = new THREE.Mesh(new THREE.TorusGeometry(.34 + (i % 3) * .12, .018, 4, 20), mat("#b6e3d8", .22, { transparent: true, opacity: .42 }));
      ripple.rotation.x = Math.PI / 2; ripple.position.set(-13 + i * 1.7, .19, 7.5 + Math.sin(i) * .55); ripple.userData.waterLine = true; world.add(ripple);
    }
    const bridge = new THREE.Group(); bridge.position.set(7.8, .28, 6.1); world.add(bridge);
    addBox(bridge, 3.7, .22, 1.5, mat("#806044"), 0, .25, 0);
    for (let i = 0; i < 9; i++) addBox(bridge, .38, .035, 1.43, mat("#c49a68"), -1.62 + i * .405, .38, 0, false);
    for (const side of [-1, 1]) addBox(bridge, 3.7, .12, .12, mat("#614a35"), 0, .62, side * .72);
    // Densely planted tree belts, palms, shrubs and scattered village greenery.
    const treeSpots = [[-13,-7],[-10,-6],[-7,-7],[-3,-7],[1,-7],[5,-7],[9,-7],[13,-6],[-14,-2],[-13,2],[-12,6],[-10,7],[-7,6],[-4,7],[-1,7],[2,7],[5,7],[10,7],[13,5],[13,1],[12,-3],[-9,1],[-6,3],[10,1],[4,3],[-2,4]];
    treeSpots.forEach(([x,z], i) => addTree(world, x, z, .76 + (i % 4) * .11, i));
    // Distinctive public buildings and homes across the sector.
    const buildingKinds = new Map([[2 + "," + 2,"home"],[8 + "," + 1,"school"],[9 + "," + 5,"clinic"],[3 + "," + 6,"home"],[4 + "," + 1,"home"],[10 + "," + 2,"home"],[1 + "," + 3,"home"],[4 + "," + 5,"home"],[10 + "," + 6,"home"],[0 + "," + 1,"home"]]);
    for (const [key, kind] of buildingKinds) { const [c,r] = key.split(",").map(Number); addHouse(world, c, r, kind); }
    const siteNodes = new Map();
    const siteMeshes = [];
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
    const unitNodes = new Map();
    for (const unit of liveRef.current.game.units) {
      const g = addVolunteer(world, unit); unitNodes.set(unit.id, g);
    }
    // Ambient floating pollen and flood spray, intentionally sparse for phones.
    const particles = [];
    for (let i = 0; i < 28; i++) {
      const dust = new THREE.Mesh(new THREE.SphereGeometry(.025 + (i % 3) * .012, 5, 5), mat("#f1e6bd", .5, { transparent: true, opacity: .48 }));
      dust.position.set(-14 + (i * 1.91) % 28, 1.2 + (i % 5) * .5, -8 + (i * 2.7) % 16); world.add(dust); particles.push(dust);
    }
    const routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#fff0b8", transparent: true, opacity: .92 }));
    world.add(routeLine); let routeSignature = "";
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let down = null, moved = false, frame = 0, disposed = false, pinchStart = 0, pinchZoom = 1;
    const activePointers = new Map();
    const target = new THREE.Vector3(0, 0, 0);
    function resize() {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight), aspect = w / h, view = aspect < 1.15 ? 33 : 17;
      camera.left = -view * aspect / 2; camera.right = view * aspect / 2; camera.top = view / 2; camera.bottom = -view / 2; camera.zoom = aspect < 1.15 ? 1.08 : 1; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    function pointerStart(e) { activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); renderer.domElement.setPointerCapture(e.pointerId); if (activePointers.size === 2) { const pts = [...activePointers.values()]; pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); pinchZoom = camera.zoom; down = null; moved = true; return; } down = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved = false; }
    function pointerMove(e) {
      if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size >= 2) { const pts = [...activePointers.values()]; const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); if (pinchStart > 0) { camera.zoom = THREE.MathUtils.clamp(pinchZoom * distance / pinchStart, .72, 1.8); camera.updateProjectionMatrix(); } return; }
      if (!down || down.id !== e.pointerId) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (moved) { target.x -= dx * .026 / camera.zoom; target.z -= dy * .026 / camera.zoom; camera.position.x -= dx * .026 / camera.zoom; camera.position.z -= dy * .026 / camera.zoom; camera.lookAt(target); }
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
      river.position.y = state.floodLevel ? .2 : .11; river.scale.z = state.floodLevel ? 1.22 : 1;
      river.material.color.set(state.floodLevel ? "#286f91" : "#347f9b");
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
        node.userData.ring.scale.setScalar(state.selected === id ? 1 + Math.sin(t * .006) * .06 : 1);
      }
      for (const site of sites) {
        const saved = state.saved[site.id] || 0, node = siteNodes.get(site.id);
        if (node) { node.ring.material.color.set(saved >= site.survivors ? "#6dbb79" : "#e85d50"); node.ring.rotation.z = t * .00025; node.cap.material.emissiveIntensity = .35 + Math.sin(t * .006) * .2; node.civilians.forEach((person, i) => { person.visible = i >= saved; person.rotation.y = Math.sin(t * .001 + person.userData.phase) * .08; }); }
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
      renderer.domElement.removeEventListener("pointerdown", pointerStart); renderer.domElement.removeEventListener("pointermove", pointerMove); renderer.domElement.removeEventListener("pointerup", pointerEnd); renderer.domElement.removeEventListener("pointercancel", pointerEnd); renderer.domElement.removeEventListener("wheel", wheel);
      renderer.dispose(); routeLine.geometry.dispose(); host.removeChild(renderer.domElement); sceneRef.current = null;
      scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose()); });
    };
  }, [sites]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera); }, [game]);
  return <div ref={hostRef} className="three-village-host" role="img" aria-label="Interactive three-dimensional isometric flood-hit village. Tap a volunteer to select, tap a rescue beacon to dispatch, drag to pan, and pinch or scroll to zoom." />;
}
