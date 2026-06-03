"use client";

/**
 * Patch for THREE.Clock deprecation warning.
 *
 * @react-three/fiber v9 (and its events bundles) unconditionally does
 *   clock: new THREE.Clock()
 * in its internal store state at module initialization time.
 * This fires the deprecation warning from three.js r183+ every time a Canvas mounts.
 *
 * The <Canvas clock={...}> prop is NOT wired up in the configure() of this fiber version,
 * so previous attempts to pass a Timer had no effect.
 *
 * Solution: Replace THREE.Clock with a drop-in implementation that provides the exact
 * same public API (properties + methods) that fiber, drei, and our own code rely on,
 * but never constructs the real (deprecated) THREE.Clock.
 *
 * We run this patch by importing this module *before* any code that imports fiber.
 * The patch is idempotent and only affects the browser (where the warning appears).
 */

import * as THREE from "three";

// Module-scoped flag. ESM module evaluation happens once.
let patched = false;

if (typeof window !== "undefined" && !patched) {
  patched = true;

  // Install a console filter FIRST to catch any deprecation warnings that
  // may fire during module evaluation of three + fiber (the warn happens
  // inside the original Clock constructor body when fiber creates its state).
  const origWarn = console.warn?.bind(console);
  const origError = console.error?.bind(console);

  function filterThreeClockDeprecation(...args: any[]) {
    const first = args[0];
    if (typeof first === "string" && first.includes("Clock: This module has been deprecated")) {
      // Silently drop the noisy deprecation from three.js r183+ / fiber v9.
      return;
    }
    if (origWarn) origWarn(...args);
  }

  if (console.warn) console.warn = filterThreeClockDeprecation as any;
  // Some three internals may use error path, be defensive.
  if (console.error) {
    console.error = function (...args: any[]) {
      const first = args[0];
      if (typeof first === "string" && first.includes("Clock: This module has been deprecated")) {
        return;
      }
      if (origError) origError(...args);
    } as any;
  }

  class PatchedClock {
    autoStart: boolean;
    startTime: number;
    oldTime: number;
    elapsedTime: number;
    running: boolean;

    constructor(autoStart = true) {
      this.autoStart = autoStart;
      this.startTime = 0;
      this.oldTime = 0;
      this.elapsedTime = 0;
      this.running = false;

      if (autoStart) this.start();
      // Never invoke the real THREE.Clock constructor (the source of the deprecation warn).
    }

    start() {
      this.startTime = performance.now();
      this.oldTime = this.startTime;
      this.elapsedTime = 0;
      this.running = true;
    }

    stop() {
      this.getElapsedTime();
      this.running = false;
    }

    getElapsedTime(): number {
      this.getDelta();
      return this.elapsedTime;
    }

    getDelta(): number {
      let diff = 0;

      if (this.autoStart && !this.running) {
        this.start();
      }

      if (this.running) {
        const newTime = performance.now();
        diff = (newTime - this.oldTime) / 1000;
        this.oldTime = newTime;
        this.elapsedTime += diff;
      }

      return diff;
    }
  }

  // Best-effort replacement for code that does `new THREE.Clock()` using *our* namespace.
  // In ESM (Turbopack/Next browser bundles) the namespace object usually has
  // non-configurable getters for exports, so direct assignment or defineProperty
  // will throw "has only a getter". We guard it so the patch module itself never fails to evaluate.
  try {
    (THREE as any).Clock = PatchedClock as any;
  } catch {
    // Expected in strict ESM namespace objects. The filters below are the
    // reliable way to silence the warning no matter which namespace fiber uses internally.
  }

  // Also try defineProperty (works in some CJS / older bundler setups).
  try {
    Object.defineProperty(THREE, "Clock", {
      value: PatchedClock,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    // ignore - filters will handle the warning
  }

  // Additionally patch three.js's own warn / warnOnce functions (if present).
  // This catches the deprecation at the source even if three uses its custom
  // console function (setConsoleFunction) instead of going through global console.
  try {
    const threeWarn = (THREE as any).warn;
    if (typeof threeWarn === "function") {
      (THREE as any).warn = function (...args: any[]) {
        const joined = args.map((a: any) => (typeof a === "string" ? a : "")).join(" ");
        if (joined.includes("Clock: This module has been deprecated")) return;
        return threeWarn.apply(this, args);
      };
    }
  } catch {}

  try {
    const threeWarnOnce = (THREE as any).warnOnce;
    if (typeof threeWarnOnce === "function") {
      (THREE as any).warnOnce = function (...args: any[]) {
        const joined = args.map((a: any) => (typeof a === "string" ? a : "")).join(" ");
        if (joined.includes("Clock: This module has been deprecated")) return;
        return threeWarnOnce.apply(this, args);
      };
    }
  } catch {}
}

export {}; // side-effect only module
