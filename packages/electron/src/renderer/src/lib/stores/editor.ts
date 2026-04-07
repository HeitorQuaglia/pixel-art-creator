import { writable, derived } from 'svelte/store';
import { Document, type DrawTool } from '@pixel-art/core';

export const document = writable<Document | null>(null);
export const activeTool = writable<DrawTool>('pencil');
export const foregroundColor = writable('#000000');
export const backgroundColor = writable('#ffffff');
export const zoom = writable(8);
export const gridVisible = writable(true);
export const cursorPosition = writable<{ x: number; y: number } | null>(null);
export const projectPath = writable<string | null>(null);
export const modified = writable(false);

export function newDocument(width: number, height: number): void {
  document.set(new Document(width, height));
  projectPath.set(null);
  modified.set(false);
}

export const activeLayerName = derived(document, ($doc) =>
  $doc ? $doc.layers[$doc.activeLayerIndex]?.name ?? '' : '',
);
