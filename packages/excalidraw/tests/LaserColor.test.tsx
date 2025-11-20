import React from "react";

import { Excalidraw } from "../index";

import { act, render } from "./test-utils";

describe("Laser color (TDD cycle 5)", () => {
  const h = window.h as any;

  beforeEach(async () => {
    await render(<Excalidraw />);
  });

    it("applies selected color and works with neon on and off", async () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });

    const color = "#00FF00";

    act(() => {
      h.app.setAppState({ laserPointerColor: color, laserPointerNeon: false });
    });

    act(() => {
      h.app.laserTrails.startPath(10, 10);
    });

    const path = document.querySelector('[data-testid="laser-trail-path"]') as SVGPathElement | null;
    expect(path).not.toBeNull();

    const fill = path!.getAttribute("fill");
    expect(fill).toBe(color);


    act(() => {
      h.app.setAppState({ laserPointerNeon: true });
    });

    act(() => {
      h.app.laserTrails.startPath(20, 20);
    });

    const fillWithNeon = path!.getAttribute("fill");
    expect(fillWithNeon).toBe(color);
  });
});
