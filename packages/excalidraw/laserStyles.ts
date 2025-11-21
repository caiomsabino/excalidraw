export function applyLaserStyles(
  el: SVGPathElement,
  options: { size?: number; neon?: boolean; color?: string },
) {
  const sizeVal = options?.size ?? 1;
  if (sizeVal != null) {
    el.setAttribute("stroke-width", String(sizeVal));
    el.style.strokeWidth = `${sizeVal}`;
  }

  const neon = !!options?.neon;
  if (neon) {
    el.classList.add("laser-neon");
    // Set CSS variable for neon glow effect
    if (options.color) {
      el.style.setProperty("--laser-color", options.color);
    }
  } else {
    el.classList.remove("laser-neon");
    // Clear any inline filters and CSS variables
    el.style.filter = "";
    el.style.removeProperty("--laser-color");
  }
}

export default applyLaserStyles;
