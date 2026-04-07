import { getPresetPalette, isValidPalette, PixelArtError } from '@pixel-art/core';
import type { Session } from '../session.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

export function handleSetPalette(
  session: Session,
  args: { name?: string; colors?: string[] },
): ToolResult {
  const doc = session.requireDocument();

  if (args.name) {
    doc.palette = getPresetPalette(args.name);
    return {
      content: [{ type: 'text', text: `Palette set to preset "${args.name}" (${doc.palette.colors.length} colors)` }],
    };
  }

  if (args.colors) {
    const customPalette = { name: 'Custom', colors: args.colors };
    if (!isValidPalette(customPalette)) {
      throw new PixelArtError('INVALID_ARGS', 'Invalid palette: colors must be valid hex strings (#RRGGBB or #RRGGBBAA)');
    }
    doc.palette = customPalette;
    return {
      content: [{ type: 'text', text: `Custom palette set with ${args.colors.length} colors` }],
    };
  }

  throw new PixelArtError('INVALID_ARGS', 'Must provide either name or colors');
}
