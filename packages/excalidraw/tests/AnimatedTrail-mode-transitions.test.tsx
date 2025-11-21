import { vi } from "vitest";
import { AnimatedTrail } from "../animated-trail";
import type { AnimationFrameHandler } from "../animation-frame-handler";
import type App from "../components/App";

// Mock dependencies
vi.mock("../colorUtils", () => ({
  composeColorWithOpacity: (color: string, opacity: number) => color,
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
      return this.points.map(p => [p[0], p[1]]);
    }

    close() {
      return this;
    }
  },
}));

describe("AnimatedTrail Mode Transition Tests", () => {
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
        laserPointerMode: "pointer",
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

  describe("Mode Transition Scenarios", () => {
    it("should handle pointer to annotation mode transition", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "pointer",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Start in pointer mode
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110); // Should not add point in pointer mode
      trail.endPath();

      expect((trail as any).pastTrails.length).toBe(0); // Pointer mode doesn't persist

      // Switch to annotation mode
      trail.updateOptions({ laserPointerMode: "annotation", decayDuration: 600000 });

      trail.startPath(200, 200);
      trail.addPointToPath(210, 210); // Should add point in annotation mode
      trail.endPath();

      expect((trail as any).pastTrails.length).toBe(1); // Annotation mode persists
    });

    it("should handle annotation to hold-to-draw mode transition", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        decayDuration: 600000,
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Create annotation trail
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      expect((trail as any).pastTrails.length).toBe(1);
      expect(trail.options.decayDuration).toBe(600000);

      // Switch to hold-to-draw mode
      trail.updateOptions({ laserPointerMode: "hold-to-draw", decayDuration: 1000 });

      trail.startPath(200, 200);
      trail.addPointToPath(210, 210);
      trail.endPath();

      expect((trail as any).pastTrails.length).toBe(2); // Both trails should persist
      expect(trail.options.decayDuration).toBe(1000); // Decay time should be updated
    });

    it("should handle hold-to-draw to pointer mode transition", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        decayDuration: 1000,
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Create hold-to-draw trail
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      expect((trail as any).pastTrails.length).toBe(1);

      // Switch to pointer mode
      trail.updateOptions({ laserPointerMode: "pointer", decayDuration: 1000 });

      trail.startPath(200, 200);
      trail.addPointToPath(210, 210); // Should not add point in pointer mode
      trail.endPath();

      // Previous trail should still exist, but new one shouldn't persist
      expect((trail as any).pastTrails.length).toBe(1);
    });
  });

  describe("Trail Persistence During Mode Changes", () => {
    it("should preserve existing trails when changing modes", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        decayDuration: 600000,
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Create multiple annotation trails
      for (let i = 0; i < 3; i++) {
        trail.startPath(i * 100, i * 100);
        trail.addPointToPath(i * 100 + 50, i * 100 + 50);
        trail.endPath();
      }

      expect((trail as any).pastTrails.length).toBe(3);

      // Switch to pointer mode
      trail.updateOptions({ laserPointerMode: "pointer" });

      // Existing trails should still be there
      expect((trail as any).pastTrails.length).toBe(3);

      // But new trails shouldn't persist
      trail.startPath(400, 400);
      trail.endPath();

      expect((trail as any).pastTrails.length).toBe(3);
    });

    it("should update decay behavior for existing trails", async () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "hold-to-draw",
        decayDuration: 100, // Short duration for testing
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Create trail with short decay
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);
      trail.endPath();

      expect((trail as any).pastTrails.length).toBe(1);

      // Switch to annotation mode with longer decay
      trail.updateOptions({ 
        laserPointerMode: "annotation", 
        decayDuration: 600000 
      });

      // Trigger rendering to apply decay filtering
      trail.render();

      // Trail should still exist due to longer decay duration
      expect((trail as any).pastTrails.length).toBe(1);
    });
  });

  describe("Option Updates During Active Drawing", () => {
    it("should update options of current trail when changed mid-drawing", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Start drawing
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);

      const currentTrail = trail.getCurrentTrail();
      expect(currentTrail?.options.size).toBe(5);

      // Update options mid-drawing
      trail.updateOptions({ size: 8, laserPointerMode: "annotation" });

      // Current trail should have updated options
      expect(currentTrail?.options.size).toBe(8);

      trail.endPath();
    });

    it("should handle mode change during active drawing", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Start drawing in annotation mode
      trail.startPath(100, 100);
      trail.addPointToPath(110, 110);

      // Switch to pointer mode mid-drawing
      trail.updateOptions({ laserPointerMode: "pointer" });

      // Continue adding points (should still work based on original mode)
      trail.addPointToPath(120, 120);
      trail.endPath();

      // Trail should NOT persist because mode changed to pointer before endPath
      expect((trail as any).pastTrails.length).toBe(0);
    });
  });

  describe("Decay Duration Clamping During Transitions", () => {
    it("should clamp decay duration to valid range when updating", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      // Test minimum clamping
      trail.updateOptions({ decayDuration: 10 }); // Below minimum
      expect(trail.options.decayDuration).toBe(50); // Should be clamped to minimum

      // Test maximum clamping
      trail.updateOptions({ decayDuration: 700000 }); // Above maximum
      expect(trail.options.decayDuration).toBe(600000); // Should be clamped to maximum

      // Test valid range
      trail.updateOptions({ decayDuration: 5000 });
      expect(trail.options.decayDuration).toBe(5000); // Should remain unchanged
    });
  });

  describe("Visual Property Transitions", () => {
    it("should update visual properties during mode transitions", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "pointer",
        size: 5,
        neon: false,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      // Update multiple visual properties along with mode
      trail.updateOptions({
        laserPointerMode: "annotation",
        size: 8,
        neon: true,
        decayDuration: 600000,
      });

      expect(trail.options.laserPointerMode).toBe("annotation");
      expect(trail.options.size).toBe(8);
      expect(trail.options.neon).toBe(true);
      expect(trail.options.decayDuration).toBe(600000);
    });

    it("should handle size clamping during property updates", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "annotation",
        size: 5,
        fill: () => "#ff0000",
      });

      // Test size clamping during update
      trail.updateOptions({ size: 15 }); // Above maximum
      expect(trail.options.size).toBe(10); // Should be clamped

      trail.updateOptions({ size: 0 }); // Below minimum  
      expect(trail.options.size).toBe(1); // Should be clamped
    });
  });

  describe("Memory Management During Transitions", () => {
    it("should not leak memory when frequently switching modes", () => {
      const trail = new AnimatedTrail(animationFrameHandler, mockApp, {
        laserPointerMode: "pointer",
        size: 5,
        fill: () => "#ff0000",
      });

      trail.start(svgElement);

      const modes = ["pointer", "annotation", "hold-to-draw"] as const;

      // Rapidly switch modes and create trails
      for (let i = 0; i < 50; i++) {
        const mode = modes[i % 3];
        trail.updateOptions({ 
          laserPointerMode: mode,
          decayDuration: mode === "annotation" ? 600000 : 1000,
        });

        trail.startPath(i, i);
        if (mode !== "pointer") {
          trail.addPointToPath(i + 10, i + 10);
        }
        trail.endPath();
      }

      // Should handle many mode switches without issues  
      // After 50 iterations, final mode should be modes[49 % 3] = modes[1] = "annotation"
      expect(trail.options.laserPointerMode).toBe("annotation");
      expect((trail as any).pastTrails.length).toBeGreaterThan(0);
    });
  });
});