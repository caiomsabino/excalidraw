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
    // Clear annotations logic will be implemented in future cycles
    setIsOpen(false);
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
