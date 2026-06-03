"use client";

// Safety patch (the page that uses us should import this first, but this guarantees it).
import "@/lib/three-patch";

import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { getEventColor } from "./utils";

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
  const PITCH_LENGTH_U = 120;
  const PITCH_WIDTH_U = 80;
  const PITCH_LENGTH_W = 16.1;
  const PITCH_WIDTH_W = 10.75;
  const SCALE = PITCH_WIDTH_W / PITCH_WIDTH_U; // 0.134375 for accurate proportions

  const HALF_LENGTH_W = PITCH_LENGTH_W / 2; // ~8.05
  const HALF_WIDTH_W = PITCH_WIDTH_W / 2; // 5.375
  const GOAL_LINE_X = -HALF_LENGTH_W;

  // Real pitch structure constants (proportions based on FIFA standard 105x68m mapped to 120x80u)
  // Goal width ~7.32m → ~8.61u → world width
  const GOAL_WIDTH_W = (7.32 / (68 / PITCH_WIDTH_U)) * SCALE; // ~1.157
  const GOAL_HALF_Z = GOAL_WIDTH_W / 2;
  // Penalty box (18yd) depth 16.5m → ~19.41u
  const PBOX_DEPTH_W = (16.5 / (68 / PITCH_WIDTH_U)) * SCALE; // ~2.607
  const PBOX_FRONT_X = -HALF_LENGTH_W + PBOX_DEPTH_W; // ~-5.443
  const PBOX_HALF_Z = (40.3 / (68 / PITCH_WIDTH_U) * SCALE) / 2; // ~3.185
  // 6yd box depth 5.5m
  const SIXYD_DEPTH_W = (5.5 / (68 / PITCH_WIDTH_U)) * SCALE; // ~0.87
  const SIXYD_FRONT_X = -HALF_LENGTH_W + SIXYD_DEPTH_W; // ~-7.18
  const SIXYD_HALF_Z = (18.32 / (68 / PITCH_WIDTH_U) * SCALE) / 2; // ~1.447
  // Penalty spot 11m from goal line
  const SPOT_DIST_W = (11 / (68 / PITCH_WIDTH_U)) * SCALE; // ~1.738
  const SPOT_X = -HALF_LENGTH_W + SPOT_DIST_W; // ~-6.312
  // D radius and center circle 9.15m
  const D_R_W = (9.15 / (68 / PITCH_WIDTH_U)) * SCALE; // ~1.447
  const CENTER_R_W = D_R_W;

  const height = 1.5; // slight 3D extrusion for field (visual, not to real scale)

  // Convert 2D pitch coords (0-120, 0-80) to Three.js coords - use consistent SCALE for real shape
  const to3D = (x: number, y: number) => [
    (x - 60) * SCALE,
    0.1,
    (40 - y) * SCALE,
  ] as const;

  const fieldColor = "#0a3d0a"; // more realistic grass green
  const lineColor = "#e2e8f0"; // bright white lines for better visibility in 3D

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
      <mesh key="left-penalty-front" position={[PBOX_FRONT_X, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    // Top long side
    lines.push(
      <mesh key="left-penalty-top" position={[(PBOX_FRONT_X - HALF_LENGTH_W) / 2, lineRadius + 0.015, -PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    // Bottom long side
    lines.push(
      <mesh key="left-penalty-bottom" position={[(PBOX_FRONT_X - HALF_LENGTH_W) / 2, lineRadius + 0.015, PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
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
      <mesh key="right-penalty-front" position={[-PBOX_FRONT_X, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-penalty-top" position={[(-PBOX_FRONT_X + HALF_LENGTH_W) / 2, lineRadius + 0.015, -PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius, lineRadius, PBOX_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-penalty-bottom" position={[(-PBOX_FRONT_X + HALF_LENGTH_W) / 2, lineRadius + 0.015, PBOX_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
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
      <mesh key="left-6yard-front" position={[SIXYD_FRONT_X, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="left-6yard-top" position={[(SIXYD_FRONT_X - HALF_LENGTH_W) / 2, lineRadius + 0.015, -SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="left-6yard-bottom" position={[(SIXYD_FRONT_X - HALF_LENGTH_W) / 2, lineRadius + 0.015, SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
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
      <mesh key="right-6yard-front" position={[-SIXYD_FRONT_X, lineRadius + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_HALF_Z * 2, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-6yard-top" position={[(-SIXYD_FRONT_X + HALF_LENGTH_W) / 2, lineRadius + 0.015, -SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[lineRadius * 0.82, lineRadius * 0.82, SIXYD_DEPTH_W, 5]} />
        {lineMat}
      </mesh>
    );
    lines.push(
      <mesh key="right-6yard-bottom" position={[(-SIXYD_FRONT_X + HALF_LENGTH_W) / 2, lineRadius + 0.015, SIXYD_HALF_Z]} rotation={[Math.PI / 2, 0, 0]}>
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
      <mesh key="left-penalty-spot" position={[SPOT_X, lineRadius + 0.055, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.028, 14]} />
        <meshStandardMaterial color={lineColor} roughness={0.7} metalness={0.15} />
      </mesh>
    );
    lines.push(
      <mesh key="right-penalty-spot" position={[-SPOT_X, lineRadius + 0.055, 0]}>
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
      const px = SPOT_X + Math.cos(a) * D_R_W;
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
      const px = -SPOT_X + Math.cos(a) * D_R_W;
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
    const cornerR = 0.55;
    const cPositions = [
      [-halfL + 0.1, lineRadius + 0.015, -halfW + 0.1],
      [-halfL + 0.1, lineRadius + 0.015, halfW - 0.1],
      [halfL - 0.1, lineRadius + 0.015, -halfW + 0.1],
      [halfL - 0.1, lineRadius + 0.015, halfW - 0.1],
    ];
    cPositions.forEach((cp, ci) => {
      lines.push(
        <mesh key={`corner-arc-${ci}`} position={cp as [number,number,number]} rotation={[Math.PI / 2, ci * (Math.PI / 2), 0]}>
          <torusGeometry args={[cornerR * 0.3, lineRadius * 0.6, 4, 12, Math.PI / 2]} />
          {lineMat}
        </mesh>
      );
    });

    return lines;
  }, [lineColor]);

  // Photorealistic 3D goals with proper posts + authentic net grid (tensioned string look)
  const goalPosts = useMemo(() => {
    const goals: React.ReactElement[] = [];
    const postR = 0.095;
    const barR = 0.085;
    const netColor = "#9aa5b8";
    const postColor = "#f4f6f9";
    const netMat = (opacity = 0.82) => (
      <meshStandardMaterial color={netColor} roughness={0.95} metalness={0.08} transparent opacity={opacity} />
    );

    function makeNetGrid(backX: number, centerZ: number, isLeft: boolean, depth: number) {
      const els: React.ReactElement[] = [];
      const w = 3.72; // goal mouth width
      const h = 1.82;
      const d = depth; // net depth
      const vCount = 7; // vertical strings
      const hCount = 6; // horizontal

      const backXOff = isLeft ? -0.08 : 0.08;
      const sideTilt = isLeft ? 0.18 : -0.18;

      // Back plane grid (the main visible net)
      for (let i = 0; i < vCount; i++) {
        const frac = i / (vCount - 1);
        const lx = backX + backXOff + (isLeft ? -d * 0.08 : d * 0.08);
        const lz = centerZ - w / 2 + frac * w;
        // vertical string (top to bottom)
        els.push(
          <mesh key={`v-${i}`} position={[lx, h * 0.5, lz]} rotation={[0, sideTilt, 0]}>
            <cylinderGeometry args={[0.014, 0.014, h, 3]} />
            {netMat(0.78)}
          </mesh>
        );
      }
      for (let j = 0; j < hCount; j++) {
        const fy = (j / (hCount - 1)) * h;
        const bz = centerZ;
        // Slight sag on horizontal strings for authentic net tension (realistic catenary)
        const sag = Math.sin((j / (hCount - 1)) * Math.PI) * 0.04;
        els.push(
          <mesh key={`h-${j}`} position={[backX + backXOff * 0.6, fy - sag, bz]} rotation={[0, sideTilt * 0.6, Math.PI / 2]}>
            <cylinderGeometry args={[0.014, 0.014, w * 0.995, 3]} />
            {netMat(0.72)}
          </mesh>
        );
      }

      // Left side wing net (angled)
      for (let k = 0; k < 5; k++) {
        const f = k / 4;
        const y = f * h * 0.98;
        els.push(
          <mesh key={`sideL-${k}`} position={[backX - d * 0.42, y, centerZ - w * 0.5 - 0.06]} rotation={[0, sideTilt + (isLeft ? -0.6 : 0.6), 0]}>
            <cylinderGeometry args={[0.012, 0.012, d * 0.92, 3]} />
            {netMat(0.65)}
          </mesh>
        );
      }
      // Right side wing net
      for (let k = 0; k < 5; k++) {
        const f = k / 4;
        const y = f * h * 0.98;
        els.push(
          <mesh key={`sideR-${k}`} position={[backX - d * 0.42, y, centerZ + w * 0.5 + 0.06]} rotation={[0, sideTilt + (isLeft ? 0.6 : -0.6), 0]}>
            <cylinderGeometry args={[0.012, 0.012, d * 0.92, 3]} />
            {netMat(0.65)}
          </mesh>
        );
      }

      // Top tension strings (roof of net)
      for (let t = 0; t < 4; t++) {
        const f = (t + 1) / 5;
        els.push(
          <mesh key={`top-${t}`} position={[backX - d * 0.32, h + 0.02, centerZ - w * 0.5 + f * w]} rotation={[0, sideTilt * 0.7, Math.PI / 2]}>
            <cylinderGeometry args={[0.011, 0.011, d * 0.86, 3]} />
            {netMat(0.6)}
          </mesh>
        );
      }
      return els;
    }

    // LEFT GOAL - accurate FIFA proportions (goal 7.32m wide, visual height for presence)
    const leftGoal = (
      <group key="left-goal" position={[GOAL_LINE_X, 0.02, 0]}>
        {/* Left upright */}
        <mesh position={[0.02, 0.91, -GOAL_HALF_Z]} castShadow receiveShadow>
          <cylinderGeometry args={[postR, postR, 1.82, 9]} />
          <meshPhysicalMaterial color={postColor} metalness={0.6} roughness={0.35} clearcoat={0.5} />
        </mesh>
        {/* Right upright */}
        <mesh position={[0.02, 0.91, GOAL_HALF_Z]} castShadow receiveShadow>
          <cylinderGeometry args={[postR, postR, 1.82, 9]} />
          <meshPhysicalMaterial color={postColor} metalness={0.6} roughness={0.35} clearcoat={0.5} />
        </mesh>
        {/* Crossbar */}
        <mesh position={[0.02, 1.82, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[barR, barR, GOAL_WIDTH_W, 9]} />
          <meshPhysicalMaterial color={postColor} metalness={0.6} roughness={0.35} clearcoat={0.5} />
        </mesh>

        {/* Net grid (detailed string lines) */}
        {makeNetGrid(GOAL_LINE_X - 0.12, 0, true, 0.95)}
      </group>
    );
    goals.push(leftGoal);

    // RIGHT GOAL
    const rightGoal = (
      <group key="right-goal" position={[-GOAL_LINE_X, 0.02, 0]}>
        <mesh position={[-0.02, 0.91, -GOAL_HALF_Z]} castShadow receiveShadow>
          <cylinderGeometry args={[postR, postR, 1.82, 9]} />
          <meshPhysicalMaterial color={postColor} metalness={0.6} roughness={0.35} clearcoat={0.5} />
        </mesh>
        <mesh position={[-0.02, 0.91, GOAL_HALF_Z]} castShadow receiveShadow>
          <cylinderGeometry args={[postR, postR, 1.82, 9]} />
          <meshPhysicalMaterial color={postColor} metalness={0.6} roughness={0.35} clearcoat={0.5} />
        </mesh>
        <mesh position={[-0.02, 1.82, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[barR, barR, GOAL_WIDTH_W, 9]} />
          <meshPhysicalMaterial color={postColor} metalness={0.6} roughness={0.35} clearcoat={0.5} />
        </mesh>

        {makeNetGrid(-GOAL_LINE_X + 0.12, 0, false, 0.95)}
      </group>
    );
    goals.push(rightGoal);

    return goals;
  }, [lineColor]);

  // 3D corner flags for broadcast-level pitch detail (small poles + flags)
  const cornerFlags = useMemo(() => {
    const flags: React.ReactElement[] = [];
    const poleR = 0.04;
    const flagH = 0.7;
    const positions = [
      [GOAL_LINE_X, 0.05, -HALF_WIDTH_W], // left bottom (near left goal)
      [GOAL_LINE_X, 0.05, HALF_WIDTH_W],  // left top
      [-GOAL_LINE_X, 0.05, -HALF_WIDTH_W], // right bottom
      [-GOAL_LINE_X, 0.05, HALF_WIDTH_W],  // right top
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

  // Stadium environment for real stadium feel: stands, hoardings, floodlights
  const stadiumFeatures = useMemo(() => {
    const features: React.ReactElement[] = [];
    const standHeight = 2.5;
    const standDist = 9.5; // outside pitch
    const standDepth = 3;

    // Simple stands as raised platforms around (4 sides, low poly for perf)
    const standColors = ["#1e3a5f", "#2a4a6f", "#1e3a5f", "#2a4a6f"]; // alternating seat colors
    const standPos = [
      [0, standHeight/2, -standDist], // north
      [0, standHeight/2, standDist],  // south
      [-standDist, standHeight/2, 0], // west
      [standDist, standHeight/2, 0],  // east
    ];
    const standSizes = [
      [PITCH_LENGTH_W * 1.3, standHeight, standDepth],
      [PITCH_LENGTH_W * 1.3, standHeight, standDepth],
      [standDepth, standHeight, PITCH_WIDTH_W * 1.3],
      [standDepth, standHeight, PITCH_WIDTH_W * 1.3],
    ];
    standPos.forEach((pos, i) => {
      features.push(
        <mesh key={`stand-${i}`} position={pos as [number, number, number]} receiveShadow>
          <boxGeometry args={standSizes[i] as [number, number, number]} />
          <meshLambertMaterial color={standColors[i]} />
        </mesh>
      );
      // Seat detail lines on stands
      for (let s = -1; s <= 1; s += 0.5) {
        features.push(
          <mesh key={`seat-${i}-${s}`} position={[pos[0] + (i>1 ? s*2 : 0), pos[1]+0.1, pos[2] + (i<2 ? s*2 : 0)] } >
            <boxGeometry args={i<2 ? [PITCH_LENGTH_W*1.2, 0.1, 0.2] : [0.2, 0.1, PITCH_WIDTH_W*1.2]} />
            <meshLambertMaterial color="#334455" />
          </mesh>
        );
      }
    });

    // Advertising hoardings (perimeter boards) - thin raised boxes with color
    const hoardDist = HALF_WIDTH_W + 0.3;
    const hoardH = 0.4;
    const hoardColors = ["#ffcc00", "#0066cc", "#cc0000", "#00aa00", "#ff6600"];
    for (let side = 0; side < 4; side++) {
      const isLong = side < 2;
      const len = isLong ? PITCH_LENGTH_W : PITCH_WIDTH_W;
      const hx = isLong ? 0 : (side === 2 ? -hoardDist : hoardDist);
      const hz = isLong ? (side === 0 ? -hoardDist : hoardDist) : 0;
      for (let j = 0; j < 5; j++) {
        const offset = (j - 2) * (len / 5);
        const posX = isLong ? offset : hx;
        const posZ = isLong ? hz : offset;
        features.push(
          <mesh key={`hoard-${side}-${j}`} position={[posX, hoardH/2, posZ]} >
            <boxGeometry args={isLong ? [len/5 - 0.1, hoardH, 0.15] : [0.15, hoardH, len/5 - 0.1]} />
            <meshLambertMaterial color={hoardColors[(side + j) % hoardColors.length]} />
          </mesh>
        );
      }
    }

    // Floodlight poles (4 corners) with bright lights for stadium night feel
    const lightPositions = [
      [GOAL_LINE_X - 1, 4, -HALF_WIDTH_W - 1],
      [GOAL_LINE_X - 1, 4, HALF_WIDTH_W + 1],
      [-GOAL_LINE_X + 1, 4, -HALF_WIDTH_W - 1],
      [-GOAL_LINE_X + 1, 4, HALF_WIDTH_W + 1],
    ];
    lightPositions.forEach((lp, li) => {
      // Pole
      features.push(
        <mesh key={`lightpole-${li}`} position={[lp[0], 2, lp[2]]}>
          <cylinderGeometry args={[0.08, 0.08, 4, 6]} />
          <meshLambertMaterial color="#555555" />
        </mesh>
      );
      // Light head
      features.push(
        <mesh key={`lighthead-${li}`} position={[lp[0], 4.2, lp[2]]}>
          <boxGeometry args={[0.6, 0.3, 0.4]} />
          <meshLambertMaterial color="#333333" />
        </mesh>
      );
      // Bright point light for illumination
      features.push(
        <pointLight key={`light-${li}`} position={[lp[0], 4, lp[2]]} intensity={0.8} color="#fff8e1" distance={25} />
      );
    });

    return features;
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

  // Camera capture bridge so outer DOM handlers can project using live camera
  function CameraCapture({ camRef }: { camRef: React.MutableRefObject<THREE.Camera | null> }) {
    const { camera } = useThree();
    useEffect(() => { camRef.current = camera; }, [camera]);
    return null;
  }

  // Animated traveling ball for highlighted pass/carry (replay feel)
  function AnimatedTrajectoryBall({ curve, color, isActive }: { curve: THREE.CatmullRomCurve3; color: string; isActive: boolean }) {
    const ballRef = useRef<THREE.Group>(null!);
    useFrame((state) => {
      if (!isActive || !ballRef.current || !curve) return;
      // Our patched Clock (see lib/three-patch.ts) fully implements the classic Clock API
      // that fiber expects. Use the standard method.
      const elapsed = state.clock.getElapsedTime();
      const t = ((elapsed * 0.72) % 1.35) / 1.35; // slow realistic flight
      const pos = curve.getPoint(t);
      ballRef.current.position.copy(pos);
      // subtle spin scale pulse + spin rotation for premium live-ball animation
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
          <meshPhysicalMaterial color="#fff" emissive={color} emissiveIntensity={0.9} metalness={0.2} roughness={0.25} clearcoat={0.7} />
        </mesh>
        {/* faint motion ghost + extra speed trail for ultra-real flight */}
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

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[120/80] max-w-[920px] mx-auto rounded-2xl overflow-hidden border border-slate-700/70 bg-[#0B1120] select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        camera={{ position: [0, 19.5, 23.5], fov: 43 }}
        style={{ background: "#0B1120" }}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ 
          preserveDrawingBuffer: true, 
          antialias: true, 
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15
        }}
      >
        <ambientLight intensity={0.38} />
        <directionalLight
          position={[13, 27, 9]}
          intensity={1.25}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.4}
          shadow-camera-far={62}
          shadow-camera-left={-13}
          shadow-camera-right={13}
          shadow-camera-top={13}
          shadow-camera-bottom={-13}
          shadow-bias={-0.0006}
        />
        {/* Soft fill + sky/ground hemisphere for outdoor broadcast realism */}
        <hemisphereLight args={["#9fd4a8", "#122a12", 0.72]} />
        {/* Very subtle rim/fill */}
        <directionalLight position={[-18, 9, -22]} intensity={0.22} />
        {/* Extra soft fill for realistic outdoor ambient on pitch */}
        <directionalLight position={[0, 15, -30]} intensity={0.15} />

        {/* Atmospheric fog for depth (stadium haze) */}
        <fog attach="fog" args={["#0B1120", 19, 46]} />

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
        {/* Surrounding darker apron / cut grass */}
        <mesh rotation={[-Math.PI * 0.5, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
          <planeGeometry args={[PITCH_LENGTH_W * 1.15, PITCH_WIDTH_W * 1.2]} />
          <meshLambertMaterial color="#052605" />
        </mesh>

        {/* Turf lip / raised border (real stadium pitch edge) */}
        <mesh position={[0, 0.13, 0]} receiveShadow>
          <boxGeometry args={[PITCH_LENGTH_W * 0.96, 0.22, PITCH_WIDTH_W * 0.97]} />
          <meshLambertMaterial color="#132f13" />
        </mesh>

        {/* Field Lines (complete accurate) */}
        {fieldLines}

        {/* Goal Posts (photoreal nets) */}
        {goalPosts}

        {/* Corner flags for extra broadcast realism */}
        {cornerFlags}

        {/* Stadium stands, hoardings, floodlights for real stadium atmosphere */}
        {stadiumFeatures}

        {/* 3D sponsor boards / ads for advanced stadium realism (using Text for clarity) */}
        <Text position={[0, 0.8, -HALF_WIDTH_W - 0.8]} fontSize={0.4} color="#ffcc00" anchorX="center" rotation={[ -0.2, 0, 0 ]}>SPONSOR</Text>
        <Text position={[0, 0.8, HALF_WIDTH_W + 0.8]} fontSize={0.4} color="#0066cc" anchorX="center" rotation={[ 0.2, Math.PI, 0 ]}>ANALYTICS</Text>
        <Text position={[GOAL_LINE_X - 1.5, 0.8, 0]} fontSize={0.35} color="#cc0000" anchorX="center" rotation={[0, Math.PI/2, 0]}>LIVE</Text>

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
                  {event.event_type} {event.minute}'
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
      <div className="absolute bottom-2 right-2 z-20 text-[9px] text-slate-400/70 bg-black/50 px-1.5 py-px rounded pointer-events-none tracking-[0.2px]">
        SHIFT+drag to box select • Scroll zoom • Drag rotate
      </div>

      {/* 3D Hover tooltip for UX parity with advanced 2D tooltip */}
      {hoveredEvent3D && (
        <div className="absolute z-50 pointer-events-none rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur-sm bottom-12 right-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getEventColor(hoveredEvent3D.event_type) }} />
            <span className="font-medium text-white">{hoveredEvent3D.event_type}</span>
            <span className="text-slate-400 tabular-nums">
              {hoveredEvent3D.minute}':{String(hoveredEvent3D.second || 0).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}
    </div>
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
