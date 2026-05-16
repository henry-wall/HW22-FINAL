import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateTournamentStats } from "../../utils/statsUtils";
import type { TournamentConfig } from "../../types/tournament";

interface OperationalInsightsProps {
  tournaments: TournamentConfig[];
}

export function OperationalInsights({ tournaments }: OperationalInsightsProps) {
  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-1">Painel de Alertas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tournaments.map(t => (
          <TournamentInsight key={t.id} config={t} />
        ))}
      </div>
    </div>
  );
}

function TournamentInsight({ config }: { config: TournamentConfig }) {
  const { data, isLoaded } = useTournamentData(config.id);
  
  if (!isLoaded) return null;
  
  const stats = calculateTournamentStats(config, data);
  const isInactive = data.lastUpdateTime && (Date.now() - data.lastUpdateTime > 15 * 60 * 1000);
  const isDelayed = stats.progress < 20 && stats.status === "in_progress"; // Simplified logic for delay

  if (!isInactive && !isDelayed && stats.status !== "in_progress") return null;

  return (
    <>
      {isInactive && (
        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <div className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Quadra Parada</div>
            <div className="text-xs font-bold text-primary">{config.name} sem atualizações há +15min</div>
          </div>
        </div>
      )}
      {isDelayed && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <span className="text-lg">⏳</span>
          <div className="flex-1">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Categoria Lenta</div>
            <div className="text-xs font-bold text-primary">{config.name} está progredindo devagar</div>
          </div>
        </div>
      )}
    </>
  );
}
