import * as THREE from 'three';

/* ========================================================================== */
/*                           ATMOSPHERE GLOW SHADER                           */
/* ========================================================================== */

const AtmosphereVertexShader = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const AtmosphereFragmentShader = `
varying vec3 vNormal;
uniform vec3 color;
void main() {
  float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.5);
  gl_FragColor = vec4(color, 1.0) * intensity;
}
`;

export function createAtmosphereMaterial(colorHex: number = 0x38bdf8): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: AtmosphereVertexShader,
    fragmentShader: AtmosphereFragmentShader,
    uniforms: {
      color: { value: new THREE.Color(colorHex) }
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
}
