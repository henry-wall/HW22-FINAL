import { useState, useEffect, useMemo } from "react";
import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateTournamentStats, formatRemainingTime } from "../../utils/statsUtils";
import type { TournamentStats } from "../../utils/statsUtils";
import type { TournamentConfig } from "../../types/tournament";

interface GlobalSummaryProps {
  tournaments: TournamentConfig[];
}

interface TournamentUpdate {
  stats: TournamentStats;
  players: string[];
}

export function GlobalSummary({ tournaments }: GlobalSummaryProps) {
  const [updates, setUpdates] = useState<Record<string, TournamentUpdate>>({});

  const handleUpdate = (id: string, stats: TournamentStats, players: string[]) => {
    setUpdates(prev => {
      // Deep check to avoid infinite loops if data hasn't changed
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
    let finishedCategories = 0;

    tournaments.forEach(t => {
      const update = updates[t.id];
      if (!update) {
        // Fallback for players if data not yet loaded
        totalMatches += 0; // Unknown
        return;
      }

      totalMatches += update.stats.totalMatches;
      completedMatches += update.stats.completedMatches;
      maxEstimatedTime = Math.max(maxEstimatedTime, update.stats.estimatedRemainingTime);
      if (update.stats.status === "finished") finishedCategories++;

      // Collect unique players
      update.players.forEach(p => uniquePlayers.add(p.trim().toLowerCase()));
    });

    // If no data loaded yet, fallback players to sum of configs
    const playerCount = uniquePlayers.size > 0 
      ? uniquePlayers.size 
      : tournaments.reduce((acc, t) => acc + t.numPlayers, 0);

    return {
      totalMatches,
      completedMatches,
      playerCount,
      maxEstimatedTime,
      finishedCategories,
      progress: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
    };
  }, [tournaments, updates]);

  if (tournaments.length === 0) return null;

  return (
    <div className="mb-10">
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

      <div className="group relative overflow-hidden rounded-[32px] bg-surface border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all hover:border-white/20">
        {/* Animated Gradients */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-pink/10 blur-[100px] -mr-40 -mt-40 rounded-full animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-cyan/10 blur-[100px] -ml-40 -mb-40 rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
        
        <div className="relative p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">
            
            {/* Left: Progress Circle or Large Stat */}
            <div className="flex flex-col items-center justify-center shrink-0">
               <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-white/5"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * aggregated.progress) / 100}
                      strokeLinecap="round"
                      className="text-brand-pink transition-all duration-1000 ease-out"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(255, 5, 149, 0.5))' }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black text-primary tracking-tighter">{aggregated.progress}%</span>
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest">Total</span>
                  </div>
               </div>
            </div>

            {/* Middle: Details */}
            <div className="flex-1 space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-gradient-to-r from-brand-pink to-transparent" />
                  <h2 className="text-[11px] font-black text-brand-pink uppercase tracking-[0.4em]">Status Geral do Evento</h2>
                </div>
                <h3 className="text-2xl font-black text-primary uppercase tracking-tight">Andamento Global</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="relative group/stat">
                  <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1 group-hover/stat:text-brand-pink transition-colors">👥 Atletas</div>
                  <div className="text-2xl font-black text-primary">{aggregated.playerCount}</div>
                  <div className="h-1 w-0 group-hover/stat:w-full bg-brand-pink transition-all duration-300 rounded-full mt-1" />
                </div>
                <div className="relative group/stat">
                  <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1 group-hover/stat:text-brand-cyan transition-colors">🎾 Partidas</div>
                  <div className="text-2xl font-black text-primary">{aggregated.completedMatches}<span className="text-muted text-sm font-bold">/{aggregated.totalMatches}</span></div>
                  <div className="h-1 w-0 group-hover/stat:w-full bg-brand-cyan transition-all duration-300 rounded-full mt-1" />
                </div>
                <div className="relative group/stat">
                  <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1 group-hover/stat:text-amber-500 transition-colors">⏳ Restantes</div>
                  <div className="text-2xl font-black text-primary">{aggregated.totalMatches - aggregated.completedMatches}</div>
                  <div className="h-1 w-0 group-hover/stat:w-full bg-amber-500 transition-all duration-300 rounded-full mt-1" />
                </div>
                <div className="relative group/stat">
                  <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1 group-hover/stat:text-green-500 transition-colors">🏆 Finalizadas</div>
                  <div className="text-2xl font-black text-primary">{aggregated.finishedCategories}<span className="text-muted text-sm font-bold">/{tournaments.length}</span></div>
                  <div className="h-1 w-0 group-hover/stat:w-full bg-green-500 transition-all duration-300 rounded-full mt-1" />
                </div>
              </div>
            </div>

            {/* Right: Time Projection */}
            <div className="lg:w-px lg:h-32 bg-white/10 hidden lg:block" />

            <div className="flex flex-col items-center lg:items-end justify-center">
               <div className="bg-white/5 border border-white/10 p-6 rounded-[24px] backdrop-blur-md min-w-[220px] text-center lg:text-right">
                  <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] block mb-2">Previsão de Término</span>
                  <div className="text-4xl font-black text-brand-cyan tracking-tighter mb-1">
                    {formatRemainingTime(aggregated.maxEstimatedTime)}
                  </div>
                  <span className="text-[9px] font-bold text-brand-cyan/60 uppercase tracking-widest">Tempo Total Estimado</span>
               </div>
            </div>

          </div>
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
      
      // Extract player names
      let players: string[] = [];
      if (data.players && data.players.length > 0) {
        players = data.players;
      } else if (data.couples && data.couples.length > 0) {
        players = data.couples.flatMap(c => [c.manName, c.womanName]);
      } else {
        // Fallback to placeholder names if no data yet (just to have a count)
        players = Array.from({ length: config.numPlayers }, (_, i) => `Player ${i}`);
      }

      onUpdate(stats, players);
    }
  }, [isLoaded, data, config]);

  return null;
}
