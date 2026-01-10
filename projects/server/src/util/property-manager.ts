import * as fs from 'node:fs';
import * as path from 'node:path';
import { ROOT_DIR } from './environment';

export class PropertyManager {
  static readonly DATA_DIR = path.join(ROOT_DIR, '.discord-mcbe');
  static readonly DATA_PATH = path.join(PropertyManager.DATA_DIR, 'data.json');

  private readonly cache = new Map<string, any>();

  constructor() {
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(PropertyManager.DATA_PATH)) return;
    try {
      const data = JSON.parse(fs.readFileSync(PropertyManager.DATA_PATH, 'utf-8'));
      for (const [key, value] of Object.entries(data)) {
        this.cache.set(key, value);
      }
    } catch (e) {
      console.error('Failed to load data.json', e);
    }
  }

  private save(): void {
    try {
      if (!fs.existsSync(PropertyManager.DATA_DIR)) {
        fs.mkdirSync(PropertyManager.DATA_DIR, { recursive: true });
      }
      const data = Object.fromEntries(this.cache);
      fs.writeFileSync(PropertyManager.DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save data.json', e);
    }
  }

  public get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  public set(key: string, value: any): void {
    this.cache.set(key, value);
    this.save();
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): void {
    this.cache.delete(key);
    this.save();
  }

  public clear(): void {
    this.cache.clear();
    this.save();
  }
}
