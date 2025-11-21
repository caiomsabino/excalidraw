import React, { useState } from "react";

import DropdownMenu from "./dropdownMenu/DropdownMenu";
import { laserPointerToolIcon, TrashIcon } from "./icons";

import type { AppClassProperties, UIAppState } from "../types";

type LaserMode = "pointer" | "annotation" | "hold-to-draw";

type LaserPointerMenuProps = {
  activeTool: UIAppState["activeTool"];
  app: AppClassProperties;
};

const MENU_ITEMS = [
  {
    mode: "pointer" as const,
    label: "Pointer Mode",
    testId: "laser-mode-pointer",
  },
  {
    mode: "annotation" as const,
    label: "Annotation Mode",
    testId: "laser-mode-annotation",
  },
  {
    mode: "hold-to-draw" as const,
    label: "Hold-to-Draw Mode",
    testId: "laser-mode-hold-to-draw",
  },
] as const;

export const LaserPointerMenu = ({
  activeTool,
  app,
}: LaserPointerMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLaserActive = activeTool.type === "laser";
  const currentMode = app.state.laserPointerMode;
  const showClearButton = currentMode === "annotation";

  const handleModeSelect = (mode: LaserMode) => {
    app.setAppState({ laserPointerMode: mode });
    setIsOpen(false);
  };

  const handleClearAnnotations = () => {
    // Connect to LaserTrails system that's already integrated in App.tsx
    if ((app as any).laserTrails) {
      (app as any).laserTrails.clearAllTrails();
    }
    setIsOpen(false);
  };

  const handleSizeChange = (value: number) => {
    // clamp to 1..10 minimal logic
    const clamped = Math.max(1, Math.min(10, value));
    app.setAppState({ laserPointerSize: clamped });
  };

  const handleNeonToggle = () => {
    const current = !!(app.state as any).laserPointerNeon;
    app.setAppState({ laserPointerNeon: !current });
  };

  const handleColorChange = (color: string) => {
    app.setAppState({ laserPointerColor: color });
  };

  const handleOpacityChange = (opacity: number) => {
    const clamped = Math.max(0, Math.min(1, opacity));
    app.setAppState({ laserPointerOpacity: clamped });
  };

  if (!isLaserActive) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen}>
      <DropdownMenu.Trigger
        onToggle={() => setIsOpen(!isOpen)}
        data-testid="laser-pointer-menu-trigger"
      >
        {laserPointerToolIcon}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        onClickOutside={() => setIsOpen(false)}
        onSelect={() => setIsOpen(false)}
        data-testid="laser-pointer-dropdown"
      >
        <div style={{ padding: 8 }}>
          <label htmlFor="laser-size-slider">Thickness</label>
          <input
            id="laser-size-slider"
            data-testid="laser-size-slider"
            type="range"
            min={1}
            max={10}
            defaultValue={(app.state as any).laserPointerSize ?? 5}
            onChange={(e) => handleSizeChange(Number((e.target as HTMLInputElement).value))}
          />
          <input
            data-testid="laser-size-input"
            type="number"
            min={1}
            max={10}
            defaultValue={(app.state as any).laserPointerSize ?? 5}
            onChange={(e) => handleSizeChange(Number((e.target as HTMLInputElement).value))}
            style={{ width: 40, marginLeft: 8 }}
          />
          <div style={{ marginTop: 8 }}>
            <label htmlFor="laser-neon-toggle" style={{ marginRight: 8 }}>Neon</label>
            <input
              id="laser-neon-toggle"
              data-testid="laser-neon-toggle"
              type="checkbox"
              defaultChecked={!!(app.state as any).laserPointerNeon}
              onChange={() => handleNeonToggle()}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label htmlFor="laser-color-picker">Color</label>
            <input
              id="laser-color-picker"
              data-testid="laser-color-picker"
              type="color"
              defaultValue={app.state.laserPointerColor || "#FF0000"}
              onChange={(e) => handleColorChange(e.target.value)}
              style={{ width: 40, marginLeft: 8 }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label htmlFor="laser-opacity-slider">Opacity</label>
            <input
              id="laser-opacity-slider"
              data-testid="laser-opacity-slider"
              type="range"
              min={0}
              max={1}
              step={0.1}
              defaultValue={(app.state as any).laserPointerOpacity ?? 1}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
            />
            <span style={{ marginLeft: 8 }}>{Math.round(((app.state as any).laserPointerOpacity ?? 1) * 100)}%</span>
          </div>
        </div>
        {MENU_ITEMS.map(({ mode, label, testId }) => (
          <DropdownMenu.Item
            key={mode}
            data-testid={testId}
            onSelect={() => handleModeSelect(mode)}
          >
            {label}
          </DropdownMenu.Item>
        ))}
        {showClearButton && (
          <DropdownMenu.Item
            data-testid="laser-clear-annotations"
            onSelect={handleClearAnnotations}
            icon={TrashIcon}
          >
            Clear Annotations
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
