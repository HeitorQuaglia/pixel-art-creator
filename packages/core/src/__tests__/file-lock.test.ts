import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { acquireLock, releaseLock, isLocked } from '../file-lock.js';
import { PixelArtError } from '../errors.js';

function makeTempFile(): string {
  return path.join(os.tmpdir(), `pxart-test-${process.pid}-${Date.now()}.pxart`);
}

describe('acquireLock', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = makeTempFile();
  });

  afterEach(() => {
    // Clean up lock files
    const lockFile = filePath + '.lock';
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  });

  it('creates a .lock file with the current PID', () => {
    acquireLock(filePath);
    const lockFile = filePath + '.lock';
    expect(fs.existsSync(lockFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
    expect(content.pid).toBe(process.pid);
    expect(typeof content.timestamp).toBe('number');
  });

  it('throws FILE_LOCKED if the file is already locked by an active process', () => {
    acquireLock(filePath);
    const tryAcquire = () => acquireLock(filePath);
    expect(tryAcquire).toThrow(PixelArtError);
    let thrown: PixelArtError | undefined;
    try { tryAcquire(); } catch (e) { thrown = e as PixelArtError; }
    expect(thrown?.code).toBe('FILE_LOCKED');
  });

  it('reclaims a stale lock from a dead PID', () => {
    // Write a lock file with a definitely-dead PID
    const lockFile = filePath + '.lock';
    // PID 1 is init/systemd - we can't send signal 0 to it unless we're root.
    // Use a large non-existent PID instead.
    const deadPid = 999999999;
    fs.writeFileSync(lockFile, JSON.stringify({ pid: deadPid, timestamp: Date.now() - 10000 }));

    // Should not throw - stale lock is reclaimed
    expect(() => acquireLock(filePath)).not.toThrow();
    const content = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
    expect(content.pid).toBe(process.pid);
  });
});

describe('releaseLock', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = makeTempFile();
  });

  it('deletes the .lock file', () => {
    acquireLock(filePath);
    expect(fs.existsSync(filePath + '.lock')).toBe(true);
    releaseLock(filePath);
    expect(fs.existsSync(filePath + '.lock')).toBe(false);
  });

  it('does not throw if lock file does not exist', () => {
    expect(() => releaseLock(filePath)).not.toThrow();
  });
});

describe('isLocked', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = makeTempFile();
  });

  afterEach(() => {
    const lockFile = filePath + '.lock';
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  });

  it('returns false when no lock file exists', () => {
    expect(isLocked(filePath)).toBe(false);
  });

  it('returns true when locked by active process (current PID)', () => {
    acquireLock(filePath);
    expect(isLocked(filePath)).toBe(true);
  });

  it('returns false for stale lock from dead PID', () => {
    const lockFile = filePath + '.lock';
    const deadPid = 999999999;
    fs.writeFileSync(lockFile, JSON.stringify({ pid: deadPid, timestamp: Date.now() - 10000 }));
    expect(isLocked(filePath)).toBe(false);
  });
});
