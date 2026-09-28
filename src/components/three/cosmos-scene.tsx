'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import * as React from 'react';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  type BufferAttribute,
  type Group,
  type Points,
} from 'three';

/**
 * The site-wide 3D cosmos.
 *
 * This is the piece that makes the whole product read as one 3D space rather
 * than a page with a 3D widget on it. It is mounted once, fixed, behind all
 * content, and built from three cheap layers:
 *
 *   1. **Nebula core** — a large additive sphere that slowly tumbles.
 *   2. **Star torus** — points wrapped around a ring, drifting, giving the
 *      scene a sense of orbit and scale.
 *   3. **Orbit rings** — three tilted wireframe rings rotating at different
 *      speeds, which read as a holographic armillary sphere.
 *
 * Design constraints that shape the code:
 *
 *   • **One draw call per layer.** Everything is a single `Points` or a single
 *     mesh, never N objects, so a laptop GPU is never the bottleneck.
 *   • **Zero React re-renders after mount.** Every per-frame value is read from
 *     a ref inside `useFrame`.
 *   • **Reduced motion = one static frame.** `motionScale: 0` freezes everything,
 *     and the canvas is not torn down, so the background is still there.
 *   • **Tab visibility.** `frameloop` flips to `never` while the tab is hidden so
 *     a backgrounded tab burns no GPU.
 *   • **The cursor drives parallax.** The whole rig leans toward the pointer,
 *     so the background is spatially connected to the UI floating on top of it.
 */

/** Brand palette, as raw values — WebGL cannot read CSS custom properties. */
const STAR_COLORS = ['#19D3AE', '#A78BFA', '#FF7BB0', '#FFC94D', '#60A5FA', '#FFFFFF'];

/**
 * A soft round dot, generated rather than loaded.
 *
 * `PointsMaterial` with no map renders each point as a hard-edged SQUARE, which
 * at a 900-particle count reads as digital confetti rather than stars. Drawing a
 * radial gradient into an offscreen canvas once and reusing it as the sprite
 * texture is what turns them into points of light. No asset to fetch, and it is
 * shared by every Points material in the scene.
 */
let softDot: CanvasTexture | null = null;

function softDotTexture(): CanvasTexture {
  if (softDot) return softDot;

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Bright core fading through a wide halo, so overlapping points bloom
    // together instead of stacking as visible discs.
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  softDot = new CanvasTexture(canvas);
  softDot.needsUpdate = true;
  return softDot;
}

interface CosmosSceneProps {
  /** Smoothed pointer, -1..1 on each axis. */
  pointer: React.RefObject<{ x: number; y: number }>;
  /** 0 freezes all idle motion (reduced motion). */
  motionScale?: number;
  /** Scaled down on phones. */
  particleCount?: number;
}

/* -------------------------------------------------------------------------- */

/*  Stars
   --------------------------------------------------------------------------
   There is deliberately NO nebula geometry in this file.
 *
 * Every attempt at one — an enclosing sphere, then a handful of huge additive
 * spheres — projected to a visible circular silhouette with a hard edge across
 * the page, which reads as a rendering bug rather than as space. A colour wash
 * cannot be faked with lit geometry at this scale: the moment an object is
 * large enough to fill the frame, its edge is in frame too.
 *
 * The wash is already done properly in CSS, by the aurora blobs in
 * `AmbientBackground` — those are `border-radius: 50%` under a 120px+ blur, so
 * they have no edge by construction. This layer is left to what CSS genuinely
 * cannot do: points that orbit at different depths, and geometry that turns.
 * ========================================================================== */

/* -------------------------------------------------------------------------- */
/*  Orbiting star field                                                        */
/* -------------------------------------------------------------------------- */

function StarTorus({
  count,
  motionScale,
  radius = 34,
}: {
  count: number;
  motionScale: number;
  radius?: number;
}) {
  const ref = React.useRef<Points>(null);
  const angles = React.useRef<Float32Array>(new Float32Array(0));

  const { positions, colors, radii, heights, sizes } = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const heights = new Float32Array(count);
    const sizes = new Float32Array(count);

    // Deterministic PRNG: the sky must be byte-identical between the server
    // render and the client, or the whole page hydrates with a visible jump.
    let seed = 0x0c05a0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      // sqrt keeps the distribution even across the disc instead of clumping
      // everything in the centre.
      // The disc is deliberately wide and tall. Stars bunched into a tight
      // volume sit directly behind the hero copy, where their additive glow
      // competes with the text and makes body copy harder to read.
      const r = radius * (0.45 + Math.sqrt(rand()) * 0.75);
      const y = (rand() - 0.5) * 26;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const hex = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
      const c = Number.parseInt(hex.slice(1), 16);
      colors[i * 3] = ((c >> 16) & 255) / 255;
      colors[i * 3 + 1] = ((c >> 8) & 255) / 255;
      colors[i * 3 + 2] = (c & 255) / 255;

      radii[i] = r;
      heights[i] = y;
      sizes[i] = 0.06 + rand() * 0.16;
    }

    angles.current = new Float32Array(count);
    for (let i = 0; i < count; i++) angles.current[i] = rand() * Math.PI * 2;

    return { positions, colors, radii, heights, sizes };
  }, [count, radius]);

  useFrame((state) => {
    if (motionScale <= 0) return;
    const points = ref.current;
    if (!points) return;

    const geometry = points.geometry;
    const attr = geometry.getAttribute('position') as BufferAttribute;
    const array = attr.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Each star orbits on its own rate; the vertical position breathes on a
      // slower, offset phase. The whole disc is one buffer write per frame.
      const speed = (0.012 + sizes[i] * 0.05) * motionScale;
      const angle = angles.current[i] + t * speed;
      const r = radii[i];
      array[i * 3] = Math.cos(angle) * r;
      array[i * 3 + 1] = heights[i] + Math.sin(t * 0.4 + i) * 0.5;
      array[i * 3 + 2] = Math.sin(angle) * r;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={softDotTexture()}
        size={0.7}
        vertexColors
        transparent
        opacity={0.16}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/*  Armillary rings                                                            */
/* -------------------------------------------------------------------------- */

/*
 * The orbit rings are the layer that had to be dialled back the furthest.
 *
 * A full-width torus crossing the viewport draws a long, hard, bright line
 * straight through the middle of the page. On a hero with a big empty centre
 * that reads as a premium detail; on a form, a list or a table it reads as a
 * rendering artefact slicing through the content, and it is exactly the kind of
 * thing the brief calls "distracting users from the content".
 *
 * So they are kept, but faint, and pushed far enough back that the perspective
 * shrinks them. At this opacity a ring contributes atmosphere, not a line.
 */
const RINGS = [
  { radius: 30, tube: 0.016, speed: 0.03, tilt: [Math.PI / 2.6, 0, 0.2] as const, color: '#19D3AE' },
  { radius: 42, tube: 0.013, speed: -0.022, tilt: [Math.PI / 3.4, 0.6, -0.3] as const, color: '#A78BFA' },
  { radius: 55, tube: 0.011, speed: 0.014, tilt: [Math.PI / 2, -0.4, 0.9] as const, color: '#FF7BB0' },
] as const;

function OrbitRings({ motionScale }: { motionScale: number }) {
  const refs = React.useRef<Array<Group | null>>([]);

  useFrame((_, delta) => {
    if (motionScale <= 0) return;
    const step = Math.min(delta, 0.05) * motionScale;
    RINGS.forEach((ring, index) => {
      const node = refs.current[index];
      if (!node) return;
      node.rotation.z += step * ring.speed;
    });
  });

  return (
    <group>
      {RINGS.map((ring, index) => (
        <group key={ring.radius} ref={(node) => (refs.current[index] = node)} rotation={ring.tilt as unknown as [number, number, number]}>
          <mesh>
            <torusGeometry args={[ring.radius, ring.tube, 6, 128]} />
            <meshBasicMaterial
              color={ring.color}
              transparent
              opacity={0.07}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Floating shards                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A handful of slow-turning crystals drifting through the volume.
 *
 * Only five, because each is real geometry — this is the one layer where count
 * has to stay low.
 *
 * The key detail is `emissiveIntensity`. These sat at 0.9 with `toneMapped: false`,
 * which made each one essentially a flat rectangle of solid colour: the emissive
 * term swamps the lighting entirely, so every facet renders the same value and an
 * octahedron viewed face-on reads as a diamond-shaped sticker. Dropping the
 * emissive to a faint tint and letting the point lights do the work is what makes
 * the facets shade differently as the crystal turns.
 */
const SHARDS = [
  { position: [-34, 14, -40], scale: 1.1, speed: 0.16, color: '#A78BFA' },
  { position: [36, -16, -44], scale: 1.3, speed: -0.12, color: '#19D3AE' },
  { position: [18, 26, -48], scale: 0.9, speed: 0.2, color: '#FF7BB0' },
  { position: [-26, -22, -38], scale: 1.2, speed: -0.18, color: '#FFC94D' },
  { position: [4, 32, -52], scale: 0.8, speed: 0.14, color: '#60A5FA' },
] as const;

function FloatingShards({ motionScale }: { motionScale: number }) {
  const refs = React.useRef<Array<Group | null>>([]);

  useFrame((state, delta) => {
    if (motionScale <= 0) return;
    const step = Math.min(delta, 0.05) * motionScale;
    const t = state.clock.elapsedTime;
    SHARDS.forEach((shard, index) => {
      const node = refs.current[index];
      if (!node) return;
      node.rotation.x += step * shard.speed;
      node.rotation.y += step * shard.speed * 0.7;
      node.position.y = shard.position[1] + Math.sin(t * 0.3 + index) * 1.4;
    });
  });

  return (
    <group>
      {SHARDS.map((shard, index) => (
        <group
          key={shard.position.join(',')}
          ref={(node) => (refs.current[index] = node)}
          position={shard.position}
          scale={shard.scale}
        >
          <mesh>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={shard.color}
              emissive={shard.color}
              emissiveIntensity={0.15}
              transparent
              opacity={0.3}
              roughness={0.15}
              metalness={0.7}
              flatShading
            />
          </mesh>
          <mesh scale={1.4}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={shard.color}
              transparent
              opacity={0.03}
              side={BackSide}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pointer rig                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Leans the whole volume toward the cursor.
 *
 * Kept as its own component *inside* the canvas: `useFrame` only resolves within
 * the R3F render loop, so this hook cannot live in the wrapper owning `<Canvas>`.
 */
function CosmosRig({
  pointer,
  motionScale,
  children,
}: {
  pointer: React.RefObject<{ x: number; y: number }>;
  motionScale: number;
  children: React.ReactNode;
}) {
  const ref = React.useRef<Group>(null);

  useFrame((state, delta) => {
    const rig = ref.current;
    if (!rig) return;
    const p = pointer.current ?? { x: 0, y: 0 };
    const step = Math.min(delta, 0.05);
    const lerp = 1 - Math.pow(0.002, step);

    // A small range on purpose: the background should feel attached to the
    // page, not like it is being steered by the mouse.
    const targetX = -p.y * 2.6 * motionScale;
    const targetY = p.x * 3.4 * motionScale;
    rig.rotation.x += (targetX - rig.rotation.x) * lerp;
    rig.rotation.y += (targetY - rig.rotation.y) * lerp;
    rig.position.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.8 * motionScale;
  });

  return <group ref={ref}>{children}</group>;
}

/* -------------------------------------------------------------------------- */
/*  Scene                                                                      */
/* -------------------------------------------------------------------------- */

export function CosmosScene({ pointer, motionScale = 1, particleCount = 900 }: CosmosSceneProps) {
  const [visible, setVisible] = React.useState(true);

  // Stop rendering entirely while the tab is in the background.
  React.useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <Canvas
      // A blur-heavy background gains nothing from retina density, so DPR is
      // capped hard. This is the single biggest perf win in the whole app.
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 30], fov: 55, near: 0.1, far: 120 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', depth: true }}
      // Stop drawing entirely while the tab is hidden.
      frameloop={visible ? (motionScale > 0 ? 'always' : 'demand') : 'never'}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 8]} intensity={0.8} color="#FFFFFF" />
      <pointLight position={[-10, 4, -6]} intensity={40} color="#A78BFA" distance={40} />
      <pointLight position={[10, -4, -8]} intensity={30} color="#19D3AE" distance={40} />
      {/* A light behind the camera. Without one the crystals are backlit only,
          so every facet facing the viewer sits at near-zero and the whole thing
          reads as a flat silhouette rather than a solid. */}
      <pointLight position={[0, 2, 18]} intensity={26} color="#FFE8F4" distance={50} />

      <CosmosRig pointer={pointer} motionScale={motionScale}>
        <StarTorus count={particleCount} motionScale={motionScale} />
        <OrbitRings motionScale={motionScale} />
        <FloatingShards motionScale={motionScale} />
      </CosmosRig>
    </Canvas>
  );
}
