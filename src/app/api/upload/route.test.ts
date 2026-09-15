import { describe, expect, it } from 'vitest';
import { magicBytesMatch } from './route';

describe('upload content verification', () => {
  it('accepts genuine PNG/JPEG bytes and rejects HTML relabelled as an image', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(magicBytesMatch(png, 'image/png')).toBe(true);
    const html = Buffer.from('<html><body>x');
    expect(magicBytesMatch(html, 'image/png')).toBe(false);
    expect(magicBytesMatch(png, 'image/jpeg')).toBe(false);
  });
  it('rejects truncated files that are too short to verify', () => {
    expect(magicBytesMatch(Buffer.from([0x89, 0x50]), 'image/png')).toBe(false);
  });
});
