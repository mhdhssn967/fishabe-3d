import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// ─── Wind Waker-style toon water vertex shader ────────────────────────────────
const toonWaterVert = `
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform vec3  uFishPos;
uniform float uInWater;

varying vec2  vUv;
varying vec3  vWorldPos;
varying float vDepthX;
varying float vDistZ;

float waveHeight(vec2 p, float t) {
  float w  = sin(p.y * 0.3 - t * uWaveSpeed) * uWaveHeight;
        w += sin(p.x * 0.6 + p.y * 0.2 - t * uWaveSpeed * 1.3) * uWaveHeight * 0.5;
        w += sin(p.x * 1.4 - p.y * 0.5 + t * uWaveSpeed * 2.0) * uWaveHeight * 0.25;

  if (uInWater > 0.0) {
    float d = distance(p, uFishPos.xz);
    if (d < 8.0) {
      float ripple = sin(d * 3.5 - t * 10.0) * exp(-d * 0.45) * 0.04;
      float hump   = exp(-d * d * 2.0) * 0.025;
      w += (ripple + hump) * uInWater;
    }
  }
  return w;
}

void main() {
  vUv = uv;
  vec2 wp = vec2(position.x, -position.y - 30.0);

  float h = waveHeight(wp, uTime);
  vec3 displaced = vec3(position.x, position.y, position.z + h);

  vDepthX = abs(position.x) / 4.0;
  vDistZ  = max(0.0, -wp.y) / 100.0;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

// ─── Wind Waker-style toon water fragment shader ──────────────────────────────
const toonWaterFrag = `
uniform float uTime;
uniform float uWaveSpeed;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uHorizonColor;
uniform vec3 uFoamColor;
uniform vec3 uHighlightColor;
uniform float uFoamWidth;
uniform float uFoamOpacity;
uniform float uFoamSpeed;
uniform float uFresnelPower;
uniform float uCausticIntensity;
uniform vec3  uFishPos;
uniform float uInWater;

uniform sampler2D uWaterTex;
uniform vec2 uTexOffset;

varying vec2  vUv;
varying vec3  vWorldPos;
varying float vDepthX;
varying float vDistZ;

vec2 rippleNormal(vec2 p, float t) {
  vec2 uv1 = p * 0.8 + vec2(0.0, -t * 0.35);
  float n1x = sin(uv1.x * 6.28 + uv1.y * 3.14) * 0.5;
  float n1y = cos(uv1.y * 6.28 + uv1.x * 2.0)  * 0.5;
  vec2 uv2 = p * 1.6 + vec2(t * 0.15, -t * 0.55);
  float n2x = sin(uv2.x * 8.0 - uv2.y * 4.0) * 0.3;
  float n2y = cos(uv2.y * 7.0 + uv2.x * 3.5) * 0.3;
  return vec2(n1x + n2x, n1y + n2y);
}

float causticPattern(vec2 p, float t) {
  float c1 = sin(p.x * 5.0 + t * 2.0) * sin(p.y * 5.0 - t * 1.5);
  float c2 = sin(p.x * 7.0 - t * 1.8) * sin(p.y * 6.0 + t * 2.3);
  return (c1 + c2) * 0.5 + 0.5;
}

void main() {
  vec4 texColor = texture2D(uWaterTex, vUv + uTexOffset);
  
  // 1. Depth gradient & Texture
  float depthFactor = smoothstep(0.0, 0.7, 1.0 - vDepthX);
  vec3 gradColor = mix(uShallowColor, uDeepColor, depthFactor);
  
  // Mix procedural depth gradient with the texture for a rich look
  // (Using texture alpha to allow blending if the image has transparency)
  vec3 baseColor = mix(gradColor, texColor.rgb, texColor.a);
  // Also multiply by depth factor so edges still look nice if it is fully opaque
  baseColor *= mix(vec3(0.8), vec3(1.0), depthFactor);
  
  baseColor = mix(baseColor, uHorizonColor, smoothstep(0.0, 1.0, vDistZ) * 0.4);

  // 2. Scrolling ripple normals
  vec2 wp = vec2(vWorldPos.x, vWorldPos.z);
  vec2 rn = rippleNormal(wp * 0.15, uTime * uWaveSpeed * 0.4);
  baseColor += rn.x * 0.04 * uShallowColor;
  baseColor += rn.y * 0.03;

  // 3. Shore foam (organic irregular edge)
  // Create a scrolling noise-like pattern using combined sine waves
  float foamNoise = sin(wp.y * 2.0 + wp.x * 4.0 + uTime * uFoamSpeed) * 0.5 + 0.5;
  foamNoise += sin(wp.y * 6.0 - wp.x * 2.0 + uTime * uFoamSpeed * 1.3) * 0.25;
  foamNoise += sin(wp.y * 15.0 + uTime * uFoamSpeed * 0.8) * 0.15;
  
  // Modulate the edge distance using the noise
  // vDepthX is 1.0 at the absolute edge, 0.0 in the center.
  float edgeThreshold = 1.0 - (uFoamWidth * (0.6 + foamNoise * 0.6));
  
  // Softly blend the foam inward
  float foamEdge = smoothstep(edgeThreshold - 0.08, edgeThreshold + 0.05, vDepthX);
  
  // Final foam value adds internal patchiness and scales by opacity
  float foam = foamEdge * smoothstep(0.2, 0.9, foamNoise) * uFoamOpacity;

  if (uInWater > 0.0) {
    float fishDist = distance(wp, uFishPos.xz);
    float wakeFoam = exp(-fishDist * fishDist * 1.5) * 0.6 * uInWater;
    vec2 toFish = wp - uFishPos.xz;
    float behind = smoothstep(-0.5, 2.0, toFish.y);
    float vShape = exp(-abs(toFish.x) * 2.0) * behind * exp(-toFish.y * 0.3) * 0.4 * uInWater;
    wakeFoam += vShape;
    foam = max(foam, wakeFoam);
  }

  baseColor = mix(baseColor, uFoamColor, clamp(foam, 0.0, 1.0));

  // 4. Stylized toon fresnel
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 normal = normalize(vec3(rn.x * 0.15, 1.0, rn.y * 0.15));
  float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), uFresnelPower);
  fresnel = smoothstep(0.3, 0.6, fresnel) * 0.45;
  baseColor = mix(baseColor, uHighlightColor, fresnel);

  // 5. Sun specular glint (toon hard edge)
  vec3 lightDir = normalize(vec3(0.4, 1.0, 0.25));
  vec3 halfVec  = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(normal, halfVec)), 80.0);
  spec = smoothstep(0.4, 0.5, spec) * 0.6;
  baseColor += spec * uHighlightColor;

  // 6. Caustic hint
  float c = causticPattern(wp * 0.25, uTime);
  c = pow(c, 3.0) * uCausticIntensity;
  baseColor += c * vec3(0.5, 0.85, 1.0) * (1.0 - depthFactor) * 0.5;

  gl_FragColor = vec4(baseColor, 0.45);
}
`;

// ─── Caustics overlay for the riverbed ────────────────────────────────────────
const causticsVert = `
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const causticsFrag = `
uniform float uTime;
uniform float uCausticIntensity;
uniform sampler2D uFloorTex;
uniform vec2 uTexOffset;

varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vec4 texColor = texture2D(uFloorTex, vUv + uTexOffset);
  // Use the texture color directly as the base
  vec3 baseColor = texColor.rgb;

  // Animated caustics
  vec2 wp = vec2(vWorldPos.x, vWorldPos.z);
  float c1 = sin(wp.x * 5.0 + uTime * 2.0) * sin(wp.y * 5.0 - uTime * 1.5);
  float c2 = sin(wp.x * 7.0 - uTime * 1.8) * sin(wp.y * 6.0 + uTime * 2.3);
  float c = (c1 + c2) * 0.5 + 0.5;
  c = pow(c, 3.0) * uCausticIntensity;
  vec3 causticColor = c * vec3(0.4, 0.75, 0.95);

  gl_FragColor = vec4(baseColor + causticColor, 1.0);
}
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Ground({ speed = 6, fishPositionRef, ...props }) {
  const sideTexture = useTexture('/side_texture.png');
  const wallBaseTexture = useTexture('/environment/side_text.png?v=2');
  const waterTexture = useTexture('/image.png');
  const waterMatRef = useRef();
  const floorMatRef = useRef();
  const sideMaterialRef = useRef();
  const sideMaterialRightRef = useRef();
  const baseMaterialRef = useRef();
  const baseMaterialRightRef = useRef();

  const sideTextureRight = useMemo(() => {
    const t = sideTexture.clone();
    t.needsUpdate = true;
    return t;
  }, [sideTexture]);

  const wallBaseTextureRight = useMemo(() => {
    const t = wallBaseTexture.clone();
    t.needsUpdate = true;
    return t;
  }, [wallBaseTexture]);

  useMemo(() => {
    sideTexture.wrapS = sideTexture.wrapT = THREE.RepeatWrapping;
    sideTexture.repeat.set(30, 0.5);
    
    sideTextureRight.wrapS = sideTextureRight.wrapT = THREE.RepeatWrapping;
    sideTextureRight.repeat.set(30, 0.5);

    wallBaseTexture.wrapS = wallBaseTexture.wrapT = THREE.RepeatWrapping;
    wallBaseTexture.repeat.set(30, 0.5);
    
    wallBaseTextureRight.wrapS = wallBaseTextureRight.wrapT = THREE.RepeatWrapping;
    wallBaseTextureRight.repeat.set(30, 0.5);

    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(4, 20); // Adjust repeats based on size
  }, [sideTexture, sideTextureRight, wallBaseTexture, wallBaseTextureRight, waterTexture]);

  const curveAmount = 0.001;

  const bendGeometry = (geometry, isRotatedPlane, zOffset) => {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let worldZ = isRotatedPlane ? -pos.getY(i) + zOffset : pos.getZ(i) + zOffset;
      if (worldZ < 0) {
        const drop = Math.pow(Math.abs(worldZ), 2) * curveAmount;
        if (isRotatedPlane) pos.setZ(i, pos.getZ(i) - drop);
        else pos.setY(i, pos.getY(i) - drop);
      }
    }
    geometry.computeVertexNormals();
    return geometry;
  };

  const geometries = useMemo(() => ({
    water:    bendGeometry(new THREE.PlaneGeometry(8, 150, 16, 80), true, -30),
    seaFloor: bendGeometry(new THREE.PlaneGeometry(40, 150, 1, 64), true, -30),
    wallBase: bendGeometry(new THREE.BoxGeometry(2, 2.5, 150, 1, 1, 64), false, -30),
    wallTop:  bendGeometry(new THREE.BoxGeometry(2, 0.5, 150, 1, 1, 64), false, -30),
  }), []);

  // ── Water uniforms (all exposed for easy tweaking) ───────────────────────
  const waterUniforms = useMemo(() => ({
    uTime:            { value: 0 },
    uWaveHeight:      { value: 0.035 },
    uWaveSpeed:       { value: 1.5 },
    uShallowColor:    { value: new THREE.Color('#4de8d1') },
    uDeepColor:       { value: new THREE.Color('#1a7ec7') },
    uHorizonColor:    { value: new THREE.Color('#0d4a7a') },
    uFoamColor:       { value: new THREE.Color('#ffffff') }, // pure white/light cyan
    uHighlightColor:  { value: new THREE.Color('#e0faff') },
    uFoamWidth:       { value: 0.12 }, // About 5-10% of canal
    uFoamOpacity:     { value: 0.9 },
    uFoamSpeed:       { value: 1.5 },
    uFresnelPower:    { value: 2.5 },
    uCausticIntensity:{ value: 0.35 },
    uFishPos:         { value: new THREE.Vector3(0, 0, 0) },
    uInWater:         { value: 1.0 },
    uWaterTex:        { value: waterTexture },
    uTexOffset:       { value: new THREE.Vector2(0, 0) },
  }), [waterTexture]);

  // ── Floor caustics uniforms (now uses texture) ─────────────
  const floorUniforms = useMemo(() => ({
    uTime:            { value: 0 },
    uCausticIntensity:{ value: 0.5 },
    uFloorTex:        { value: waterTexture },
    uTexOffset:       { value: new THREE.Vector2(0, 0) },
  }), [waterTexture]);

  // ── Per-frame updates ────────────────────────────────────────────────────
  useFrame((state, delta) => {
    if (speed === 0) return;
    const t = state.clock.elapsedTime;

    // Side wall texture scroll
    if (sideMaterialRef.current && sideMaterialRef.current.map) {
      sideMaterialRef.current.map.offset.x += delta * 1.2;
    }
    if (sideMaterialRightRef.current && sideMaterialRightRef.current.map) {
      sideMaterialRightRef.current.map.offset.x -= delta * 1.2;
    }
    if (baseMaterialRef.current && baseMaterialRef.current.map) {
      baseMaterialRef.current.map.offset.x += delta * 1.2;
    }
    if (baseMaterialRightRef.current && baseMaterialRightRef.current.map) {
      baseMaterialRightRef.current.map.offset.x -= delta * 1.2;
    }

    // Water shader uniforms
    if (waterMatRef.current) {
      waterMatRef.current.uniforms.uTime.value = t;
      waterMatRef.current.uniforms.uTexOffset.value.y += delta * 0.01 * speed;

      const fp = fishPositionRef && fishPositionRef.current;
      if (fp) {
        waterMatRef.current.uniforms.uFishPos.value.set(fp.x, fp.y, fp.z);
        const inWater = Math.max(0, 1 - Math.max(0, fp.y + 0.2) / 0.6);
        waterMatRef.current.uniforms.uInWater.value = inWater;
      }
    }

    // Floor caustics uniform
    if (floorMatRef.current) {
      floorMatRef.current.uniforms.uTime.value = t;
      // Scroll the ground texture at the same speed as the water surface
      floorMatRef.current.uniforms.uTexOffset.value.y += delta * 0.01 * speed;
    }
  });

  return (
    <group {...props}>
      {/* ── Toon Water Surface ──────────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} geometry={geometries.water}>
        <shaderMaterial
          ref={waterMatRef}
          transparent
          depthWrite={false}
          uniforms={waterUniforms}
          vertexShader={toonWaterVert}
          fragmentShader={toonWaterFrag}
        />
      </mesh>

      {/* ── Sea Floor with Caustics ─────────────────────────────────── */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -30]} geometry={geometries.seaFloor}>
        <shaderMaterial
          ref={floorMatRef}
          uniforms={floorUniforms}
          vertexShader={causticsVert}
          fragmentShader={causticsFrag}
        />
      </mesh>

      {/* ── River Banks ─────────────────────────────────────────────── */}
      <mesh receiveShadow position={[-5, -0.75, -30]} geometry={geometries.wallBase}>
        <meshStandardMaterial ref={baseMaterialRef} map={wallBaseTexture} bumpMap={wallBaseTexture} bumpScale={0.5} color="#ffffff" roughness={1.0} />
      </mesh>
      <mesh receiveShadow position={[-5, 0.75, -30]} geometry={geometries.wallTop}>
        <meshStandardMaterial ref={sideMaterialRef} map={sideTexture} bumpMap={sideTexture} bumpScale={0.5} color="#ffffff" roughness={1.0} />
      </mesh>

      <mesh receiveShadow position={[5, -0.75, -30]} geometry={geometries.wallBase}>
        <meshStandardMaterial ref={baseMaterialRightRef} map={wallBaseTextureRight} bumpMap={wallBaseTextureRight} bumpScale={0.5} color="#ffffff" roughness={1.0} />
      </mesh>
      <mesh receiveShadow position={[5, 0.75, -30]} geometry={geometries.wallTop}>
        <meshStandardMaterial ref={sideMaterialRightRef} map={sideTextureRight} bumpMap={sideTextureRight} bumpScale={0.5} color="#ffffff" roughness={1.0} />
      </mesh>
    </group>
  );
}
