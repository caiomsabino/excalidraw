import React from "react";

import { Excalidraw } from "../index";

import { act, render, fireEvent } from "./test-utils";

describe("Laser thickness UI binding (TDD cycle 2)", () => {
  const h = window.h as any;

  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("updates the laser DOM element when changing thickness via UI", () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });

    const trigger = document.querySelector('[data-testid="laser-pointer-menu-trigger"]') as HTMLElement;
    expect(trigger).not.toBeNull();

    act(() => {
      trigger.click();
    });

    const slider = document.querySelector('[data-testid="laser-size-slider"]') as HTMLInputElement | null;
    expect(slider).not.toBeNull();

    act(() => {
      fireEvent.change(slider!, { target: { value: "5" } });
    });

    act(() => {
      h.app.laserTrails.startPath(10, 10);
    });

    const path = document.querySelector('[data-testid="laser-trail-path"]') as SVGPathElement | null;
    expect(path).not.toBeNull();

    const strokeWidth = path!.getAttribute('stroke-width') || path!.style.strokeWidth;
    expect(strokeWidth).toBe("5");
  });
});
