'use client';

import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import type { Group, Mesh } from 'three';

/**
 * Small glowing objects orbiting the gift — the "digital gift universe" layer.
 *
 * Each object is a shared primitive (heart, star, crystal, envelope, mini box)
 * with an emissive material, wrapped in Drei's `<Float>` so the bobbing is
 * handled for us. The whole group rotates slowly and leans toward the pointer.
 */

const PINK = '#FF7BB0';
const PURPLE = '#A97BFF';
const CORAL = '#FF7A5C';
const GOLD = '#FFC94D';
const ICE = '#9FE8FF';

interface Orbiter {
  id: string;
  position: [number, number, number];
  scale: number;
  color: string;
  kind: 'heart' | 'star' | 'crystal' | 'envelope' | 'box';
  spin: number;
}

const ORBITERS: Orbiter[] = [
  { id: 'heart', kind: 'heart', position: [-2.5, 1.1, -0.4], scale: 0.9, color: PINK, spin: 0.4 },
  { id: 'star-a', kind: 'star', position: [2.6, 1.5, -0.8], scale: 0.75, color: GOLD, spin: -0.5 },
  { id: 'crystal', kind: 'crystal', position: [2.2, -1.3, 0.6], scale: 0.85, color: ICE, spin: 0.6 },
  { id: 'envelope', kind: 'envelope', position: [-2.4, -1.2, 0.3], scale: 0.8, color: PURPLE, spin: -0.35 },
  { id: 'box-a', kind: 'box', position: [-1.5, 2.1, -1.2], scale: 0.55, color: CORAL, spin: 0.7 },
  { id: 'star-b', kind: 'star', position: [1.4, -2.2, -0.9], scale: 0.5, color: PURPLE, spin: 0.9 },
];

function Shape({ kind, color }: { kind: Orbiter['kind']; color: string }) {
  switch (kind) {
    case 'heart':
      // Two spheres and a cone read as a heart at this scale, for a fraction of
      // the geometry an extruded heart path would need.
      return (
        <group rotation={[0, 0, Math.PI]}>
          <mesh position={[-0.16, 0.1, 0]}>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[0.16, 0.1, 0]}>
            <sphereGeometry args={[0.22, 20, 20]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[0, -0.22, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.34, 0.62, 4]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
          </mesh>
        </group>
      );

    case 'star':
      return (
        <mesh>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
      );

    case 'crystal':
      return (
        <mesh>
          <icosahedronGeometry args={[0.32, 0]} />
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            roughness={0.05}
            metalness={0.1}
            transmission={0.9}
            thickness={0.8}
            ior={1.6}
          />
        </mesh>
      );

    case 'envelope':
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.62, 0.42, 0.06]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0, 0.04, 0.05]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.58, 0.02, 0.3]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.8} />
          </mesh>
        </group>
      );

    case 'box':
    default:
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.5, 0.42, 0.5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.58, 0.14, 0.58]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.9} />
          </mesh>
        </group>
      );
  }
}

interface FloatingObjectsProps {
  /** Pointer position, -1..1 on each axis, already smoothed by the parent. */
  pointer: React.RefObject<{ x: number; y: number }>;
  motionScale?: number;
}

export function FloatingObjects({ pointer, motionScale = 1 }: FloatingObjectsProps) {
  const groupRef = React.useRef<Group>(null);
  const meshRefs = React.useRef<Array<Mesh | null>>([]);

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    const p = pointer.current ?? { x: 0, y: 0 };

    if (groupRef.current) {
      // Slow constant rotation, plus a lean toward the cursor.
      groupRef.current.rotation.y += step * 0.12 * motionScale;
      const targetX = p.y * 0.16 * motionScale;
      const targetY = p.x * 0.24 * motionScale;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.06;
      groupRef.current.position.y += (targetY * 0.1 - groupRef.current.position.y) * 0.06;
    }

    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const orbiter = ORBITERS[index];
      mesh.rotation.z += step * orbiter.spin * motionScale;
      mesh.rotation.y += step * orbiter.spin * 0.6 * motionScale;
      // Cursor pushes the objects outward very slightly.
      const push = 1 + Math.abs(p.x) * 0.05 + Math.abs(p.y) * 0.05;
      mesh.scale.setScalar(orbiter.scale * push);
    });
  });

  return (
    <group ref={groupRef}>
      {ORBITERS.map((orbiter, index) => (
        <Float
          key={orbiter.id}
          speed={motionScale > 0 ? 1.4 : 0}
          rotationIntensity={motionScale > 0 ? 0.4 : 0}
          floatIntensity={motionScale > 0 ? 1.1 : 0}
        >
          <mesh
            ref={(node) => {
              meshRefs.current[index] = node;
            }}
            position={orbiter.position}
            scale={orbiter.scale}
          >
            <Shape kind={orbiter.kind} color={orbiter.color} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}