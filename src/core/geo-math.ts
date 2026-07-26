import * as THREE from 'three';
import { LatLng } from '../types/geo';

/* ========================================================================== */
/*                           GEOGRAPHIC MATHEMATICS                           */
/* ========================================================================== */

const EARTH_RADIUS_KM = 6371;
const LINE_R = 1.016;

export function latLngToVector3(lat: number, lng: number, radius: number = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lng * (Math.PI / 180);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    -radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function vector3ToLatLng(v: THREE.Vector3): LatLng {
  const norm = v.clone().normalize();
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI);
  const lng = Math.atan2(-norm.z, norm.x) * (180 / Math.PI);
  return { lat, lng };
}

export function calculateAntipode(lat: number, lng: number): LatLng {
  const antiLat = -lat;
  let antiLng = lng >= 0 ? lng - 180 : lng + 180;
  if (antiLng > 180) antiLng -= 360;
  if (antiLng < -180) antiLng += 360;
  return { lat: antiLat, lng: antiLng };
}

export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function generateGreatCirclePoints(
  lat: number,
  lng: number,
  headingDeg: number,
  numPoints: number = 360
): THREE.Vector3[] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lng * (Math.PI / 180);

  const startVec = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    -Math.sin(phi) * Math.sin(theta)
  );

  let tangentNorth = new THREE.Vector3(
    -Math.cos(phi) * Math.cos(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.sin(theta)
  ).normalize();

  let tangentEast = new THREE.Vector3(
    -Math.sin(phi) * Math.sin(theta),
    0,
    -Math.sin(phi) * Math.cos(theta)
  ).normalize().negate();

  if (tangentEast.lengthSq() < 0.0001) {
    tangentEast = new THREE.Vector3(-1, 0, 0);
  }

  const headingRad = headingDeg * (Math.PI / 180);
  const dir = tangentNorth
    .clone()
    .multiplyScalar(Math.cos(headingRad))
    .add(tangentEast.clone().multiplyScalar(Math.sin(headingRad)))
    .normalize();

  const rotationAxis = new THREE.Vector3().crossVectors(startVec, dir).normalize();
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    points.push(
      startVec.clone().applyAxisAngle(rotationAxis, angle).multiplyScalar(LINE_R)
    );
  }

  return points;
}

export function generateLatitudePoints(
  lat: number,
  lng: number,
  numPoints: number = 360
): THREE.Vector3[] {
  const cosLat = Math.cos(lat * (Math.PI / 180)) * LINE_R;
  const sinLat = Math.sin(lat * (Math.PI / 180)) * LINE_R;
  const offsetRad = lng * (Math.PI / 180);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = offsetRad + (i / numPoints) * Math.PI * 2;
    points.push(new THREE.Vector3(cosLat * Math.cos(angle), sinLat, -cosLat * Math.sin(angle)));
  }

  return points;
}

export function pointsToLatLngArray(pts: THREE.Vector3[]): LatLng[] {
  return pts.map((p) => vector3ToLatLng(p));
}
