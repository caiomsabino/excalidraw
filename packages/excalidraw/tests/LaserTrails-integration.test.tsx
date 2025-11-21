import { vi } from "vitest";
import { LaserTrails } from "../laser-trails";
import { AnimatedTrail } from "../animated-trail";
import type { AnimationFrameHandler } from "../animation-frame-handler";
import type App from "../components/App";

// Mock dependencies
vi.mock("../colorUtils", () => ({
  composeColorWithOpacity: (color: string, opacity: number) => color,
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
      return this.points.map(p => [p[0], p[1]]);
    }

    close() {
      return this;
    }
  },
}));

describe("LaserTrails Integration Tests", () => {
  let animationFrameHandler: AnimationFrameHandler;
  let mockApp: App;
  let svgElement: SVGSVGElement;
  let laserTrails: LaserTrails;

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

    laserTrails = new LaserTrails(animationFrameHandler, mockApp);
  });

  afterEach(() => {
    if (svgElement.parentNode) {
      svgElement.parentNode.removeChild(svgElement);
    }
  });

  describe("LaserTrails Configuration", () => {
    it("should create local trail with correct options", () => {
      expect(laserTrails.localTrail).toBeInstanceOf(AnimatedTrail);
      expect(laserTrails.localTrail.options.laserPointerMode).toBe("pointer");
      expect(laserTrails.localTrail.options.size).toBe(5);
    });

    it("should clamp laser size within valid range", () => {
      expect(laserTrails.clampLaserSize(0)).toBe(1);
      expect(laserTrails.clampLaserSize(15)).toBe(10);
      expect(laserTrails.clampLaserSize(5)).toBe(5);
      expect(laserTrails.clampLaserSize(undefined)).toBe(5);
    });

    it("should configure decay time based on mode", () => {
      // Test annotation mode (10 minutes)
      mockApp.state.laserPointerMode = "annotation";
      const annotationTrails = new LaserTrails(animationFrameHandler, mockApp);
      expect(annotationTrails.localTrail.options.decayDuration).toBe(600000);

      // Test hold-to-draw mode (1 second)
      mockApp.state.laserPointerMode = "hold-to-draw";
      const holdToDrawTrails = new LaserTrails(animationFrameHandler, mockApp);
      expect(holdToDrawTrails.localTrail.options.decayDuration).toBe(1000);

      // Test pointer mode (1 second, but doesn't persist)
      mockApp.state.laserPointerMode = "pointer";
      const pointerTrails = new LaserTrails(animationFrameHandler, mockApp);
      expect(pointerTrails.localTrail.options.decayDuration).toBe(1000);
    });
  });

  describe("Trail Lifecycle Management", () => {
    it("should start and stop trails correctly", () => {
      laserTrails.start(svgElement);
      expect(animationFrameHandler.start).toHaveBeenCalled();

      laserTrails.stop();
      expect(animationFrameHandler.stop).toHaveBeenCalled();
    });

    it("should delegate path operations to local trail", () => {
      const startPathSpy = vi.spyOn(laserTrails.localTrail, "startPath");
      const addPointSpy = vi.spyOn(laserTrails.localTrail, "addPointToPath");
      const endPathSpy = vi.spyOn(laserTrails.localTrail, "endPath");

      laserTrails.startPath(100, 200);
      expect(startPathSpy).toHaveBeenCalledWith(100, 200);

      laserTrails.addPointToPath(150, 250);
      expect(addPointSpy).toHaveBeenCalledWith(150, 250);

      laserTrails.endPath();
      expect(endPathSpy).toHaveBeenCalled();
    });

    it("should update options before starting path", () => {
      const updateOptionsSpy = vi.spyOn(laserTrails.localTrail, "updateOptions");
      
      // Change app state
      mockApp.state.laserPointerSize = 8;
      mockApp.state.laserPointerNeon = true;

      laserTrails.startPath(100, 200);
      
      expect(updateOptionsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 8,
          neon: true,
        })
      );
    });
  });

  describe("Clear Operations", () => {
    it("should clear all trails including collaborator trails", () => {
      const clearTrailsSpy = vi.spyOn(laserTrails.localTrail, "clearTrails");
      
      // Add a mock collaborator trail
      const mockCollabTrail = {
        clearTrails: vi.fn(),
        stop: vi.fn(),
      } as any;
      
      (laserTrails as any).collabTrails.set("user1", mockCollabTrail);

      laserTrails.clearAllTrails();

      expect(clearTrailsSpy).toHaveBeenCalled();
      expect(mockCollabTrail.clearTrails).toHaveBeenCalled();
    });
  });

  describe("Collaboration Support", () => {
    it("should create trails for new collaborators", () => {
      const collaborator = {
        pointer: {
          tool: "laser",
          x: 100,
          y: 200,
          laserColor: "#00ff00",
        },
        button: "down",
      };

      mockApp.state.collaborators.set("user1", collaborator as any);
      laserTrails.start(svgElement);

      // Trigger collaboration update
      laserTrails.onFrame();

      expect((laserTrails as any).collabTrails.has("user1")).toBe(true);
    });

    it("should handle collaborator pointer interactions", () => {
      const collaborator = {
        pointer: {
          tool: "laser",
          x: 100,
          y: 200,
          laserColor: "#00ff00",
        },
        button: "down",
      };

      mockApp.state.collaborators.set("user1", collaborator as any);
      laserTrails.start(svgElement);
      laserTrails.onFrame();

      // Check that a collaboration trail was created
      expect((laserTrails as any).collabTrails.has("user1")).toBe(true);
    });


  });

  describe("Mode-Specific Behavior Integration", () => {
    it("should handle pointer mode - no persistence", () => {
      // Create a new mock app with pointer mode
      const pointerMockApp = {
        ...mockApp,
        state: {
          ...mockApp.state,
          laserPointerMode: "pointer" as const,
        }
      };
      const pointerTrails = new LaserTrails(animationFrameHandler, pointerMockApp as any);
      pointerTrails.start(svgElement);

      pointerTrails.startPath(100, 200);
      pointerTrails.addPointToPath(110, 210); // Should not add in pointer mode
      pointerTrails.endPath();

      // In pointer mode, trails should not persist
      const currentTrail = pointerTrails.localTrail.getCurrentTrail();
      expect(currentTrail).toBeUndefined();
    });

    it("should handle annotation mode - long persistence", () => {
      const annotationMockApp = {
        ...mockApp,
        state: {
          ...mockApp.state,
          laserPointerMode: "annotation" as const,
        }
      };
      const annotationTrails = new LaserTrails(animationFrameHandler, annotationMockApp as any);
      annotationTrails.start(svgElement);

      annotationTrails.startPath(100, 200);
      annotationTrails.addPointToPath(110, 210);
      annotationTrails.endPath();

      // Trail should persist in annotation mode
      expect((annotationTrails.localTrail as any).pastTrails.length).toBe(1);
      
      // Verify decay duration is set to 10 minutes
      expect(annotationTrails.localTrail.options.decayDuration).toBe(600000);
    });

    it("should handle hold-to-draw mode - short persistence", () => {
      const holdToDrawMockApp = {
        ...mockApp,
        state: {
          ...mockApp.state,
          laserPointerMode: "hold-to-draw" as const,
        }
      };
      const holdToDrawTrails = new LaserTrails(animationFrameHandler, holdToDrawMockApp as any);
      holdToDrawTrails.start(svgElement);

      holdToDrawTrails.startPath(100, 200);
      holdToDrawTrails.addPointToPath(110, 210);
      holdToDrawTrails.endPath();

      // Trail should persist in hold-to-draw mode
      expect((holdToDrawTrails.localTrail as any).pastTrails.length).toBe(1);
      
      // Verify decay duration is set to 1 second
      expect(holdToDrawTrails.localTrail.options.decayDuration).toBe(1000);
    });
  });

  describe("Dynamic Configuration Updates", () => {
    it("should update trail options when app state changes", () => {
      laserTrails.start(svgElement);
      
      // Change app state
      mockApp.state.laserPointerSize = 8;
      mockApp.state.laserPointerColor = "#00ff00";
      mockApp.state.laserPointerNeon = true;
      mockApp.state.laserPointerOpacity = 0.5;

      const updateOptionsSpy = vi.spyOn(laserTrails.localTrail, "updateOptions");
      
      // Start new path to trigger options update
      laserTrails.startPath(100, 200);

      expect(updateOptionsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 8,
          neon: true,
          opacity: 0.5,
        })
      );
    });

    it("should handle mode transitions correctly", () => {
      laserTrails.start(svgElement);

      // Start in pointer mode
      mockApp.state.laserPointerMode = "pointer";
      laserTrails.startPath(100, 200);
      laserTrails.endPath();

      // Switch to annotation mode
      mockApp.state.laserPointerMode = "annotation";
      laserTrails.startPath(200, 300);
      laserTrails.endPath();

      // Annotation trail should persist
      expect((laserTrails.localTrail as any).pastTrails.length).toBe(1);
    });
  });

  describe("Performance and Memory Management", () => {
    it("should handle rapid trail creation without memory leaks", () => {
      mockApp.state.laserPointerMode = "hold-to-draw";
      laserTrails.start(svgElement);

      // Create many trails rapidly
      for (let i = 0; i < 100; i++) {
        laserTrails.startPath(i, i);
        laserTrails.addPointToPath(i + 10, i + 10);
        laserTrails.endPath();
      }

      // Should handle many trails
      expect((laserTrails.localTrail as any).pastTrails.length).toBe(100);
    });

    it("should properly dispose of animation frame handlers", () => {
      laserTrails.start(svgElement);
      laserTrails.stop();

      expect(animationFrameHandler.stop).toHaveBeenCalled();
    });
  });
});