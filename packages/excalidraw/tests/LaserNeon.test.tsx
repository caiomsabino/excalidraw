import React from "react";

import { Excalidraw } from "../index";

import { act, render, fireEvent } from "./test-utils";

describe("Laser neon toggle (TDD cycle 3)", () => {
  const h = window.h as any;

  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("adds neon styles when enabled and removes when disabled", () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });

    const trigger = document.querySelector('[data-testid="laser-pointer-menu-trigger"]') as HTMLElement;
    expect(trigger).not.toBeNull();

    act(() => {
      trigger.click();
    });

    const toggle = document.querySelector('[data-testid="laser-neon-toggle"]') as HTMLInputElement | null;
    expect(toggle).not.toBeNull();

    // enable neon
    act(() => {
      fireEvent.click(toggle!);
    });

    act(() => {
      h.app.laserTrails.startPath(10, 10);
    });

    const path = document.querySelector('[data-testid="laser-trail-path"]') as SVGPathElement | null;
    expect(path).not.toBeNull();

    // should have neon class or neon style applied
    const hasClass = path!.classList.contains("laser-neon");
    const hasFilter = (path!.getAttribute("style") || "").includes("drop-shadow") || !!path!.getAttribute("filter");

    expect(hasClass || hasFilter).toBe(true);

    // disable neon
    act(() => {
      fireEvent.click(toggle!);
    });

    // start a new path to ensure update
    act(() => {
      h.app.laserTrails.startPath(20, 20);
    });

    const hasClassAfter = path!.classList.contains("laser-neon");
    const hasFilterAfter = (path!.getAttribute("style") || "").includes("drop-shadow") || !!path!.getAttribute("filter");

    expect(hasClassAfter || hasFilterAfter).toBe(false);
  });
});
