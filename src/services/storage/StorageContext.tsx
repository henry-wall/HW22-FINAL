import React, { createContext, useContext, useEffect, useState } from "react";
import type { StorageService } from "./StorageService";
import { LocalStorageService } from "./LocalStorageService";
import { SupabaseService } from "./SupabaseService";

type StorageMode = "local" | "cloud";

interface StorageContextType {
  mode: StorageMode;
  setMode: (mode: StorageMode) => void;
  service: StorageService;
  isConnected: boolean;
  migrateLocalToCloud: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | null>(null);
const localService = new LocalStorageService();
const supabaseService = new SupabaseService();

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<StorageMode>(() => {
    return (localStorage.getItem("storage_mode_v2") as StorageMode) || "cloud";
  });
  const [service, setService] = useState<StorageService>(
    mode === "cloud" ? supabaseService : localService
  );

  const setMode = (newMode: StorageMode) => {
    localStorage.setItem("storage_mode_v2", newMode);
    setModeState(newMode);
  };

  const migrateLocalToCloud = async () => {
    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("wallbt_v2_") || key.startsWith("tournament_"))) {
        keysToMigrate.push(key);
      }
    }
    if (keysToMigrate.length === 0) { alert("Nenhum dado local encontrado para migrar."); return; }
    const confirmed = window.confirm(`Encontrei ${keysToMigrate.length} itens locais. Deseja enviar para a nuvem?`);
    if (!confirmed) return;
    let count = 0;
    for (const key of keysToMigrate) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) { await supabaseService.save(key, JSON.parse(raw)); count++; }
      } catch (e) { console.error(`Erro ao migrar ${key}`, e); }
    }
    alert(`Migração concluída! ${count} itens enviados para a nuvem.`);
  };

  useEffect(() => {
    setService(mode === "cloud" ? supabaseService : localService);
  }, [mode]);

  return (
    <StorageContext.Provider value={{ mode, setMode, service, isConnected: mode === "cloud", migrateLocalToCloud }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) throw new Error("useStorage must be used within a StorageProvider");
  return context;
}
