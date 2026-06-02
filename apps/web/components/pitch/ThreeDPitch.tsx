"use client";

import { useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface EventPoint {
  id: number;
  x: number | null;
  y: number | null;
  end_x?: number | null;
  end_y?: number | null;
  event_type: string | null;
  minute: number | null;
  second: number | null;
}

interface ThreeDPitchProps {
  events: EventPoint[];
  onEventClick?: (event: EventPoint) => void;
  highlightedEventId?: number | null;
  selectedEventIds?: number[];
  viewMode?: 'top' | 'side' | 'goal' | 'iso';
}

const getEventColor = (eventType: string | null): string => {
  if (!eventType) return "#64748b";
  const type = eventType.toLowerCase();
  if (type.includes("shot")) return "#ef4444";
  if (type.includes("pass")) return "#3b82f6";
  if (type.includes("pressure")) return "#f59e0b";
  if (type.includes("carry")) return "#10b981";
  if (type.includes("duel")) return "#8b5cf6";
  return "#64748b";
};

export function ThreeDPitch({
  events,
  onEventClick,
  highlightedEventId,
  selectedEventIds = [],
  viewMode = 'iso',
}: ThreeDPitchProps) {
  const width = 120;
  const depth = 80;
  const height = 1.5; // slight 3D extrusion for field

  // Convert 2D pitch coords (0-120, 0-80) to Three.js coords
  const to3D = (x: number, y: number) => [
    (x - 60) * 0.12,     // center and scale X
    0.1,                 // slightly above plane
    (40 - y) * 0.12,     // flip + scale Y (Three.js Z is forward)
  ] as const;

  const fieldColor = "#0a3d0a"; // more realistic grass green
  const lineColor = "#e2e8f0"; // bright white lines for better visibility in 3D

  // Procedural grass texture for realism (no external assets needed)
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

    ctx.fillStyle = '#0a3d0a';
    ctx.fillRect(0, 0, 256, 256);

    // Add subtle grass variation (noise-like strokes)
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const length = 1 + Math.random() * 3;
      ctx.strokeStyle = Math.random() > 0.5 ? '#0f4d12' : '#083308';
      ctx.lineWidth = 0.8 + Math.random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * length, y + length * 0.6);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.anisotropy = 8;
    return texture;
  }, []);

  // Create much more realistic 3D field lines using cylinders (thicker and more visible)
  const fieldLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const lineRadius = 0.07;

    // Center line
    lines.push(
      <mesh key="center" position={[0, lineRadius + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, 9.6, 6]} />
        <meshLambertMaterial color={lineColor} />
      </mesh>
    );

    // Center circle
    lines.push(
      <mesh key="center-circle" position={[0, lineRadius + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, lineRadius, 6, 48]} />
        <meshLambertMaterial color={lineColor} />
      </mesh>
    );

    // Penalty areas - more 3D and accurate
    // Left penalty area
    lines.push(
      <mesh key="left-penalty-front" position={[-5.4, lineRadius + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, 6.1, 6]} />
        <meshLambertMaterial color={lineColor} />
      </mesh>
    );

    // Right penalty area
    lines.push(
      <mesh key="right-penalty-front" position={[5.4, lineRadius + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, 6.1, 6]} />
        <meshLambertMaterial color={lineColor} />
      </mesh>
    );

    return lines;
  }, []);

  // Simple but effective 3D goal posts
  const goalPosts = useMemo(() => {
    const posts: JSX.Element[] = [];
    const postMat = <meshLambertMaterial color="#e2e8f0" />;
    const postRadius = 0.12;
    const crossbarRadius = 0.1;

    // Left goal (negative X)
    posts.push(
      <group key="left-goal" position={[-7.1, 0.8, 0]}>
        {/* Left post */}
        <mesh position={[-0.1, 0, -1.8]}><cylinderGeometry args={[postRadius, postRadius, 1.6, 8]} /><meshLambertMaterial color="#e2e8f0" /></mesh>
        {/* Right post */}
        <mesh position={[-0.1, 0, 1.8]}><cylinderGeometry args={[postRadius, postRadius, 1.6, 8]} /><meshLambertMaterial color="#e2e8f0" /></mesh>
        {/* Crossbar */}
        <mesh position={[-0.1, 0.8, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[crossbarRadius, crossbarRadius, 3.7, 8]} /><meshLambertMaterial color="#e2e8f0" /></mesh>
      </group>
    );

    // Right goal
    posts.push(
      <group key="right-goal" position={[7.1, 0.8, 0]}>
        <mesh position={[0.1, 0, -1.8]}><cylinderGeometry args={[postRadius, postRadius, 1.6, 8]} /><meshLambertMaterial color="#e2e8f0" /></mesh>
        <mesh position={[0.1, 0, 1.8]}><cylinderGeometry args={[postRadius, postRadius, 1.6, 8]} /><meshLambertMaterial color="#e2e8f0" /></mesh>
        <mesh position={[0.1, 0.8, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[crossbarRadius, crossbarRadius, 3.7, 8]} /><meshLambertMaterial color="#e2e8f0" /></mesh>
      </group>
    );

    return posts;
  }, []);

  return (
    <div className="relative w-full aspect-[120/80] max-w-[900px] mx-auto rounded-2xl overflow-hidden border border-slate-700/70 bg-[#0B1120]">
      <Canvas
        camera={{ position: [0, 18, 22], fov: 45 }}
        style={{ background: "#0B1120" }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[12, 25, 8]} intensity={1.1} castShadow />
        <hemisphereLight args={["#a5d6a7", "#1b3a1b", 0.6]} /> {/* Sky + grass feel */}

        {/* 3D Pitch Surface - more realistic */}
        <mesh rotation={[-Math.PI * 0.5, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[14.8, 9.8]} />
          <meshPhongMaterial 
            color={fieldColor} 
            map={grassTexture}
            shininess={6}
            specular="#1a3a1a"
          />
        </mesh>

        {/* Field Lines */}
        {fieldLines}

        {/* Border */}
        <mesh rotation={[-Math.PI * 0.5, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[4.85, 4.95, 4]} />
          <meshLambertMaterial color={lineColor} side={2} />
        </mesh>

        {/* Goal Posts */}
        {goalPosts}

        {/* Events - Advanced 3D representations */}
        {events
          .filter((e) => e.x != null && e.y != null)
          .map((event) => {
            const [x, y, z] = to3D(event.x!, event.y!);
            const isHighlighted = highlightedEventId === event.id;
            const isSelected = selectedEventIds.length === 0 || selectedEventIds.includes(event.id);
            const color = getEventColor(event.event_type);
            const scale = isHighlighted || isSelected ? 1.4 : 0.55;
            const opacity = isSelected ? 1 : 0.18;

            const groupElements = [];

            // Base event marker (sphere for all)
            groupElements.push(
              <mesh
                key="base"
                position={[x, 0.35, z]}
                onClick={() => onEventClick?.(event)}
                onPointerOver={(e) => {
                  e.object.scale.setScalar(1.4);
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={(e) => {
                  e.object.scale.setScalar(scale);
                  document.body.style.cursor = "default";
                }}
              >
                <sphereGeometry args={[0.22 * scale]} />
                <meshPhongMaterial
                  color={color}
                  emissive={isHighlighted || isSelected ? color : "#000000"}
                  emissiveIntensity={isHighlighted || isSelected ? 0.4 : 0}
                  shininess={90}
                  transparent
                  opacity={opacity}
                />
              </mesh>
            );

            // 3D arc for passes and carries (more realistic)
            if ((event.event_type?.toLowerCase().includes("pass") || event.event_type?.toLowerCase().includes("carry")) && event.end_x != null && event.end_y != null) {
              const [ex, ey, ez] = to3D(event.end_x, event.end_y);
              const midX = (x + ex) / 2;
              const midZ = (z + ez) / 2;
              const arcHeight = Math.min(Math.hypot(ex - x, ez - z) * 0.15, 4); // natural arc height

              const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(x, 0.35, z),
                new THREE.Vector3(midX, arcHeight, midZ),
                new THREE.Vector3(ex, 0.35, ez),
              ]);

              const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
              groupElements.push(
                <mesh key="arc" geometry={tubeGeometry} onClick={() => onEventClick?.(event)}>
                  <meshPhongMaterial
                    color={color}
                    emissive={isHighlighted || isSelected ? color : "#000000"}
                    emissiveIntensity={isHighlighted || isSelected ? 0.3 : 0}
                    transparent
                    opacity={opacity * 0.9}
                  />
                </mesh>
              );
            }

            // Cone for shots (directional feel)
            if (event.event_type?.toLowerCase().includes("shot")) {
              groupElements.push(
                <mesh
                  key="shot"
                  position={[x, 0.8, z]}
                  onClick={() => onEventClick?.(event)}
                >
                  <coneGeometry args={[0.18 * scale, 0.6 * scale, 3]} />
                  <meshPhongMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isHighlighted || isSelected ? 0.5 : 0.2}
                    transparent
                    opacity={opacity}
                  />
                </mesh>
              );
            }

            // Subtle glow ring for selected/highlighted
            if (isHighlighted || isSelected) {
              groupElements.push(
                <mesh key="glow" position={[x, 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.35 * scale, 0.52 * scale, 32]} />
                  <meshBasicMaterial color={color} transparent opacity={0.4} side={2} />
                </mesh>
              );
            }

            return <group key={event.id}>{groupElements}</group>;
          })}

        <OrbitControls
          ref={(ref) => {
            // @ts-ignore - we store controls for preset animation
            if (ref) (window as any).__pitchControls = ref;
          }}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={6}
          maxDistance={32}
          maxPolarAngle={Math.PI * 0.85}
        />
        <CameraRig viewMode={viewMode} />
      </Canvas>

      <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-black/60 px-2 py-0.5 rounded pointer-events-none">
        Drag to rotate • Scroll to zoom • Click events
      </div>
    </div>
  );
}

// Advanced camera presets with smooth animation
function CameraRig({ viewMode = 'iso' }: { viewMode?: 'top' | 'side' | 'goal' | 'iso' }) {
  const { camera } = useThree();

  useEffect(() => {
    const controls = (window as any).__pitchControls;
    if (!controls) return;

    let targetPos: [number, number, number];
    let targetLookAt: [number, number, number] = [0, 0, 0];

    switch (viewMode) {
      case 'top':
        targetPos = [0, 28, 0.1];
        targetLookAt = [0, 0, 0];
        break;
      case 'side':
        targetPos = [0, 8, 22];
        targetLookAt = [0, 0, 0];
        break;
      case 'goal':
        targetPos = [-14, 6, 0];
        targetLookAt = [6, 0, 0];
        break;
      case 'iso':
      default:
        targetPos = [0, 18, 22];
        targetLookAt = [0, 0, 0];
        break;
    }

    // Smooth camera animation
    const startPos = camera.position.clone();
    const startLook = controls.target.clone();
    const duration = 650;
    const startTime = performance.now();

    const animate = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic

      camera.position.lerpVectors(startPos, new THREE.Vector3(...targetPos), ease);
      const newLook = startLook.clone().lerp(new THREE.Vector3(...targetLookAt), ease);
      controls.target.copy(newLook);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [viewMode, camera]);

  return null;
}
