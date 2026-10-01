import { describe, it, expect } from 'vitest';
import { checkRateLimit, getTodayArgentinaString } from '../server/services/quotaService';

describe('Quota and Rate Limiting Service', () => {
  it('should generate Argentina date string in YYYY-MM-DD format', () => {
    const today = getTodayArgentinaString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should allow requests within rate limit window', () => {
    const key = `test_rate_${Date.now()}`;
    expect(checkRateLimit(key, 5, 5000)).toBe(true);
    expect(checkRateLimit(key, 5, 5000)).toBe(true);
    expect(checkRateLimit(key, 5, 5000)).toBe(true);
  });

  it('should block requests exceeding rate limit threshold', () => {
    const key = `test_rate_block_${Date.now()}`;
    expect(checkRateLimit(key, 2, 5000)).toBe(true);
    expect(checkRateLimit(key, 2, 5000)).toBe(true);
    expect(checkRateLimit(key, 2, 5000)).toBe(false);
  });

  it('should compute remaining fair quota accurately', () => {
    const computeRemaining = (limit: number, used: number) => Math.max(0, limit - used);
    expect(computeRemaining(50, 0)).toBe(50);
    expect(computeRemaining(50, 10)).toBe(40);
    expect(computeRemaining(50, 50)).toBe(0);
    expect(computeRemaining(50, 55)).toBe(0);
  });
});
