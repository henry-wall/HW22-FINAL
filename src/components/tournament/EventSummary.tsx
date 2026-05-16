import { useState, useEffect, useMemo } from "react";
import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateTournamentStats, formatRemainingTime } from "../../utils/statsUtils";
import type { TournamentStats } from "../../utils/statsUtils";
import type { TournamentConfig } from "../../types/tournament";

interface EventSummaryProps {
  tournaments: TournamentConfig[];
}

interface TournamentUpdate {
  stats: TournamentStats;
  players: string[];
}

export function EventSummary({ tournaments }: EventSummaryProps) {
  const [updates, setUpdates] = useState<Record<string, TournamentUpdate>>({});

  const handleUpdate = (id: string, stats: TournamentStats, players: string[]) => {
    setUpdates(prev => {
      if (prev[id] && 
          prev[id].stats.completedMatches === stats.completedMatches && 
          prev[id].stats.totalMatches === stats.totalMatches &&
          prev[id].players.length === players.length) {
        return prev;
      }
      return { ...prev, [id]: { stats, players } };
    });
  };

  const aggregated = useMemo(() => {
    const uniquePlayers = new Set<string>();
    let totalMatches = 0;
    let completedMatches = 0;
    let maxEstimatedTime = 0;

    tournaments.forEach(t => {
      const update = updates[t.id];
      if (!update) return;

      totalMatches += update.stats.totalMatches;
      completedMatches += update.stats.completedMatches;
      maxEstimatedTime = Math.max(maxEstimatedTime, update.stats.estimatedRemainingTime);
      update.players.forEach(p => uniquePlayers.add(p.trim().toLowerCase()));
    });

    const playerCount = uniquePlayers.size > 0 
      ? uniquePlayers.size 
      : tournaments.reduce((acc, t) => acc + t.numPlayers, 0);

    return {
      totalMatches,
      completedMatches,
      playerCount,
      maxEstimatedTime,
      progress: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
    };
  }, [tournaments, updates]);

  if (tournaments.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Hidden loaders */}
      <div className="hidden">
        {tournaments.map(t => (
          <StatLoader 
            key={t.id} 
            config={t} 
            onUpdate={(stats, players) => handleUpdate(t.id, stats, players)} 
          />
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-black/20 border border-white/5 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          
          {/* Progress Circle (Slightly smaller) */}
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0 mx-auto md:mx-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * aggregated.progress) / 100}
                strokeLinecap="round"
                className="text-brand-pink transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black text-primary tracking-tighter">{aggregated.progress}%</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="text-center md:text-left">
              <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-0.5">Atletas</div>
              <div className="text-lg font-black text-primary">{aggregated.playerCount}</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-0.5">Partidas</div>
              <div className="text-lg font-black text-primary">{aggregated.completedMatches}<span className="text-muted text-xs font-bold">/{aggregated.totalMatches}</span></div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-0.5">Restante</div>
              <div className="text-lg font-black text-brand-cyan">{formatRemainingTime(aggregated.maxEstimatedTime)}</div>
            </div>
          </div>
        </div>

        {/* Progress Bar background layer */}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/5">
          <div 
            className="h-full bg-brand-pink transition-all duration-1000"
            style={{ width: `${aggregated.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatLoader({ config, onUpdate }: { config: TournamentConfig; onUpdate: (stats: TournamentStats, players: string[]) => void }) {
  const { data, isLoaded } = useTournamentData(config.id);
  useEffect(() => {
    if (isLoaded) {
      const stats = calculateTournamentStats(config, data);
      let players: string[] = [];
      if (data.players?.length) players = data.players;
      else if (data.couples?.length) players = data.couples.flatMap(c => [c.manName, c.womanName]);
      onUpdate(stats, players);
    }
  }, [isLoaded, data, config]);
  return null;
}
