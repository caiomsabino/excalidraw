import React from "react";

import { Excalidraw } from "../index";

import { act, render } from "./test-utils";
import { API } from "./helpers/api";

describe("Laser thickness control (TDD cycle 1)", () => {
  const h = window.h as any;

  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("applies a valid thickness value to the laser options", () => {
    act(() => {
      API.setAppState({ laserPointerSize: 5 });
      h.app.setActiveTool({ type: "laser" });
      h.app.laserTrails.startPath(10, 10);
    });

    const size = h.app.laserTrails.localTrail.getCurrentTrail()?.options.size;
    expect(size).toBe(5);
  });

  it("clamps values below 1 to 1", () => {
    act(() => {
        API.setAppState({ laserPointerSize: 0 });
    });

    act(() => {
        h.app.setActiveTool({ type: "laser" });
        h.app.laserTrails.startPath(20, 20);
    });

    const size = h.app.laserTrails.localTrail.getCurrentTrail()?.options.size;
    expect(size).toBe(1);
  });

  it("clamps values above 10 to 10", () => {
    act(() => {
        API.setAppState({ laserPointerSize: 20 });
    });

    act(() => {
        h.app.setActiveTool({ type: "laser" });
        h.app.laserTrails.startPath(30, 30);
    });

    const size = h.app.laserTrails.localTrail.getCurrentTrail()?.options.size;
    expect(size).toBe(10);
    });
});
