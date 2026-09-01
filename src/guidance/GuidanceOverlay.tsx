import { useEffect, useState } from "react";
import { useAnchorRegistry } from "./AnchorRegistry";

export function GuidanceOverlay({ anchorKey, active }: { anchorKey?: string; active: boolean }) {
  const registry = useAnchorRegistry();
  const [box, setBox] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!active || !anchorKey) {
      setBox(null);
      return;
    }
    const element = registry.get(anchorKey);
    if (!element) {
      setBox(null);
      return;
    }
    const update = () => setBox(element.getBoundingClientRect());
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
  if (!box) return null;
  return (
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
  );
}
