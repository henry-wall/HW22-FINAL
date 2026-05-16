import type { StorageService } from "./StorageService";

export class LocalStorageService implements StorageService {
  async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error loading key "${key}" from localStorage`, error);
      return defaultValue;
    }
  }

  async save<T>(key: string, value: T): Promise<void> {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("local-storage-update", { detail: { key, value } }));
    } catch (error) {
      console.warn(`Error saving key "${key}" to localStorage`, error);
    }
  }

  subscribe<T>(key: string, callback: (newValue: T) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === key) {
        callback(customEvent.detail.value);
      }
    };
    window.addEventListener("local-storage-update", handler);
    const storageHandler = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try { callback(JSON.parse(event.newValue)); } catch { }
      }
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("local-storage-update", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }
}
