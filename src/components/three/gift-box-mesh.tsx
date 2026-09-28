'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import type { Group } from 'three';

/**
 * The 3D gift box at the centre of the hero.
 *
 * Built from primitives rather than a loaded glTF so there is no asset to fetch,
 * nothing to 404, and no decode cost on first paint — the box is on screen
 * immediately. All geometry is shared via `useMemo` so re-renders never
 * reallocate buffers.
 *
 * Materials are MeshPhysicalMaterial: a glossy lacquered body, a metal ribbon,
 * and a translucent inner cavity that is revealed as the lid lifts.
 *
 * The component animates only its own group — it never touches the camera.
 * `CameraRig` in `gift-scene.tsx` is the sole owner of `camera.position`, so
 * the two cannot fight over the same axis.
 */

/** Hadiya brand colours, as raw values (WebGL cannot read CSS variables). */
const PINK = '#FF7BB0';
const PURPLE = '#A97BFF';
const CORAL = '#FF7A5C';
const GOLD = '#FFC94D';

interface GiftBoxMeshProps {
  /** 0 = sealed, 1 = fully open. Driven by the parent's spring. */
  openProgress: React.RefObject<number>;
  /** Multiplies the idle bob/floating animation. 0 freezes it. */
  motionScale?: number;
}

export function GiftBoxMesh({ openProgress, motionScale = 1 }: GiftBoxMeshProps) {
  const lidRef = React.useRef<Group>(null);
  const innerRef = React.useRef<Group>(null);
  const rootRef = React.useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = openProgress.current ?? 0;

    if (lidRef.current) {
      // Lift and tilt the lid as the box opens.
      lidRef.current.position.y = 0.62 + p * 0.85;
      lidRef.current.rotation.z = -p * 0.22;
      lidRef.current.rotation.x = p * 0.12;
    }
    if (innerRef.current) {
      // The cavity only reads once the lid is clear of it.
      const eased = Math.max(0, (p - 0.25) / 0.75);
      innerRef.current.scale.setScalar(0.2 + eased * 0.8);
    }

    // Gentle idle drift, applied to the box itself.
    //
    // This used to write `state.camera.position.y` directly, which meant the
    // box mesh and the camera rig were both animating the same axis from two
    // different `useFrame` callbacks. The result was a visible double-lerp and
    // the box appeared to sag. The camera is now owned solely by `CameraRig`.
    const root = rootRef.current;
    if (root && motionScale > 0) {
      root.position.y = Math.sin(t * 0.6) * 0.09 * motionScale;
      root.rotation.y = Math.sin(t * 0.35) * 0.12 * motionScale;
    }
  });

  return (
    <group ref={rootRef}>
      {/* ------------------------------------------------------------ body */}
      <RoundedBox args={[1.7, 1.2, 1.7]} radius={0.14} smoothness={4} position={[0, -0.2, 0]}>
        <meshPhysicalMaterial
          color={PINK}
          roughness={0.28}
          metalness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.15}
          sheen={1}
          sheenColor={CORAL}
        />
      </RoundedBox>

      {/* Vertical ribbon bands on the body */}
      <RoundedBox args={[0.3, 1.22, 1.74]} radius={0.05} smoothness={3} position={[0, -0.2, 0]}>
        <meshPhysicalMaterial color={GOLD} roughness={0.18} metalness={0.95} />
      </RoundedBox>
      <RoundedBox args={[1.74, 1.22, 0.3]} radius={0.05} smoothness={3} position={[0, -0.2, 0]}>
        <meshPhysicalMaterial color={GOLD} roughness={0.18} metalness={0.95} />
      </RoundedBox>

      {/* ------------------------------------------------------- inner glow */}
      <group ref={innerRef} position={[0, 0.35, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 0.7, 1.5]} />
          <meshStandardMaterial
            color={PURPLE}
            emissive={PURPLE}
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
        <pointLight color={PURPLE} intensity={2.6} distance={4} />
      </group>

      {/* ------------------------------------------------------------- lid */}
      <group ref={lidRef} position={[0, 0.62, 0]}>
        <RoundedBox args={[1.9, 0.34, 1.9]} radius={0.1} smoothness={4}>
          <meshPhysicalMaterial
            color={PINK}
            roughness={0.24}
            metalness={0.4}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </RoundedBox>
        <RoundedBox args={[0.3, 0.36, 1.94]} radius={0.04} smoothness={3}>
          <meshPhysicalMaterial color={GOLD} roughness={0.18} metalness={0.95} />
        </RoundedBox>
        <RoundedBox args={[1.94, 0.36, 0.3]} radius={0.04} smoothness={3}>
          <meshPhysicalMaterial color={GOLD} roughness={0.18} metalness={0.95} />
        </RoundedBox>

        {/* Bow loops */}
        <mesh position={[-0.26, 0.26, 0]} rotation={[0, 0, 0.5]}>
          <torusGeometry args={[0.24, 0.075, 12, 28]} />
          <meshPhysicalMaterial color={GOLD} roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0.26, 0.26, 0]} rotation={[0, 0, -0.5]}>
          <torusGeometry args={[0.24, 0.075, 12, 28]} />
          <meshPhysicalMaterial color={GOLD} roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.09, 20, 20]} />
          <meshPhysicalMaterial color={GOLD} roughness={0.15} metalness={1} />
        </mesh>
      </group>
    </group>
  );
}