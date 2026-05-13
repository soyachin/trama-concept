import type { ReactNode } from "react";

interface OverlayLayerProps {
  children: ReactNode;
}

export function OverlayLayer({ children }: OverlayLayerProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}
