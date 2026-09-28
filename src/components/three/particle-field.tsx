'use client';

import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import { AdditiveBlending, type BufferAttribute, type Points } from 'three';

/**
 * Drifting particle field around the gift.
 *
 * One `Points` object with a single additive-blended material — not N meshes —
 * so the whole field costs one draw call regardless of count. Positions are
 * generated once and animated on the GPU-side buffer each frame by nudging Y
 * and wrapping, which is cheap enough to run every frame even on mid-range
 * phones.
 */

const PALETTE = ['#FF7BB0', '#A97BFF', '#FFC94D', '#FF7A5C', '#9FE8FF'];

interface ParticleFieldProps {
  /** Halved on mobile by the caller. */
  count?: number;
  /** 0 freezes the drift (reduced motion). */
  motionScale?: number;
  /** Radius of the spherical volume the particles occupy. */
  radius?: number;
}

export function ParticleField({ count = 260, motionScale = 1, radius = 6 }: ParticleFieldProps) {
  const pointsRef = React.useRef<Points>(null);

  const { positions, colors, speeds } = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    // A tiny deterministic PRNG keeps the field identical between the server
    // render and the client, so nothing shifts on hydration.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = radius * (0.35 + rand() * 0.65);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const hex = PALETTE[Math.floor(rand() * PALETTE.length)];
      const c = Number.parseInt(hex.slice(1), 16);
      colors[i * 3] = ((c >> 16) & 255) / 255;
      colors[i * 3 + 1] = ((c >> 8) & 255) / 255;
      colors[i * 3 + 2] = (c & 255) / 255;

      speeds[i] = 0.12 + rand() * 0.4;
    }

    return { positions, colors, speeds };
  }, [count, radius]);

  useFrame((_, delta) => {
    if (motionScale <= 0) return;
    const geometry = pointsRef.current?.geometry;
    if (!geometry) return;

    const attr = geometry.getAttribute('position') as BufferAttribute;
    const array = attr.array as Float32Array;
    // Clamp delta so a backgrounded tab does not teleport the whole field.
    const step = Math.min(delta, 0.05) * motionScale;

    for (let i = 0; i < count; i++) {
      const yIndex = i * 3 + 1;
      array[yIndex] += speeds[i] * step;
      if (array[yIndex] > radius * 0.7) array[yIndex] = -radius * 0.7;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}