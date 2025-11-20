import { DEFAULT_LASER_COLOR, easeOut } from "@excalidraw/common";

import type { LaserPointerOptions } from "@excalidraw/laser-pointer";

import { AnimatedTrail } from "./animated-trail";
import type { AnimatedTrailOptions } from "./animated-trail";
import { getClientColor } from "./clients";

import type { Trail } from "./animated-trail";
import type { AnimationFrameHandler } from "./animation-frame-handler";
import type App from "./components/App";
import type { SocketId } from "./types";

export class LaserTrails implements Trail {
  public localTrail: AnimatedTrail;
  private collabTrails = new Map<SocketId, AnimatedTrail>();

  private container?: SVGSVGElement;

  constructor(
    private animationFrameHandler: AnimationFrameHandler,
    private app: App,
  ) {
    this.animationFrameHandler.register(this, this.onFrame.bind(this));

    this.localTrail = new AnimatedTrail(animationFrameHandler, app, {
      ...this.getTrailOptions(),
    });
  }

  private getTrailOptions(): Partial<LaserPointerOptions> & Partial<AnimatedTrailOptions> {
    const rawSize = this.app?.state?.laserPointerSize;
    const size = this.clampLaserSize(rawSize);
    const neon = !!(this.app?.state as any)?.laserPointerNeon;

    const colorState = (this.app?.state as any)?.laserPointerColor;
    console.debug(
      "laserPointerSize raw:",
      rawSize,
      "clamped:",
      size,
      "neon:",
      neon,
      "color:",
      colorState,
    );

    const DECAY_TIME = 1000;
    const DECAY_LENGTH = 50;

    const calcTimeFactor = (pressure: number) =>
      Math.max(0, 1 - (performance.now() - pressure) / DECAY_TIME);

    const calcLengthFactor = (totalLength: number, currentIndex: number) =>
      (DECAY_LENGTH - Math.min(DECAY_LENGTH, totalLength - currentIndex)) / DECAY_LENGTH;

    return {
      simplify: 0,
      streamline: 0.4,
      size,
      fill: () => (this.app?.state?.laserPointerColor as string) || DEFAULT_LASER_COLOR,
      neon,
      sizeMapping: (c: any) => {
        const t = calcTimeFactor(c.pressure);
        const l = calcLengthFactor(c.totalLength, c.currentIndex);
        return Math.min(easeOut(l), easeOut(t));
      },
    } as Partial<LaserPointerOptions & AnimatedTrailOptions>;
  }

  clampLaserSize(value?: number): number {
    const defaultSize = 5;
    const min = 1;
    const max = 10;
    return Math.max(min, Math.min(max, value ?? defaultSize));
  }

  startPath(x: number, y: number): void {
    // Atualiza opções da trilha local antes de iniciar o path
    this.localTrail.updateOptions({
      ...this.getTrailOptions(),
    });
    this.localTrail.startPath(x, y);
  }

  addPointToPath(x: number, y: number): void {
    this.localTrail.addPointToPath(x, y);
  }

  endPath(): void {
    this.localTrail.endPath();
  }

  start(container: SVGSVGElement) {
    this.container = container;

    this.animationFrameHandler.start(this);
    this.localTrail.start(container);
  }

  stop() {
    this.animationFrameHandler.stop(this);
    this.localTrail.stop();
  }

  onFrame() {
    this.updateCollabTrails();
  }

  private updateCollabTrails() {
    if (!this.container || this.app.state.collaborators.size === 0) {
      return;
    }

    for (const [key, collaborator] of this.app.state.collaborators.entries()) {
      let trail!: AnimatedTrail;

      if (!this.collabTrails.has(key)) {
        trail = new AnimatedTrail(this.animationFrameHandler, this.app, {
          ...this.getTrailOptions(),
          fill: () =>
            collaborator.pointer?.laserColor ||
            getClientColor(key, collaborator),
        });
        trail.start(this.container);

        this.collabTrails.set(key, trail);
      } else {
        trail = this.collabTrails.get(key)!;

        trail.updateOptions({
          ...this.getTrailOptions(),
          fill: () =>
            collaborator.pointer?.laserColor ||
            getClientColor(key, collaborator),
        });
      }

      if (collaborator.pointer && collaborator.pointer.tool === "laser") {
        if (collaborator.button === "down" && !trail.hasCurrentTrail) {
          trail.startPath(collaborator.pointer.x, collaborator.pointer.y);
        }

        if (
          collaborator.button === "down" &&
          trail.hasCurrentTrail &&
          !trail.hasLastPoint(collaborator.pointer.x, collaborator.pointer.y)
        ) {
          trail.addPointToPath(collaborator.pointer.x, collaborator.pointer.y);
        }

        if (collaborator.button === "up" && trail.hasCurrentTrail) {
          trail.addPointToPath(collaborator.pointer.x, collaborator.pointer.y);
          trail.endPath();
        }
      }
    }

    for (const key of this.collabTrails.keys()) {
      if (!this.app.state.collaborators.has(key)) {
        const trail = this.collabTrails.get(key)!;
        trail.stop();
        this.collabTrails.delete(key);
      }
    }
  }
}


