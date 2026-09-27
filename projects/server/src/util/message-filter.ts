import type { MessageFilter } from '../types';

export type FilterResult =
  | { action: 'cancel' }
  | { action: 'update'; updatedContent: string }
  | { action: 'none' };

export const FILTER_MASK = '***';
export const SHORTEN_SUFFIX = '..';

export function applyMessageFilter(content: string, filter: MessageFilter): FilterResult {
  let updatedContent = content;
  let isChanged = false;

  if ('ignore_pattern' in filter) {
    const matchRegex = new RegExp(filter.ignore_pattern);
    if (matchRegex.test(updatedContent)) {
      if (filter.on_fail === 'cancel') {
        return { action: 'cancel' };
      }

      const replaceRegex = new RegExp(filter.ignore_pattern, 'g');
      updatedContent = updatedContent.replace(replaceRegex, FILTER_MASK);
      isChanged = true;
    }
  } else {
    if (typeof filter.max_content_length === 'number' && updatedContent.length > filter.max_content_length) {
      if (filter.on_fail === 'cancel') {
        return { action: 'cancel' };
      }

      if (filter.on_fail === 'shorten') {
        updatedContent = updatedContent.slice(0, filter.max_content_length) + SHORTEN_SUFFIX;
        isChanged = true;
      }
    }

    if (typeof filter.max_content_lines === 'number') {
      const lines = updatedContent.split('\n');
      if (lines.length > filter.max_content_lines) {
        if (filter.on_fail === 'cancel') {
          return { action: 'cancel' };
        }

        if (filter.on_fail === 'shorten') {
          updatedContent = lines.slice(0, filter.max_content_lines).join('\n') + SHORTEN_SUFFIX;
          isChanged = true;
        }
      }
    }
  }

  if (isChanged) {
    return { action: 'update', updatedContent };
  }

  return { action: 'none' };
}

export function applyMessageFilters(content: string, filters: MessageFilter[]): FilterResult {
  let updatedContent = content;
  let isChanged = false;

  for (const filter of filters) {
    const result = applyMessageFilter(updatedContent, filter);
    if (result.action === 'cancel') {
      return result;
    }

    if (result.action === 'update') {
      updatedContent = result.updatedContent;
      isChanged = true;
    }
  }

  return isChanged ? { action: 'update', updatedContent } : { action: 'none' };
}
