import React, { useState } from "react";

import DropdownMenu from "./dropdownMenu/DropdownMenu";
import { laserPointerToolIcon, TrashIcon } from "./icons";

import type { AppClassProperties, UIAppState } from "../types";

type LaserPointerMenuProps = {
  activeTool: UIAppState["activeTool"];
  app: AppClassProperties;
};

export const LaserPointerMenu = ({
  activeTool,
  app,
}: LaserPointerMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLaserActive = activeTool.type === "laser";

  const handleModeSelect = (
    mode: "pointer" | "annotation" | "hold-to-draw",
  ) => {
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
        <DropdownMenu.Item
          data-testid="laser-mode-pointer"
          onSelect={() => handleModeSelect("pointer")}
        >
          Pointer Mode
        </DropdownMenu.Item>
        <DropdownMenu.Item
          data-testid="laser-mode-annotation"
          onSelect={() => handleModeSelect("annotation")}
        >
          Annotation Mode
        </DropdownMenu.Item>
        <DropdownMenu.Item
          data-testid="laser-mode-hold-to-draw"
          onSelect={() => handleModeSelect("hold-to-draw")}
        >
          Hold-to-Draw Mode
        </DropdownMenu.Item>
        {app.state.laserPointerMode === "annotation" && (
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
