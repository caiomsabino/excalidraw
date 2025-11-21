import { AnimatedTrail } from "../animated-trail";
import type { AnimationFrameHandler } from "../animation-frame-handler";
import type App from "../components/App";

/**
 * tdd(laser-pointer-mode): cycle 1 - Pointer Mode
 *
 * Feature: Pointer Mode – laser segue o cursor e não deixa rastro
 *
 * What should be tested:
 * - posição do ponto = posição do cursor
 * - não cria trilha
 *
 * This cycle verifies that when laserPointerMode is set to "pointer":
 * 1. A single glowing dot appears at the cursor position
 * 2. No trail or drawing is left behind as the cursor moves
 * 3. The pointer stops rendering when the laser is deactivated
 */

describe("tdd(laser-pointer-mode): cycle 1 - Pointer Mode", () => {
  let mockApp: Partial<App>;
  let mockAnimationFrameHandler: Partial<AnimationFrameHandler>;
  let containerSvg: SVGSVGElement;

  beforeEach(() => {
    // Setup DOM
    containerSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(containerSvg);

    // Mock AnimationFrameHandler
    mockAnimationFrameHandler = {
      register: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    // Mock App state with Pointer Mode enabled
    mockApp = {
      state: {
        laserPointerMode: "pointer",
        laserPointerColor: "#FF0000",
        laserPointerSize: 5,
        laserPointerNeon: false,
        laserPointerOpacity: 1,
        zoom: { value: 1 },
      },
      visibleElements: [],
      scene: {
        getNonDeletedElementsMap: vi.fn(() => new Map()),
      },
    } as any;
  });

  afterEach(() => {
    if (containerSvg.parentNode) {
      containerSvg.parentNode.removeChild(containerSvg);
    }
  });

  describe("Pointer Mode Behavior", () => {
    it("should place a dot at the cursor position when startPath is called", () => {
      const trail = new AnimatedTrail(
        mockAnimationFrameHandler as any,
        mockApp as any,
        {
          fill: () => "#FF0000",
          size: 5,
        },
      );

      trail.start(containerSvg);

      const cursorX = 100;
      const cursorY = 200;

      // Trigger pointer mode start
      trail.updateOptions({ laserPointerMode: "pointer" });
      trail.startPath(cursorX, cursorY);

      // The trail element should have a pointer indicator at the exact cursor position
      const pathElement = containerSvg.querySelector('[data-testid="laser-trail-path"]');
      expect(pathElement).toBeTruthy();

      // In pointer mode, the dot should be positioned exactly at cursor coords
      // (The actual SVG path rendering will be tested in integration tests,
      //  here we verify the mode is recognized)
      const currentTrail = trail.getCurrentTrail();
      expect(currentTrail).toBeTruthy();

      trail.stop();
    });

    it("should NOT create a trail when cursor moves in Pointer Mode", () => {
      const trail = new AnimatedTrail(
        mockAnimationFrameHandler as any,
        mockApp as any,
        {
          fill: () => "#FF0000",
          size: 5,
          laserPointerMode: "pointer",
        },
      );

      trail.start(containerSvg);

      // Start pointer at position (100, 200)
      trail.startPath(100, 200);

      // Move cursor to position (150, 250) - should NOT add to trail
      trail.addPointToPath(150, 250);

      // Get the current trail points
      const currentTrail = trail.getCurrentTrail();
      expect(currentTrail).toBeTruthy();

      // In pointer mode, originalPoints should only contain the start point
      // because we shouldn't accumulate points for trail drawing
      // Expected: only 1 point (the original pointer position)
      // Actual behavior (before fix): multiple points accumulated
      expect(currentTrail?.originalPoints.length).toBe(1);

      trail.stop();
    });

    it("should have originalPoints length of 1 throughout Pointer Mode lifecycle", () => {
      const trail = new AnimatedTrail(
        mockAnimationFrameHandler as any,
        mockApp as any,
        {
          fill: () => "#FF0000",
          size: 5,
          laserPointerMode: "pointer",
        },
      );

      trail.start(containerSvg);

      trail.startPath(100, 200);
      let currentTrail = trail.getCurrentTrail();
      expect(currentTrail?.originalPoints.length).toBe(1);

      // Add multiple points (simulating cursor movements)
      trail.addPointToPath(110, 210);
      currentTrail = trail.getCurrentTrail();
      expect(currentTrail?.originalPoints.length).toBe(1);

      trail.addPointToPath(120, 220);
      currentTrail = trail.getCurrentTrail();
      expect(currentTrail?.originalPoints.length).toBe(1);

      trail.addPointToPath(130, 230);
      currentTrail = trail.getCurrentTrail();
      expect(currentTrail?.originalPoints.length).toBe(1);

      trail.stop();
    });

    it("should clear the pointer when endPath is called", () => {
      const trail = new AnimatedTrail(
        mockAnimationFrameHandler as any,
        mockApp as any,
        {
          fill: () => "#FF0000",
          size: 5,
          laserPointerMode: "pointer",
        },
      );

      trail.start(containerSvg);

      trail.startPath(100, 200);
      expect(trail.hasCurrentTrail).toBe(true);

      trail.endPath();
      expect(trail.hasCurrentTrail).toBe(false);

      trail.stop();
    });
  });

  describe("Pointer Mode - Position Tracking", () => {
    it("pointer dot position should match cursor position", () => {
      const trail = new AnimatedTrail(
        mockAnimationFrameHandler as any,
        mockApp as any,
        {
          fill: () => "#FF0000",
          size: 5,
          laserPointerMode: "pointer",
        },
      );

      trail.start(containerSvg);

      const x = 150;
      const y = 250;

      trail.startPath(x, y);
      const currentTrail = trail.getCurrentTrail();

      // First point should match the cursor position
      expect(currentTrail?.originalPoints[0][0]).toBe(x);
      expect(currentTrail?.originalPoints[0][1]).toBe(y);

      trail.stop();
    });

    it("should maintain pointer position when addPointToPath is called", () => {
      const trail = new AnimatedTrail(
        mockAnimationFrameHandler as any,
        mockApp as any,
        {
          fill: () => "#FF0000",
          size: 5,
          laserPointerMode: "pointer",
        },
      );

      trail.start(containerSvg);

      const startX = 100;
      const startY = 200;

      trail.startPath(startX, startY);
      const firstPoint = [...trail.getCurrentTrail()!.originalPoints[0]];

      // Move cursor (but in pointer mode, position should not change in trail points)
      trail.addPointToPath(200, 300);
      const pointsAfterMove = trail.getCurrentTrail()!.originalPoints;

      // Should still have only the original point
      expect(pointsAfterMove.length).toBe(1);
      expect(pointsAfterMove[0][0]).toBe(firstPoint[0]);
      expect(pointsAfterMove[0][1]).toBe(firstPoint[1]);

      trail.stop();
    });
  });
});
