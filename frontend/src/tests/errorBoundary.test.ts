import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

describe('Phase 6 — Frontend Error Boundary Hardening', () => {
  it('derives error state cleanly from caught Error instances', () => {
    const testError = new Error('Subsystem fault in streaming analyzer');
    const state = ErrorBoundary.getDerivedStateFromError(testError);

    expect(state.hasError).toBe(true);
    expect(state.errorMessage).toBe('Subsystem fault in streaming analyzer');
  });

  it('handles fallback error message for non-standard error types', () => {
    const fallbackState = ErrorBoundary.getDerivedStateFromError(null as any);

    expect(fallbackState.hasError).toBe(true);
    expect(fallbackState.errorMessage).toBe('An unexpected rendering error occurred.');
  });

  it('initializes default clean state', () => {
    const boundary = new ErrorBoundary({ children: null });
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.errorMessage).toBe('');
  });

  it('resets error state when handleReset is invoked', () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = {
      hasError: true,
      errorMessage: 'AudioContext initialization failed',
    };

    boundary.handleReset();

    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.errorMessage).toBe('');
  });
});
