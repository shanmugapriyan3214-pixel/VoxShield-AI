import { describe, it, expect } from 'vitest';
import { ThreatSeverity } from '../types/call';

export function calculateSeverity(score: number): ThreatSeverity {
  if (score >= 75.0) return 'CRITICAL';
  if (score >= 50.0) return 'HIGH';
  if (score >= 25.0) return 'MEDIUM';
  return 'LOW';
}

export function getRecommendedAction(severity: ThreatSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'RECOMMEND_TERMINATION';
    case 'HIGH':
      return 'REQUIRE_VERIFICATION';
    case 'MEDIUM':
      return 'DISPLAY_ADVISORY';
    case 'LOW':
    default:
      return 'CONTINUE_NORMAL';
  }
}

describe('Threat Score Evaluation & Thresholds', () => {
  it('correctly maps scores 0-24.9 to LOW and CONTINUE_NORMAL', () => {
    expect(calculateSeverity(0)).toBe('LOW');
    expect(calculateSeverity(12.5)).toBe('LOW');
    expect(calculateSeverity(24.9)).toBe('LOW');
    expect(getRecommendedAction('LOW')).toBe('CONTINUE_NORMAL');
  });

  it('correctly maps scores 25-49.9 to MEDIUM and DISPLAY_ADVISORY', () => {
    expect(calculateSeverity(25.0)).toBe('MEDIUM');
    expect(calculateSeverity(38.2)).toBe('MEDIUM');
    expect(calculateSeverity(49.9)).toBe('MEDIUM');
    expect(getRecommendedAction('MEDIUM')).toBe('DISPLAY_ADVISORY');
  });

  it('correctly maps scores 50-74.9 to HIGH and REQUIRE_VERIFICATION', () => {
    expect(calculateSeverity(50.0)).toBe('HIGH');
    expect(calculateSeverity(64.5)).toBe('HIGH');
    expect(calculateSeverity(74.9)).toBe('HIGH');
    expect(getRecommendedAction('HIGH')).toBe('REQUIRE_VERIFICATION');
  });

  it('correctly maps scores 75-100 to CRITICAL and RECOMMEND_TERMINATION', () => {
    expect(calculateSeverity(75.0)).toBe('CRITICAL');
    expect(calculateSeverity(88.4)).toBe('CRITICAL');
    expect(calculateSeverity(100.0)).toBe('CRITICAL');
    expect(getRecommendedAction('CRITICAL')).toBe('RECOMMEND_TERMINATION');
  });
});
