import React, { useState } from "react";

import DropdownMenu from "./dropdownMenu/DropdownMenu";
import { laserPointerToolIcon } from "./icons";

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
        <DropdownMenu.Item data-testid="laser-mode-pointer">
          Pointer Mode
        </DropdownMenu.Item>
        <DropdownMenu.Item data-testid="laser-mode-annotation">
          Annotation Mode
        </DropdownMenu.Item>
        <DropdownMenu.Item data-testid="laser-mode-hold-to-draw">
          Hold-to-Draw Mode
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
