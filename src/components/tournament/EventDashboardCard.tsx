import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateTournamentStats, formatRemainingTime } from "../../utils/statsUtils";
import type { TournamentConfig, TournamentEvent } from "../../types/tournament";
import { EventSummary } from "./EventSummary";

interface EventDashboardCardProps {
  event: TournamentEvent;
  tournaments: TournamentConfig[];
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

export function EventDashboardCard({ event, tournaments, onDelete, onOpen }: EventDashboardCardProps) {
  return (
    <div className="surface-card border-border-main overflow-hidden mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-xl">🗂️</div>
          <div>
            <h2 className="font-black text-primary text-lg leading-tight uppercase tracking-tight">{event.name}</h2>
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{tournaments.length} Categorias</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(event.id)}
          className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Summary of the Event */}
      <EventSummary tournaments={tournaments} />

      <div className="grid grid-cols-1 gap-3">
        {tournaments.map(t => (
          <EventTournamentRow key={t.id} config={t} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function EventTournamentRow({ config, onOpen }: { config: TournamentConfig; onOpen: (id: string) => void }) {
  const { data, isLoaded } = useTournamentData(config.id);
  
  if (!isLoaded) return <div className="h-12 bg-white/5 animate-pulse rounded-lg"></div>;
  
  const stats = calculateTournamentStats(config, data);
  
  return (
    <div 
      onClick={() => onOpen(config.id)}
      className="flex items-center gap-4 p-3 bg-black/20 rounded-xl border border-white/5 group hover:border-brand-pink/50 transition-all cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-bold text-sm text-primary truncate mr-2">{config.name}</span>
          <span className="text-[10px] font-black text-brand-cyan uppercase">{formatRemainingTime(stats.estimatedRemainingTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-pink rounded-full transition-all duration-1000"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-muted w-8 text-right">{stats.progress}%</span>
        </div>
      </div>
    </div>
  );
}
