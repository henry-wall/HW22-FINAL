export interface StorageService {
  load<T>(key: string, defaultValue: T): Promise<T>;
  save<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  subscribe<T>(key: string, callback: (newValue: T) => void): () => void;
}
