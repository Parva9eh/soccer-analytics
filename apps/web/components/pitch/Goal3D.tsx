"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  GOAL_HALF_Z,
  GOAL_HEIGHT_W,
  GOAL_NET_DEPTH_W,
  GOAL_POST_RADIUS_W,
  GOAL_WIDTH_W,
  LEFT_GOAL_LINE_X,
  LINE_COLOR,
  RIGHT_GOAL_LINE_X,
} from "./constants";

const POST_COLOR = "#f8fafc";
const NET_COLOR = "#94a3b8";

type GoalSide = "left" | "right";

/**
 * Single goal in LOCAL space:
 * - Origin on goal line, center of mouth, ground level.
 * - +X points into the field; net extends in −X (behind the goal line).
 * - Z spans the goal width; Y is height.
 */
function GoalAssembly({ side: _side }: { side: GoalSide }) {
  const postMat = (
    <meshPhysicalMaterial
      color={POST_COLOR}
      metalness={0.65}
      roughness={0.32}
      clearcoat={0.55}
    />
  );

  const net = useMemo(() => {
    const netMat = (
      <meshStandardMaterial
        color={NET_COLOR}
        roughness={0.95}
        metalness={0.05}
        transparent
        opacity={0.72}
        side={THREE.DoubleSide}
      />
    );

    const strand = (
      key: string,
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
      thickness = 0.012,
    ) => {
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2;
      const midZ = (az + bz) / 2;
      const len = Math.hypot(bx - ax, by - ay, bz - az);
      if (len < 0.001) return null;
      const dir = new THREE.Vector3(bx - ax, by - ay, bz - az).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir,
      );
      return (
        <mesh key={key} position={[midX, midY, midZ]} quaternion={quat}>
          <cylinderGeometry args={[thickness, thickness, len, 4]} />
          {netMat}
        </mesh>
      );
    };

    const strands: React.ReactElement[] = [];
    const xFront = GOAL_POST_RADIUS_W;
    const xBack = -GOAL_NET_DEPTH_W;
    const yTop = GOAL_HEIGHT_W;
    const zL = -GOAL_HALF_Z;
    const zR = GOAL_HALF_Z;

    const vCount = 9;
    const hCount = 7;

    // Back net plane (vertical strings)
    for (let i = 0; i < vCount; i++) {
      const t = i / (vCount - 1);
      const z = zL + t * (zR - zL);
      strands.push(
        strand(`bv-${i}`, xBack, 0.04, z, xBack, yTop, z) as React.ReactElement,
      );
    }
    // Back net horizontal strings
    for (let j = 0; j < hCount; j++) {
      const t = j / (hCount - 1);
      const y = 0.04 + t * (yTop - 0.04);
      const sag = Math.sin(t * Math.PI) * 0.025;
      strands.push(
        strand(`bh-${j}`, xBack, y - sag, zL, xBack, y - sag, zR) as React.ReactElement,
      );
    }

    // Top net (roof) — goal line to back along width segments
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const z = zL + t * (zR - zL);
      strands.push(
        strand(`top-${i}`, xFront, yTop, z, xBack, yTop, z) as React.ReactElement,
      );
    }

    // Side nets (left & right) — connect front post to back corner
    for (let j = 0; j < hCount; j++) {
      const t = j / (hCount - 1);
      const y = 0.04 + t * (yTop - 0.04);
      strands.push(
        strand(`sl-${j}`, xFront, y, zL, xBack, y, zL) as React.ReactElement,
        strand(`sr-${j}`, xFront, y, zR, xBack, y, zR) as React.ReactElement,
      );
    }

    // Depth strings along ground (bottom net)
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const z = zL + t * (zR - zL);
      strands.push(
        strand(`bg-${i}`, xFront, 0.04, z, xBack, 0.04, z) as React.ReactElement,
      );
    }

    // Front face — tie net to goal mouth (light grid on the plane of the posts)
    for (let i = 1; i < vCount - 1; i++) {
      const t = i / (vCount - 1);
      const z = zL + t * (zR - zL);
      strands.push(
        strand(`fv-${i}`, xFront, 0.04, z, xFront, yTop, z, 0.01) as React.ReactElement,
      );
    }

    return strands.filter(Boolean);
  }, []);

  const postY = GOAL_HEIGHT_W / 2;

  return (
    <group>
      {/* Goal line ground peg (thin line on turf) */}
      <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, GOAL_WIDTH_W + GOAL_POST_RADIUS_W * 2, 6]} />
        <meshStandardMaterial color={LINE_COLOR} />
      </mesh>

      {/* Left post (touchline side −Z) */}
      <mesh position={[GOAL_POST_RADIUS_W, postY, -GOAL_HALF_Z]} castShadow receiveShadow>
        <cylinderGeometry args={[GOAL_POST_RADIUS_W, GOAL_POST_RADIUS_W, GOAL_HEIGHT_W, 12]} />
        {postMat}
      </mesh>
      {/* Right post (+Z) */}
      <mesh position={[GOAL_POST_RADIUS_W, postY, GOAL_HALF_Z]} castShadow receiveShadow>
        <cylinderGeometry args={[GOAL_POST_RADIUS_W, GOAL_POST_RADIUS_W, GOAL_HEIGHT_W, 12]} />
        {postMat}
      </mesh>
      {/* Crossbar */}
      <mesh
        position={[GOAL_POST_RADIUS_W, GOAL_HEIGHT_W, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[GOAL_POST_RADIUS_W * 0.9, GOAL_POST_RADIUS_W * 0.9, GOAL_WIDTH_W, 12]} />
        {postMat}
      </mesh>
      {/* Back bottom bar (net frame on ground behind goal) */}
      <mesh position={[-GOAL_NET_DEPTH_W, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, GOAL_WIDTH_W * 0.98, 6]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.5} />
      </mesh>

      <group>{net}</group>
    </group>
  );
}

export function Goals3D() {
  return (
    <>
      <group position={[LEFT_GOAL_LINE_X, 0.02, 0]}>
        <GoalAssembly side="left" />
      </group>
      <group position={[RIGHT_GOAL_LINE_X, 0.02, 0]} rotation={[0, Math.PI, 0]}>
        <GoalAssembly side="right" />
      </group>
    </>
  );
}