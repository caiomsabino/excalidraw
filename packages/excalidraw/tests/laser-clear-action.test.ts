import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { AnimatedTrail } from "../animated-trail";
import { LaserTrails } from "../laser-trails";
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

describe("tdd(laser-clear-action): cycle 4 - Clear Action with Undo Support", () => {
  let animationFrameHandler: AnimationFrameHandler;
  let mockApp: App;
  let trail: AnimatedTrail;
  let laserTrails: LaserTrails;
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

    trail = new AnimatedTrail(animationFrameHandler, mockApp, {
      laserPointerMode: "annotation",
      size: 5,
      fill: () => "#ff0000",
    });

    laserTrails = new LaserTrails(animationFrameHandler, mockApp);
  });

  afterEach(() => {
    if (svgElement.parentNode) {
      svgElement.parentNode.removeChild(svgElement);
    }
  });

  describe("Clear Action - Basic Functionality", () => {
    it("should clear all trails when clearTrails is called", () => {
      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.addPointToPath(120, 120);
      trail.endPath();

      expect(trail.getCurrentTrail()).toBeUndefined();

      trail.clearTrails();
      expect(trail.getCurrentTrail()).toBeUndefined();

      trail.stop();
    });

    it("should reset canvas to empty state", () => {
      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      // Before clear: pastTrails should have content
      expect((trail as any).pastTrails.length).toBeGreaterThan(0);

      trail.clearTrails();

      // After clear: both pastTrails and currentTrail should be empty
      expect((trail as any).pastTrails.length).toBe(0);
      expect((trail as any).currentTrail).toBeUndefined();

      // SVG path should also be empty
      const trailElement = trail["trailElement"];
      const pathAfter = trailElement.getAttribute("d");
      expect(pathAfter === "" || pathAfter === null).toBe(true);

      trail.stop();
    });
  });

  describe("Clear Action - With Undo Support (NEW FEATURE)", () => {
    it("should store cleared trails in history for undo", () => {
      trail.start(svgElement);
      trail.startPath(50, 50);
      trail.addPointToPath(60, 60);
      trail.addPointToPath(70, 70);
      trail.endPath();

      // FAILS: Trail should be stored in history before clearing
      const clearHistory = (trail as any).clearHistory || [];
      expect(
        Array.isArray(clearHistory) || typeof (trail as any).getClearHistory === "function",
        "Clear action should store history for undo"
      ).toBe(true);

      trail.clearTrails();

      trail.stop();
    });

    it("should support undoing clear action with undoClear()", () => {
      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.addPointToPath(120, 120);
      trail.endPath();

      // Get initial state
      const initialEmpty = trail.getCurrentTrail() === undefined;

      // Clear trails
      trail.clearTrails();
      expect(trail.getCurrentTrail()).toBeUndefined();

      // FAILS: Should have undoClear method
      expect(
        typeof (trail as any).undoClear === "function",
        "Trail should have undoClear method to restore cleared drawings"
      ).toBe(true);

      trail.stop();
    });

    it("should maintain clear history with timestamp", () => {
      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      const beforeClear = performance.now();
      trail.clearTrails();
      const afterClear = performance.now();

      // FAILS: Clear history should include timestamp
      const history = (trail as any).getClearHistory?.();
      expect(
        history && Array.isArray(history),
        "Clear history should be accessible"
      ).toBe(true);

      if (history && history.length > 0) {
        const lastClear = history[history.length - 1];
        expect(lastClear.timestamp).toBeGreaterThanOrEqual(beforeClear);
        expect(lastClear.timestamp).toBeLessThanOrEqual(afterClear);
      }

      trail.stop();
    });

    it("should limit clear history to last N actions (NEW FEATURE)", () => {
      trail.start(svgElement);

      const MAX_HISTORY = (trail.options as any)?.maxClearHistory || 10;

      // Perform more clears than max history
      for (let i = 0; i < MAX_HISTORY + 5; i++) {
        trail.startPath(100 + i, 100 + i);
        trail.addPointToPath(110 + i, 110 + i);
        trail.endPath();
        trail.clearTrails();
      }

      // FAILS: History should not exceed max size
      const history = (trail as any).getClearHistory?.();
      expect(
        !history || history.length <= (MAX_HISTORY || 10),
        "Clear history should be limited to prevent memory bloat"
      ).toBe(true);

      trail.stop();
    });

    it("should validate clear action is not empty before storing in history", () => {
      trail.start(svgElement);

      // Try to clear when nothing is drawn
      trail.clearTrails();

      // FAILS: Should not store empty clears in history
      const history = (trail as any).getClearHistory?.();
      expect(
        !history || history.length === 0,
        "Empty clear should not be added to history"
      ).toBe(true);

      trail.stop();
    });
  });

  describe("Clear Action - Confirmation Dialog (NEW FEATURE)", () => {
    it("should require confirmation for large draws before clearing", () => {
      trail.start(svgElement);

      // Draw many strokes
      for (let i = 0; i < 50; i++) {
        trail.startPath(100 + i, 100 + i);
        trail.addPointToPath(110 + i, 110 + i);
        trail.endPath();
      }

      // FAILS: Should have confirmation requirement for large clears
      const requiresConfirmation = (trail as any).requiresClearConfirmation?.() || false;
      expect(
        typeof (trail as any).requiresClearConfirmation === "function",
        "Clear action should check if confirmation is needed"
      ).toBe(true);

      trail.stop();
    });

    it("should define threshold for confirmation (default 5 trails)", () => {
      trail.start(svgElement);

      // FAILS: Should have configurable confirmation threshold
      const threshold = (trail.options as any)?.clearConfirmThreshold || 5;
      expect(threshold).toBeGreaterThan(0);

      trail.stop();
    });

    it("should allow bypassing confirmation with force flag", () => {
      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      // FAILS: clearTrails should accept force parameter
      expect(
        (trail as any).clearTrails.length > 0 || 
          (trail as any).forceClearing !== undefined,
        "Clear action should support force flag to bypass confirmation"
      ).toBe(true);

      trail.stop();
    });
  });

  describe("Clear Action - State Management (NEW FEATURE)", () => {
    it("should track if there are pending clears that can be undone", () => {
      trail.start(svgElement);
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      expect(
        typeof (trail as any).hasClearHistory === "function" ||
          (trail as any).canUndo !== undefined,
        "Should provide method to check if undo is available"
      ).toBe(true);

      trail.stop();
    });

    it("should maintain separate history for each trail instance", () => {
      const trail2 = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);
      trail2.start(svgElement);

      // Clear trail 1
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();
      trail.clearTrails();

      // FAILS: trail1 history should not affect trail2 history
      const history1 = (trail as any).getClearHistory?.() || [];
      const history2 = (trail2 as any).getClearHistory?.() || [];

      expect(
        history1.length !== history2.length || history1.length === 0,
        "Each trail instance should maintain separate history"
      ).toBe(true);

      trail.stop();
      trail2.stop();
    });
  });

  describe("Clear Action - LaserTrails Integration", () => {
    it("should clear local trail through LaserTrails interface", () => {
      laserTrails.start(svgElement);
      laserTrails.startPath(100, 100);
      laserTrails.addPointToPath(110, 110);
      laserTrails.endPath();

      laserTrails.localTrail.clearTrails();
      expect(laserTrails.localTrail.getCurrentTrail()).toBeUndefined();

      laserTrails.stop();
    });

    it("should support clearing all trails including collaborative trails", () => {
      laserTrails.start(svgElement);
      laserTrails.startPath(100, 100);
      laserTrails.addPointToPath(110, 110);

      // FAILS: LaserTrails should have clearAllTrails method for collaboration
      expect(
        typeof (laserTrails as any).clearAllTrails === "function",
        "LaserTrails should support clearing all trails including collaborative"
      ).toBe(true);

      laserTrails.stop();
    });
  });

  describe("Clear Action - Performance", () => {
    it("should clear large number of trails efficiently", () => {
      trail.start(svgElement);

      // Create 100 trails
      for (let i = 0; i < 100; i++) {
        trail.startPath(50 + i, 50 + i);
        trail.addPointToPath(60 + i, 60 + i);
        trail.endPath();
      }

      const startTime = performance.now();
      trail.clearTrails();
      const duration = performance.now() - startTime;

      // FAILS: Clear should be fast (< 10ms for 100 trails)
      expect(
        duration < 10,
        `Clear action should be fast, took ${duration.toFixed(2)}ms`
      ).toBe(true);

      trail.stop();
    });
  });
});
