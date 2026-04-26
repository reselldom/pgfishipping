import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../src/services/auth.service';

describe('validatePassword', () => {
  it('accepts a valid password', () => {
    expect(() => validatePassword('Strong1Password')).not.toThrow();
  });

  it('rejects a short password', () => {
    expect(() => validatePassword('Short1')).toThrow(/at least 8/);
  });

  it('rejects a password with no uppercase', () => {
    expect(() => validatePassword('lowercase1')).toThrow(/uppercase/);
  });

  it('rejects a password with no digit', () => {
    expect(() => validatePassword('NoDigitsHere')).toThrow(/digit/);
  });
});
