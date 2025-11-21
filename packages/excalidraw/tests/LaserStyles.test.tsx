import { vi } from "vitest";
import { applyLaserStyles } from "../laserStyles";

describe("LaserStyles Unit Tests", () => {
  let mockElement: SVGPathElement;

  beforeEach(() => {
    // Create mock SVG path element
    mockElement = {
      setAttribute: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      style: {
        strokeWidth: "",
        filter: "",
        setProperty: vi.fn(),
        removeProperty: vi.fn(),
      },
    } as unknown as SVGPathElement;
  });

  describe("Size Styling", () => {
    it("should apply stroke width correctly", () => {
      applyLaserStyles(mockElement, { size: 5 });

      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "5");
      expect(mockElement.style.strokeWidth).toBe("5");
    });

    it("should use default size when size is undefined", () => {
      applyLaserStyles(mockElement, {});

      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "1");
      expect(mockElement.style.strokeWidth).toBe("1");
    });

    it("should handle zero and negative sizes", () => {
      applyLaserStyles(mockElement, { size: 0 });
      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "0");

      applyLaserStyles(mockElement, { size: -5 });
      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "-5");
    });
  });

  describe("Neon Effect Styling", () => {
    it("should add neon class when neon is true", () => {
      applyLaserStyles(mockElement, { neon: true });

      expect(mockElement.classList.add).toHaveBeenCalledWith("laser-neon");
    });

    it("should remove neon class when neon is false", () => {
      applyLaserStyles(mockElement, { neon: false });

      expect(mockElement.classList.remove).toHaveBeenCalledWith("laser-neon");
      expect(mockElement.style.filter).toBe("");
    });

    it("should set CSS variable for neon color", () => {
      applyLaserStyles(mockElement, { 
        neon: true, 
        color: "#ff0000" 
      });

      expect(mockElement.classList.add).toHaveBeenCalledWith("laser-neon");
      expect(mockElement.style.setProperty).toHaveBeenCalledWith("--laser-color", "#ff0000");
    });

    it("should not set CSS variable when color is not provided", () => {
      applyLaserStyles(mockElement, { neon: true });

      expect(mockElement.classList.add).toHaveBeenCalledWith("laser-neon");
      expect(mockElement.style.setProperty).not.toHaveBeenCalled();
    });

    it("should clear CSS variables when disabling neon", () => {
      applyLaserStyles(mockElement, { neon: false });

      expect(mockElement.classList.remove).toHaveBeenCalledWith("laser-neon");
      expect(mockElement.style.filter).toBe("");
      expect(mockElement.style.removeProperty).toHaveBeenCalledWith("--laser-color");
    });
  });

  describe("Combined Styling Options", () => {
    it("should apply size and neon together", () => {
      applyLaserStyles(mockElement, {
        size: 8,
        neon: true,
        color: "#00ff00",
      });

      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "8");
      expect(mockElement.style.strokeWidth).toBe("8");
      expect(mockElement.classList.add).toHaveBeenCalledWith("laser-neon");
      expect(mockElement.style.setProperty).toHaveBeenCalledWith("--laser-color", "#00ff00");
    });

    it("should handle all options undefined", () => {
      applyLaserStyles(mockElement, {});

      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "1");
      expect(mockElement.classList.remove).toHaveBeenCalledWith("laser-neon");
    });

    it("should handle null and undefined options gracefully", () => {
      expect(() => {
        applyLaserStyles(mockElement, { size: undefined, neon: undefined, color: undefined });
      }).not.toThrow();

      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "1");
      expect(mockElement.classList.remove).toHaveBeenCalledWith("laser-neon");
    });
  });

  describe("Color Handling", () => {
    it("should handle various color formats", () => {
      const colorFormats = [
        "#ff0000",
        "#FF0000",
        "rgb(255, 0, 0)",
        "rgba(255, 0, 0, 0.5)",
        "red",
        "hsl(0, 100%, 50%)",
      ];

      colorFormats.forEach(color => {
        applyLaserStyles(mockElement, { neon: true, color });
        expect(mockElement.style.setProperty).toHaveBeenCalledWith("--laser-color", color);
      });
    });

    it("should handle empty string color by not setting CSS variable", () => {
      applyLaserStyles(mockElement, { neon: true, color: "" });
      // Empty color should not call setProperty for color
      expect(mockElement.style.setProperty).not.toHaveBeenCalledWith("--laser-color", "");
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle rapid successive calls", () => {
      for (let i = 0; i < 100; i++) {
        applyLaserStyles(mockElement, {
          size: i % 10 + 1,
          neon: i % 2 === 0,
          color: `#${i.toString(16).padStart(6, '0')}`,
        });
      }

      // Should not throw errors
      expect(mockElement.setAttribute).toHaveBeenCalledTimes(100);
    });

    it("should handle very large size values", () => {
      applyLaserStyles(mockElement, { size: 999999 });
      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "999999");
    });

    it("should handle fractional size values", () => {
      applyLaserStyles(mockElement, { size: 2.5 });
      expect(mockElement.setAttribute).toHaveBeenCalledWith("stroke-width", "2.5");
    });
  });

  describe("State Transitions", () => {
    it("should properly transition from neon to non-neon", () => {
      // Enable neon first
      applyLaserStyles(mockElement, { neon: true, color: "#ff0000" });
      expect(mockElement.classList.add).toHaveBeenCalledWith("laser-neon");
      expect(mockElement.style.setProperty).toHaveBeenCalledWith("--laser-color", "#ff0000");

      // Disable neon
      applyLaserStyles(mockElement, { neon: false });
      expect(mockElement.classList.remove).toHaveBeenCalledWith("laser-neon");
      expect(mockElement.style.filter).toBe("");
      expect(mockElement.style.removeProperty).toHaveBeenCalledWith("--laser-color");
    });

    it("should handle size changes while maintaining neon state", () => {
      applyLaserStyles(mockElement, { size: 3, neon: true, color: "#blue" });
      applyLaserStyles(mockElement, { size: 7, neon: true, color: "#blue" });

      expect(mockElement.setAttribute).toHaveBeenLastCalledWith("stroke-width", "7");
      expect(mockElement.classList.add).toHaveBeenCalledWith("laser-neon");
    });
  });
});