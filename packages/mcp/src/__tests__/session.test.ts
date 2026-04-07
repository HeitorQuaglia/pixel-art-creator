import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Session } from '../session.js';
import { PixelArtError, serializeProject } from '@pixel-art/core';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('Session', () => {
  let session: Session;
  const tmpFiles: string[] = [];

  beforeEach(() => {
    session = new Session();
  });

  afterEach(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    tmpFiles.length = 0;
  });

  it('starts with no document', () => {
    expect(session.document).toBeNull();
    expect(session.projectPath).toBeNull();
  });

  describe('createCanvas', () => {
    it('creates a document with specified dimensions', () => {
      session.createCanvas(16, 16);
      expect(session.document).not.toBeNull();
      expect(session.document!.width).toBe(16);
      expect(session.document!.height).toBe(16);
    });

    it('clears projectPath after creation', () => {
      session.projectPath = '/some/path.pxart';
      session.createCanvas(8, 8);
      expect(session.projectPath).toBeNull();
    });

    it('applies palette when specified', () => {
      session.createCanvas(8, 8, 'PICO-8');
      expect(session.document!.palette.name).toBe('PICO-8');
      expect(session.document!.palette.colors).toHaveLength(16);
    });

    it('throws for unknown palette', () => {
      expect(() => session.createCanvas(8, 8, 'NonExistentPalette')).toThrow(PixelArtError);
    });
  });

  describe('requireDocument', () => {
    it('throws when no document', () => {
      const err = (() => { try { session.requireDocument(); } catch (e) { return e; } })();
      expect(err).toBeInstanceOf(PixelArtError);
      expect((err as PixelArtError).code).toBe('INVALID_ARGS');
    });

    it('returns document when set', () => {
      session.createCanvas(4, 4);
      const doc = session.requireDocument();
      expect(doc.width).toBe(4);
    });
  });

  describe('openProject', () => {
    it('throws FILE_NOT_FOUND for non-existent file', () => {
      const err = (() => { try { session.openProject('/nonexistent/file.pxart'); } catch (e) { return e; } })();
      expect(err).toBeInstanceOf(PixelArtError);
      expect((err as PixelArtError).code).toBe('FILE_NOT_FOUND');
    });

    it('loads a valid .pxart file and sets projectPath', () => {
      const tmpPath = path.join(os.tmpdir(), `session-test-${Date.now()}.pxart`);
      tmpFiles.push(tmpPath);

      const s1 = new Session();
      s1.createCanvas(8, 8);
      fs.writeFileSync(tmpPath, serializeProject(s1.document!), 'utf-8');

      session.openProject(tmpPath);
      expect(session.document).not.toBeNull();
      expect(session.document!.width).toBe(8);
      expect(session.projectPath).toBe(tmpPath);
    });
  });
});
