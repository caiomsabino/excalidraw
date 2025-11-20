function expandShortHex(hex: string) {
  return hex
    .slice(1)
    .split("")
    .map((c) => c + c)
    .join("");
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex.startsWith("#")) return null;
  const h = hex.slice(1);
  if (h.length === 3) {
    const full = expandShortHex(hex);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return [r, g, b];
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

function parseRgbString(rgb: string): [number, number, number, number?] | null {
  const m = rgb.match(/rgba?\s*\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(",").map((p) => p.trim());
  if (parts.length < 3) return null;
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts.length >= 4 ? Number(parts[3]) : undefined;
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return [r, g, b, a];
}

export function composeColorWithOpacity(color: string, opacity: number): string {
  if (opacity == null || opacity >= 1) return color;
  if (!color) return `rgba(0,0,0,${opacity})`;

  const s = color.trim();

  // hex
  const hexRgb = hexToRgb(s);
  if (hexRgb) {
    const [r, g, b] = hexRgb;
    return `rgba(${r},${g},${b},${opacity})`;
  }

  // rgb / rgba
  const rgbParsed = parseRgbString(s);
  if (rgbParsed) {
    const [r, g, b, a] = rgbParsed as [number, number, number, number?];
    const finalA = typeof a === "number" ? a * opacity : opacity;
    return `rgba(${r},${g},${b},${finalA})`;
  }

  // fallback: try canvas to resolve named colors to rgb
  try {
    const cvs = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (cvs) {
      const ctx = cvs.getContext("2d");
      if (ctx) {
        ctx.fillStyle = s;
        const computed = ctx.fillStyle as string; // typically rgb(...) or #rrggbb
        const parsed = parseRgbString(computed) || hexToRgb(computed);
        if (parsed) {
          if (Array.isArray(parsed)) {
            const [r, g, b] = parsed as [number, number, number];
            return `rgba(${r},${g},${b},${opacity})`;
          } else {
            const [r, g, b, a] = parsed as [number, number, number, number?];
            const finalA = typeof a === "number" ? a * opacity : opacity;
            return `rgba(${r},${g},${b},${finalA})`;
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // last resort: return original color and let caller handle opacity separately
  return color;
}

export default composeColorWithOpacity;
