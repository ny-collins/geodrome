import * as THREE from 'three';

/* ========================================================================== */
/*                            TUBE MESH GEOMETRY                              */
/* ========================================================================== */

// WARNING: Call disposeMesh() whenever replacing or removing tube meshes to prevent VRAM memory leaks.
export function buildTubeMesh(
  pts: THREE.Vector3[],
  radius: number,
  color: number,
  depthTest: boolean = true,
  sides: number = 8
): THREE.Mesh | null {
  const N = pts.length;
  if (N < 2) return null;

  const positions: number[] = [];
  const indices: number[] = [];

  const fwd = pts[1].clone().sub(pts[0]).normalize();
  const ref = Math.abs(fwd.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(fwd, ref).normalize();

  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const fwdI = i < N - 1 ? pts[i + 1].clone().sub(p).normalize() : p.clone().sub(pts[i - 1]).normalize();

    if (i > 0) {
      const pf = pts[i].clone().sub(pts[i - 1]).normalize();
      const ra = new THREE.Vector3().crossVectors(pf, fwdI);
      if (ra.lengthSq() > 1e-8) {
        const ag = Math.acos(Math.max(-1, Math.min(1, pf.dot(fwdI))));
        up.applyAxisAngle(ra.normalize(), ag);
      }
      up.sub(fwdI.clone().multiplyScalar(fwdI.dot(up))).normalize();
    }

    const right = new THREE.Vector3().crossVectors(fwdI, up).normalize();
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      positions.push(
        p.x + (up.x * Math.cos(a) + right.x * Math.sin(a)) * radius,
        p.y + (up.y * Math.cos(a) + right.y * Math.sin(a)) * radius,
        p.z + (up.z * Math.cos(a) + right.z * Math.sin(a)) * radius
      );
    }
  }

  for (let j = 0; j < N - 1; j++) {
    const base = j * sides;
    for (let s2 = 0; s2 < sides; s2++) {
      const a2 = base + s2;
      const b2 = base + ((s2 + 1) % sides);
      const c2 = a2 + sides;
      const d2 = b2 + sides;
      indices.push(a2, b2, c2, b2, d2, c2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    depthTest
  });

  return new THREE.Mesh(geo, mat);
}

export function disposeMesh(mesh: THREE.Mesh | THREE.Group): void {
  mesh.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    }
  });
}
