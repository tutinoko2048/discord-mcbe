import { describe, expect, test } from 'bun:test';
import { applyMessageFilter, applyMessageFilters, FILTER_MASK, SHORTEN_SUFFIX } from './message-filter';

describe('applyMessageFilter', () => {
  test('returns cancel when length exceeds and on_fail=cancel', () => {
    const result = applyMessageFilter('abcd', {
      on_fail: 'cancel',
      max_content_length: 3,
    });

    expect(result).toEqual({ action: 'cancel' });
  });

  test('shortens content when length exceeds and on_fail=shorten', () => {
    const result = applyMessageFilter('abcdef', {
      on_fail: 'shorten',
      max_content_length: 3,
    });

    expect(result).toEqual({ action: 'update', updatedContent: `abc${SHORTEN_SUFFIX}` });
  });

  test('shortens content when lines exceed and on_fail=shorten', () => {
    const result = applyMessageFilter('line1\nline2\nline3', {
      on_fail: 'shorten',
      max_content_lines: 2,
    });

    expect(result).toEqual({ action: 'update', updatedContent: `line1\nline2${SHORTEN_SUFFIX}` });
  });

  test('replaces matches when regex matches and on_fail=replace', () => {
    const result = applyMessageFilter('foo bar foo', {
      on_fail: 'replace',
      ignore_pattern: 'foo',
    });

    expect(result).toEqual({
      action: 'update',
      updatedContent: `${FILTER_MASK} bar ${FILTER_MASK}`,
    });
  });

  test('returns none when no filter conditions match', () => {
    const result = applyMessageFilter('hello', {
      on_fail: 'shorten',
      max_content_length: 10,
    });

    expect(result).toEqual({ action: 'none' });
  });
});

describe('applyMessageFilters', () => {
  test('applies filters sequentially', () => {
    const result = applyMessageFilters('abcdef', [
      { on_fail: 'shorten', max_content_length: 4 },
      { on_fail: 'replace', ignore_pattern: 'ab' },
    ]);

    expect(result).toEqual({
      action: 'update',
      updatedContent: `${FILTER_MASK}cd${SHORTEN_SUFFIX}`,
    });
  });

  test('returns cancel when any filter cancels', () => {
    const result = applyMessageFilters('abcdef', [
      { on_fail: 'shorten', max_content_length: 10 },
      { on_fail: 'cancel', ignore_pattern: 'cd' },
    ]);

    expect(result).toEqual({ action: 'cancel' });
  });

  test('returns none when filters are empty', () => {
    const result = applyMessageFilters('hello', []);

    expect(result).toEqual({ action: 'none' });
  });
});
