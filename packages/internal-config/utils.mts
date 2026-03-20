export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  return mergeObjects(target, source as Record<string, unknown>) as T;
}

function mergeObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = target[key];

    if (Array.isArray(sourceValue)) {
      const targetArray = Array.isArray(targetValue) ? targetValue : [];
      target[key] = [...targetArray, ...sourceValue];
      continue;
    }

    if (isPlainObject(sourceValue)) {
      const targetObject = isPlainObject(targetValue) ? targetValue : {};
      target[key] = mergeObjects(targetObject, sourceValue);
      continue;
    }

    target[key] = sourceValue;
  }

  return target;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
