import { LaserPointer } from "@excalidraw/laser-pointer";

import {
  SVG_NS,
  getSvgPathFromStroke,
  sceneCoordsToViewportCoords,
} from "@excalidraw/common";

import type { LaserPointerOptions } from "@excalidraw/laser-pointer";

import type { AnimationFrameHandler } from "./animation-frame-handler";
import type App from "./components/App";
import type { AppState } from "./types";
import { applyLaserStyles } from "./laserStyles";
import { composeColorWithOpacity } from "./colorUtils";

export interface Trail {
  start(container: SVGSVGElement): void;
  stop(): void;

  startPath(x: number, y: number): void;
  addPointToPath(x: number, y: number): void;
  endPath(): void;
}

export interface AnimatedTrailOptions {
  fill: (trail: AnimatedTrail) => string;
  stroke?: (trail: AnimatedTrail) => string;
  animateTrail?: boolean;
  decayDuration?: number;
}

export class AnimatedTrail implements Trail {
  private currentTrail?: LaserPointer;
  private pastTrails: LaserPointer[] = [];
  private clearHistory: Array<{ trails: LaserPointer[]; timestamp: number }> = [];
  private readonly MAX_CLEAR_HISTORY = 10;
  private readonly CLEAR_CONFIRM_THRESHOLD = 5;

  private container?: SVGSVGElement;
  private trailElement: SVGPathElement;
  private trailAnimation?: SVGAnimateElement;

  private clampSize(size?: number): number {
    const MIN_SIZE = 1;
    const MAX_SIZE = 10;
    const DEFAULT_SIZE = 5;
    return Math.max(MIN_SIZE, Math.min(MAX_SIZE, size ?? DEFAULT_SIZE));
  }

  private clampDecayDuration(duration?: number): number {
    const MIN_DECAY = 50;
    const MAX_DECAY = 5000;
    const DEFAULT_DECAY = 1000;
    return Math.max(MIN_DECAY, Math.min(MAX_DECAY, duration ?? DEFAULT_DECAY));
  }

  getOpacityFactor(trail?: LaserPointer): number {
    if (!trail || !(trail as any).createdAt) {
      return 1;
    }

    const decayDuration = this.clampDecayDuration((this.options as any)?.decayDuration);
    const elapsed = performance.now() - (trail as any).createdAt;
    const progress = Math.min(1, elapsed / decayDuration);

    // Ease-out: 1 - progress^2 for smoother fade
    return Math.max(0, 1 - progress * progress);
  }

  constructor(
    private animationFrameHandler: AnimationFrameHandler,
    protected app: App,
    private options: Partial<LaserPointerOptions> &
      Partial<AnimatedTrailOptions>,
  ) {
    this.animationFrameHandler.register(this, this.onFrame.bind(this));

    // Clamp size on initialization
    if (this.options.size !== undefined) {
      this.options.size = this.clampSize(this.options.size);
    }

    // Clamp decay duration on initialization
    if (this.options.decayDuration !== undefined) {
      this.options.decayDuration = this.clampDecayDuration(
        this.options.decayDuration,
      );
    }

    this.trailElement = document.createElementNS(SVG_NS, "path");
    // mark the trail element so tests and tools can select it reliably
    this.trailElement.setAttribute("data-testid", "laser-trail-path");
    if (this.options.animateTrail) {
      this.trailAnimation = document.createElementNS(SVG_NS, "animate");
      // TODO: make this configurable
      this.trailAnimation.setAttribute("attributeName", "stroke-dashoffset");
      this.trailElement.setAttribute("stroke-dasharray", "7 7");
      this.trailElement.setAttribute("stroke-dashoffset", "10");
      this.trailAnimation.setAttribute("from", "0");
      this.trailAnimation.setAttribute("to", `-14`);
      this.trailAnimation.setAttribute("dur", "0.3s");
      this.trailElement.appendChild(this.trailAnimation);
    }
  }

  get hasCurrentTrail() {
    return !!this.currentTrail;
  }

  hasLastPoint(x: number, y: number) {
    if (this.currentTrail) {
      const len = this.currentTrail.originalPoints.length;
      return (
        this.currentTrail.originalPoints[len - 1][0] === x &&
        this.currentTrail.originalPoints[len - 1][1] === y
      );
    }

    return false;
  }

  start(container?: SVGSVGElement) {
    if (container) {
      this.container = container;
    }

    if (this.trailElement.parentNode !== this.container && this.container) {
      this.container.appendChild(this.trailElement);
    }

    this.animationFrameHandler.start(this);
  }

  stop() {
    this.animationFrameHandler.stop(this);

    if (this.trailElement.parentNode === this.container) {
      this.container?.removeChild(this.trailElement);
    }
  }

  startPath(x: number, y: number) {
    this.currentTrail = new LaserPointer(this.options);

    this.currentTrail.addPoint([x, y, performance.now()]);

    // apply standard laser visual styles (size + neon) without touching
    // fill/stroke/opacity attributes.
    applyLaserStyles(this.trailElement, {
      size: (this.options as any)?.size,
      neon: (this.options as any)?.neon,
    });

    // Apply fill/stroke synchronously so tests and consumers can read
    // the color immediately after startPath without waiting for frame.
    try {
      if (this.trailAnimation) {
        const baseFill = (this.options.fill ?? (() => "black"))(this);
        const baseStroke = (this.options.stroke ?? (() => "black"))(this);
        const op = (this.options as any)?.opacity;
        if (op != null) {
          this.trailElement.setAttribute("fill", composeColorWithOpacity(baseFill, op));
          this.trailElement.setAttribute("stroke", composeColorWithOpacity(baseStroke, op));
        } else {
          this.trailElement.setAttribute("fill", baseFill);
          this.trailElement.setAttribute("stroke", baseStroke);
        }
      } else {
        const baseFill = (this.options.fill ?? (() => "black"))(this);
        const op = (this.options as any)?.opacity;
        if (op != null) {
          this.trailElement.setAttribute("fill", composeColorWithOpacity(baseFill, op));
          // ensure stroke exists so stroke-opacity is meaningful (we now embed alpha into stroke)
          const baseStroke = (this.options.stroke ?? (() => baseFill))(this);
          this.trailElement.setAttribute("stroke", composeColorWithOpacity(baseStroke, op));
        } else {
          this.trailElement.setAttribute("fill", baseFill);
        }
      }
    } catch (e) {
      // defensive: if option functions throw, don't break startPath
      // leave attributes untouched and let onFrame apply them later
      // (this preserves previous behavior in edge cases)
      // eslint-disable-next-line no-console
      console.warn("AnimatedTrail: failed to apply fill/stroke synchronously", e);
    }

    this.update();
  }

  addPointToPath(x: number, y: number) {
    if (this.currentTrail) {
      // In Pointer Mode, don't add points to the trail - just keep the initial point
      const mode = (this.options as any)?.laserPointerMode;
      if (mode !== "pointer") {
        this.currentTrail.addPoint([x, y, performance.now()]);
        this.update();
      }
    }
  }

  endPath() {
    if (this.currentTrail) {
      this.currentTrail.close();
      this.currentTrail.options.keepHead = false;
      this.pastTrails.push(this.currentTrail);
      this.currentTrail = undefined;
      this.update();
    }
  }

  getCurrentTrail() {
    return this.currentTrail;
  }

  clearTrails(force?: boolean) {
    // Store in history only if there are actual trails to clear
    if (this.pastTrails.length > 0 || this.currentTrail) {
      this.clearHistory.push({
        trails: [...this.pastTrails, ...(this.currentTrail ? [this.currentTrail] : [])],
        timestamp: performance.now(),
      });

      // Limit history to prevent memory bloat
      if (this.clearHistory.length > this.MAX_CLEAR_HISTORY) {
        this.clearHistory.shift();
      }
    }

    this.pastTrails = [];
    this.currentTrail = undefined;

    // Clear the trail element's SVG path
    if (this.trailElement) {
      this.trailElement.setAttribute("d", "");
    }

    this.update();
  }

  undoClear() {
    if (this.clearHistory.length === 0) {
      return;
    }

    const lastClear = this.clearHistory.pop();
    if (lastClear) {
      this.pastTrails = lastClear.trails;
      this.update();
    }
  }

  getClearHistory() {
    return this.clearHistory.map((entry) => ({
      timestamp: entry.timestamp,
      trailCount: entry.trails.length,
    }));
  }

  hasClearHistory() {
    return this.clearHistory.length > 0;
  }

  requiresClearConfirmation() {
    const totalTrails = this.pastTrails.length + (this.currentTrail ? 1 : 0);
    return totalTrails >= this.CLEAR_CONFIRM_THRESHOLD;
  }

  // Public method for testing: manually trigger frame rendering
  render() {
    (this as any).onFrame();
  }

  // Allow callers to update runtime options (e.g. size) before creating a
  // new LaserPointer so changes in app state are applied immediately.
  updateOptions(options: Partial<LaserPointerOptions> & Partial<AnimatedTrailOptions>) {
    const clampedOptions = { ...options };
    if (clampedOptions.size !== undefined) {
      clampedOptions.size = this.clampSize(clampedOptions.size);
    }
    if (clampedOptions.decayDuration !== undefined) {
      clampedOptions.decayDuration = this.clampDecayDuration(
        clampedOptions.decayDuration,
      );
    }
    this.options = {
      ...(this.options ?? {}),
      ...(clampedOptions ?? {}),
    };
    // Update the current trail options if it exists
    if (this.currentTrail) {
      this.currentTrail.options = {
        ...this.currentTrail.options,
        ...clampedOptions,
      };
    }
  }

  private update() {
    this.start();
    if (this.trailAnimation) {
      this.trailAnimation.setAttribute("begin", "indefinite");
      this.trailAnimation.setAttribute("repeatCount", "indefinite");
    }
  }

  private onFrame() {
    const paths: string[] = [];

    for (const trail of this.pastTrails) {
      paths.push(this.drawTrail(trail, this.app.state));
    }

    if (this.currentTrail) {
      const currentPath = this.drawTrail(this.currentTrail, this.app.state);

      paths.push(currentPath);
    }

    this.pastTrails = this.pastTrails.filter((trail) => {
      return trail.getStrokeOutline().length !== 0;
    });

    if (paths.length === 0) {
      this.stop();
    }

    const svgPaths = paths.join(" ").trim();

    this.trailElement.setAttribute("d", svgPaths);
    // Apply standard laser visual styles (size + neon) without touching
    // fill/stroke/opacity attributes.
    applyLaserStyles(this.trailElement, {
      size: (this.options as any)?.size,
      neon: (this.options as any)?.neon,
    });
        if (this.trailAnimation) {
          const baseFill = (this.options.fill ?? (() => "black"))(this);
          const baseStroke = (this.options.stroke ?? (() => "black"))(this);
          const op = (this.options as any)?.opacity;
          if (op != null) {
            this.trailElement.setAttribute("fill", composeColorWithOpacity(baseFill, op));
            this.trailElement.setAttribute("stroke", composeColorWithOpacity(baseStroke, op));
          } else {
            this.trailElement.setAttribute("fill", baseFill);
            this.trailElement.setAttribute("stroke", baseStroke);
          }
        } else {
          const baseFill = (this.options.fill ?? (() => "black"))(this);
          const op = (this.options as any)?.opacity;
          if (op != null) {
            this.trailElement.setAttribute("fill", composeColorWithOpacity(baseFill, op));
            // ensure stroke exists so stroke-opacity is meaningful (we now embed alpha into stroke)
            const baseStroke = (this.options.stroke ?? (() => baseFill))(this);
            this.trailElement.setAttribute("stroke", composeColorWithOpacity(baseStroke, op));
          } else {
            this.trailElement.setAttribute("fill", baseFill);
          }
        }
  }

  private drawTrail(trail: LaserPointer, state: AppState): string {
    const _stroke = trail
      .getStrokeOutline(trail.options.size / state.zoom.value)
      .map(([x, y]) => {
        const result = sceneCoordsToViewportCoords(
          { sceneX: x, sceneY: y },
          state,
        );

        return [result.x, result.y];
      });

    const stroke = this.trailAnimation
      ? _stroke.slice(0, _stroke.length / 2)
      : _stroke;

    return getSvgPathFromStroke(stroke, true);
  }
}
