import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LatLng, MarkerData, GeoFeature } from '../types/geo';
import { latLngToVector3, vector3ToLatLng, generateGreatCirclePoints, generateLatitudePoints, pointsToLatLngArray } from '../core/geo-math';
import { buildTubeMesh, disposeMesh } from './tube-builder';

/* ========================================================================== */
/*                              3D GLOBE ENGINE                               */
/* ========================================================================== */

export class GlobeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private markerScene: THREE.Scene;
  private backScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbit: OrbitControls;

  private root: THREE.Group;
  private markerRoot: THREE.Group;
  private lineRoot: THREE.Group;
  private backRoot: THREE.Group;
  private gridGroup: THREE.Group;
  private lineGroup: THREE.Group;

  private oceanMat: THREE.MeshBasicMaterial;
  private landMat: THREE.MeshBasicMaterial;
  private brdMat: THREE.MeshBasicMaterial;
  private backFillMat: THREE.MeshBasicMaterial;
  private backBrdMat: THREE.MeshBasicMaterial;

  private landCanvas: HTMLCanvasElement;
  private fillCanvas: HTMLCanvasElement;
  private brdCanvas: HTMLCanvasElement;
  private landCtx: CanvasRenderingContext2D;
  private fillCtx: CanvasRenderingContext2D;
  private brdCtx: CanvasRenderingContext2D;

  private landTex: THREE.CanvasTexture;
  private fillTex: THREE.CanvasTexture;
  private brdTex: THREE.CanvasTexture;

  private isTransparent: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private oceanMesh: THREE.Mesh;
  private centerDot: THREE.Mesh;

  private markerMeshes: Map<string, { main: THREE.Mesh; anti: THREE.Mesh; lines: THREE.Group; thru: THREE.Group }> = new Map();
  private onDoubleTapCallback?: (coords: LatLng) => void;
  private onMercatorRedrawCallback?: () => void;

  private animationFrameId: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    /* --- Scene Initialization --- */
    this.scene = new THREE.Scene();
    this.markerScene = new THREE.Scene();
    this.backScene = new THREE.Scene();

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || 540;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.z = 3.0;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.autoClear = false;

    this.container.appendChild(this.renderer.domElement);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enablePan = false;
    this.orbit.minDistance = 1.5;
    this.orbit.maxDistance = 6.0;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.markerRoot = new THREE.Group();
    this.markerScene.add(this.markerRoot);

    this.lineRoot = new THREE.Group();
    this.markerScene.add(this.lineRoot);

    this.lineGroup = new THREE.Group();
    this.lineRoot.add(this.lineGroup);

    this.backRoot = new THREE.Group();
    this.backScene.add(this.backRoot);

    this.gridGroup = new THREE.Group();
    this.root.add(this.gridGroup);

    /* --- Canvas Setup --- */
    const CW = 4096;
    const CH = 2048;

    this.landCanvas = document.createElement('canvas');
    this.landCanvas.width = CW; this.landCanvas.height = CH;
    this.landCtx = this.landCanvas.getContext('2d')!;

    this.fillCanvas = document.createElement('canvas');
    this.fillCanvas.width = CW; this.fillCanvas.height = CH;
    this.fillCtx = this.fillCanvas.getContext('2d')!;

    this.brdCanvas = document.createElement('canvas');
    this.brdCanvas.width = CW; this.brdCanvas.height = CH;
    this.brdCtx = this.brdCanvas.getContext('2d')!;

    this.landTex = new THREE.CanvasTexture(this.landCanvas);
    this.fillTex = new THREE.CanvasTexture(this.fillCanvas);
    this.brdTex = new THREE.CanvasTexture(this.brdCanvas);

    /* --- Globe Sphere & Layers --- */
    this.oceanMat = new THREE.MeshBasicMaterial({ color: 0xc8dff0 });
    this.oceanMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), this.oceanMat);
    this.root.add(this.oceanMesh);

    this.landMat = new THREE.MeshBasicMaterial({ map: this.landTex, transparent: true, opacity: 1, depthWrite: true });
    this.root.add(new THREE.Mesh(new THREE.SphereGeometry(1.002, 64, 64), this.landMat));

    this.brdMat = new THREE.MeshBasicMaterial({ map: this.brdTex, transparent: true, opacity: 1, depthWrite: true });
    this.root.add(new THREE.Mesh(new THREE.SphereGeometry(1.005, 64, 64), this.brdMat));

    this.backFillMat = new THREE.MeshBasicMaterial({ map: this.fillTex, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false });
    this.backRoot.add(new THREE.Mesh(new THREE.SphereGeometry(1.001, 64, 64), this.backFillMat));

    this.backBrdMat = new THREE.MeshBasicMaterial({ map: this.brdTex, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false });
    this.backRoot.add(new THREE.Mesh(new THREE.SphereGeometry(1.001, 64, 64), this.backBrdMat));

    /* --- Center Dot --- */
    this.centerDot = new THREE.Mesh(new THREE.SphereGeometry(0.0044, 16, 16), new THREE.MeshBasicMaterial({ color: 0x22aa44 }));
    this.centerDot.visible = false;
    this.markerRoot.add(this.centerDot);

    this.initGrid();

    /* --- Event Listeners --- */
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('dblclick', this.handleDoubleClick);
    window.addEventListener('resize', this.handleResize);

    this.startLoop();
  }

  /* ========================================================================== */
  /*                             TEXTURE RENDERING                              */
  /* ========================================================================== */

  public updateTopologyFeatures(features: GeoFeature[]): void {
    const CW = 4096;
    const CH = 2048;

    this.drawFeatures(this.landCtx, CW, CH, 'rgba(175, 215, 160, 1)', null, 0, features);
    this.landTex.needsUpdate = true;

    this.drawFeatures(this.fillCtx, CW, CH, 'rgba(175, 215, 160, 0.6)', null, 0, features);
    this.fillTex.needsUpdate = true;

    this.drawFeatures(this.brdCtx, CW, CH, null, 'rgba(40, 40, 40, 1)', 3, features);
    this.brdTex.needsUpdate = true;
  }

  private drawFeatures(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fs: string | null,
    ss: string | null,
    lw: number,
    features: GeoFeature[]
  ): void {
    ctx.clearRect(0, 0, w, h);
    if (fs) ctx.fillStyle = fs;
    if (ss) { ctx.strokeStyle = ss; ctx.lineWidth = lw; ctx.lineJoin = 'round'; }

    const geo2x = (lng: number) => ((lng + 180) / 360) * w;
    const geo2y = (lat: number) => ((90 - lat) / 180) * h;

    const splitRing = (coords: number[][]) => {
      if (!coords || coords.length < 2) return [];
      const paths: number[][][] = [[]];
      let prevLng = coords[0][0];
      paths[0].push(coords[0]);
      for (let i = 1; i < coords.length; i++) {
        if (Math.abs(coords[i][0] - prevLng) > 180) paths.push([]);
        paths[paths.length - 1].push(coords[i]);
        prevLng = coords[i][0];
      }
      return paths.filter((p) => p.length >= 2);
    };

    features.forEach((f) => {
      if (!f.geometry) return;
      const g = f.geometry;
      let polys: number[][][][] = [];
      if (g.type === 'Polygon') polys = [g.coordinates as number[][][]];
      else if (g.type === 'MultiPolygon') polys = g.coordinates as number[][][][];

      polys.forEach((rings) => {
        if (fs) {
          ctx.beginPath();
          rings.forEach((r) => {
            splitRing(r).forEach((sub) => {
              ctx.moveTo(geo2x(sub[0][0]), geo2y(sub[0][1]));
              for (let i = 1; i < sub.length; i++) ctx.lineTo(geo2x(sub[i][0]), geo2y(sub[i][1]));
              ctx.closePath();
            });
          });
          ctx.fill('evenodd');
        }

        if (ss) {
          rings.forEach((r) => {
            splitRing(r).forEach((sub) => {
              ctx.beginPath();
              ctx.moveTo(geo2x(sub[0][0]), geo2y(sub[0][1]));
              for (let i = 1; i < sub.length; i++) ctx.lineTo(geo2x(sub[i][0]), geo2y(sub[i][1]));
              ctx.stroke();
            });
          });
        }
      });
    });
  }

  /* ========================================================================== */
  /*                                 GRID SETUP                                 */
  /* ========================================================================== */

  private initGrid(): void {
    const GRID_R = 1.009;
    const SEGS = 256;
    const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, depthTest: true });

    const addGridLine = (pts: THREE.Vector3[]) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridGroup.add(new THREE.Line(geo, lineMat));
    };

    [-80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80].forEach((lat) => {
      const cl = Math.cos(lat * (Math.PI / 180)) * GRID_R;
      const sl = Math.sin(lat * (Math.PI / 180)) * GRID_R;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= SEGS; i++) {
        const a = (i / SEGS) * Math.PI * 2;
        pts.push(new THREE.Vector3(cl * Math.cos(a), sl, -cl * Math.sin(a)));
      }
      addGridLine(pts);
    });

    for (let lon = 0; lon < 360; lon += 10) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= SEGS; i++) {
        pts.push(latLngToVector3(i / SEGS * 180 - 90, lon, GRID_R));
      }
      addGridLine(pts);
    }

    /* Dashed Axis Line */
    const axisPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      axisPts.push(new THREE.Vector3(0, ((i / 64) * 2 - 1) * 1.5, 0));
    }
    const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPts);
    const axisMat = new THREE.LineDashedMaterial({ color: 0x000000, dashSize: 0.06, gapSize: 0.04, depthTest: true });
    const axisLine = new THREE.Line(axisGeo, axisMat);
    axisLine.computeLineDistances();
    this.gridGroup.add(axisLine);

    /* Equator Tube Ring */
    const eqPts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      eqPts.push(new THREE.Vector3(GRID_R * Math.cos(a), 0, -GRID_R * Math.sin(a)));
    }
    const tube = buildTubeMesh(eqPts, 0.003, 0x000000, true);
    if (tube) this.gridGroup.add(tube);
  }

  /* ========================================================================== */
  /*                           MARKER & DIAMETER LINE                           */
  /* ========================================================================== */

  public setOnDoubleTap(cb: (coords: LatLng) => void): void {
    this.onDoubleTapCallback = cb;
  }

  public setOnMercatorRedraw(cb: () => void): void {
    this.onMercatorRedrawCallback = cb;
  }

  private handleDoubleClick = (e: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.oceanMesh);
    if (hits.length === 0) return;

    const localPoint = this.root.worldToLocal(hits[0].point.clone()).normalize();
    const coords = vector3ToLatLng(localPoint);
    if (this.onDoubleTapCallback) this.onDoubleTapCallback(coords);
  };

  private createMarkerMesh(color: number, lat: number, lng: number, isAntipode: boolean): THREE.Mesh {
    const v = latLngToVector3(lat, lng, 1.015);
    if (isAntipode) v.multiplyScalar(-1);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 16), new THREE.MeshBasicMaterial({ color }));
    m.position.copy(v);
    return m;
  }

  private makeThruLine(lat: number, lng: number): THREE.Group {
    const v = latLngToVector3(lat, lng, 1.5);
    const anti = v.clone().negate();
    const STEPS = 80;
    const DASH = 8;
    const GAP = 4;

    const grp = new THREE.Group();
    let seg: THREE.Vector3[] = [];
    let phase = 0;
    let count = 0;

    for (let i = 0; i <= STEPS; i++) {
      const pt = v.clone().lerp(anti, i / STEPS);
      if (phase === 0) {
        seg.push(pt);
        count++;
        if (count >= DASH) {
          if (seg.length >= 2) {
            const tube = buildTubeMesh(seg, 0.006, 0x888800, false);
            if (tube) grp.add(tube);
          }
          seg = [pt];
          phase = 1;
          count = 0;
        }
      } else {
        count++;
        if (count >= GAP) {
          phase = 0;
          count = 0;
          seg = [pt];
        }
      }
    }

    if (phase === 0 && seg.length >= 2) {
      const tube = buildTubeMesh(seg, 0.006, 0x888800, false);
      if (tube) grp.add(tube);
    }

    return grp;
  }

  public syncMarkers(markers: MarkerData[]): void {
    const currentIds = new Set(markers.map((m) => m.id));

    this.markerMeshes.forEach((meshObj, id) => {
      if (!currentIds.has(id)) {
        this.markerRoot.remove(meshObj.main);
        this.markerRoot.remove(meshObj.anti);
        this.lineGroup.remove(meshObj.lines);
        this.lineGroup.remove(meshObj.thru);
        disposeMesh(meshObj.main);
        disposeMesh(meshObj.anti);
        disposeMesh(meshObj.lines);
        disposeMesh(meshObj.thru);
        this.markerMeshes.delete(id);
      }
    });

    markers.forEach((m) => {
      let existing = this.markerMeshes.get(m.id);
      if (!existing) {
        const mainMesh = this.createMarkerMesh(0xcc2200, m.lat, m.lng, false);
        const antiMesh = this.createMarkerMesh(0x0044cc, m.lat, m.lng, true);
        const thruGroup = this.makeThruLine(m.lat, m.lng);
        thruGroup.visible = false;
        const linesGroup = new THREE.Group();

        this.markerRoot.add(mainMesh);
        this.markerRoot.add(antiMesh);
        this.lineGroup.add(thruGroup);
        this.lineGroup.add(linesGroup);

        existing = { main: mainMesh, anti: antiMesh, lines: linesGroup, thru: thruGroup };
        this.markerMeshes.set(m.id, existing);
      }

      existing.thru.visible = m.showDiameterLine;
    });
  }

  /* ========================================================================== */
  /*                      ANIMATED LINE DRAWING ENGINE                          */
  /* ========================================================================== */

  private animateLine(allPts: THREE.Vector3[], color: number, markerObj: MarkerData, mercKey: 'gc' | 'lat'): void {
    const meshObj = this.markerMeshes.get(markerObj.id);
    if (!meshObj) return;

    const N = allPts.length;
    const DUR = 3000;
    const radius = 0.008;

    const grp = new THREE.Group();
    this.lineGroup.add(grp);
    meshObj.lines.add(grp);

    const arrowMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.05, 12),
      new THREE.MeshBasicMaterial({ color, depthTest: false })
    );
    arrowMesh.visible = false;
    grp.add(arrowMesh);

    const llPts = pointsToLatLngArray(allPts);
    if (mercKey === 'gc') {
      if (!markerObj.mercGcPts) markerObj.mercGcPts = [];
      markerObj.mercGcPts.push({ pts: [], color: `#${('000000' + color.toString(16)).slice(-6)}` });
    }

    let tubeMesh: THREE.Mesh | null = null;
    let lastCount = -1;
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = Math.min((now - t0) / DUR, 1);
      const count = Math.max(2, Math.floor(t * N));

      if (count !== lastCount && (count - lastCount >= 4 || t >= 1)) {
        lastCount = count;
        if (tubeMesh) {
          grp.remove(tubeMesh);
          if (tubeMesh.geometry) tubeMesh.geometry.dispose();
        }
        tubeMesh = buildTubeMesh(allPts.slice(0, count), radius, color, false);
        if (tubeMesh) grp.add(tubeMesh);

        if (mercKey === 'lat') {
          markerObj.mercLatPts = llPts.slice(0, count);
        } else if (markerObj.mercGcPts && markerObj.mercGcPts.length > 0) {
          markerObj.mercGcPts[markerObj.mercGcPts.length - 1].pts = llPts.slice(0, count);
        }

        if (this.onMercatorRedrawCallback) this.onMercatorRedrawCallback();
      }

      if (count >= 2) {
        const tip = allPts[count - 1];
        const prev = allPts[count - 2];
        const dir = tip.clone().sub(prev).normalize();
        arrowMesh.position.copy(tip);
        arrowMesh.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
        arrowMesh.visible = t < 1;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        if (mercKey === 'lat') {
          markerObj.mercLatPts = llPts;
        } else if (markerObj.mercGcPts && markerObj.mercGcPts.length > 0) {
          markerObj.mercGcPts[markerObj.mercGcPts.length - 1].pts = llPts;
        }
        if (this.onMercatorRedrawCallback) this.onMercatorRedrawCallback();
      }
    };

    requestAnimationFrame(frame);
  }

  public drawGreatCircle(marker: MarkerData): void {
    const pts = generateGreatCirclePoints(marker.lat, marker.lng, marker.headingDeg, 360);
    this.animateLine(pts, 0xdd4400, marker, 'gc');
  }

  public drawLatitudeCircle(marker: MarkerData): void {
    const pts = generateLatitudePoints(marker.lat, marker.lng, 360);
    this.animateLine(pts, 0x0055cc, marker, 'lat');
  }

  public flyTo(lat: number, lng: number): void {
    const targetVec = latLngToVector3(lat, lng, 3.0);
    const startPos = this.camera.position.clone();
    const duration = 1000;
    const startTime = performance.now();

    const animateCam = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this.camera.position.lerpVectors(startPos, targetVec, ease);
      this.orbit.update();

      if (progress < 1) requestAnimationFrame(animateCam);
    };

    requestAnimationFrame(animateCam);
  }

  /* ========================================================================== */
  /*                          X-RAY TRANSPARENCY MODE                           */
  /* ========================================================================== */

  public toggleTransparency(enable?: boolean): boolean {
    this.isTransparent = enable !== undefined ? enable : !this.isTransparent;

    if (this.isTransparent) {
      this.oceanMat.transparent = true;
      this.oceanMat.opacity = 0;
      this.landMat.map = this.fillTex;
      this.landMat.opacity = 0.6;
      this.backFillMat.opacity = 0.7;
      this.backBrdMat.opacity = 0.85;
      this.centerDot.visible = true;
      this.gridGroup.children.forEach((l) => {
        const line = l as THREE.Line;
        if (line.material) {
          (line.material as THREE.Material).depthTest = false;
          (line.material as THREE.Material).needsUpdate = true;
        }
      });
    } else {
      this.oceanMat.transparent = false;
      this.oceanMat.opacity = 1;
      this.landMat.map = this.landTex;
      this.landMat.opacity = 1;
      this.backFillMat.opacity = 0;
      this.backBrdMat.opacity = 0;
      this.centerDot.visible = false;
      this.gridGroup.children.forEach((l) => {
        const line = l as THREE.Line;
        if (line.material) {
          (line.material as THREE.Material).depthTest = true;
          (line.material as THREE.Material).needsUpdate = true;
        }
      });
    }

    this.landMat.needsUpdate = true;
    this.backFillMat.needsUpdate = true;
    this.backBrdMat.needsUpdate = true;
    return this.isTransparent;
  }

  /* ========================================================================== */
  /*                            RENDER & LIFECYCLE                              */
  /* ========================================================================== */

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.orbit.update();

      this.markerRoot.quaternion.copy(this.root.quaternion);
      this.lineRoot.quaternion.copy(this.root.quaternion);
      this.backRoot.quaternion.copy(this.root.quaternion);

      this.renderer.clear();
      if (this.isTransparent) this.renderer.render(this.backScene, this.camera);
      this.renderer.render(this.scene, this.camera);
      if (this.isTransparent) this.renderer.clearDepth();
      this.renderer.render(this.markerScene, this.camera);
    };
    animate();
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || 540;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // WARNING: Call dispose() when tearing down the component to free WebGL contexts.
  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('dblclick', this.handleDoubleClick);

    this.renderer.dispose();
    this.markerMeshes.forEach((meshObj) => {
      disposeMesh(meshObj.main);
      disposeMesh(meshObj.anti);
      disposeMesh(meshObj.lines);
      disposeMesh(meshObj.thru);
    });
    this.markerMeshes.clear();
  }
}
