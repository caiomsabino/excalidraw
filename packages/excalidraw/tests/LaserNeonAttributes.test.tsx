import React from "react";

import { Excalidraw } from "../index";

import { act, render } from "./test-utils";

describe("Laser neon attributes (TDD cycle 4)", () => {
  const h = window.h as any;

  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("enabling neon does not change size, color or opacity; disabling keeps them intact", () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });

    act(() => {
      h.app.setAppState({ laserPointerSize: 6 });
    });


    act(() => {
      h.app.laserTrails.startPath(10, 10);
    });

    const path = document.querySelector('[data-testid="laser-trail-path"]') as SVGPathElement | null;
    expect(path).not.toBeNull();

    const initialStrokeWidth = path!.getAttribute("stroke-width");
    const initialFill = path!.getAttribute("fill");
    const initialOpacity = path!.getAttribute("opacity") || path!.style.opacity || null;

    act(() => {
      h.app.setAppState({ laserPointerNeon: true });
    });

    act(() => {
      h.app.laserTrails.startPath(20, 20);
    });

    const afterEnableStrokeWidth = path!.getAttribute("stroke-width");
    const afterEnableFill = path!.getAttribute("fill");
    const afterEnableOpacity = path!.getAttribute("opacity") || path!.style.opacity || null;

    expect(afterEnableStrokeWidth).toBe(initialStrokeWidth);
    expect(afterEnableFill).toBe(initialFill);
    expect(afterEnableOpacity).toBe(initialOpacity);

    act(() => {
      h.app.setAppState({ laserPointerNeon: false });
    });


    act(() => {
      h.app.laserTrails.startPath(30, 30);
    });

    const afterDisableStrokeWidth = path!.getAttribute("stroke-width");
    const afterDisableFill = path!.getAttribute("fill");
    const afterDisableOpacity = path!.getAttribute("opacity") || path!.style.opacity || null;

    expect(afterDisableStrokeWidth).toBe(initialStrokeWidth);
    expect(afterDisableFill).toBe(initialFill);
    expect(afterDisableOpacity).toBe(initialOpacity);
  });
});
