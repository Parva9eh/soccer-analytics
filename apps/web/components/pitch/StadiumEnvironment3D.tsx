"use client";

import { useMemo, type ReactElement } from "react";
import {
  HALF_LENGTH_W,
  HALF_WIDTH_W,
  GOAL_LINE_X,
  PITCH_LENGTH_W,
  PITCH_WIDTH_W,
  STAND_COLORS,
  TRACK_COLOR,
} from "./constants";

const STAND_DISTANCE = 11.2;
const TIER_COUNT = 5;
const TIER_HEIGHT = 0.42;
const TIER_DEPTH = 0.55;

function TieredStand({
  position,
  rotation,
  length,
  depth,
  color,
  tierCount,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  depth: number;
  color: string;
  tierCount: number;
}) {
  const tiers = [];
  for (let t = 0; t < tierCount; t++) {
    const y = t * TIER_HEIGHT + TIER_HEIGHT / 2;
    const inset = t * 0.12;
    tiers.push(
      <mesh
        key={t}
        position={[0, y, inset * 0.5]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[length - inset * 2, TIER_HEIGHT * 0.92, depth - t * 0.08]} />
        <meshStandardMaterial
          color={t % 2 === 0 ? color : "#334155"}
          roughness={0.88}
          metalness={0.05}
        />
      </mesh>,
    );
    // Crowd speckle row (emissive dots simulated as thin boxes)
    if (t > 0) {
      tiers.push(
        <mesh key={`crowd-${t}`} position={[0, y + TIER_HEIGHT * 0.35, inset * 0.5 + 0.02]}>
          <boxGeometry args={[length - inset * 2.2, 0.06, depth * 0.35]} />
          <meshStandardMaterial
            color="#475569"
            emissive="#64748b"
            emissiveIntensity={0.15}
            roughness={1}
          />
        </mesh>,
      );
    }
  }
  return (
    <group position={position} rotation={rotation}>
      {tiers}
    </group>
  );
}

function LedBoardRing() {
  const boards = useMemo(() => {
    const items: ReactElement[] = [];
    const boardH = 0.38;
    const boardY = boardH / 2 + 0.05;
    const hoardDist = HALF_WIDTH_W + 0.55;
    const colors = ["#fbbf24", "#38bdf8", "#f87171", "#34d399", "#a78bfa"];

    const sides: Array<{
      key: string;
      rot: [number, number, number];
      pos: [number, number, number];
      size: [number, number, number];
      segments: number;
      axis: "x" | "z";
    }> = [
      {
        key: "north",
        rot: [0, 0, 0],
        pos: [0, boardY, -hoardDist],
        size: [PITCH_LENGTH_W * 0.92, boardH, 0.12],
        segments: 8,
        axis: "x",
      },
      {
        key: "south",
        rot: [0, 0, 0],
        pos: [0, boardY, hoardDist],
        size: [PITCH_LENGTH_W * 0.92, boardH, 0.12],
        segments: 8,
        axis: "x",
      },
      {
        key: "west",
        rot: [0, Math.PI / 2, 0],
        pos: [-hoardDist, boardY, 0],
        size: [PITCH_WIDTH_W * 0.88, boardH, 0.12],
        segments: 5,
        axis: "z",
      },
      {
        key: "east",
        rot: [0, Math.PI / 2, 0],
        pos: [hoardDist, boardY, 0],
        size: [PITCH_WIDTH_W * 0.88, boardH, 0.12],
        segments: 5,
        axis: "z",
      },
    ];

    sides.forEach((side, sideIdx) => {
      const segLen = side.size[0] / side.segments;
      for (let i = 0; i < side.segments; i++) {
        const offset = (i - (side.segments - 1) / 2) * (segLen + 0.08);
        const px = side.axis === "x" ? side.pos[0] + offset : side.pos[0];
        const pz = side.axis === "z" ? side.pos[2] + offset : side.pos[2];
        const c = colors[(i + sideIdx) % colors.length];
        items.push(
          <mesh
            key={`${side.key}-${i}`}
            position={[px, side.pos[1], pz]}
            rotation={side.rot}
          >
            <boxGeometry args={[segLen, boardH, 0.12]} />
            <meshStandardMaterial
              color={c}
              emissive={c}
              emissiveIntensity={0.35}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>,
        );
      }
    });
    return items;
  }, []);

  return <group>{boards}</group>;
}

function FloodlightRig() {
  const towers = useMemo(() => {
    const positions: [number, number, number][] = [
      [GOAL_LINE_X - 2.2, 0, -HALF_WIDTH_W - 2.8],
      [GOAL_LINE_X - 2.2, 0, HALF_WIDTH_W + 2.8],
      [-GOAL_LINE_X + 2.2, 0, -HALF_WIDTH_W - 2.8],
      [-GOAL_LINE_X + 2.2, 0, HALF_WIDTH_W + 2.8],
      [0, 0, -HALF_WIDTH_W - 3.4],
      [0, 0, HALF_WIDTH_W + 3.4],
      [-HALF_LENGTH_W - 3.2, 0, 0],
      [HALF_LENGTH_W + 3.2, 0, 0],
    ];

    return positions.map((pos, i) => (
      <group key={i} position={pos}>
        <mesh position={[0, 2.8, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 5.6, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.45} />
        </mesh>
        <mesh position={[0, 5.65, 0]}>
          <boxGeometry args={[0.85, 0.35, 0.5]} />
          <meshStandardMaterial
            color="#1e293b"
            emissive="#fef3c7"
            emissiveIntensity={0.25}
            metalness={0.6}
          />
        </mesh>
        <pointLight position={[0, 5.2, 0]} intensity={0.55} color="#fff7ed" distance={38} decay={2} />
      </group>
    ));
  }, []);

  return <group>{towers}</group>;
}

function RoofSilhouette() {
  return (
    <>
      {/* Partial roof over long-side stands (typical stadium bowl) */}
      <mesh position={[0, 6.8, -STAND_DISTANCE - 1.2]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[PITCH_LENGTH_W * 1.35, 0.12, 4.2]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.55} side={2} />
      </mesh>
      <mesh position={[0, 6.8, STAND_DISTANCE + 1.2]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[PITCH_LENGTH_W * 1.35, 0.12, 4.2]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.55} side={2} />
      </mesh>
    </>
  );
}

function TechnicalArea() {
  return (
    <group position={[HALF_LENGTH_W * 0.35, 0.02, -HALF_WIDTH_W - 0.95]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[2.8, 0.5, 1.1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh position={[-1.6, 0.55, 0]}>
        <boxGeometry args={[0.08, 0.9, 1.1]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Full stadium bowl: tiered stands, running track, LED hoardings, lights, roof, dugout.
 */
export function StadiumEnvironment3D() {
  const longStandLen = PITCH_LENGTH_W * 1.28;
  const shortStandLen = PITCH_WIDTH_W * 1.22;

  return (
    <group>
      {/* Outer apron / concourse */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshStandardMaterial color="#030712" roughness={1} />
      </mesh>

      {/* Running track — four sides between pitch and stands */}
      {(
        [
          [0, 0.01, -(HALF_WIDTH_W + 0.52), PITCH_LENGTH_W + 0.5, 0.72],
          [0, 0.01, HALF_WIDTH_W + 0.52, PITCH_LENGTH_W + 0.5, 0.72],
          [-(HALF_LENGTH_W + 0.52), 0.01, 0, 0.72, PITCH_WIDTH_W + 0.5],
          [HALF_LENGTH_W + 0.52, 0.01, 0, 0.72, PITCH_WIDTH_W + 0.5],
        ] as const
      ).map(([px, py, pz, w, d], i) => (
        <mesh key={`track-${i}`} position={[px, py, pz]} receiveShadow>
          <boxGeometry args={[w, 0.04, d]} />
          <meshStandardMaterial color={TRACK_COLOR} roughness={0.95} />
        </mesh>
      ))}

      {/* Tiered stands — four sides */}
      <TieredStand
        position={[0, 0, -STAND_DISTANCE]}
        rotation={[0, 0, 0]}
        length={longStandLen}
        depth={TIER_DEPTH * TIER_COUNT}
        color={STAND_COLORS[0]}
        tierCount={TIER_COUNT}
      />
      <TieredStand
        position={[0, 0, STAND_DISTANCE]}
        rotation={[0, 0, 0]}
        length={longStandLen}
        depth={TIER_DEPTH * TIER_COUNT}
        color={STAND_COLORS[1]}
        tierCount={TIER_COUNT}
      />
      <TieredStand
        position={[-STAND_DISTANCE, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        length={shortStandLen}
        depth={TIER_DEPTH * TIER_COUNT}
        color={STAND_COLORS[2]}
        tierCount={TIER_COUNT}
      />
      <TieredStand
        position={[STAND_DISTANCE, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        length={shortStandLen}
        depth={TIER_DEPTH * TIER_COUNT}
        color={STAND_COLORS[3]}
        tierCount={TIER_COUNT}
      />

      <LedBoardRing />
      <FloodlightRig />
      <RoofSilhouette />
      <TechnicalArea />
    </group>
  );
}