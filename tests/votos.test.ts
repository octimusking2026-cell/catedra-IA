import { describe, it, expect } from 'vitest';
import { calculateResolutionStatus, getVotoDocId } from '../server/db/votos';

describe('Votos Logic and Status Transitions', () => {
  it('should generate compound document ID correctly', () => {
    expect(getVotoDocId('res_123', 'user_abc')).toBe('res_123_user_abc');
  });

  it('should return sin_verificar when there are no votes', () => {
    expect(calculateResolutionStatus(0, 0)).toBe('sin_verificar');
  });

  it('should return sin_verificar when positive votes are fewer than 3', () => {
    expect(calculateResolutionStatus(1, 0)).toBe('sin_verificar');
    expect(calculateResolutionStatus(2, 0)).toBe('sin_verificar');
  });

  it('should return verificada when net positive votes are 3 or greater', () => {
    expect(calculateResolutionStatus(3, 0)).toBe('verificada');
    expect(calculateResolutionStatus(5, 1)).toBe('verificada');
    expect(calculateResolutionStatus(10, 2)).toBe('verificada');
  });

  it('should return en_revision when negative votes are at least 2 and exceed positive votes', () => {
    expect(calculateResolutionStatus(0, 2)).toBe('en_revision');
    expect(calculateResolutionStatus(1, 2)).toBe('en_revision');
    expect(calculateResolutionStatus(1, 3)).toBe('en_revision');
  });

  it('should return sin_verificar when positive and negative votes are tied or below threshold', () => {
    expect(calculateResolutionStatus(2, 2)).toBe('sin_verificar');
    expect(calculateResolutionStatus(1, 1)).toBe('sin_verificar');
    expect(calculateResolutionStatus(0, 1)).toBe('sin_verificar');
  });
});
