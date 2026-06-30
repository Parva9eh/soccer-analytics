"use client";

// Safety patch (the page that uses us should import this first, but this guarantees it).
import "@/lib/three-patch";

import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { getEventColor } from "./utils";
import {
  PITCH_LENGTH_W,
  PITCH_WIDTH_W,
  HALF_LENGTH_W,
  HALF_WIDTH_W,
  LEFT_GOAL_LINE_X,
  PBOX_FRONT_X_LEFT,
  PBOX_FRONT_X_RIGHT,
  PBOX_HALF_Z,
  PBOX_DEPTH_W,
  SIXYD_FRONT_X_LEFT,
  SIXYD_FRONT_X_RIGHT,
  SIXYD_HALF_Z,
  SIXYD_DEPTH_W,
  SPOT_X_LEFT,
  SPOT_X_RIGHT,
  D_R_W,
  CENTER_R_W,
  CORNER_ARC_W,
  LINE_COLOR,
  GRASS_BASE,
  statsbombToWorld,
} from "./constants";
import { StadiumEnvironment3D } from "./StadiumEnvironment3D";
import { PitchFrame } from "./PitchFrame";
import { Goals3D } from "./Goal3D";

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
  onSelectionChange?: (ids: number[]) => void;
  onViewModeChange?: (mode: 'top' | 'side' | 'goal' | 'iso') => void;
  autoRotate?: boolean; // for advanced interactive stadium experience
}


function CameraCapture({
  camRef,
}: {
  camRef: React.MutableRefObject<THREE.Camera | null>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camRef.current = camera;
  }, [camera, camRef]);
  return null;
}

function AnimatedTrajectoryBall({
  curve,
  color,
  isActive,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  isActive: boolean;
}) {
  const ballRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (!isActive || !ballRef.current || !curve) return;
    const elapsed = state.clock.getElapsedTime();
    const t = ((elapsed * 0.72) % 1.35) / 1.35;
    const pos = curve.getPoint(t);
    ballRef.current.position.copy(pos);
    const s = 0.9 + Math.sin(elapsed * 6) * 0.08;
    ballRef.current.scale.setScalar(s);
    ballRef.current.rotation.y = elapsed * 9;
    ballRef.current.rotation.x = elapsed * 4;
  });
  if (!isActive) return null;
  return (
    <group ref={ballRef}>
      <mesh>
        <icosahedronGeometry args={[0.11]} />
        <meshPhysicalMaterial
          color="#fff"
          emissive={color}
          emissiveIntensity={0.9}
          metalness={0.2}
          roughness={0.25}
          clearcoat={0.7}
        />
      </mesh>
      <mesh position={[0.02, 0.01, 0.01]}>
        <icosahedronGeometry args={[0.065]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0.04, 0.015, 0.015]}>
        <icosahedronGeometry args={[0.04]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

// Grass wind animator - defined at top level so it's stable, and MUST be rendered as child of Canvas
function GrassWind({ grassMeshRef }: { grassMeshRef: React.MutableRefObject<THREE.Mesh> }) {
  useFrame((state) => {
    if (grassMeshRef.current) {
      const mat = (grassMeshRef.current as any).material as THREE.MeshStandardMaterial;
      if (mat && mat.map) {
        mat.map.offset.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.004;
        mat.map.offset.y = Math.cos(state.clock.elapsedTime * 0.05) * 0.002;
      }
    }
  });
  return null;
}

export function ThreeDPitch({
  events,
  onEventClick,
  highlightedEventId,
  selectedEventIds = [],
  viewMode = 'iso',
  onSelectionChange,
  onViewModeChange,
  autoRotate = false,
}: ThreeDPitchProps) {
  const to3D = statsbombToWorld;
  const fieldColor = GRASS_BASE;
  const lineColor = LINE_COLOR;

  // Bumpy pitch geometry for subtle real-world undulations (not perfectly flat)
  const fieldGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(PITCH_LENGTH_W, PITCH_WIDTH_W, 32, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Low frequency gentle waves + small noise for natural pitch feel
      const z = Math.sin(x * 0.6) * 0.035 + Math.cos(y * 0.5) * 0.028 + (Math.random() - 0.5) * 0.012;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Highly realistic procedural grass texture with mow stripes + wear patches (iconic broadcast look)
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

    // Base rich grass
    ctx.fillStyle = '#0a3d0a';
    ctx.fillRect(0, 0, 512, 512);

    // Classic mow stripes (lengthwise, subtle value shifts - very real pitch)
    const stripeW = 38;
    for (let sx = 0; sx < 512; sx += stripeW) {
      const isLight = (Math.floor(sx / stripeW) % 2) === 0;
      ctx.save();
      ctx.globalAlpha = isLight ? 0.09 : 0.16;
      ctx.fillStyle = isLight ? '#145a14' : '#062f06';
      ctx.fillRect(sx, 0, stripeW * 0.82, 512);
      ctx.restore();
      // Seam lines between stripes for ultra realism
      if (sx > 0) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#052805';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, 512);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Fine grass blade strokes (dense natural variation)
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const len = 1.2 + Math.random() * 5.5;
      const angle = (Math.random() - 0.5) * 1.3;
      ctx.strokeStyle = Math.random() > 0.48 ? '#0f4d12' : (Math.random() > 0.5 ? '#083308' : '#1a5c1a');
      ctx.lineWidth = 0.6 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len * 0.6 + (Math.random() - 0.5) * 1.5);
      ctx.stroke();
    }

    // Medium tufts / variation + small divots
    for (let i = 0; i < 320; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(15, 60, 18, 0.38)' : 'rgba(6, 42, 8, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + Math.random() * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Extra divots / scuffs (very real on pro pitches)
    for (let i = 0; i < 85; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.random() * 0.1;
      ctx.fillStyle = '#052805';
      ctx.beginPath();
      ctx.ellipse(x, y, 2.5 + Math.random() * 4, 1.5 + Math.random() * 2.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Localized wear patches (near goals + center - real pitches get used there)
    const wearSpots = [
      { x: 78, y: 255, r: 52 },   // left goalmouth
      { x: 434, y: 255, r: 52 },  // right goalmouth
      { x: 256, y: 255, r: 38 },  // center circle wear
      { x: 118, y: 188, r: 22 },
      { x: 394, y: 322, r: 19 },
    ];
    wearSpots.forEach((spot) => {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#0a2f0a';
      ctx.beginPath();
      ctx.ellipse(spot.x, spot.y, spot.r, spot.r * 0.72, (Math.random() - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // lighter scuff inside some
      if (Math.random() > 0.4) {
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = '#1a4a1a';
        ctx.beginPath();
        ctx.ellipse(spot.x + 4, spot.y - 3, spot.r * 0.55, spot.r * 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.6, 3.6);
    texture.anisotropy = 16;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  // Create ultra-realistic complete 3D field markings (full boxes, Ds, perimeter, spots)
  // All positions/sizes now use accurate FIFA proportions scaled to our world model
  const fieldLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const lineRadius = 0.065;
    const lineMat = <meshStandardMaterial color={lineColor} roughness={0.78} metalness={0.12} />;

    // Long center line (full length)
    lines.push(
      <mesh key="center" position={[0, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PITCH_LENGTH_W * 0.99, 5]} />
        {lineMat}
      </mesh>
    );

    // Center circle (thicker visible torus)
    lines.push(
      <mesh key="center-circle" position={[0, lineRadius + 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CENTER_R_W, lineRadius, 5, 52]} />
        {lineMat}
      </mesh>
    );

    // === FULL LEFT PENALTY AREA (18yd box) - all 4 sides ===
    // Front (goal side)
    lines.push(
      <mesh key="left-penalty-front" position={[PBOX_FRONT_X_LEFT, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    // Top long side
    lines.push(
      <mesh key="left-penalty-top" position={[(PBOX_FRONT_X_LEFT - HALF_LENGTH_W) / 2, lineRadius + 0.015, -PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    // Bottom long side
    lines.push(
      <mesh key="left-penalty-bottom" position={[(PBOX_FRONT_X_LEFT - HALF_LENGTH_W) / 2, lineRadius + 0.015, PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    // Back vertical (the 18yd depth line)
    lines.push(
      <mesh key="left-penalty-back" position={[-HALF_LENGTH_W + PBOX_DEPTH_W * 0.5, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );

    // === FULL RIGHT PENALTY AREA ===
    lines.push(
      <mesh key="right-penalty-front" position={[PBOX_FRONT_X_RIGHT, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-penalty-top" position={[HALF_LENGTH_W - PBOX_DEPTH_W / 2, lineRadius + 0.015, -PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-penalty-bottom" position={[HALF_LENGTH_W - PBOX_DEPTH_W / 2, lineRadius + 0.015, PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-penalty-back" position={[HALF_LENGTH_W - PBOX_DEPTH_W * 0.5, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );

    // === 6-YARD BOXES (goal areas) - full rectangles ===
    // Left 6yd
    lines.push(
      <mesh key="left-6yard-front" position={[SIXYD_FRONT_X_LEFT, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="left-6yard-top" position={[(SIXYD_FRONT_X_LEFT - HALF_LENGTH_W) / 2, lineRadius + 0.015, -SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="left-6yard-bottom" position={[(SIXYD_FRONT_X_LEFT - HALF_LENGTH_W) / 2, lineRadius + 0.015, SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="left-6yard-back" position={[-HALF_LENGTH_W + SIXYD_DEPTH_W * 0.5, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );

    // Right 6yd
    lines.push(
      <mesh key="right-6yard-front" position={[SIXYD_FRONT_X_RIGHT, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-6yard-top" position={[HALF_LENGTH_W - SIXYD_DEPTH_W / 2, lineRadius + 0.015, -SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-6yard-bottom" position={[HALF_LENGTH_W - SIXYD_DEPTH_W / 2, lineRadius + 0.015, SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-6yard-back" position={[HALF_LENGTH_W - SIXYD_DEPTH_W * 0.5, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );

    // Penalty spots (raised small discs)
    lines.push(
      <mesh key="left-penalty-spot" position={[SPOT_X_LEFT, lineRadius + 0.055, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.028, 14]} />
        <meshStandardMaterial color={lineColor} roughness={0.7} metalness={0.15} />
      </mesh>
    );
    lines.push(
      <mesh key="right-penalty-spot" position={[SPOT_X_RIGHT, lineRadius + 0.055, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.028, 14]} />
        <meshStandardMaterial color={lineColor} roughness={0.7} metalness={0.15} />
      </mesh>
    );
    // Center spot
    lines.push(
      <mesh key="center-spot" position={[0, lineRadius + 0.055, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.028, 14]} />
        <meshStandardMaterial color={lineColor} roughness={0.7} metalness={0.15} />
      </mesh>
    );

    // === PENALTY ARCS (the "D") - approximated with torus segments for 3D thickness ===
    // Left D (curved part outside the box)
    for (let i = 0; i < 11; i++) {
      const a = (-0.72 + i * 0.144) * Math.PI;
      const px = SPOT_X_LEFT + Math.cos(a) * D_R_W;
      const pz = Math.sin(a) * D_R_W;
      const rotY = Math.atan2(Math.cos(a), 0);
      lines.push(
        <mesh key={`left-d-${i}`} position={[px, lineRadius + 0.018, pz]} rotation={[Math.PI / 2, rotY + 0.1, 0]}>
          <cylinderGeometry args={[lineRadius * 0.78, lineRadius * 0.78, 0.38, 3]} />
          {lineMat}
        </mesh>
      );
    }
    // Right D
    for (let i = 0; i < 11; i++) {
      const a = (Math.PI - 0.72 + i * 0.144);
      const px = SPOT_X_RIGHT + Math.cos(a) * D_R_W;
      const pz = Math.sin(a) * D_R_W;
      const rotY = Math.atan2(Math.cos(a), 0);
      lines.push(
        <mesh key={`right-d-${i}`} position={[px, lineRadius + 0.018, pz]} rotation={[Math.PI / 2, rotY - 0.1, 0]}>
          <cylinderGeometry args={[lineRadius * 0.78, lineRadius * 0.78, 0.38, 3]} />
          {lineMat}
        </mesh>
      );
    }

    // Subtle perimeter touchlines (outer rectangle) using four cylinders
    const halfL = HALF_LENGTH_W;
    const halfW = HALF_WIDTH_W;
    lines.push(
      <mesh key="touch-top" position={[0, lineRadius + 0.012, -halfW]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.7, lineRadius * 0.7, halfL * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="touch-bottom" position={[0, lineRadius + 0.012, halfW]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.7, lineRadius * 0.7, halfL * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="touch-left" position={[-halfL, lineRadius + 0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.7, lineRadius * 0.7, halfW * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="touch-right" position={[halfL, lineRadius + 0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.7, lineRadius * 0.7, halfW * 2, 5]} />
        {lineMat}
      </mesh>
    );

    // Corner arcs (small 3D tori segments for rounded corners - parity with 2D)
    const cPositions = [
      [-halfL, lineRadius + 0.015, -halfW],
      [-halfL, lineRadius + 0.015, halfW],
      [halfL, lineRadius + 0.015, -halfW],
      [halfL, lineRadius + 0.015, halfW],
    ];
    cPositions.forEach((cp, ci) => {
      lines.push(
        <mesh key={`corner-arc-${ci}`} position={cp as [number, number, number]} rotation={[Math.PI / 2, ci * (Math.PI / 2), 0]}>
          <torusGeometry args={[CORNER_ARC_W, lineRadius * 0.65, 4, 10, Math.PI / 2]} />
          {lineMat}
        </mesh>
      );
    });

    return lines;
  }, [lineColor]);

  // 3D corner flags for broadcast-level pitch detail (small poles + flags)
  const cornerFlags = useMemo(() => {
    const flags: React.ReactElement[] = [];
    const poleR = 0.04;
    const flagH = 0.7;
    const positions = [
      [LEFT_GOAL_LINE_X, 0.05, -HALF_WIDTH_W],
      [LEFT_GOAL_LINE_X, 0.05, HALF_WIDTH_W],
      [HALF_LENGTH_W, 0.05, -HALF_WIDTH_W],
      [HALF_LENGTH_W, 0.05, HALF_WIDTH_W],
    ];
    positions.forEach((p, i) => {
      // Pole
      flags.push(
        <mesh key={`pole-${i}`} position={[p[0], p[1] + flagH / 2, p[2]]} castShadow>
          <cylinderGeometry args={[poleR, poleR, flagH, 4]} />
          <meshPhysicalMaterial color="#f1f5f9" metalness={0.4} roughness={0.5} />
        </mesh>
      );
      // Small flag (angled triangle-ish via plane for simplicity)
      const flagX = p[0] + (p[0] < 0 ? 0.25 : -0.25);
      flags.push(
        <mesh key={`flag-${i}`} position={[flagX, p[1] + flagH * 0.7, p[2]]} rotation={[0, p[0] < 0 ? 0.6 : -0.6, 0]}>
          <planeGeometry args={[0.45, 0.35]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#ef4444" : "#3b82f6"} side={2} transparent opacity={0.85} />
        </mesh>
      );
    });
    return flags;
  }, []);

  // Refs for advanced interactions (drag select projection + camera control)
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<any>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const grassMeshRef = useRef<THREE.Mesh>(null!); // for subtle wind anim on grass

  // 3D drag-to-select state (parity with 2D + pro tool)
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);

  // Hover state for 3D tooltip parity with 2D (advanced consistent UX)
  const [hoveredEvent3D, setHoveredEvent3D] = useState<EventPoint | null>(null);

  // Disable orbit during drag select (shift+drag)
  useEffect(() => {
    if (orbitRef.current) {
      orbitRef.current.enabled = !isSelecting;
    }
  }, [isSelecting]);

  // Pointer handlers for shift+drag box select on the 3D scene (projects world->screen)
  const getLocalPos = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.shiftKey || e.button !== 0) return;
    const p = getLocalPos(e);
    setIsSelecting(true);
    setSelectionStart(p);
    setSelectionEnd(p);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart) return;
    setSelectionEnd(getLocalPos(e));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); return;
    }
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    if (Math.hypot(maxX - minX, maxY - minY) < 28) {
      setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); return;
    }

    const cam = cameraRef.current;
    const contRect = containerRef.current?.getBoundingClientRect();
    if (!cam || !contRect || !onSelectionChange) {
      setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); return;
    }

    const picked: number[] = [];
    events.filter(ev => ev.x != null && ev.y != null).forEach((ev) => {
      const [wx, _wy, wz] = to3D(ev.x!, ev.y!);
      const wp = new THREE.Vector3(wx, 0.55, wz);
      const proj = wp.clone().project(cam);
      const sx = (proj.x * 0.5 + 0.5) * contRect.width;
      const sy = (-proj.y * 0.5 + 0.5) * contRect.height;
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        picked.push(ev.id);
      }
    });

    if (picked.length > 0) onSelectionChange(picked);
    setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null);
  };

  const handlePointerLeave = () => {
    if (isSelecting) { setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); }
  };

  return (
    <PitchFrame mode="3d" className="w-full max-w-[960px] mx-auto select-none">
    <div
      ref={containerRef}
      className="relative w-full aspect-[120/80] min-h-[420px]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        camera={{ position: [0, 20, 24], fov: 42 }}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color("#071018");
        }}
      >
        <ambientLight intensity={0.28} color="#c7d2fe" />
        <directionalLight
          position={[14, 28, 10]}
          intensity={1.35}
          color="#fffbeb"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.4}
          shadow-camera-far={65}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-bias={-0.0004}
        />
        <hemisphereLight args={["#86efac", "#052e16", 0.55]} />
        <directionalLight position={[-20, 12, -18]} intensity={0.18} color="#93c5fd" />
        <directionalLight position={[0, 8, 28]} intensity={0.12} color="#fef3c7" />

        <fog attach="fog" args={["#071018", 22, 52]} />

        {/* 3D Pitch Surface - ultra realistic grass + stripes + wear + subtle real pitch undulations */}
        <mesh ref={grassMeshRef} geometry={fieldGeometry} rotation={[-Math.PI * 0.5, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <meshStandardMaterial
            color={fieldColor}
            map={grassTexture}
            roughness={0.92}
            metalness={0.0}
          />
        </mesh>
        <GrassWind grassMeshRef={grassMeshRef} />
        {/* Pitch surround apron */}
        <mesh rotation={[-Math.PI * 0.5, 0, 0]} position={[0, -0.018, 0]} receiveShadow>
          <planeGeometry args={[PITCH_LENGTH_W * 1.08, PITCH_WIDTH_W * 1.08]} />
          <meshStandardMaterial color="#052e16" roughness={1} />
        </mesh>

        {fieldLines}
        <Goals3D />
        {cornerFlags}

        <StadiumEnvironment3D />

        <CameraCapture camRef={cameraRef} />

        {/* Events - photoreal 3D balls, arcs with flight animation, shots, grounding + dimming */}
        {events
          .filter((e) => e.x != null && e.y != null)
          .map((event) => {
            const [x, _y, z] = to3D(event.x!, event.y!);
            const isHighlighted = highlightedEventId === event.id;
            const isFaded = selectedEventIds.length > 0 && !selectedEventIds.includes(event.id);
            const color = getEventColor(event.event_type);
            const baseScale = isFaded ? 0.48 : (isHighlighted ? 1.55 : 0.9);
            const baseOpacity = isFaded ? 0.16 : 1.0;

            const elements: React.ReactElement[] = [];

            // Soft grounding shadow disk (extra depth and pitch contact realism)
            elements.push(
              <mesh key="shadow" position={[x, 0.032, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.31 * (isFaded ? 0.7 : 1)]} />
                <meshBasicMaterial color="#000000" transparent opacity={isFaded ? 0.08 : 0.28} />
              </mesh>
            );

            // Main event "ball" - faceted for premium sports viz
            elements.push(
              <mesh
                key="ball"
                position={[x, 0.42, z]}
                onClick={() => onEventClick?.(event)}
                onPointerOver={(e) => { e.object.scale.setScalar(1.65); document.body.style.cursor = "pointer"; setHoveredEvent3D(event); }}
                onPointerOut={(e) => { e.object.scale.setScalar(baseScale); document.body.style.cursor = "default"; setHoveredEvent3D(null); }}
                castShadow
                receiveShadow
              >
                <icosahedronGeometry args={[0.195 * baseScale]} />
                <meshPhysicalMaterial
                  color={color}
                  emissive={isHighlighted ? color : "#0a0f14"}
                  emissiveIntensity={isHighlighted ? 0.65 : (isFaded ? 0 : 0.08)}
                  metalness={0.15}
                  roughness={0.35}
                  clearcoat={isHighlighted ? 0.8 : 0.4}
                  clearcoatRoughness={0.2}
                  transparent
                  opacity={baseOpacity}
                />
              </mesh>
            );

            // Pass / Carry raised trajectory tubes + end marker + animated replay ball
            const isTraj = (event.event_type?.toLowerCase().includes("pass") || event.event_type?.toLowerCase().includes("carry")) && event.end_x != null && event.end_y != null;
            if (isTraj) {
              const [ex, ey, ez] = to3D(event.end_x!, event.end_y!);
              const dist = Math.hypot(ex - x, ez - z);
              const midX = (x + ex) / 2;
              const midZ = (z + ez) / 2;
              // Distance + type sensitive arc height (long balls fly higher - very real)
              let arcHeight = Math.min(dist * 0.13, 3.8);
              if (dist > 4.8) arcHeight *= 1.55;
              if (event.event_type?.toLowerCase().includes("carry")) arcHeight *= 0.55; // carries lower

              const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(x, 0.42, z),
                new THREE.Vector3(midX, arcHeight, midZ),
                new THREE.Vector3(ex, 0.39, ez),
              ]);

              const tubeR = isFaded ? 0.055 : (dist > 5.5 ? 0.084 : 0.072);
              const tubeGeom = new THREE.TubeGeometry(curve, 22, tubeR, 7, false);

              elements.push(
                <mesh key="tube" geometry={tubeGeom} onClick={() => onEventClick?.(event)} onPointerOver={() => setHoveredEvent3D(event)} onPointerOut={() => setHoveredEvent3D(null)} castShadow>
                  <meshPhongMaterial
                    color={color}
                    emissive={isHighlighted ? color : "#000000"}
                    emissiveIntensity={isHighlighted ? 0.38 : 0}
                    shininess={64}
                    transparent
                    opacity={isFaded ? 0.13 : (isHighlighted ? 0.98 : 0.86)}
                  />
                </mesh>
              );

              // End arrival ball (where the pass/carry arrives)
              elements.push(
                <mesh key="arrive" position={[ex, 0.38, ez]} onClick={() => onEventClick?.(event)} onPointerOver={() => setHoveredEvent3D(event)} onPointerOut={() => setHoveredEvent3D(null)} castShadow>
                  <icosahedronGeometry args={[0.105]} />
                  <meshPhysicalMaterial color={color} metalness={0.1} roughness={0.4} clearcoat={0.3} transparent opacity={isFaded ? 0.18 : 0.85} />
                </mesh>
              );

              // The magic: animated ball flying along the trajectory when highlighted
              elements.push(
                <AnimatedTrajectoryBall key="fly" curve={curve} color={color} isActive={isHighlighted} />
              );
            }

            // Shots: sharp cone + fast directional streak (powerful visual)
            if (event.event_type?.toLowerCase().includes("shot")) {
              const shotScale = isFaded ? 0.55 : (isHighlighted ? 1.35 : 1.0);
              elements.push(
                <mesh key="shot-cone" position={[x, 0.78, z]} onClick={() => onEventClick?.(event)} onPointerOver={() => setHoveredEvent3D(event)} onPointerOut={() => setHoveredEvent3D(null)} castShadow>
                  <coneGeometry args={[0.155 * shotScale, 0.72 * shotScale, 3]} />
                  <meshPhysicalMaterial
                    color={color}
                    emissive={isHighlighted ? "#ff2d2d" : color}
                    emissiveIntensity={isHighlighted ? 0.7 : (isFaded ? 0.05 : 0.18)}
                    metalness={0.2}
                    roughness={0.3}
                    clearcoat={0.4}
                    transparent
                    opacity={isFaded ? 0.15 : (isHighlighted ? 1 : 0.92)}
                  />
                </mesh>
              );
              // Small fast "streak" indicator behind shot
              elements.push(
                <mesh key="shot-streak" position={[x, 0.51, z]} rotation={[0.6, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.55, 4]} />
                  <meshBasicMaterial color="#fda4af" transparent opacity={isFaded ? 0.08 : (isHighlighted ? 0.55 : 0.28)} />
                </mesh>
              );
            }

            // Strong selection/highlight ring on turf + extra rim light
            if (isHighlighted || (!isFaded && selectedEventIds.length === 0)) {
              elements.push(
                <mesh key="ring" position={[x, 0.035, z]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.38 * (isHighlighted ? 1.15 : 0.82), 0.57 * (isHighlighted ? 1.15 : 0.82), 38]} />
                  <meshBasicMaterial color={color} transparent opacity={isHighlighted ? 0.55 : 0.18} side={2} />
                </mesh>
              );
            }

            // 3D floating label for highlighted event - advanced interactive info
            if (isHighlighted) {
              elements.push(
                <Text
                  key="label"
                  position={[x, 1.2, z]}
                  fontSize={0.25}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.01}
                  outlineColor="#000000"
                >
                  {event.event_type} {event.minute}&apos;
                </Text>
              );
            }

            return <group key={event.id}>{elements}</group>;
          })}

        <OrbitControls
          ref={orbitRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5.2}
          maxDistance={34}
          maxPolarAngle={Math.PI * 0.86}
          enableDamping
          dampingFactor={0.085}
          autoRotate={autoRotate}
          autoRotateSpeed={0.3}
        />
        <CameraRig viewMode={viewMode} orbitRef={orbitRef} />
      </Canvas>

      {/* Drag selection rect overlay (matches 2D visual language) */}
      {isSelecting && selectionStart && selectionEnd && (
        <div
          className="absolute border border-accent/70 bg-accent/10 pointer-events-none z-20 rounded-sm"
          style={{
            left: Math.min(selectionStart.x, selectionEnd.x),
            top: Math.min(selectionStart.y, selectionEnd.y),
            width: Math.abs(selectionEnd.x - selectionStart.x),
            height: Math.abs(selectionEnd.y - selectionEnd.y),
            borderStyle: "dashed",
          }}
        />
      )}

      {/* Immersive floating camera preset toolbar (inside 3D view for presence) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md p-1 text-[11px] shadow-xl">
        {(['iso', 'top', 'side', 'goal'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange ? onViewModeChange(mode) : undefined}
            className={`px-3 py-0.5 rounded-lg capitalize transition-all ${viewMode === mode ? "bg-white text-black font-semibold shadow" : "text-white/75 hover:text-white hover:bg-white/15"}`}
          >
            {mode}
          </button>
        ))}
        <div className="w-px h-3.5 bg-white/20 mx-0.5" />
        <button
          onClick={() => onViewModeChange && onViewModeChange('iso')}
          className="px-2 py-0.5 text-[10px] text-white/60 hover:text-white/90"
          title="Reset to isometric"
        >
          Reset
        </button>
      </div>

      {/* Interaction hint (subtle, non blocking) */}
      <div className="pointer-events-none absolute bottom-2 right-2 z-20 rounded bg-black/50 px-1.5 py-px text-[9px] tracking-[0.2px] text-muted-foreground/80">
        SHIFT+drag to box select • Scroll zoom • Drag rotate
      </div>

      {/* 3D Hover tooltip for UX parity with advanced 2D tooltip */}
      {hoveredEvent3D && (
        <div className="pointer-events-none absolute bottom-12 right-2 z-50 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-xs text-foreground shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getEventColor(hoveredEvent3D.event_type) }} />
            <span className="font-medium text-white">{hoveredEvent3D.event_type}</span>
            <span className="tabular-nums text-muted-foreground">
              {hoveredEvent3D.minute}&apos;:{String(hoveredEvent3D.second || 0).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}
    </div>
    </PitchFrame>
  );
}

// Advanced camera presets with smooth animation (now uses proper ref)
function CameraRig({ viewMode = 'iso', orbitRef }: { viewMode?: 'top' | 'side' | 'goal' | 'iso'; orbitRef?: React.RefObject<any> }) {
  const { camera } = useThree();

  useEffect(() => {
    const controls = orbitRef?.current;
    if (!controls) return;

    let targetPos: [number, number, number];
    let targetLookAt: [number, number, number] = [0, 0, 0];

    switch (viewMode) {
      case 'top':
        targetPos = [0, 29, 0.2];
        targetLookAt = [0, 0.6, 0];
        break;
      case 'side':
        targetPos = [0, 7.5, 24];
        targetLookAt = [0, 0.4, 0];
        break;
      case 'goal':
        targetPos = [-14.5, 5.8, 0.6];
        targetLookAt = [5, 0.8, 0];
        break;
      case 'iso':
      default:
        targetPos = [0, 19.5, 23.5];
        targetLookAt = [0, 0.3, 0];
        break;
    }

    // Smooth camera animation (broadcast style)
    const startPos = camera.position.clone();
    const startLook = controls.target.clone();
    const duration = 620;
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
  }, [viewMode, camera, orbitRef]);

  return null;
}
