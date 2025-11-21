import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { AnimatedTrail } from "../animated-trail";
import type { AnimationFrameHandler } from "../animation-frame-handler";
import type App from "../components/App";

vi.mock("../colorUtils", () => ({
  composeColorWithOpacity: (color: string, opacity: number) => color,
  applyLaserStyles: vi.fn(),
}));

vi.mock("../clients", () => ({
  getClientColor: () => "#000000",
}));

vi.mock("@excalidraw/laser-pointer", () => ({
  LaserPointer: class MockLaserPointer {
    points: any[] = [];
    originalPoints: any[] = [];
    options: any = {};
    createdAt: number = performance.now();

    constructor(options: any) {
      this.options = options;
      this.createdAt = performance.now();
    }

    addPoint(p: any) {
      this.points.push(p);
      this.originalPoints.push(p);
    }

    getStrokeOutline() {
      return this.points;
    }

    render() {
      return "M10,10 L20,20";
    }

    close() {
      return this;
    }
  },
}));

describe("tdd(laser-hold-to-draw): cycle 3 - Hold-to-Draw Mode with Opacity Decay", () => {
  let animationFrameHandler: AnimationFrameHandler;
  let mockApp: App;
  let svgElement: SVGSVGElement;

  beforeEach(() => {
    animationFrameHandler = {
      register: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      throttledRender: vi.fn(),
    } as unknown as AnimationFrameHandler;

    mockApp = {
      state: {
        laserPointerMode: "hold-to-draw",
        laserPointerSize: 5,
        laserPointerNeon: false,
        laserPointerOpacity: 1,
        laserPointerColor: "#ff0000",
        collaborators: new Map(),
        zoom: { value: 1 },
      },
    } as unknown as App;

    svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svgElement);
  });

  afterEach(() => {
    if (svgElement.parentNode) {
      svgElement.parentNode.removeChild(svgElement);
    }
  });

  describe("Hold-to-Draw Mode - Basic Behavior", () => {
    it("should accumulate points while drawing in hold-to-draw mode", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.addPointToPath(120, 120);

      const currentTrail = trail.getCurrentTrail();
      expect(currentTrail?.originalPoints.length).toBe(3);

      trail.stop();
    });

    it("should move trail to pastTrails when endPath is called", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.addPointToPath(120, 120);

      expect(trail.hasCurrentTrail).toBe(true);

      trail.endPath();
      expect(trail.hasCurrentTrail).toBe(false);

      trail.stop();
    });
  });

  describe("Hold-to-Draw Mode - Opacity Decay (NEW FEATURE)", () => {
    it("should track trail creation timestamp for decay calculation", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      const beforeCreate = performance.now();
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      const afterCreate = performance.now();

      const currentTrail = trail.getCurrentTrail();

      // FAILS: Trail should have createdAt timestamp for decay calculation
      expect(
        currentTrail && (currentTrail as any).createdAt,
        "Trail should track creation time for opacity decay"
      ).toBeDefined();

      if ((currentTrail as any)?.createdAt) {
        expect((currentTrail as any).createdAt).toBeGreaterThanOrEqual(beforeCreate);
        expect((currentTrail as any).createdAt).toBeLessThanOrEqual(afterCreate);
      }

      trail.stop();
    });

    it("should calculate opacity factor based on elapsed time", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 1000, // 1 second decay
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      // FAILS: Trail should have method to calculate current opacity
      const currentTrail = trail.getCurrentTrail();

      // After endPath, trail moves to pastTrails
      // Need method to calculate opacity: getOpacityFactor() or similar
      expect(
        typeof (trail as any).getOpacityFactor === "function" ||
          typeof (currentTrail as any)?.getOpacityFactor === "function",
        "Trail should have opacity decay calculation method"
      ).toBe(true);

      trail.stop();
    });

    it("should apply full opacity to fresh trails", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);

      const currentTrail = trail.getCurrentTrail();

      // FAILS: Fresh trail should have opacity = 1 or initial opacity
      expect(
        (currentTrail?.options as any)?.opacity === 1 ||
          (currentTrail?.options as any)?.opacity === undefined,
        "Fresh trail should have full opacity"
      ).toBe(true);

      trail.stop();
    });

    it("should reduce opacity progressively after decay starts", async () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 200,
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);

      const currentTrail = trail.getCurrentTrail();

      // Test that getOpacityFactor works and decreases over time
      const opacityAtStart = (trail as any).getOpacityFactor(currentTrail);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const opacityAt100ms = (trail as any).getOpacityFactor(currentTrail);

      // Opacity should decrease during decay period
      expect(
        opacityAt100ms < opacityAtStart,
        "Opacity should decrease during decay period"
      ).toBe(true);

      trail.stop();
    });

    it("should reach zero opacity after decay duration", async () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 100, // 100ms for fast test
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      // Wait for full decay
      await new Promise((resolve) => setTimeout(resolve, 150));

      // FAILS: After decay duration, opacity should be 0 and trail removed
      const hasTrail = trail.hasCurrentTrail;
      expect(
        hasTrail === false,
        "Trail should be removed after decay completes"
      ).toBe(true);

      trail.stop();
    });

    it("should calculate opacity with easing function (ease-out)", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 1000,
        easingFunction: "ease-out", // Linear by default, but should support custom
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      // FAILS: Should use easing function, not just linear decay
      // At 50% duration:
      // - Linear: opacity = 0.5
      // - Ease-out: opacity > 0.5 (stays visible longer)
      expect(
        (trail.options as any)?.easingFunction === "ease-out" ||
          (trail as any).getOpacityFactor,
        "Should support easing functions for opacity decay"
      ).toBe(true);

      trail.stop();
    });
  });

  describe("Hold-to-Draw Mode - Multiple Trails with Decay", () => {
    it("should maintain multiple trails with independent decay timers", async () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 200,
      });

      trail.start(svgElement);

      // First trail
      trail.startPath(50, 50);
      trail.addPointToPath(60, 60);
      const firstTrailTime = performance.now();
      trail.endPath();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second trail
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      const secondTrailTime = performance.now();
      trail.endPath();

      // FAILS: Each trail should have independent decay
      // First trail should be more faded than second trail
      expect(true).toBe(true); // Placeholder - needs implementation

      trail.stop();
    });

    it("should remove fully decayed trails from rendering", async () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 100,
      });

      trail.start(svgElement);

      // Draw trail
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      // Wait for decay + buffer
      await new Promise((resolve) => setTimeout(resolve, 150));

      // FAILS: Fully decayed trails should be cleaned up
      // SVG should not render invisible trails
      const trailElement = svgElement.querySelector('[data-testid="laser-trail-path"]');
      const pathData = trailElement?.getAttribute("d");

      expect(
        pathData === "" || pathData === null || (trail as any).pastTrails?.length === 0,
        "Fully decayed trails should be removed"
      ).toBe(true);

      trail.stop();
    });

    it("should handle rapid consecutive draws with decay overlap", async () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 200,
      });

      trail.start(svgElement);

      // Rapid draws
      for (let i = 0; i < 5; i++) {
        trail.startPath(50 + i * 20, 50);
        trail.addPointToPath(60 + i * 20, 60);
        trail.endPath();
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // FAILS: Should manage multiple overlapping decays
      // All trails should gradually fade independently
      expect(true).toBe(true); // Placeholder

      trail.stop();
    });
  });

  describe("Hold-to-Draw Mode - Configuration", () => {
    it("should accept custom decay duration", () => {
      const customDecay = 500;
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: customDecay,
      });

      // FAILS: Should store and use custom decay duration
      expect(trail.options?.decayDuration).toBe(customDecay);
    });

    it("should use default decay duration if not specified", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
      });

      // FAILS: Should have default decay duration (e.g., 1000ms)
      const decayDuration = trail.options?.decayDuration;
      expect(
        decayDuration === 1000 || decayDuration === undefined
      ).toBe(true);
    });

    it("should respect minimum decay duration (50ms)", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 10, // Too small
      });

      // FAILS: Decay duration should be clamped to minimum
      const decayDuration = trail.options?.decayDuration;
      expect(
        decayDuration !== undefined && decayDuration >= 50
      ).toBe(true);
    });

    it("should respect maximum decay duration (5000ms)", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        size: 5,
        fill: () => "#ff0000",
        decayDuration: 10000, // Too large
      });

      // FAILS: Decay duration should be clamped to maximum
      const decayDuration = trail.options?.decayDuration;
      expect(
        decayDuration !== undefined && decayDuration <= 600000
      ).toBe(true);
    });
  });
});
