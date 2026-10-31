declare module "@/components/GradientASCII" {
  import type { CSSProperties, ComponentType } from "react";

  type GradientASCIIProps = {
    colors?: string[];
    shape?: "horizon" | "pinch" | "rise" | "eclipse";
    characters?: string;
    cellSize?: number;
    density?: number;
    glyphOpacity?: number;
    gradientOpacity?: number;
    glow?: number;
    depthOfField?: number;
    flicker?: number;
    softness?: number;
    scale?: number;
    flow?: number;
    speed?: number;
    grain?: number;
    variation?: number;
    mouseInteraction?: boolean;
    scrambleRadius?: number;
    clickEffect?: "wave" | "burst" | "none";
    intro?: boolean;
    lightMode?: boolean;
    fontFamily?: string;
    dpr?: number;
    className?: string;
    style?: CSSProperties;
  };

  const GradientASCII: ComponentType<GradientASCIIProps>;
  export default GradientASCII;
}
