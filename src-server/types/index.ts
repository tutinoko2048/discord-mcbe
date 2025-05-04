export * from './config';

export type ExtractOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]-?: T[K]; // Optionalを抽出
};