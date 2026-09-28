'use client';

import { Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as React from 'react';
import { AdditiveBlending, DoubleSide, type Group, type PointLight } from 'three';

import { FloatingObjects } from './floating-objects';
import { GiftBoxMesh } from './gift-box-mesh';
import { ParticleField } from './particle-field';

/**
 * The hero's WebGL scene.
 *
 * Composition, back to front:
 *   • **Dome**        — a faint inverted sphere that gives the scene a "space"
 *   • **Glow floor**  — a soft additive disc, so the box is anchored rather
 *                       than floating in a void
 *   • **gift box**    — the subject, lit with a neon rim
 *   • **halo rings**  — two tilted rings tying the hero to the site-wide
 *                       cosmos background
 *   • **floating objects** — hearts / stars / crystals orbiting it
 *   • **particle field**  — one additive `Points`, cheap at any count
 *   • **drei Sparkles**   — a second, finer layer of drifting motes
 *
 * The camera never moves by itself beyond a gentle drift; pointer parallax is
 * applied to the whole rig so the scene feels like a window into a space rather
 * than a spinning turntable. Scrolling pushes the camera back, so the hero
 * hands off to the next section as a continuous 3D pull-back instead of being
 * abruptly cropped by it.
 *
 * Every per-frame value is read from a ref, never from React state. Nothing
 * here triggers a re-render after mount.
 */

const RIM_PINK = '#FF7BB0';
const RIM_PURPLE = '#A97BFF';
const RIM_CORAL = '#FF7A5C';

interface SceneProps {
  /** 0 → sealed, 1 → open. Written by the parent's spring, read per frame. */
  openProgress: React.RefObject<number>;
  /** Smoothed pointer, -1..1. */
  pointer: React.RefObject<{ x: number; y: number }>;
  /** 0 disables idle motion (reduced motion). */
  motionScale?: number;
  /** Lower particle budget on phones. */
  particleCount?: number;
}

/**
 * Owns the camera and the key light for the whole scene.
 *
 * This is the single writer of `camera.position` — three separate components
 * each lerping one axis used to fight each other and produce a visible drift.
 * Scroll, pointer and bob are all combined into one target here.
 */
function CameraRig({
  pointer,
  motionScale = 1,
}: {
  pointer: React.RefObject<{ x: number; y: number }>;
  motionScale?: number;
}) {
  const keyLightRef = React.useRef<PointLight>(null);

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    const p = pointer.current ?? { x: 0, y: 0 };
    const lerp = 1 - Math.pow(0.001, step);

    // --- scroll: the hero hands off to the next section as a real 3D pull-back
    const rect = state.gl.domElement.getBoundingClientRect();
    // 1 while the canvas sits fully in view, 0 once it has scrolled past.
    const progress = Math.max(
      0,
      Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)),
    );
    // Smoothstep, so the pull-back starts and ends gently rather than snapping.
    const eased = progress * progress * (3 - 2 * progress);
    const scrollZ = 5.5 * (1 - eased);

    // --- idle bob, so the frame is never perfectly static
    const bob = Math.sin(state.clock.elapsedTime * 0.6) * 0.09 * motionScale;

    // A deliberately small pointer range: the scene should breathe, not swim.
    const targetX = p.x * 0.85 * motionScale;
    const targetY = 0.55 + p.y * 0.5 * motionScale + bob * 0.35;
    const targetZ = 6.4 - Math.abs(p.x) * 0.35 * motionScale + scrollZ;

    state.camera.position.x += (targetX - state.camera.position.x) * lerp;
    state.camera.position.y += (targetY - state.camera.position.y) * lerp;
    state.camera.position.z += (targetZ - state.camera.position.z) * lerp;
    state.camera.lookAt(0, 0.1 + bob * 0.5, 0);

    if (keyLightRef.current) {
      // The key light tracks the cursor, so highlights sweep across the box.
      keyLightRef.current.position.x += (p.x * 4 - keyLightRef.current.position.x) * lerp;
      keyLightRef.current.position.y += (3 + p.y * 2 - keyLightRef.current.position.y) * lerp;
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight ref={keyLightRef} position={[3, 3, 4]} intensity={22} color="#ffffff" distance={18} />
      {/* Neon rim lights: one per brand colour, opposite each other. */}
      <pointLight position={[-4, 1.5, -2]} intensity={16} color={RIM_PINK} distance={16} />
      <pointLight position={[4, -1.5, -2]} intensity={14} color={RIM_PURPLE} distance={16} />
      <pointLight position={[0, -3, 2]} intensity={10} color={RIM_CORAL} distance={14} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Floor                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A soft glow disc under the box plus a wider halo ring. Purely additive, no
 * lighting and no shadow map — a real ground plane would cost a render target
 * per frame for a scene this small, and is indistinguishable at this distance.
 */
function GlowFloor({ motionScale }: { motionScale: number }) {
  const ref = React.useRef<Group>(null);

  useFrame((state) => {
    const group = ref.current;
    if (!group || motionScale <= 0) return;
    // The halo breathes on its own clock, independent of scroll or pointer.
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.1) * 0.06;
    group.scale.set(pulse, pulse, 1);
  });

  return (
    <group ref={ref} position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[2.4, 64]} />
        <meshBasicMaterial
          color={RIM_PURPLE}
          transparent
          opacity={0.16}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[2.4, 3.6, 64]} />
        <meshBasicMaterial
          color={RIM_PINK}
          transparent
          opacity={0.1}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Halo rings                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Two tilted rings around the box. They echo the orbit rings in the site-wide
 * cosmos, so the hero subject and the page background read as one space.
 */
const HALOS = [
  { radius: 2.5, tube: 0.018, speed: 0.35, tilt: [1.15, 0, 0] as const, color: RIM_PINK },
  { radius: 3.2, tube: 0.014, speed: -0.24, tilt: [-0.6, 0.9, 0.4] as const, color: RIM_PURPLE },
] as const;

function HaloRings({ motionScale }: { motionScale: number }) {
  const refs = React.useRef<Array<Group | null>>([]);

  useFrame((_, delta) => {
    if (motionScale <= 0) return;
    const step = Math.min(delta, 0.05) * motionScale;
    HALOS.forEach((halo, index) => {
      const node = refs.current[index];
      if (!node) return;
      node.rotation.z += step * halo.speed;
    });
  });

  return (
    <group>
      {HALOS.map((halo, index) => (
        <group
          key={halo.radius}
          ref={(node) => {
            refs.current[index] = node;
          }}
          rotation={halo.tilt as unknown as [number, number, number]}
        >
          <mesh>
            <torusGeometry args={[halo.radius, halo.tube, 8, 96]} />
            <meshBasicMaterial
              color={halo.color}
              transparent
              opacity={0.5}
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
/*  Dome                                                                       */
/* -------------------------------------------------------------------------- */

/*
 * There is deliberately NO enclosing dome or shell mesh.
 *
 * An inverted sphere used to sit here to add depth, and it was the single
 * ugliest thing in the scene: a BackSide sphere at any radius fills the entire
 * canvas with a flat wash, so the canvas rectangle showed up as a hard-edged
 * purple box sitting on the page. Fading the canvas edges with a mask does not
 * rescue it — the wash is uniform, so there is nothing to fade *to*.
 *
 * Depth here comes from the additive layers, which are transparent by
 * construction and therefore have no edge: the glow floor is a flat disc, the
 * halo rings are thin toruses, and the particles fade out radially. A flat
 * object can only be added if it does not fill the frame.
 */
function Dome() {
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Scroll recoil — folded into CameraRig                                      */
/* -------------------------------------------------------------------------- */
/*
 * The scroll pull-back used to be its own `useFrame` component writing
 * `camera.position.z`. Two writers for one axis made the hero visibly fight
 * itself; it is now computed inside `CameraRig`, which owns the camera outright.
 */

export function GiftScene({
  openProgress,
  pointer,
  motionScale = 1,
  particleCount = 260,
}: SceneProps) {
  return (
    <Canvas
      // Cap DPR: retina phones otherwise render 3–4× the pixels for no visible
      // gain on a blur-heavy scene like this.
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.55, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // Only render while something is actually happening.
      frameloop={motionScale > 0 ? 'always' : 'demand'}
    >
      <CameraRig pointer={pointer} motionScale={motionScale} />

      {/*
       * No `<Environment>` here on purpose. It suspends the subtree while it
       * fetches an HDRI from a CDN, which left the canvas mounted-but-empty
       * (0 lit pixels) whenever that request was slow or blocked. The lighting
       * below is entirely local, so the first frame is guaranteed to draw.
       */}
      <Dome />
      <GlowFloor motionScale={motionScale} />
      <HaloRings motionScale={motionScale} />
      <GiftBoxMesh openProgress={openProgress} motionScale={motionScale} />
      <FloatingObjects pointer={pointer} motionScale={motionScale} />
      <ParticleField count={particleCount} motionScale={motionScale} />
      <Sparkles
        count={Math.round(particleCount / 6)}
        scale={[9, 6, 9]}
        size={2.4}
        speed={motionScale > 0 ? 0.35 : 0}
        opacity={0.5}
        color="#FFC94D"
      />
    </Canvas>
  );
}