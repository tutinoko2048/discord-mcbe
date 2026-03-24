import { describe, expect, test } from 'bun:test';
import { shouldUpdate } from './install';

describe('shouldUpdate', () => {
  test('stable-old -> stable-new = true', () => {
    expect(shouldUpdate('1.0.0', '1.1.0')).toBe(true);
  });

  test('stable-new -> stable-old = false', () => {
    expect(shouldUpdate('1.1.0', '1.0.0')).toBe(false);
  });

  test('beta-old -> beta-new = true', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.0.0-beta.2')).toBe(true);
  });

  test('beta-new -> beta-old = false', () => {
    expect(shouldUpdate('1.1.0-beta.2', '1.0.0-beta.1')).toBe(false);
  });

  test('beta-same -> stable-same = false', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.0.0')).toBe(false);
  });

  test('stable-same -> beta-same = false', () => {
    expect(shouldUpdate('1.0.0', '1.0.0-beta.1')).toBe(false);
  });

  test('beta-old -> stable-new = false', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.1.0')).toBe(false);
  });

  test('stable-old -> beta-new = false', () => {
    expect(shouldUpdate('1.0.0', '1.1.0-beta.1')).toBe(false);
  });

  test('beta-new -> stable-old = false', () => {
    expect(shouldUpdate('1.1.0-beta.1', '1.0.0')).toBe(false);
  });

  test('stable-new -> beta-old = false', () => {
    expect(shouldUpdate('1.1.0', '1.0.0-beta.1')).toBe(false);
  });

  test('same stable versions = false', () => {
    expect(shouldUpdate('1.0.0', '1.0.0')).toBe(false);
  });

  test('same beta versions = false', () => {
    expect(shouldUpdate('1.0.0-beta.1', '1.0.0-beta.1')).toBe(false);
  });
});
