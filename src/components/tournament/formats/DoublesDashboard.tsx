import { useState, useMemo, useEffect, useCallback } from "react";
import type { TournamentConfig } from "../../../types/tournament";
import { useTournamentData } from "../../../hooks/useTournamentData";
import { useMatchSync } from "../../../hooks/useMatchSync";
import { generateDoublesSchedule, generateDoublesSeries } from "../../../engines/doublesEngine";
import type { EngineMatch } from "../../../engines/super8Engine";
import { formatMatchScore } from "../../../utils/scoreFormatting";
import { sumScore, getMatchWinner } from "../../../utils/rankingUtils";
import { ScoreInput } from "../ScoreInput";
import RefereeScoreboard from "../RefereeScoreboard";
import ShareMatchButton from "../../shared/ShareMatchButton";

interface DoublesDashboardProps {
  config: TournamentConfig;
  couples: { manName: string; womanName: string }[];
  openMatchGlobalId?: string;
  autoStart?: boolean;
}

export default function DoublesDashboard({ config, couples, openMatchGlobalId, autoStart }: DoublesDashboardProps) {
  const { data, updateData, updateField, isLoaded } = useTournamentData(config.id);
  const { validateScore, updateMatchScore, syncAllResults } = useMatchSync(config.id);
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "operation" | "series" | "standings">("overview");
  const playoffFormat = config.playoffFormat ?? "none";
  const [refereeMatch, setRefereeMatch] = useState<{ match: EngineMatch; court: number } | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);

  // Para drawdoubles, numPlayers é o número de jogadores individuais, então casais = numPlayers / 2
  const numCouples = config.format === "drawdoubles" ? Math.floor(config.numPlayers / 2) : config.numPlayers;

  // Auto-start operation mode when autoStart is true
  useEffect(() => {
    if (autoStart && isLoaded && data.status === "planning" && data.matches.length > 0) {
      const timer = setTimeout(() => {
        const queue = [...data.matches];
        const inProgress: Record<number, EngineMatch> = {};
        const remainingQueue = [...queue];

        for (let i = 1; i <= config.numCourts; i++) {
          const idx = remainingQueue.findIndex(() => true);
          if (idx !== -1) {
            const nextMatch = remainingQueue.splice(idx, 1)[0];
            inProgress[i] = { ...nextMatch, court: i };
          }
        }

        updateData({
          ...data,
          status: "operation",
          matchQueue: remainingQueue,
          inProgressMatches: inProgress,
          completedMatches: []
        });
        setActiveTab("operation");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isLoaded, data.status, data.matches.length]);

  // Sync results when tab changes
  useEffect(() => {
    if (isLoaded) {
      const changed = syncAllResults();
      if (changed) {
        setSyncWarning("Placares sincronizados automaticamente");
        setTimeout(() => setSyncWarning(null), 3000);
      }
    }
  }, [activeTab, isLoaded, syncAllResults]);

  useEffect(() => {
    if (!openMatchGlobalId || !isLoaded) return;
    const inProg = data.inProgressMatches || {};
    for (const [courtStr, m] of Object.entries(inProg)) {
      if ((m as any).globalId === openMatchGlobalId) {
        setRefereeMatch({ match: m as EngineMatch, court: Number(courtStr) });
        setActiveTab("operation");
        return;
      }
    }
    const found = (data.matches || []).find((mm: any) => mm.globalId === openMatchGlobalId);
    if (found) {
      setRefereeMatch({ match: found as EngineMatch, court: (found.court || 1) });
      setActiveTab("operation");
    }
  }, [openMatchGlobalId, data, isLoaded]);

  const gamesPerSet = config.matchSettings?.gamesPerSet ?? 6;
  const isGame6ScoreValid = (scoreA: string | number, scoreB: string | number) => {
    if (config.durationType !== "game6") return true;
    return sumScore(scoreA) + sumScore(scoreB) === gamesPerSet;
  };

  // Initial generation
  useEffect(() => {
    if (isLoaded && data.matches.length === 0) {
      const matches = generateDoublesSchedule(numCouples, config.numCourts, config.groupFormat);
      updateData({
        ...data,
        matches,
        matchQueue: matches,
        status: "planning",
        couples // Salva as duplas para o Modo TV
      });
    }
  }, [isLoaded, numCouples, config.numCourts, config.groupFormat, couples]);

  // Handle score change with validation and sync
  const handleScoreChange = useCallback((globalId: string, scoreA: string, scoreB: string) => {
    const validation = validateScore(scoreA, scoreB, config.durationType);
    if (!validation.isValid) {
      console.warn(`Score validation warning: ${validation.error}`);
    }
    updateMatchScore(globalId, scoreA, scoreB, config.durationType);
  }, [validateScore, updateMatchScore, config.durationType]);

  const handleStartOperation = () => {
    const queue = [...data.matches];
    const inProgress: Record<number, EngineMatch> = {};
    const remainingQueue = [...queue];

    for (let i = 1; i <= config.numCourts; i++) {
      const idx = remainingQueue.findIndex(() => true); // Any match is fine for fixed doubles (no player overlap by default in round-robin)
      if (idx !== -1) {
        const nextMatch = remainingQueue.splice(idx, 1)[0];
        inProgress[i] = { ...nextMatch, court: i };
      }
    }

    updateData({
      ...data,
      status: "operation",
      matchQueue: remainingQueue,
      inProgressMatches: inProgress,
      completedMatches: []
    });
    setActiveTab("operation");
  };

  const handleFinishMatch = (courtNumber: number) => {
    const finishedMatch = data.inProgressMatches[courtNumber];
    if (!finishedMatch) return;

    const result = data.matchResults[finishedMatch.globalId];
    if (!result || result.scoreA === "" || result.scoreB === "") {
      alert("Preencha o placar antes de finalizar.");
      return;
    }

    const newInProgress = { ...data.inProgressMatches };
    delete newInProgress[courtNumber];
    const newCompleted = [...data.completedMatches, finishedMatch];
    const newQueue = [...data.matchQueue];

    // Refill court
    if (newQueue.length > 0) {
      const nextMatch = newQueue.shift()!;
      newInProgress[courtNumber] = { ...nextMatch, court: courtNumber };
    }

    updateData({
      ...data,
      inProgressMatches: newInProgress,
      completedMatches: newCompleted,
      matchQueue: newQueue
    });
  };

  const handleCallNextMatches = () => {
    const newInProgress = { ...data.inProgressMatches };
    const newQueue = [...data.matchQueue];
    let changed = false;

    for (let c = 1; c <= config.numCourts; c++) {
      if (!newInProgress[c] && newQueue.length > 0) {
        const nextMatch = newQueue.shift()!;
        newInProgress[c] = { ...nextMatch, court: c };
        changed = true;
      }
    }

    if (changed) {
      updateData({
        ...data,
        inProgressMatches: newInProgress,
        matchQueue: newQueue
      });
    }
  };

  const allGroupMatchesDone = useMemo(() => {
    const groupMatches = data.completedMatches.filter(m => !m.isPlayoff);
    const total = data.matches.filter(m => !m.isPlayoff).length;
    return total > 0 && groupMatches.length >= total;
  }, [data.completedMatches, data.matches]);

  const handleGeneratePlayoff = () => {
    if (playoffFormat === "none") return;
    const pts = Array(numCouples).fill(0);
    const diff = Array(numCouples).fill(0);
    const games = Array(numCouples).fill(0);
    data.completedMatches.filter(m => !m.isPlayoff).forEach(m => {
      const res = data.matchResults[m.globalId];
      if (!res || res.scoreA === "" || res.scoreB === "") return;
      const sA = sumScore(res.scoreA); const sB = sumScore(res.scoreB);
      const pA = m.teamA[0]; const pB = m.teamB[0];
      diff[pA] += sA - sB; games[pA] += sA;
      diff[pB] += sB - sA; games[pB] += sB;
      // getMatchWinner conta sets ganhos, não soma de games (correção do bug)
      const winner = getMatchWinner(res.scoreA, res.scoreB);
      if (winner === "A") pts[pA] += 3;
      else if (winner === "B") pts[pB] += 3;
      else { pts[pA] += 1; pts[pB] += 1; }
    });
    const ranked = Array.from({ length: numCouples }, (_, i) => ({ index: i, pts: pts[i], diff: diff[i], games: games[i] }))
      .sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.games - a.games)
      .map(r => r.index);
    const playoffMatches = generateDoublesSeries(ranked, playoffFormat as "series" | "knockout");
    updateData({
      ...data,
      matches: [...data.matches, ...playoffMatches],
      matchQueue: [...data.matchQueue, ...playoffMatches]
    });
    setActiveTab("series");
  };

  // Ranking calculation
  const ranking = useMemo(() => {
    const pts = Array(numCouples).fill(0);
    const wins = Array(numCouples).fill(0);
    const diff = Array(numCouples).fill(0);
    const games = Array(numCouples).fill(0);

    const matchesToProcess = data.status === "planning" ? data.matches : data.completedMatches;

    matchesToProcess.forEach(m => {
      const res = data.matchResults[m.globalId];
      if (!res || res.scoreA === "" || res.scoreB === "") return;
      const sA = sumScore(res.scoreA);
      const sB = sumScore(res.scoreB);

      const pA = m.teamA[0]; // Couple index
      const pB = m.teamB[0]; // Couple index

      diff[pA] += (sA - sB);
      games[pA] += sA;
      diff[pB] += (sB - sA);
      games[pB] += sB;

      // getMatchWinner conta sets ganhos, não soma de games (correção do bug)
      const winner = getMatchWinner(res.scoreA, res.scoreB);
      if (winner === "A") { wins[pA]++; pts[pA] += 3; }
      else if (winner === "B") { wins[pB]++; pts[pB] += 3; }
      else { pts[pA] += 1; pts[pB] += 1; }
    });

    const items = Array.from({ length: numCouples }, (_, i) => ({
      index: i,
      name: couples[i] ? `${couples[i].womanName} & ${couples[i].manName}` : `Dupla ${i + 1}`,
      pts: pts[i],
      wins: wins[i],
      diff: diff[i],
      games: games[i]
    }));

    if (config.groupFormat === "groups") {
      const half = Math.ceil(numCouples / 2);
      const groupA = items.filter(item => item.index < half).sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.games - a.games);
      const groupB = items.filter(item => item.index >= half).sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.games - a.games);
      return { groupA, groupB };
    }

    return { single: items.sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.games - a.games) };
  }, [data, config, couples, numCouples]);

  const abbreviateName = (name?: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
  };

  const getTeamName = (teamArray: number[]) => {
    return `${abbreviateName(couples[teamArray[0]]?.womanName)} / ${abbreviateName(couples[teamArray[0]]?.manName)}`;
  };

  if (!isLoaded) return <div className="p-8 text-center text-muted">Carregando dados do torneio...</div>;

  if (refereeMatch) {
    const rm = refereeMatch;
    const teamAName = `${couples[rm.match.teamA[0]]?.womanName} & ${couples[rm.match.teamA[0]]?.manName}`;
    const teamBName = `${couples[rm.match.teamB[0]]?.womanName} & ${couples[rm.match.teamB[0]]?.manName}`;
    return (
      <RefereeScoreboard
        teamAName={teamAName}
        teamBName={teamBName}
        courtNumber={rm.court}
        durationType={config.durationType}
          initialSettings={config.matchSettings}
          matchGlobalId={rm.match.globalId}
          tournamentId={config.id}
        onSubmitScore={(scoreA, scoreB) => {
          const resultsCopy = { ...data.matchResults };
          resultsCopy[rm.match.globalId] = { scoreA, scoreB };
          updateField("matchResults", resultsCopy);
          
          setTimeout(() => handleFinishMatch(rm.court), 50);
          setRefereeMatch(null);
        }}
        onLiveScoreUpdate={(state) => {
          const copy = { ...data.liveScores };
          if (state) {
            copy[rm.match.globalId] = state;
          } else {
            delete copy[rm.match.globalId];
          }
          updateField("liveScores", copy);
        }}
        onExit={() => setRefereeMatch(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col mt-4">
      {/* Tabs */}
      <div className="flex px-5 gap-2 mb-4 overflow-x-auto hide-scrollbar">
        {(["overview", "matches", "operation", ...(playoffFormat !== "none" ? ["series"] : []), "standings"]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === t ? "bg-brand-pink text-white" : "surface-card text-secondary hover:text-primary"
            }`}
          >
            {t === "overview" ? "Visão Geral" : t === "matches" ? "Partidas" : t === "operation" ? "Operação" : t === "series" ? "🏆 Fase Final" : "Classificação"}
          </button>
        ))}
      </div>

      {/* Sync Warning Banner */}
      {syncWarning && (
        <div className="mx-5 mt-2 px-4 py-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium animate-pulse">
          ⚡ {syncWarning}
        </div>
      )}

      <div className="px-5 flex-1 overflow-y-auto pb-10">
        {activeTab === "overview" && (
          <div className="surface-card space-y-4">
            <h3 className="font-bold text-primary">{config.format === "fixeddoubles" ? "Duplas Fixas" : "Duplas Sorteadas"}</h3>
            <p className="text-sm text-secondary">{numCouples} duplas · {config.numCourts} quadra(s) · {playoffFormat !== "none" ? (playoffFormat === "series" ? "Fase Final: Séries" : "Fase Final: Mata-Mata") : "Apenas Classificatória"}</p>
            {data.status === "planning" ? (
              <button onClick={handleStartOperation} className="btn-primary w-full">▶ Iniciar Torneio (Modo Operação)</button>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg border border-green-500/20 text-sm font-bold text-center">🟢 Torneio em andamento</div>
                {playoffFormat !== "none" && allGroupMatchesDone && !data.matches.some(m => m.isPlayoff) && (
                  <button onClick={handleGeneratePlayoff} className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-yellow-500 to-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:opacity-90 transition-opacity">
                    🏆 Gerar Fase Final ({playoffFormat === "series" ? "Séries" : "Mata-Mata"})
                  </button>
                )}
                {data.matches.some(m => m.isPlayoff) && (
                  <button onClick={() => setActiveTab("series")} className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest border-2 border-yellow-500/50 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors">
                    🏆 Ver Fase Final
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "matches" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from(new Set(data.matches.map(m => m.round))).sort((a, b) => (a as number) - (b as number)).map(r => (
              <div key={r as number} className="surface-card p-0 overflow-hidden">
                <div className="p-4 bg-brand-pink/5">
                  <div className="font-black text-brand-pink mb-4 text-xl text-center">Rodada {r}</div>
                  <div className="space-y-3">
                    {data.matches.filter(m => m.round === r).map(m => {
                      const res = data.matchResults[m.globalId];
                      const { text: scoreText, winner } = formatMatchScore(res?.scoreA, res?.scoreB);
                      return (
                        <div 
                          key={m.globalId} 
                          onClick={() => setEditingMatchId(m.globalId)}
                          className="flex flex-col p-3 bg-black/40 rounded-xl border border-white/10 shadow-lg relative overflow-hidden cursor-pointer hover:border-brand-pink/50 transition-all group"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-pink/50 group-hover:bg-brand-pink transition-colors"></div>
                          <div className="flex justify-between items-center mb-2 px-2">
                            <div className="text-[10px] text-brand-pink/70 font-black uppercase tracking-widest">Quadra {m.court}</div>
                            <div className="text-[10px] text-white/30 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">✏️ Editar</div>
                          </div>
                          <div className="flex items-center gap-2 pl-2">
                            <div className={`flex-1 text-right text-[14px] font-black tracking-tight truncate ${winner === "A" ? "text-yellow-400" : "text-white"}`}>
                              {winner === "A" && "👑 "}
                              {getTeamName(m.teamA)}
                            </div>
                            <div className="flex gap-2 items-center shrink-0">
                              <span className="text-sm font-black text-white bg-brand-pink/20 border border-brand-pink/30 px-3 py-1 rounded-lg min-w-[3.5rem] text-center whitespace-nowrap shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                                {scoreText}
                              </span>
                            </div>
                            <div className={`flex-1 text-left text-[14px] font-black tracking-tight truncate ${winner === "B" ? "text-yellow-400" : "text-white"}`}>
                              {getTeamName(m.teamB)}
                              {winner === "B" && " 👑"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "operation" && (
          <div className="flex flex-col h-full min-h-[500px]">
            {/* Controls Row - Quadras ao Vivo, Chamar Próximas */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-border-main/50">
              <h3 className="font-black text-primary text-lg uppercase tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Quadras ao Vivo
              </h3>
              {data.matchQueue.length > 0 && (
                <button onClick={handleCallNextMatches} className="text-xs font-black text-brand-cyan hover:opacity-80 flex items-center gap-1 bg-brand-cyan/5 px-3 py-1.5 rounded border border-brand-cyan/20">🔔 Chamar Próximas ({data.matchQueue.length})</button>
              )}
            </div>

            {/* Live Courts Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: config.numCourts }, (_, i) => i + 1).map(c => {
                  const m = data.inProgressMatches[c];
                  return (
                    <div key={c} className={`surface-card border-l-4 ${m ? 'border-l-brand-cyan bg-brand-cyan/5 shadow-lg' : 'border-l-border-main opacity-60'} rounded-xl overflow-hidden`}>
                      <div className="flex justify-between items-center mb-3 text-sm font-black text-brand-cyan uppercase tracking-widest px-1">
                        Quadra {c}
                        {m && (
                          <div className="flex items-center gap-2">
                            <ShareMatchButton matchGlobalId={m.globalId} tournamentId={config.id} variant="compact" />
                            <span className="text-[10px] bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 px-2 py-0.5 rounded font-black tracking-widest animate-pulse">AO VIVO</span>
                          </div>
                        )}
                      </div>
                      {m ? (
                        <div className="space-y-4">
                          <div className="w-full mb-4 bg-black/20 p-2 rounded-lg border border-white/5 space-y-2">
                            {/* Team names row */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 text-right min-w-0">
                                <div className="text-[12px] md:text-[14px] font-black text-white tracking-tight leading-snug">
                                  {getTeamName(m.teamA)}
                                </div>
                              </div>
                              <span className="text-[9px] text-white/30 font-black italic shrink-0">VS</span>
                              <div className="flex-1 text-left min-w-0">
                                <div className="text-[12px] md:text-[14px] font-black text-white tracking-tight leading-snug">
                                  {getTeamName(m.teamB)}
                                </div>
                              </div>
                            </div>
                            {/* Score input row */}
                            <div className="flex justify-center">
                              <ScoreInput
                                scoreA={String(data.matchResults?.[m.globalId]?.scoreA ?? "")}
                                scoreB={String(data.matchResults?.[m.globalId]?.scoreB ?? "")}
                                onChange={(newA, newB) => handleScoreChange(m.globalId, newA, newB)}
                                isValid={isGame6ScoreValid(String(data.matchResults?.[m.globalId]?.scoreA ?? ""), String(data.matchResults?.[m.globalId]?.scoreB ?? ""))}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 px-1">
                            <button onClick={() => handleFinishMatch(c)} className="flex-1 bg-brand-cyan hover:bg-cyan-500 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-[0_0_10px_rgba(34,211,238,0.3)]">Finalizar Jogo</button>
                            <button onClick={() => setRefereeMatch({ match: m, court: c })} className="bg-brand-pink text-white hover:bg-pink-600 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-[0_0_10px_rgba(236,72,153,0.3)]">🏆 Árbitro</button>
                          </div>
                        </div>
                      ) : <div className="text-xs text-muted py-8 text-center font-bold italic uppercase tracking-tighter">Quadra Livre</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Queue Section - Below the courts */}
            <div className="mt-6 pt-4 border-t border-border-main/50">
              <h3 className="font-black text-primary text-lg mb-3 uppercase tracking-tight flex items-center justify-between">
                Fila de Espera
                <span className="text-xs bg-brand-pink/10 text-brand-pink px-2 py-0.5 rounded-full">{data.matchQueue.length}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                {data.matchQueue.map((m, idx) => (
                  <div key={m.globalId} className="bg-surface border border-border-main p-2.5 rounded-xl flex items-center gap-3 group">
                    <span className="text-[10px] font-black text-muted w-5 h-5 flex items-center justify-center bg-page rounded-full shrink-0 group-hover:bg-brand-pink/10 group-hover:text-brand-pink">{idx + 1}</span>
                    <div className="flex-1 min-w-0 flex items-center gap-2 text-[11px] font-bold text-primary">
                      <div className="flex-1 text-right truncate">{couples[m.teamA[0]]?.womanName} & {couples[m.teamA[0]]?.manName}</div>
                      <span className="text-[8px] text-muted italic">VS</span>
                      <div className="flex-1 text-left truncate">{couples[m.teamB[0]]?.womanName} & {couples[m.teamB[0]]?.manName}</div>
                    </div>
                  </div>
                ))}
                {data.matchQueue.length === 0 && (
                  <div className="col-span-full text-xs text-muted italic text-center py-6 bg-page/30 rounded-2xl border border-dashed border-border-main">
                    Nenhuma partida na fila.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "series" && playoffFormat !== "none" && (() => {
          const SERIES_CONFIG: Record<string, { label: string; emoji: string; border: string; bg: string; text: string }> = {
            ouro:   { label: "Série Ouro",   emoji: "🥇", border: "border-yellow-400",  bg: "bg-yellow-500/10",  text: "text-yellow-400" },
            prata:  { label: "Série Prata",  emoji: "🥈", border: "border-slate-400",   bg: "bg-slate-500/10",   text: "text-slate-300" },
            bronze: { label: "Série Bronze", emoji: "🥉", border: "border-orange-400",  bg: "bg-orange-500/10",  text: "text-orange-400" },
            cobre:  { label: "Série Cobre",  emoji: "🔶", border: "border-purple-400",  bg: "bg-purple-500/10",  text: "text-purple-400" },
          };
          const playoffMatches = data.matches.filter(m => m.isPlayoff);
          if (playoffMatches.length === 0) {
            return (
              <div className="surface-card text-center py-12">
                <div className="text-4xl mb-3">🏆</div>
                <p className="font-black text-primary text-lg">Fase Final ainda não gerada</p>
                <p className="text-sm text-muted mt-1">Finalize todas as partidas da fase de grupos para liberar este botão.</p>
              </div>
            );
          }
          const seriesKeys = ["ouro", "prata", "bronze", "cobre"] as const;
          return (
            <div className="space-y-6">
              {seriesKeys.map(sKey => {
                const sm = playoffMatches.filter(m => m.playoffSeries === sKey);
                if (sm.length === 0) return null;
                const cfg = SERIES_CONFIG[sKey];
                return (
                  <div key={sKey} className={`surface-card border-2 ${cfg.border}`}>
                    <div className={`flex items-center gap-2 mb-4`}>
                      <span className="text-2xl">{cfg.emoji}</span>
                      <h3 className={`font-black text-xl ${cfg.text}`}>{cfg.label}</h3>
                      {playoffFormat === "knockout" && <span className="ml-auto text-[10px] uppercase tracking-widest text-muted font-bold">Mata-Mata</span>}
                    </div>
                    <div className="space-y-3">
                      {sm.map(m => {
                        const res = data.matchResults[m.globalId];
                        const { text: scoreText, winner } = formatMatchScore(res?.scoreA, res?.scoreB);
                        const stageLabel = m.playoffStage === "semifinal" ? "Semifinal" : m.playoffStage === "final" ? "Final" : `Rodada ${m.round}`;
                        return (
                          <div key={m.globalId} onClick={() => setEditingMatchId(m.globalId)} className={`flex flex-col p-3 rounded-xl border ${cfg.border}/30 ${cfg.bg} cursor-pointer hover:border-opacity-100 transition-all group`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.text}`}>{stageLabel}</span>
                              <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity">✏️ Editar</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`flex-1 text-right text-sm font-black truncate ${winner === "A" ? "text-yellow-400" : "text-white"}`}>{winner === "A" && "👑 "}{getTeamName(m.teamA)}</div>
                              <span className="text-sm font-black text-white bg-black/40 border border-white/10 px-3 py-1 rounded-lg min-w-[3.5rem] text-center shrink-0">{scoreText}</span>
                              <div className={`flex-1 text-left text-sm font-black truncate ${winner === "B" ? "text-yellow-400" : "text-white"}`}>{getTeamName(m.teamB)}{winner === "B" && " 👑"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {activeTab === "standings" && (
          <div className="space-y-6">
            {(ranking as any).groupA ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="surface-card overflow-x-auto">
                  <h3 className="font-black text-brand-pink mb-4 text-center">Grupo A</h3>
                  <table className="w-full text-sm text-left">
                    <thead><tr className="text-muted border-b border-main"><th className="pb-2">Pos</th><th className="pb-2">Dupla</th><th className="pb-2 text-center">Pts</th><th className="pb-2 text-center">V</th><th className="pb-2 text-center">SG</th></tr></thead>
                    <tbody>{(ranking as any).groupA.map((r: any, idx: number) => <tr key={r.index} className="border-b border-border-main/50 last:border-0"><td className="py-2 text-muted font-bold">{idx + 1}</td><td className="py-2 text-primary font-medium">{r.name}</td><td className="py-2 text-center text-green-500 font-bold">{r.pts}</td><td className="py-2 text-center">{r.wins}</td><td className="py-2 text-center font-bold">{r.diff}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="surface-card overflow-x-auto">
                  <h3 className="font-black text-brand-cyan mb-4 text-center">Grupo B</h3>
                  <table className="w-full text-sm text-left">
                    <thead><tr className="text-muted border-b border-main"><th className="pb-2">Pos</th><th className="pb-2">Dupla</th><th className="pb-2 text-center">Pts</th><th className="pb-2 text-center">V</th><th className="pb-2 text-center">SG</th></tr></thead>
                    <tbody>{(ranking as any).groupB.map((r: any, idx: number) => <tr key={r.index} className="border-b border-border-main/50 last:border-0"><td className="py-2 text-muted font-bold">{idx + 1}</td><td className="py-2 text-primary font-medium">{r.name}</td><td className="py-2 text-center text-green-500 font-bold">{r.pts}</td><td className="py-2 text-center">{r.wins}</td><td className="py-2 text-center font-bold">{r.diff}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="surface-card overflow-x-auto">
                <h3 className="font-black text-brand-pink mb-4">Classificação Geral</h3>
                <table className="w-full text-sm text-left">
                  <thead><tr className="text-muted border-b border-main"><th className="pb-2">Pos</th><th className="pb-2">Dupla</th><th className="pb-2 text-center">Pts</th><th className="pb-2 text-center">V</th><th className="pb-2 text-center">SG</th><th className="pb-2 text-center text-brand-pink/70">GP</th></tr></thead>
                  <tbody>{(ranking as any).single.map((r: any, idx: number) => <tr key={r.index} className="border-b border-border-main/50 last:border-0"><td className="py-2 text-muted font-bold">{idx + 1}</td><td className="py-2 text-primary font-medium">{r.name}</td><td className="py-2 text-center text-green-500 font-bold">{r.pts}</td><td className="py-2 text-center">{r.wins}</td><td className="py-2 text-center font-bold">{r.diff}</td><td className="py-2 text-center text-brand-pink/70">{r.games}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Edit Modal */}
      {editingMatchId && (() => {
        const match = data.matches.find(m => m.globalId === editingMatchId);
        if (!match) return null;
        const res = data.matchResults[editingMatchId] || { scoreA: "", scoreB: "" };
        
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="surface-card w-full max-w-lg p-8 animate-fade-in border-2 border-brand-pink/30 shadow-[0_0_50px_rgba(236,72,153,0.2)]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-primary uppercase tracking-tighter italic">Editar Placar</h3>
                <button onClick={() => setEditingMatchId(null)} className="text-muted hover:text-white transition-colors">✕</button>
              </div>

              <div className="flex flex-col items-center gap-8 mb-10">
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex-1 text-right font-black text-lg text-primary truncate leading-tight">
                    {getTeamName(match.teamA)}
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-4 bg-black/40 p-4 rounded-3xl border border-white/10">
                    <ScoreInput
                      scoreA={String(res.scoreA)}
                      scoreB={String(res.scoreB)}
                      onChange={(newA, newB) => handleScoreChange(editingMatchId, newA, newB)}
                      isValid={isGame6ScoreValid(String(res.scoreA), String(res.scoreB))}
                    />
                  </div>

                  <div className="flex-1 text-left font-black text-lg text-primary truncate leading-tight">
                    {getTeamName(match.teamB)}
                  </div>
                </div>

                {!isGame6ScoreValid(res.scoreA, res.scoreB) && (
                  <div className="text-xs font-bold text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
                    ⚠️ A soma dos games deve ser exatamente {gamesPerSet} para este formato.
                  </div>
                )}
              </div>

              <button 
                onClick={() => setEditingMatchId(null)}
                className="btn-primary w-full py-4 text-sm font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(236,72,153,0.3)]"
              >
                Confirmar Ajuste
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
