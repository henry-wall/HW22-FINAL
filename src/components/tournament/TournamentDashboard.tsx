import { useState, useEffect, useMemo } from "react";
import type { TournamentConfig, TournamentEvent } from "../../types/tournament";
import { ThemeToggle } from "../shared/ThemeToggle";
import Super8Dashboard from "./formats/Super8Dashboard";
import MixedDoublesDashboard from "./formats/MixedDoublesDashboard";
import KingQueenDashboard from "./formats/KingQueenDashboard";
import DoublesDashboard from "./formats/DoublesDashboard";
import ChampionScreen from "./ChampionScreen";
import PresentationMode from "./PresentationMode";
import { useTournamentData } from "../../hooks/useTournamentData";
import { calculateMixedDoublesRanking, calculateSuper8Ranking, calculateKingQueenRanking } from "../../utils/rankingUtils";
import type { RankingItem } from "../../utils/rankingUtils";
import { shareStandingsToWhatsApp } from "../../utils/shareUtils";
import { exportRankingToCSV } from "../../utils/csvExport";
import { getTieBreakTrigger } from "../../utils/matchSettingsUtils";
import type { MatchSettings } from "../../types/tournament";

interface TournamentDashboardProps {
  config: TournamentConfig;
  initialPlayers: string[] | { manName: string; womanName: string }[];
  onBack: () => void;
  onUpdatePlayers: (players: any) => void;
  onUpdateTournament: (partial: Partial<TournamentConfig>) => void;
  siblingTournaments?: TournamentConfig[];
  activeEvent?: TournamentEvent;
  onSwitchTournament?: (id: string) => void;
}

const formatLabels: Record<string, string> = {
  super8: "Super 8",
  kingqueen: "King & Queen",
  mixeddoubles: "Troca de Casais",
  fixeddoubles: "Duplas Fixas",
  drawdoubles: "Duplas Sorteadas",
};

const categoryLabels: Record<string, string> = {
  masc: "Masculino",
  fem: "Feminino",
  mixed: "Misto",
};

const durationLabels: Record<string, string> = {
  set6: "Set 6 games",
  shortset: "Short Set",
  supertie: "Super Tie",
  game6: "Até 6 Games",
};

// Placeholder — this will be expanded with actual scheduling logic
export default function TournamentDashboard({
  config,
  initialPlayers,
  onBack,
  onUpdatePlayers,
  onUpdateTournament,
  siblingTournaments = [],
  activeEvent,
  onSwitchTournament,
}: TournamentDashboardProps) {
  const [showTVMode, setShowTVMode] = useState(false);
  const [isEditingPlayers, setIsEditingPlayers] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [newName, setNewName] = useState(config.name);
  const [editingPlayers, setEditingPlayers] = useState<any[]>([]);
  const [showChampion, setShowChampion] = useState(false);
  const [championShown, setChampionShown] = useState(false);
  const { data } = useTournamentData(config.id);

  useEffect(() => {
    setEditingPlayers(JSON.parse(JSON.stringify(initialPlayers)));
  }, [initialPlayers]);

  const handleSavePlayers = () => {
    onUpdatePlayers(editingPlayers);
    setIsEditingPlayers(false);
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      onUpdateTournament({ name: newName.trim() });
      setIsEditingName(false);
    }
  };

  const isMixed = config.format === "mixeddoubles";
  const isDoubles = config.format === "fixeddoubles" || config.format === "drawdoubles";
  const usesCouples = isMixed || isDoubles;
  const couples = usesCouples ? (initialPlayers as { manName: string; womanName: string }[]) : [];
  const players = !usesCouples ? (initialPlayers as string[]) : [];

  const globalRanking = useMemo(() => {
    if (!data) return [];
    if (config.format === "mixeddoubles") return calculateMixedDoublesRanking(config, data, couples);
    if (config.format === "super8") return calculateSuper8Ranking(config, data, players);
    if (config.format === "kingqueen") return calculateKingQueenRanking(config, data, players);
    if (config.format === "fixeddoubles" || config.format === "drawdoubles") {
      // For now we can use the same logic as MixedDoubles if we assume couples[i] maps to the teamA[0] index
      return calculateMixedDoublesRanking(config, data, couples);
    }
    return [];
  }, [data, config, initialPlayers]);

  const isFinished = useMemo(() => {
    if (!data) return false;
    return data.completedMatches?.length > 0 && 
           data.matchQueue?.length === 0 && 
           Object.keys(data.inProgressMatches || {}).length === 0;
  }, [data]);

  useEffect(() => {
    if (isFinished && !championShown) {
      setShowChampion(true);
      setChampionShown(true);
    }
  }, [isFinished, championShown]);

  if (showTVMode) {
    return <PresentationMode config={config} players={players} couples={couples} onClose={() => setShowTVMode(false)} />;
  }

  return (
    <div className="min-h-dvh flex flex-col transition-colors duration-300">
      {showChampion && globalRanking[0] && (
        <ChampionScreen winnerName={globalRanking[0].name} onClose={() => setShowChampion(false)} />
      )}
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border-main">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-secondary text-sm hover:text-primary transition-colors"
          >
            ← Voltar
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowTVMode(true)}
              className="bg-brand-pink/10 hover:bg-brand-pink/20 text-brand-pink px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-2 border border-brand-pink/20"
            >
              📺 Modo TV
            </button>
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                  className="bg-page border-2 border-brand-pink rounded-lg px-3 py-1 text-xl font-black text-primary outline-none w-full"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl font-black text-primary leading-tight truncate">{config.name}</h1>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-brand-pink transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="badge-pink">{formatLabels[config.format]}</span>
              {!isMixed && <span className="badge-cyan">{categoryLabels[config.category]}</span>}
              <span className="text-xs text-muted">{config.numPlayers} {isMixed ? "casais" : "jogadores"} · {config.numCourts} quadras</span>
            </div>
          </div>
        </div>
        {/* Event + Category Switcher */}
        {activeEvent && siblingTournaments.length > 0 && (
          <div className="mt-3 -mx-5 px-5 pb-3 border-b border-border-main">
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span>🗂️</span> {activeEvent.name}
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {/* Current tournament chip */}
              <div className="shrink-0 px-3 py-1.5 rounded-full text-xs font-black bg-brand-pink text-white border border-brand-pink">
                {config.name}
              </div>
              {/* Sibling tournament chips */}
              {siblingTournaments.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSwitchTournament?.(s.id)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold text-muted border border-border-main hover:border-brand-pink/50 hover:text-brand-pink transition-all bg-surface"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest">Configurações</h2>
          <button 
            onClick={() => setIsEditingConfig(!isEditingConfig)}
            className="text-[10px] font-bold text-brand-cyan border border-brand-cyan/20 px-2 py-0.5 rounded hover:bg-brand-cyan/5 transition-colors"
          >
            {isEditingConfig ? "Fechar" : "✏️ Editar"}
          </button>
        </div>

        {isEditingConfig ? (
          <div className="surface-card mb-5 animate-fade-in border-brand-cyan/30 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Basic Config */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-muted uppercase mb-1.5 block tracking-widest">Formato Geral</label>
                  <select 
                    className="input-dark w-full h-10 text-xs font-bold"
                    value={config.durationType}
                    onChange={(e) => onUpdateTournament({ durationType: e.target.value as any })}
                  >
                    <option value="set6">Set 6 games</option>
                    <option value="shortset">Short Set</option>
                    <option value="supertie">Super Tie</option>
                    <option value="game6">Até 6 Games</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-muted uppercase mb-1.5 block tracking-widest">Estrutura de Grupos</label>
                  <select 
                    className="input-dark w-full h-10 text-xs font-bold disabled:opacity-50"
                    value={config.groupFormat}
                    disabled={data?.completedMatches && data.completedMatches.length > 0}
                    onChange={(e) => onUpdateTournament({ groupFormat: e.target.value as any })}
                  >
                    <option value="single">Grupo Único</option>
                    <option value="groups">Dois Grupos</option>
                  </select>
                </div>
              </div>

              {/* Match Details */}
              <div className="space-y-4 lg:col-span-2">
                <label className="text-[10px] font-black text-brand-cyan uppercase mb-1.5 block tracking-widest">Detalhes da Pontuação das Partidas</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-page/50 p-3 rounded-xl border border-border-main">
                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase mb-2 block">Série (Melhor de)</label>
                    <div className="flex gap-1">
                      {[1, 3, 5].map(v => (
                        <button
                          key={v}
                          onClick={() => {
                            const ms = config.matchSettings || {} as MatchSettings;
                            onUpdateTournament({ 
                              matchSettings: { 
                                ...ms, 
                                bestOf: v as any,
                                superTieLastSet: v > 1
                              } 
                            });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition-all ${config.matchSettings?.bestOf === v ? 'bg-brand-pink border-brand-pink text-white' : 'bg-surface border-border-main text-muted'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-muted uppercase mb-2 block">Games por Set</label>
                    <div className="flex gap-1">
                      {[4, 6, 8].map(v => (
                        <button
                          key={v}
                          onClick={() => {
                            const ms = config.matchSettings || {} as MatchSettings;
                            onUpdateTournament({ 
                              matchSettings: { 
                                ...ms, 
                                gamesPerSet: v as any,
                                tbTrigger: getTieBreakTrigger(v)
                              } 
                            });
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition-all ${config.matchSettings?.gamesPerSet === v ? 'bg-yellow-400 border-yellow-400 text-black' : 'bg-surface border-border-main text-muted'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        const ms = config.matchSettings || {} as MatchSettings;
                        onUpdateTournament({ matchSettings: { ...ms, isNoAd: !ms.isNoAd } });
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-black uppercase transition-all ${config.matchSettings?.isNoAd ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan' : 'bg-surface border-border-main text-muted'}`}
                    >
                      <span>Modo No-Ad</span>
                      <span>{config.matchSettings?.isNoAd ? 'ON' : 'OFF'}</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        const ms = config.matchSettings || {} as MatchSettings;
                        onUpdateTournament({ matchSettings: { ...ms, hasTieBreak: !ms.hasTieBreak } });
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-black uppercase transition-all ${config.matchSettings?.hasTieBreak ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan' : 'bg-surface border-border-main text-muted'}`}
                    >
                      <span>Tie-break</span>
                      <span>{config.matchSettings?.hasTieBreak ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Formato das Partidas", value: durationLabels[config.durationType] },
              { label: "Melhor de", value: `${config.matchSettings?.bestOf || 1} set(s)` },
              { label: "Games / Set", value: `${config.matchSettings?.gamesPerSet || 6} games` },
              { label: "Regras", value: `${config.matchSettings?.isNoAd ? "No-Ad" : "Vantagem"} · ${config.matchSettings?.hasTieBreak ? "TB" : "Sem TB"}` },
            ].map(item => (
              <div key={item.label} className="surface-card">
                <p className="text-[9px] text-muted mb-1 uppercase font-bold tracking-widest">{item.label}</p>
                <p className="font-bold text-primary text-xs">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

        {/* Top Section: Players & Ranking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-5 mb-4">
        {/* Players List (Take 3/4 space) */}
        <div className="lg:col-span-3 surface-card p-4 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Jogadores Inscritos</h2>
            <button 
              onClick={() => isEditingPlayers ? handleSavePlayers() : setIsEditingPlayers(true)}
              className="text-[10px] font-black text-brand-cyan uppercase hover:opacity-70 flex items-center gap-1.5"
            >
              {isEditingPlayers ? "💾 Salvar" : "✏️ Editar"}
            </button>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar max-h-[180px] pr-2">
            {isEditingPlayers ? (
              isMixed ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {editingPlayers.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 bg-page p-1.5 rounded-lg border border-border-main shadow-sm">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 bg-brand-pink/10 text-brand-pink">
                        {i + 1}
                      </span>
                      <div className="flex flex-col gap-1 flex-1">
                        <input className="input-dark h-6 text-[10px]" value={c.manName} onChange={e => {
                          const newArr = [...editingPlayers];
                          newArr[i].manName = e.target.value;
                          setEditingPlayers(newArr);
                        }} placeholder="Ele" />
                        <input className="input-dark h-6 text-[10px]" value={c.womanName} onChange={e => {
                          const newArr = [...editingPlayers];
                          newArr[i].womanName = e.target.value;
                          setEditingPlayers(newArr);
                        }} placeholder="Ela" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1.5">
                  {editingPlayers.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-page p-1.5 rounded-lg border border-border-main shadow-sm">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black flex-shrink-0 bg-brand-pink text-brand-cyan">
                        {i + 1}
                      </span>
                      <input className="input-dark flex-1 h-7 text-[11px]" value={p} onChange={e => {
                        const newArr = [...editingPlayers];
                        newArr[i] = e.target.value;
                        setEditingPlayers(newArr);
                      }} />
                    </div>
                  ))}
                </div>
              )
            ) : (
              isMixed ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                  {couples.map((c, i) => (
                    <div key={i} className="bg-page/50 p-1.5 rounded-lg border border-border-main/50 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black bg-brand-pink text-white shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-primary truncate leading-tight uppercase">{c.manName}</p>
                        <p className="text-[10px] font-black text-brand-pink truncate leading-tight uppercase">{c.womanName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-1.5">
                  {players.map((p, i) => (
                    <div key={i} className="bg-page/50 p-1.5 rounded-lg border border-border-main/50 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black bg-brand-pink text-brand-cyan shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[10px] font-black text-primary truncate uppercase">{p}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* General Ranking Sidebar (Take 1/4 space) */}
        <div className="lg:col-span-1 surface-card p-4 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-black text-muted uppercase tracking-widest">Ranking</p>
              <TieBreakerInfo format={config.format} durationType={config.durationType} />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-1">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[8px] font-bold text-green-600 uppercase">Live</span>
              </div>
              <button 
                onClick={() => shareStandingsToWhatsApp(config, globalRanking)}
                className="text-[10px] font-black text-green-500 hover:bg-green-500/10 flex items-center justify-center w-6 h-6 rounded-md border border-green-500/20 transition-all"
                title="Compartilhar no WhatsApp"
              >
                📲
              </button>
              <button 
                onClick={() => exportRankingToCSV(config, globalRanking)}
                className="text-[10px] font-black text-brand-cyan hover:bg-brand-cyan/10 flex items-center justify-center w-6 h-6 rounded-md border border-brand-cyan/20 transition-all"
                title="Exportar CSV"
              >
                📊
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[180px] pr-1">
            {globalRanking.map((r: RankingItem, idx: number) => {
              const isTop3 = idx < 3;
              return (
                <div key={r.index} className={`flex items-center justify-between p-1.5 mb-1 rounded-lg border ${
                  r.isWinner ? "bg-yellow-500/10 border-yellow-500/20" : "bg-page/40 border-border-main/30"
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-4 text-[10px] font-black ${isTop3 ? 'text-brand-pink' : 'text-muted'}`}>{idx + 1}º</span>
                    <span className="text-[10px] font-black text-primary truncate uppercase">{r.name}</span>
                  </div>
                  <div className="flex gap-2 text-[9px] font-black shrink-0 tabular-nums">
                    <span className="text-brand-cyan">{r.pts || r.wins}V</span>
                    <span className="text-muted">{r.diff > 0 ? `+${r.diff}` : r.diff}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formats Routing */}
      <div className="flex-1 overflow-hidden">
        {config.format === "super8" ? (
          <Super8Dashboard config={config} players={players} />
        ) : config.format === "mixeddoubles" ? (
          <MixedDoublesDashboard config={config} couples={couples as any} />
        ) : config.format === "kingqueen" ? (
          <KingQueenDashboard config={config} players={players} />
        ) : (config.format === "fixeddoubles" || config.format === "drawdoubles") ? (
          <DoublesDashboard config={config} couples={couples as any} />
        ) : (
          <div className="rounded-2xl p-6 text-center mt-4 border border-dashed border-brand-pink/30 bg-brand-pink/5 mx-5">
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="font-bold text-primary mb-1">Gerenciamento em desenvolvimento</h3>
            <p className="text-muted text-sm">
              O painel para o formato {config.format} está sendo implementado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TieBreakerInfo({ format, durationType }: { format: string; durationType: string }) {
  const [show, setShow] = useState(false);
  
  const rules = format === "kingqueen"
    ? ["1. Pontos (3 por vitória)", "2. Saldo de Games", "3. Games Pró (Marcados)"]
    : durationType === "game6"
    ? ["1. Saldo de Games (1º critério — Até 6 Games)", "2. Vitórias", "3. Games Pró (Marcados)"]
    : ["1. Vitórias", "2. Confronto Direto (entre 2)", "3. Saldo de Games", "4. Games Pró (Marcados)"];

  return (
    <div className="relative">
      <button 
        onClick={() => setShow(!show)}
        className="w-4 h-4 rounded-full border border-brand-cyan/40 text-[10px] flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
      >
        i
      </button>
      {show && (
        <div className="absolute left-0 top-6 w-52 bg-brand-surface border border-brand-border p-3 rounded-lg shadow-xl z-50 animate-fade-in">
          <p className="text-[10px] font-bold text-brand-cyan uppercase mb-2">Critérios de Desempate</p>
          <ul className="space-y-1">
            {rules.map(r => (
              <li key={r} className="text-[10px] text-secondary">{r}</li>
            ))}
          </ul>
          {durationType === "game6" && (
            <p className="mt-2 pt-2 border-t border-brand-border text-[9px] text-muted italic">
              * Empate 3-3 é válido (0 vitórias para cada).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

