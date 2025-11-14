import React from "react";

import { Excalidraw } from "../index";

import { act, fireEvent, render, waitFor } from "./test-utils";

describe("LaserPointerMenu", () => {
  const h = window.h;
  let container: HTMLElement;

  beforeEach(async () => {
    const renderResult = await render(<Excalidraw />);
    container = renderResult.container;
  });

  it("should show menu when laser tool is active", () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });
    expect(h.state.activeTool.type).toBe("laser");

    const laserMenu = container.querySelector(
      '[data-testid="laser-pointer-menu-trigger"]',
    );
    expect(laserMenu).toBeInTheDocument();
  });

  it("should hide menu when laser tool is inactive", () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });

    let laserMenu = container.querySelector(
      '[data-testid="laser-pointer-menu-trigger"]',
    );
    expect(laserMenu).toBeInTheDocument();

    act(() => {
      h.app.setActiveTool({ type: "rectangle" });
    });
    expect(h.state.activeTool.type).toBe("rectangle");

    laserMenu = container.querySelector(
      '[data-testid="laser-pointer-menu-trigger"]',
    );
    expect(laserMenu).not.toBeInTheDocument();
  });

  it("should display all three mode options when opened", async () => {
    act(() => {
      h.app.setActiveTool({ type: "laser" });
    });

    const laserMenu = container.querySelector(
      '[data-testid="laser-pointer-menu-trigger"]',
    );
    expect(laserMenu).toBeInTheDocument();

    fireEvent.click(laserMenu!);

    await waitFor(() => {
      const pointerMode = container.querySelector(
        '[data-testid="laser-mode-pointer"]',
      );
      const annotationMode = container.querySelector(
        '[data-testid="laser-mode-annotation"]',
      );
      const holdToDrawMode = container.querySelector(
        '[data-testid="laser-mode-hold-to-draw"]',
      );

      expect(pointerMode).toBeInTheDocument();
      expect(annotationMode).toBeInTheDocument();
      expect(holdToDrawMode).toBeInTheDocument();
    });
  });
});
