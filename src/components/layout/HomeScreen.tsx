import { useState } from "react";
import type { TournamentConfig, TournamentEvent } from "../../types/tournament";
import { ThemeToggle } from "../shared/ThemeToggle";
import logoUrl from "../../assets/WallBT_Full.png";
import { exportDataAsJSON, importDataFromJSON } from "../../utils/backupUtils";
import { useStorage } from "../../services/storage/StorageContext";
import { TournamentProgressCard } from "../tournament/TournamentProgressCard";
import { EventDashboardCard } from "../tournament/EventDashboardCard";


interface HomeScreenProps {
  tournaments: TournamentConfig[];
  events: TournamentEvent[];
  onNewTournament: () => void;
  onOpenTournament: (id: string) => void;
  onCreateEvent: (name: string) => TournamentEvent;
  onDeleteEvent: (eventId: string) => void;
  onLinkTournament: (tournamentId: string, eventId: string | undefined) => void;
}

export default function HomeScreen({
  tournaments,
  events,
  onNewTournament,
  onOpenTournament,
  onCreateEvent,
  onDeleteEvent,
  onLinkTournament,
}: HomeScreenProps) {
  const { mode, setMode, migrateLocalToCloud } = useStorage();
  
  // Event creation state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  // Linking modal state
  const [linkingTournamentId, setLinkingTournamentId] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const handleCreateEvent = () => {
    if (!newEventName.trim()) return;
    onCreateEvent(newEventName);
    setNewEventName("");
    setShowCreateEvent(false);
  };

  // Group tournaments: by event, then standalone
  const standaloneTournaments = tournaments.filter(t => !t.eventId);

  const tournamentsByEvent: Record<string, TournamentConfig[]> = {};
  events.forEach(ev => {
    tournamentsByEvent[ev.id] = tournaments.filter(t => t.eventId === ev.id);
  });

  const renderTournamentCard = (t: TournamentConfig) => (
    <div key={t.id} className="relative group">
      <TournamentProgressCard 
        config={t} 
        onOpen={onOpenTournament} 
      />
      {/* Absolute Link Button */}
      <button
        onClick={(e) => { e.stopPropagation(); setLinkingTournamentId(t.id); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white/50 hover:text-brand-cyan transition-all border border-white/10 z-10"
        title="Vincular a um Evento"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col transition-colors duration-300">
      {/* Hero Header */}
      <div className="relative px-5 pt-8 pb-6 overflow-hidden">
        <div className="absolute top-4 right-5 z-20 flex items-center gap-2">
          {/* Storage Toggle */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 mr-2">
            <button 
              onClick={() => setMode("local")}
              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${mode === "local" ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/50"}`}
            >
              Local
            </button>
            <button 
              onClick={() => setMode("cloud")}
              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-1 ${mode === "cloud" ? "bg-brand-cyan/20 text-brand-cyan shadow-sm" : "text-white/30 hover:text-white/50"}`}
            >
              {mode === "cloud" && <span className="w-1 h-1 rounded-full bg-brand-cyan animate-pulse"></span>}
              Nuvem
            </button>
          </div>

          <button 
            onClick={migrateLocalToCloud}
            className="w-8 h-8 rounded-lg bg-brand-cyan/10 text-brand-cyan flex items-center justify-center hover:bg-brand-cyan/20 transition-all border border-brand-cyan/20"
            title="Sincronizar dados locais para a nuvem"
          >
            ☁️
          </button>
          <button 
            onClick={exportDataAsJSON}
            className="w-8 h-8 rounded-lg bg-brand-cyan/10 text-brand-cyan flex items-center justify-center hover:bg-brand-cyan/20 transition-all border border-brand-cyan/20"
            title="Exportar Backup (JSON)"
          >
            💾
          </button>
          <label className="w-8 h-8 rounded-lg bg-brand-pink/10 text-brand-pink flex items-center justify-center hover:bg-brand-pink/20 transition-all border border-brand-pink/20 cursor-pointer" title="Importar Backup (JSON)">
            📂
            <input 
              type="file" 
              className="hidden" 
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const ok = await importDataFromJSON(file);
                  if (ok) window.location.reload();
                  else alert("Erro ao importar backup.");
                }
              }}
            />
          </label>
          <ThemeToggle />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at top center, rgba(255,5,149,0.12) 0%, transparent 70%)",
        }} />
        <div className="flex flex-col items-center mb-6">
          <img
            src={logoUrl}
            alt="Wall Beach Tennis"
            className="h-28 object-contain mb-4"
            style={{ filter: "drop-shadow(0 0 16px rgba(255,5,149,0.5))" }}
          />
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 w-8" style={{ background: "linear-gradient(to right, transparent, rgba(255,5,149,0.4))" }} />
            <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Tournament Manager</span>
            <div className="h-px flex-1 w-8" style={{ background: "linear-gradient(to left, transparent, rgba(255,5,149,0.4))" }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button onClick={onNewTournament} className="btn-primary relative overflow-hidden">
            <span className="text-xl">+</span>
            <span>Novo Torneio</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 pb-8 space-y-8">


        {/* Header Section for Events */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Eventos</h2>
          <button 
            onClick={() => setShowCreateEvent(true)}
            className="btn-cyan px-4 py-2 text-[10px] uppercase font-black tracking-widest"
          >
            + Novo Evento
          </button>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.map(ev => (
            <EventDashboardCard 
              key={ev.id}
              event={ev}
              tournaments={tournamentsByEvent[ev.id] || []}
              onDelete={setDeletingEventId}
              onOpen={onOpenTournament}
            />
          ))}
          {events.length === 0 && tournaments.length > 0 && (
            <div className="p-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-muted text-xs">Crie um <strong className="text-primary uppercase">Evento</strong> para agrupar categorias.</p>
            </div>
          )}
        </div>

        {/* Standalone Section */}
        {standaloneTournaments.length > 0 && (
          <div className="pt-4 border-t border-white/5">
            <h2 className="text-xl font-black text-primary uppercase tracking-tighter mb-4">
              Torneios Avulsos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standaloneTournaments.map(t => renderTournamentCard(t))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tournaments.length === 0 && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4"
              style={{ background: "rgba(255,5,149,0.1)", border: "1px dashed rgba(255,5,149,0.3)" }}>
              🎾
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Nenhum torneio criado</h3>
            <p className="text-muted text-sm max-w-xs">
              Toque em <strong className="text-primary">Novo Torneio</strong> para começar.
            </p>
          </div>
        )}
      </div>

      {/* Modals are the same... */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-black text-primary mb-1">Criar Evento</h3>
            <input
              type="text"
              className="input-dark mb-4"
              placeholder="Nome do Evento (ex: Copa Verão 2024)"
              value={newEventName}
              onChange={e => setNewEventName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateEvent()}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowCreateEvent(false); setNewEventName(""); }} className="btn-secondary py-2 text-sm flex-1">
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                className="btn-primary py-2 text-sm flex-1"
                disabled={!newEventName.trim()}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {linkingTournamentId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-md animate-slide-up">
            {(() => {
              const t = tournaments.find(t => t.id === linkingTournamentId)!;
              return (
                <>
                  <h3 className="text-lg font-black text-primary mb-1">Vincular Evento</h3>
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {t?.eventId && (
                      <button
                        onClick={() => { onLinkTournament(linkingTournamentId, undefined); setLinkingTournamentId(null); }}
                        className="w-full text-left p-3 rounded-xl border-2 border-red-500/20 bg-red-500/5 flex items-center gap-3"
                      >
                        <span className="text-red-400 font-bold text-sm">❌ Remover vínculo atual</span>
                      </button>
                    )}
                    {events.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => { onLinkTournament(linkingTournamentId, ev.id); setLinkingTournamentId(null); }}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          t?.eventId === ev.id ? "border-brand-pink bg-brand-pink/10" : "border-white/5 bg-white/5"
                        }`}
                      >
                        <div className="font-bold text-primary text-sm">{ev.name}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setLinkingTournamentId(null)} className="btn-secondary py-2 text-sm w-full">
                    Fechar
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {deletingEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-sm text-center">
            <h3 className="text-lg font-black text-primary mb-4">Excluir Evento?</h3>
            <div className="flex gap-2">
              <button onClick={() => setDeletingEventId(null)} className="btn-secondary py-2 text-sm flex-1">Cancelar</button>
              <button
                onClick={() => { onDeleteEvent(deletingEventId); setDeletingEventId(null); }}
                className="btn-primary bg-red-500 hover:bg-red-600 py-2 text-sm flex-1"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
