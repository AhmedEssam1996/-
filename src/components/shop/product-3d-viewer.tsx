'use client';

import { Html, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

/**
 * Product 3D viewer.
 *
 * Two model sources, picked by `modelUrl`:
 *  • a .glb dropped under /public/models (referenced by products.model_url) —
 *    rendered by `GltfModel` through drei's useGLTF, with a friendly loading
 *    overlay and a graceful error fallback to the procedural model;
 *  • a stylised procedural stand-in (rounded box + ribbon) so EVERY product
 *    gets a rotatable 3D view even without a custom asset.
 *
 * `dynamic`-imported with ssr:false by the product page wrapper, because
 * WebGL has no meaning on the server.
 */

interface ViewerProps {
  modelUrl?: string | null;
  emoji?: string | null;
  accent?: string | null;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const cloned = React.useMemo(() => scene.clone(true), [scene]);

  React.useEffect(() => {
    return () => {
      useGLTF.clear(url);
    };
  }, [url]);

  return <primitive object={cloned} position={[0, -0.4, 0]} />;
}

function ProceduralProduct({ emoji, accent }: { emoji?: string | null; accent?: string | null }) {
  const ref = React.useRef<THREE.Group>(null);

  React.useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      if (ref.current) {
        ref.current.rotation.y += 0.004;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const color = accent ?? '#FF7BB0';

  return (
    <group ref={ref} position={[0, -0.3, 0]}>
      {/* Gift box body */}
      <RoundedBox args={[1.5, 1.1, 1.5]} radius={0.12} smoothness={4} castShadow>
        <meshStandardMaterial color="#1E0F33" roughness={0.35} metalness={0.15} />
      </RoundedBox>
      {/* Ribbon: two crossing slabs */}
      <mesh position={[0, 0, 0.76]}>
        <boxGeometry args={[0.22, 1.12, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.22, 1.14, 1.52]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {/* Bow */}
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.16, 0.05, 12, 24]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      {emoji ? (
        <Html center position={[0, 1.35, 0]} distanceFactor={6}>
          <span style={{ fontSize: 42, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }}>{emoji}</span>
        </Html>
      ) : null}
    </group>
  );
}

export default function Product3DViewer({ modelUrl, emoji, accent }: ViewerProps) {
  const [glbFailed, setGlbFailed] = React.useState(false);

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/60 sm:h-80">
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [2.6, 1.8, 3.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#00000000', 0);
        }}
      >
        <ambientLight intensity={0.55} />
        <pointLight position={[3, 4, 3]} intensity={18} color="#ffffff" distance={20} />
        <pointLight position={[-4, 2, -2]} intensity={10} color="#A97BFF" distance={16} />
        <pointLight position={[0, -2, 3]} intensity={7} color="#FF7A5C" distance={14} />

        {modelUrl && !glbFailed ? (
          <ErrorBoundaryFallback onFail={() => setGlbFailed(true)}>
            <GltfModel url={modelUrl} />
          </ErrorBoundaryFallback>
        ) : (
          <ProceduralProduct emoji={emoji} accent={accent} />
        )}

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2.2}
          maxDistance={7}
          autoRotate
          autoRotateSpeed={1.2}
          makeDefault
        />
      </Canvas>
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
        اسحب للتدوير 🔄
      </span>
    </div>
  );
}

/** Catches GLTF load failures (missing file, bad asset) inside the R3F tree. */
class ErrorBoundaryFallback extends React.Component<
  { children: React.ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onFail();
  }

  render(): React.ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
