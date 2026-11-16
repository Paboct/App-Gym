import { describe, expect, it } from 'vitest';
import { toBase64 } from '../src/lib/shareFile';

describe('toBase64', () => {
  it('codifica bytes conocidos', () => {
    expect(toBase64(new TextEncoder().encode('Hello'))).toBe('SGVsbG8=');
  });

  it('un array vacío da una cadena vacía', () => {
    expect(toBase64(new Uint8Array())).toBe('');
  });

  it('codifica 300 000 bytes sin desbordar la pila y coincide con Buffer', () => {
    const bytes = new Uint8Array(300_000).map((_, i) => i % 251);
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });
});
