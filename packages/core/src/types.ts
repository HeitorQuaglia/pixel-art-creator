/** Hex color string: #RRGGBB or #RRGGBBAA */
export type Color = string;

export interface PixelDelta {
  x: number;
  y: number;
  oldColor: Color;
  newColor: Color;
}

export interface LayerData {
  name: string;
  visible: boolean;
  opacity: number;
  data: Uint8ClampedArray;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface Palette {
  name: string;
  colors: Color[];
}

export interface MirrorMode {
  horizontal: boolean;
  vertical: boolean;
}

export interface ProjectData {
  version: number;
  width: number;
  height: number;
  layers: {
    name: string;
    visible: boolean;
    opacity: number;
    data: string;
  }[];
  palette: Palette;
  metadata: {
    createdAt: string;
    modifiedAt: string;
  };
}

export interface SpritesheetFrame {
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

export interface SpritesheetData {
  frames: Record<string, SpritesheetFrame>;
  meta: {
    size: { w: number; h: number };
    format: string;
  };
}

export const MAX_CANVAS_SIZE = 4096;
