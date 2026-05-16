import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { StorageService } from "./StorageService";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export class SupabaseService implements StorageService {
  private client: SupabaseClient | null = null;
  private isConfigured = false;

  constructor() {
    console.log("Iniciando Supabase com URL:", SUPABASE_URL ? "Detectada" : "FALTANDO");
    if (SUPABASE_URL && SUPABASE_KEY) {
      this.client = createClient(SUPABASE_URL, SUPABASE_KEY);
      this.isConfigured = true;
      console.log("Supabase configurado com sucesso.");
    } else {
      console.error("ERRO: Chaves do Supabase não encontradas no ambiente.");
      // Se estivermos em produção e faltarem chaves, avisar o usuário
      if (import.meta.env.PROD) {
        alert("Atenção: As chaves de sincronização (Supabase) não foram configuradas no Netlify. A sincronização entre aparelhos não funcionará.");
      }
    }
  }

  async load<T>(key: string, defaultValue: T): Promise<T> {
    if (!this.isConfigured || !this.client) return defaultValue;
    const { data, error } = await this.client
      .from("key_value_store").select("value").eq("key", key);
    if (error) {
      console.error("Supabase load error:", error);
      throw new Error(error.message);
    }
    return data && data.length > 0 ? data[0].value : defaultValue;
  }

  async save<T>(key: string, value: T): Promise<void> {
    if (!this.isConfigured || !this.client) return;
    const { error } = await this.client
      .from("key_value_store").upsert({ key, value }, { onConflict: "key" });
    if (error) { console.error("Supabase save error:", error); throw new Error(error.message); }
  }

  private channels: Record<string, any> = {};

  subscribe<T>(key: string, callback: (newValue: T) => void): () => void {
    if (!this.isConfigured || !this.client) return () => {};
    
    // Se já existe um canal para esta chave, apenas adicionamos o callback
    // Mas o Supabase JS v2 é rigoroso, então o ideal é gerenciar um único canal por chave.
    if (this.channels[key]) {
      return () => {}; // Já existe um canal cuidando disso
    }

    const channel = this.client
      .channel(`chan-${key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "key_value_store",
          filter: `key=eq.${key}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
            callback((payload.new as any).value as T);
          }
        }
      );

    this.channels[key] = channel;

    channel.subscribe((status: string) => {
      console.log(`Supabase Realtime status for ${key}:`, status);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        delete this.channels[key];
      }
    });

    return () => {
      if (this.channels[key]) {
        this.client?.removeChannel(this.channels[key]);
        delete this.channels[key];
      }
    };
  }
}
