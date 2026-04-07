import type { Session } from '../session.js';

type ToolResult = { content: [{ type: 'text'; text: string }] };

export function handleCreateLayer(
  session: Session,
  args: { name: string; position?: number },
): ToolResult {
  const doc = session.requireDocument();
  doc.addLayer(args.name, args.position);
  return {
    content: [{ type: 'text', text: `Layer "${args.name}" created (${doc.layers.length} total layers)` }],
  };
}

export function handleDeleteLayer(
  session: Session,
  args: { index: number },
): ToolResult {
  const doc = session.requireDocument();
  doc.removeLayer(args.index);
  return {
    content: [{ type: 'text', text: `Layer ${args.index} deleted (${doc.layers.length} total layers)` }],
  };
}

export function handleSetActiveLayer(
  session: Session,
  args: { index: number },
): ToolResult {
  const doc = session.requireDocument();
  if (args.index < 0 || args.index >= doc.layers.length) {
    throw new Error(`Layer index ${args.index} out of range [0, ${doc.layers.length - 1}]`);
  }
  doc.activeLayerIndex = args.index;
  return {
    content: [{ type: 'text', text: `Active layer set to ${args.index} ("${doc.layers[args.index].name}")` }],
  };
}

export function handleSetLayerVisibility(
  session: Session,
  args: { index: number; visible: boolean },
): ToolResult {
  const doc = session.requireDocument();
  if (args.index < 0 || args.index >= doc.layers.length) {
    throw new Error(`Layer index ${args.index} out of range [0, ${doc.layers.length - 1}]`);
  }
  doc.layers[args.index].visible = args.visible;
  return {
    content: [{ type: 'text', text: `Layer ${args.index} visibility set to ${args.visible}` }],
  };
}

export function handleSetLayerOpacity(
  session: Session,
  args: { index: number; opacity: number },
): ToolResult {
  const doc = session.requireDocument();
  if (args.index < 0 || args.index >= doc.layers.length) {
    throw new Error(`Layer index ${args.index} out of range [0, ${doc.layers.length - 1}]`);
  }
  if (args.opacity < 0 || args.opacity > 1) {
    throw new Error(`Opacity must be between 0 and 1, got ${args.opacity}`);
  }
  doc.layers[args.index].opacity = args.opacity;
  return {
    content: [{ type: 'text', text: `Layer ${args.index} opacity set to ${args.opacity}` }],
  };
}

export function handleReorderLayer(
  session: Session,
  args: { from: number; to: number },
): ToolResult {
  const doc = session.requireDocument();
  doc.reorderLayer(args.from, args.to);
  return {
    content: [{ type: 'text', text: `Layer moved from index ${args.from} to ${args.to}` }],
  };
}

export function handleMergeLayers(
  session: Session,
  args: { index: number },
): ToolResult {
  const doc = session.requireDocument();
  doc.mergeLayerDown(args.index);
  return {
    content: [{ type: 'text', text: `Layer ${args.index} merged down (${doc.layers.length} total layers)` }],
  };
}
