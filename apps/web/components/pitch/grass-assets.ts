import * as THREE from "three";
import { PITCH_LENGTH_W, PITCH_WIDTH_W } from "./constants";

export function createBumpyFieldGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PITCH_LENGTH_W, PITCH_WIDTH_W, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z =
      Math.sin(x * 0.6) * 0.035 +
      Math.cos(y * 0.5) * 0.028 +
      (Math.random() - 0.5) * 0.012;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createGrassTexture(): THREE.CanvasTexture | null {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  ctx.fillStyle = "#0a3d0a";
  ctx.fillRect(0, 0, 512, 512);

  const stripeW = 38;
  for (let sx = 0; sx < 512; sx += stripeW) {
    const isLight = Math.floor(sx / stripeW) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = isLight ? 0.09 : 0.16;
    ctx.fillStyle = isLight ? "#145a14" : "#062f06";
    ctx.fillRect(sx, 0, stripeW * 0.82, 512);
    ctx.restore();
    if (sx > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#052805";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, 512);
      ctx.stroke();
      ctx.restore();
    }
  }

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 1.2 + Math.random() * 5.5;
    const angle = (Math.random() - 0.5) * 1.3;
    ctx.strokeStyle =
      Math.random() > 0.48
        ? "#0f4d12"
        : Math.random() > 0.5
          ? "#083308"
          : "#1a5c1a";
    ctx.lineWidth = 0.6 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + Math.cos(angle) * len,
      y + Math.sin(angle) * len * 0.6 + (Math.random() - 0.5) * 1.5,
    );
    ctx.stroke();
  }

  for (let i = 0; i < 320; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle =
      Math.random() > 0.5 ? "rgba(15, 60, 18, 0.38)" : "rgba(6, 42, 8, 0.3)";
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + Math.random() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 85; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.random() * 0.1;
    ctx.fillStyle = "#052805";
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      2.5 + Math.random() * 4,
      1.5 + Math.random() * 2.5,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  const wearSpots = [
    { x: 78, y: 255, r: 52 },
    { x: 434, y: 255, r: 52 },
    { x: 256, y: 255, r: 38 },
    { x: 118, y: 188, r: 22 },
    { x: 394, y: 322, r: 19 },
  ];
  wearSpots.forEach((spot) => {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#0a2f0a";
    ctx.beginPath();
    ctx.ellipse(
      spot.x,
      spot.y,
      spot.r,
      spot.r * 0.72,
      (Math.random() - 0.5) * 0.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (Math.random() > 0.4) {
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = "#1a4a1a";
      ctx.beginPath();
      ctx.ellipse(
        spot.x + 4,
        spot.y - 3,
        spot.r * 0.55,
        spot.r * 0.4,
        0.3,
        0,
        Math.PI * 2,
      );
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
}