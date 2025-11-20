import React from "react";

import { Excalidraw } from "../index";

import { act, render } from "./test-utils";

describe("Laser opacity (TDD cycle 6)", () => {
  const h = window.h as any;

  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("applies selected opacity to stroke and preserves it when neon is enabled", () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });

    const color = "#00FF00";
    const opacity = 0.4;

    // set color and opacity and ensure neon is off
    act(() => {
      h.app.setAppState({
        laserPointerColor: color,
        laserPointerOpacity: opacity,
        laserPointerNeon: false,
      });
    });

    act(() => {
      h.app.laserTrails.startPath(10, 10);
    });

    const path = document.querySelector('[data-testid="laser-trail-path"]') as SVGPathElement | null;
    expect(path).not.toBeNull();

    const expected = `rgba(0,255,0,${opacity})`;
    const fillAttr = path!.getAttribute("fill");
    const strokeAttr = path!.getAttribute("stroke");

    expect(fillAttr).toBe(expected);
    expect(strokeAttr).toBe(expected);

    // enable neon and start new path
    act(() => {
      h.app.setAppState({ laserPointerNeon: true });
    });

    act(() => {
      h.app.laserTrails.startPath(20, 20);
    });

    const fillAttrNeon = path!.getAttribute("fill");
    const strokeAttrNeon = path!.getAttribute("stroke");

    expect(fillAttrNeon).toBe(expected);
    expect(strokeAttrNeon).toBe(expected);
  });
});
