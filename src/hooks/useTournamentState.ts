import { useEffect, useState, useRef, useCallback } from "react";
import { useStorage } from "../services/storage/StorageContext";

export type SyncStatus = "loading" | "saved" | "saving" | "error" | "offline";

interface UseTournamentStateReturn<T extends Record<string, any>> {
  data: T;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  updateData: (partial: Partial<T>) => void;
  replaceData: (full: T) => void;
  syncStatus: SyncStatus;
  lastSavedAt: Date | null;
  isLoaded: boolean;
  errorMessage: string | null;
}

export function useTournamentState<T extends Record<string, any>>(
  key: string,
  defaultValue: T
): UseTournamentStateReturn<T> {
  const { service, mode } = useStorage();
  const [data, setData] = useState<T>(defaultValue);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dataRef = useRef<T>(data);
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const lastSavedJsonRef = useRef<string>("");
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    let mounted = true;
    isLoadedRef.current = false;
    setIsLoaded(false);
    setSyncStatus("loading");

    async function load() {
      try {
        const loaded = await service.load<T>(key, defaultValue);
        if (!mounted) return;
        setData(loaded);
        dataRef.current = loaded;
        lastSavedJsonRef.current = JSON.stringify(loaded);
        isLoadedRef.current = true;
        setIsLoaded(true);
        setSyncStatus("saved");
      } catch (err: any) {
        if (!mounted) return;
        setErrorMessage(err.message || "Erro ao carregar");
        try {
          const fallback = window.localStorage.getItem(key);
          if (fallback) {
            const parsed = JSON.parse(fallback) as T;
            setData(parsed);
            dataRef.current = parsed;
            lastSavedJsonRef.current = JSON.stringify(parsed);
          }
        } catch { }
        isLoadedRef.current = true;
        setIsLoaded(true);
        setSyncStatus(mode === "cloud" ? "offline" : "saved");
      }
    }
    load();
    return () => { mounted = false; };
  }, [service, key]);

  useEffect(() => {
    const unsubscribe = service.subscribe<T>(key, (newValue) => {
      if (!isLoadedRef.current) return;
      const newJson = JSON.stringify(newValue);
      if (newJson !== JSON.stringify(dataRef.current)) {
        isApplyingRemoteRef.current = true;
        setData(newValue);
        dataRef.current = newValue;
        lastSavedJsonRef.current = newJson;
        setTimeout(() => { isApplyingRemoteRef.current = false; }, 50);
      }
    });
    return () => { unsubscribe(); };
  }, [service, key]);

  const debouncedSave = useCallback((newData: T) => {
    if (!isLoadedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const newJson = JSON.stringify(newData);
    if (newJson === lastSavedJsonRef.current) return;
    setSyncStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) { pendingSaveRef.current = true; return; }
      isSavingRef.current = true;
      const dataToSave = dataRef.current;
      const jsonToSave = JSON.stringify(dataToSave);
      try {
        await service.save(key, dataToSave);
        lastSavedJsonRef.current = jsonToSave;
        setLastSavedAt(new Date());
        setSyncStatus("saved");
        if (mode === "cloud") {
          try { window.localStorage.setItem(`${key}_backup`, jsonToSave); } catch { }
        }
      } catch (err: any) {
        setSyncStatus("error");
        setErrorMessage(err.message || "Erro ao salvar");
        try { window.localStorage.setItem(key, jsonToSave); } catch { }
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) { pendingSaveRef.current = false; debouncedSave(dataRef.current); }
      }
    }, 500);
  }, [service, key, mode]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (isApplyingRemoteRef.current) return;
    debouncedSave(data);
  }, [data, debouncedSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (isLoadedRef.current) {
          const finalJson = JSON.stringify(dataRef.current);
          if (finalJson !== lastSavedJsonRef.current) {
            service.save(key, dataRef.current).catch(console.error);
          }
        }
      }
    };
  }, [service, key, mode]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData((prev) => { const updated = { ...prev, [field]: value }; dataRef.current = updated; return updated; });
  }, []);

  const updateData = useCallback((partial: Partial<T>) => {
    setData((prev) => { const updated = { ...prev, ...partial }; dataRef.current = updated; return updated; });
  }, []);

  const replaceData = useCallback((full: T) => { setData(full); dataRef.current = full; }, []);

  return { data, updateField, updateData, replaceData, syncStatus, lastSavedAt, isLoaded, errorMessage };
}
