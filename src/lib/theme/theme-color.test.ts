import { describe, expect, it } from 'vitest';
import { hslTokenToHex } from './theme-color';

describe('hslTokenToHex', () => {
  it('converts shadcn HSL tokens to hex', () => {
    expect(hslTokenToHex('0 0% 100%')).toBe('#ffffff');
    expect(hslTokenToHex('0 0% 0%')).toBe('#000000');
    expect(hslTokenToHex('0 100% 50%')).toBe('#ff0000');
    expect(hslTokenToHex('47 47% 96%')).toBe('#faf8f0');
    expect(hslTokenToHex(' 240 10% 4% ')).toBe('#09090b');
  });

  it('rejects values that are not an HSL token', () => {
    expect(hslTokenToHex('')).toBeNull();
    expect(hslTokenToHex('#fff')).toBeNull();
    expect(hslTokenToHex('hsl(0 0% 100%)')).toBeNull();
  });
});
