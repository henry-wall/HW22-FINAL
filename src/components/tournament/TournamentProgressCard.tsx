import { useState } from "react";
import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateTournamentStats, formatRemainingTime } from "../../utils/statsUtils";
import type { TournamentConfig } from "../../types/tournament";

interface TournamentProgressCardProps {
  config: TournamentConfig;
  onOpen: (id: string) => void;
}

export function TournamentProgressCard({ config, onOpen }: TournamentProgressCardProps) {
  const { data, isLoaded } = useTournamentData(config.id);
  const [copied, setCopied] = useState(false);

  if (!isLoaded) return (
    <div className="h-20 bg-white/5 animate-pulse rounded-xl border border-white/10"></div>
  );

  const stats = calculateTournamentStats(config, data);

  const statusColors = {
    not_started: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    in_progress: "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20",
    finished: "text-green-500 bg-green-500/10 border-green-500/20"
  };

  const statusLabels = {
    not_started: "Não Iniciado",
    in_progress: "Em Andamento",
    finished: "Finalizado"
  };

  const getTvUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?tv=${config.id}`;
  };

  const handleTvClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getTvUrl();
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
    // Open in new tab
    window.open(url, "_blank");
  };

  return (
    <div
      onClick={() => onOpen(config.id)}
      className="surface-card p-4 hover:border-brand-pink/40 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Background Progress Bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-brand-pink to-brand-cyan transition-all duration-1000"
        style={{ width: `${stats.progress}%` }}
      />

      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-primary group-hover:text-brand-pink transition-colors truncate">
              {config.name}
            </h3>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColors[stats.status]}`}>
              {statusLabels[stats.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted font-medium">
            <span>{stats.completedMatches} / {stats.totalMatches} Partidas</span>
            <span>•</span>
            <span className="text-primary">{stats.progress}% concluído</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          <div className="text-right">
            <span className="text-[9px] text-muted uppercase tracking-tighter block mb-0.5">Tempo Restante</span>
            <span className="text-xs font-black text-brand-cyan">{formatRemainingTime(stats.estimatedRemainingTime)}</span>
          </div>
          {/* TV Link Button */}
          <button
            onClick={handleTvClick}
            title="Abrir Modo TV (link copiado)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
              copied
                ? "bg-green-500/20 border-green-500/40 text-green-400"
                : "bg-brand-pink/10 border-brand-pink/20 text-brand-pink hover:bg-brand-pink/20"
            }`}
          >
            {copied ? "✓ Copiado!" : "📺 Modo TV"}
          </button>
        </div>
      </div>

      {/* Mini Progress Bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-brand-pink rounded-full transition-all duration-1000"
          style={{ width: `${stats.progress}%` }}
        />
      </div>
    </div>
  );
}
