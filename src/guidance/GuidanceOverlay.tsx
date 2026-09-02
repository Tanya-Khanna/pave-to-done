import { useEffect, useState } from "react";
import type { ActorKind } from "../domain/types";
import { useAnchorRegistry } from "./AnchorRegistry";

interface TargetBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CoachPosition {
  left: number;
  top: number;
  placement: "left" | "right" | "above" | "below";
}

interface GuidanceOverlayProps {
  anchorKey?: string;
  active: boolean;
  title?: string;
  reason?: string;
  actor?: ActorKind;
}

const CARD_WIDTH = 268;
const CARD_HEIGHT = 174;
const GAP = 18;
const VIEWPORT_MARGIN = 12;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function positionCoach(box: TargetBox): CoachPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const roomRight = viewportWidth - (box.left + box.width);
  const roomLeft = box.left;
  const roomBelow = viewportHeight - (box.top + box.height);
  const roomAbove = box.top;

  let placement: CoachPosition["placement"] = "right";
  let left = box.left + box.width + GAP;
  let top = box.top + box.height / 2 - CARD_HEIGHT / 2;

  if (roomRight < CARD_WIDTH + GAP && roomLeft >= CARD_WIDTH + GAP) {
    placement = "left";
    left = box.left - CARD_WIDTH - GAP;
  } else if (roomRight < CARD_WIDTH + GAP && roomBelow >= CARD_HEIGHT + GAP) {
    placement = "below";
    left = box.left + box.width / 2 - CARD_WIDTH / 2;
    top = box.top + box.height + GAP;
  } else if (roomRight < CARD_WIDTH + GAP && roomAbove >= CARD_HEIGHT + GAP) {
    placement = "above";
    left = box.left + box.width / 2 - CARD_WIDTH / 2;
    top = box.top - CARD_HEIGHT - GAP;
  }

  return {
    placement,
    left: clamp(left, VIEWPORT_MARGIN, viewportWidth - CARD_WIDTH - VIEWPORT_MARGIN),
    top: clamp(top, VIEWPORT_MARGIN, viewportHeight - CARD_HEIGHT - VIEWPORT_MARGIN),
  };
}

export function GuidanceOverlay({ anchorKey, active, title, reason, actor }: GuidanceOverlayProps) {
  const registry = useAnchorRegistry();
  const [box, setBox] = useState<TargetBox | null>(null);
  const [coach, setCoach] = useState<CoachPosition | null>(null);
  useEffect(() => {
    if (!active || !anchorKey) {
      setBox(null);
      setCoach(null);
      return;
    }
    const element = registry.get(anchorKey);
    if (!element) {
      setBox(null);
      setCoach(null);
      return;
    }
    const update = () => {
      const bounds = element.getBoundingClientRect();
      const next = {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      };
      setBox(next);
      setCoach(positionCoach(next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, anchorKey, registry]);
  if (!box || !coach) return null;
  const owner = actor === "agent" ? "Agent acts" : "You act";
  return (
    <>
      <div
        className="guidance-spotlight"
        aria-hidden="true"
        style={{
          left: box.left - 7,
          top: box.top - 7,
          width: box.width + 14,
          height: box.height + 14,
        }}
      >
        <span />
      </div>
      <aside
        className="guidance-coach"
        data-placement={coach.placement}
        data-anchor-key={anchorKey}
        role="status"
        aria-live="polite"
        style={{ left: coach.left, top: coach.top }}
      >
        <div className="guidance-coach-kicker">
          <span>CURRENT STEP</span>
          <b>{owner}</b>
        </div>
        <h2>{title ?? "Continue this step"}</h2>
        <dl>
          <div>
            <dt>Why</dt>
            <dd>{reason ?? "This is the next verified step in the journey."}</dd>
          </div>
          <div>
            <dt>Expected</dt>
            <dd>The app verifies the result, records it, and advances the journey.</dd>
          </div>
        </dl>
      </aside>
    </>
  );
}
