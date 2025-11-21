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

    constructor(options: any) {
      this.options = options;
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

describe("tdd(laser-annotation-mode): cycle 2 - Annotation Mode with Size Validation", () => {
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
        laserPointerMode: "annotation",
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

  describe("Annotation Mode - Basic Behavior", () => {
    it("should accumulate points in annotation mode", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
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

    it("should persist trail after endPath", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
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

  describe("Annotation Mode - Size Validation (NEW FEATURE)", () => {
    it("should reject size 0 and not draw trail", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 0,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // With size 0, startPath should be rejected or size should be clamped to minimum
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);

      // FAILS: Size 0 should not create a trail
      // After implementation, this should either:
      // 1. Not create currentTrail at all, OR
      // 2. Clamp size 0 to minimum (1)
      const currentTrail = trail.getCurrentTrail();
      expect(
        currentTrail === undefined || (currentTrail?.options as any)?.size >= 1,
        "Size 0 should be rejected or clamped to minimum"
      ).toBe(true);

      trail.stop();
    });

    it("should clamp negative size to minimum 1", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: -5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail.startPath(100, 100);

      const currentTrail = trail.getCurrentTrail();

      // FAILS: Negative size should be clamped
      expect(
        (currentTrail?.options as any)?.size >= 1,
        "Negative size should be clamped to minimum 1"
      ).toBe(true);

      trail.stop();
    });

    it("should clamp size above 10 to maximum 10", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 25,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail.startPath(100, 100);

      const currentTrail = trail.getCurrentTrail();

      // FAILS: Size > 10 should be clamped
      expect(
        (currentTrail?.options as any)?.size <= 10,
        "Size should be clamped to maximum 10"
      ).toBe(true);

      trail.stop();
    });

    it("should accept valid sizes between 1 and 10", () => {
      const validSizes = [1, 3, 5, 7, 10];

      validSizes.forEach((size) => {
        const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
          laserPointerMode: "annotation",
          size,
          fill: () => "#ff0000",
        });

        trail.start(svgElement);
        trail.startPath(100, 100);

        const currentTrail = trail.getCurrentTrail();

        // FAILS: Valid sizes should not be modified
        expect(
          (currentTrail?.options as any)?.size,
          `Size ${size} should be preserved`
        ).toBe(size);

        trail.stop();
      });
    });

    it("should validate size during updateOptions", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail.startPath(100, 100);

      // FAILS: updateOptions with invalid size should clamp it
      trail.updateOptions({ size: 15 });

      const currentTrail = trail.getCurrentTrail();
      expect(
        (currentTrail?.options as any)?.size <= 10,
        "Size should be clamped to 10 via updateOptions"
      ).toBe(true);

      trail.stop();
    });

    it("should prevent drawing when size becomes 0 after update", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);

      const initialLength = trail.getCurrentTrail()?.originalPoints.length || 0;

      // FAILS: Setting size to 0 should stop adding points
      trail.updateOptions({ size: 0 });
      trail.addPointToPath(120, 120);

      // After size is 0, no new points should be added OR size should be re-clamped
      const finalLength = trail.getCurrentTrail()?.originalPoints.length || 0;

      expect(
        finalLength === initialLength ||
          (trail.getCurrentTrail()?.options as any)?.size >= 1,
        "Size 0 should prevent new points or be auto-clamped"
      ).toBe(true);

      trail.stop();
    });
  });

  describe("Annotation Mode - Multiple Strokes with Size Validation", () => {
    it("should handle multiple strokes with valid sizes", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // First stroke
      trail.startPath(50, 50);
      trail.addPointToPath(60, 60);
      trail.endPath();

      // Second stroke with different size
      trail.updateOptions({ size: 8 });
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      // Both strokes should succeed with their respective sizes
      expect(trail.hasCurrentTrail).toBe(false);

      trail.stop();
    });

    it("should skip drawing if size is invalid throughout stroke", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: -1,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // FAILS: With invalid size, startPath behavior is undefined
      // After implementation, should either reject or clamp
      trail.startPath(100, 100);

      const currentTrail = trail.getCurrentTrail();
      if (currentTrail) {
        expect(
          (currentTrail.options as any)?.size >= 1,
          "Invalid size should be clamped on startPath"
        ).toBe(true);
      }

      trail.stop();
    });
  });
});
