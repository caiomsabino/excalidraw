export function applyLaserStyles(
  el: SVGPathElement,
  options: { size?: number; neon?: boolean },
) {
  const sizeVal = options?.size ?? 1;
  if (sizeVal != null) {
    el.setAttribute("stroke-width", String(sizeVal));
    el.style.strokeWidth = `${sizeVal}`;
  }

  const neon = !!options?.neon;
  if (neon) {
    el.classList.add("laser-neon");
    if (!el.style.filter || !el.style.filter.includes("drop-shadow")) {
      // do not alter other style attributes; only add a glow fallback
      el.style.filter = el.style.filter || "drop-shadow(0 0 6px rgba(255,255,255,0.9))";
    }
  } else {
    el.classList.remove("laser-neon");
    if (el.style.filter && el.style.filter.includes("drop-shadow")) {
      // remove only the drop-shadow fallback we add
      el.style.filter = "";
    }
  }
}

export default applyLaserStyles;
