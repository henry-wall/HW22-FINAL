import { useState, useMemo, useEffect } from "react";
import type { TournamentConfig } from "../../../types/tournament";
import { useTournamentData } from "../../../hooks/useTournamentData";
import { generateSuper8Schedule } from "../../../engines/super8Engine";
import type { EngineMatch } from "../../../engines/super8Engine";
import { formatMatchScore } from "../../../utils/scoreFormatting";
import { ScoreInput } from "../ScoreInput";
import RefereeScoreboard from "../RefereeScoreboard";
// import { SyncStatusBadge } from "../../shared/SyncStatusBadge";

interface Super8DashboardProps {
  config: TournamentConfig;
  players: string[];
}

export default function Super8Dashboard({ config, players }: Super8DashboardProps) {
  const { data, updateData, updateField, isLoaded } = useTournamentData(config.id);
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "operation" | "standings">("overview");
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean; fromCourt: number | null }>({
    isOpen: false,
    fromCourt: null
  });
  const [refereeMatch, setRefereeMatch] = useState<{ match: EngineMatch; court: number } | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Initial generation
  useEffect(() => {
    if (isLoaded && data.matches.length === 0) {
      const matches = generateSuper8Schedule(config.numPlayers, config.numCourts);
      updateData({
        ...data,
        matches,
        matchQueue: matches,
        status: "planning",
        players // Salva os nomes para o Modo TV
      });
    }
  }, [isLoaded, config.numPlayers, config.numCourts, players]);

  const handleScoreChange = (globalId: string, scoreA: string, scoreB: string) => {
    const copy = { ...data.matchResults };
    if (!copy[globalId]) copy[globalId] = { scoreA: "", scoreB: "" };
    copy[globalId] = { ...copy[globalId], scoreA, scoreB };
    updateField("matchResults", copy);
  };

  // Validates that scoreA + scoreB === 6 for game6 format
  const isGame6ScoreValid = (scoreA: string | number, scoreB: string | number): boolean => {
    if (config.durationType !== "game6") return true;
    if (scoreA === "" || scoreB === "") return true; // not yet filled
    const sumScore = (val: string | number) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      return String(val).split("/").reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    };
    return sumScore(scoreA) + sumScore(scoreB) === 6;
  };

  const handleStartOperation = () => {
    // Fill empty courts
    const queue = [...data.matches];
    const inProgress: Record<number, EngineMatch> = {};
    const remainingQueue = [...queue];

    for (let i = 1; i <= config.numCourts; i++) {
      const busy = new Set<number>();
      Object.values(inProgress).forEach((m) => {
        m.teamA.forEach((p) => busy.add(p));
        m.teamB.forEach((p) => busy.add(p));
      });

      const idx = remainingQueue.findIndex((m) => {
        const pList = [...m.teamA, ...m.teamB];
        return !pList.some((p) => busy.has(p));
      });

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

    // Try to fill all courts
    for (let c = 1; c <= config.numCourts; c++) {
      if (!newInProgress[c]) {
        const busy = new Set<number>();
        Object.values(newInProgress).forEach((m) => {
          m.teamA.forEach((p) => busy.add(p));
          m.teamB.forEach((p) => busy.add(p));
        });

        const idx = newQueue.findIndex((m) => {
          const pList = [...m.teamA, ...m.teamB];
          return !pList.some((p) => busy.has(p));
        });

        if (idx !== -1) {
          const nextMatch = newQueue.splice(idx, 1)[0];
          newInProgress[c] = { ...nextMatch, court: c };
        }
      }
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
      if (!newInProgress[c]) {
        const busy = new Set<number>();
        Object.values(newInProgress).forEach((m) => {
          m.teamA.forEach((p) => busy.add(p));
          m.teamB.forEach((p) => busy.add(p));
        });

        const idx = newQueue.findIndex((m) => {
          const pList = [...m.teamA, ...m.teamB];
          return !pList.some((p) => busy.has(p));
        });

        if (idx !== -1) {
          const nextMatch = newQueue.splice(idx, 1)[0];
          newInProgress[c] = { ...nextMatch, court: c };
          changed = true;
        }
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

  const handleTransferCourt = (fromCourt: number, toCourt: number) => {
    const matchToTransfer = data.inProgressMatches[fromCourt];
    if (!matchToTransfer) return;

    const newInProgress = { ...data.inProgressMatches };
    delete newInProgress[fromCourt];
    newInProgress[toCourt] = { ...matchToTransfer, court: toCourt };

    updateField("inProgressMatches", newInProgress);
    setTransferModal({ isOpen: false, fromCourt: null });

    // Call next matches immediately to fill the newly freed court if possible
    setTimeout(() => {
      // We can't rely on state being immediately updated inside setTimeout without a ref or calling the function differently,
      // but the simplest is just triggering the same logic:
      handleCallNextMatchesForData({...data, inProgressMatches: newInProgress});
    }, 0);
  };

  const handleCallNextMatchesForData = (currentData: any) => {
    const newInProgress = { ...currentData.inProgressMatches };
    const newQueue = [...currentData.matchQueue];
    let changed = false;

    for (let c = 1; c <= config.numCourts; c++) {
      if (!newInProgress[c]) {
        const busy = new Set<number>();
        Object.values(newInProgress).forEach((m: any) => {
          m.teamA.forEach((p: number) => busy.add(p));
          m.teamB.forEach((p: number) => busy.add(p));
        });

        const idx = newQueue.findIndex((m: any) => {
          const pList = [...m.teamA, ...m.teamB];
          return !pList.some((p: number) => busy.has(p));
        });

        if (idx !== -1) {
          const nextMatch = newQueue.splice(idx, 1)[0];
          newInProgress[c] = { ...nextMatch, court: c };
          changed = true;
        }
      }
    }

    if (changed) {
      updateData({
        ...currentData,
        inProgressMatches: newInProgress,
        matchQueue: newQueue
      });
    }
  };

  const getFreeCourts = () => {
    const freeCourts = [];
    for (let c = 1; c <= config.numCourts; c++) {
      if (!data.inProgressMatches[c]) {
        freeCourts.push(c);
      }
    }
    return freeCourts;
  };

  // Ranking calculation
  const ranking = useMemo(() => {
    const wins = Array(config.numPlayers).fill(0);
    const diff = Array(config.numPlayers).fill(0);
    const games = Array(config.numPlayers).fill(0);

    const matchesToProcess = data.status === "planning" ? data.matches : data.completedMatches;

    const sumScore = (val: string | number) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      return String(val).split("/").reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    };

    const processMatch = (m: EngineMatch) => {
      const res = data.matchResults[m.globalId];
      if (!res || res.scoreA === "" || res.scoreB === "") return;
      const sA = sumScore(res.scoreA);
      const sB = sumScore(res.scoreB);

      [...m.teamA].forEach(p => {
        if (sA > sB) wins[p]++;
        diff[p] += (sA - sB);
        games[p] += sA;
      });
      [...m.teamB].forEach(p => {
        if (sB > sA) wins[p]++;
        diff[p] += (sB - sA);
        games[p] += sB;
      });
    };

    matchesToProcess.forEach(processMatch);

    return Array.from({ length: config.numPlayers }, (_, i) => ({
      index: i,
      name: players[i] || `Jogador ${i + 1}`,
      wins: wins[i],
      diff: diff[i],
      games: games[i]
    })).sort((a, b) => {
      if (config.durationType === "game6") return b.diff - a.diff || b.wins - a.wins || b.games - a.games;
      if (config.victoryCondition === "wins") return b.wins - a.wins || b.diff - a.diff || b.games - a.games;
      if (config.victoryCondition === "gamediff") return b.diff - a.diff || b.wins - a.wins || b.games - a.games;
      return b.games - a.games || b.wins - a.wins || b.diff - a.diff;
    });
  }, [data.matches, data.completedMatches, data.matchResults, config.victoryCondition, players, data.status]);

  const handleExportCSV = () => {
    const header = ["Posição", "Jogador", "Vitórias", "Saldo de Games", "Games Pró"];
    const rows = ranking.map((r, idx) => [
      idx + 1,
      r.name,
      r.wins,
      r.diff,
      r.games
    ]);
    const csv = [header.join(";"), ...rows.map(r => r.map(cell => `"${cell}"`).join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Classificacao_Super8.csv`;
    link.click();
  };

  const abbreviateName = (name?: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name;
    return `${parts[0].charAt(0).toUpperCase()}. ${parts[parts.length - 1]}`;
  };

  const getTeamNameNodes = (teamArray: number[]) => (
    <>
      {abbreviateName(players[teamArray[0]])} <span className="mx-0.5 text-white/30 font-normal">&</span> {abbreviateName(players[teamArray[1]])}
    </>
  );

  if (!isLoaded) return <div className="p-8 text-center text-muted">Carregando dados do torneio...</div>;

  // Referee overlay
  if (refereeMatch) {
    const rm = refereeMatch;
    const teamAName = `${players[rm.match.teamA[0]]} & ${players[rm.match.teamA[1]]}`;
    const teamBName = `${players[rm.match.teamB[0]]} & ${players[rm.match.teamB[1]]}`;
    return (
      <RefereeScoreboard
        teamAName={teamAName}
        teamBName={teamBName}
        courtNumber={rm.court}
        durationType={config.durationType}
        initialSettings={config.matchSettings}
        onSubmitScore={(scoreA, scoreB) => {
          const resultsCopy = { ...data.matchResults };
          resultsCopy[rm.match.globalId] = { scoreA: String(scoreA), scoreB: String(scoreB) };
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
        {[
          { id: "overview", label: "Visão Geral" },
          { id: "matches", label: "Partidas" },
          { id: "operation", label: "Operação" },
          { id: "standings", label: "Classificação" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === t.id ? "bg-brand-pink text-white" : "surface-card text-secondary hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-5 flex-1 overflow-y-auto pb-10">
        
        {activeTab === "overview" && (
          <div className="surface-card">
            <h3 className="font-bold text-primary mb-2">Resumo do Torneio</h3>
            <p className="text-sm text-secondary mb-4">Total de {data.matches.length} partidas geradas.</p>
            {data.status === "planning" ? (
              <button onClick={handleStartOperation} className="btn-primary w-full">
                ▶ Iniciar Torneio (Modo Operação)
              </button>
            ) : (
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg border border-green-500/20 text-sm font-bold text-center">
                🟢 Torneio em andamento
              </div>
            )}
          </div>
        )}

        {activeTab === "matches" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from(new Set(data.matches.map((m: EngineMatch) => m.round))).sort((a: any, b: any) => a - b).map(r => (
              <div key={r as number} className="surface-card p-0 overflow-hidden">
                <div className="p-4 bg-brand-pink/5">
                  <div className="font-black text-brand-pink mb-4 text-xl text-center">Rodada {r as number}</div>
                  {data.matches.filter((m: EngineMatch) => m.round === r).map((m: EngineMatch) => {
                    const res = data.matchResults[m.globalId];
                    const { text: scoreText, winner } = formatMatchScore(res?.scoreA, res?.scoreB);
                    return (
                        <div 
                          key={m.globalId} 
                          onClick={() => setEditingMatchId(m.globalId)}
                          className="flex flex-col p-3 bg-black/40 rounded-xl border border-white/10 shadow-lg relative overflow-hidden mb-2 cursor-pointer hover:border-brand-pink/50 transition-all group"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-pink/50 group-hover:bg-brand-pink transition-colors"></div>
                          <div className="flex justify-between items-center mb-2 px-2">
                            <div className="text-[10px] text-brand-pink/70 font-black uppercase tracking-widest">Quadra {m.court}</div>
                            <div className="text-[10px] text-white/30 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">✏️ Editar</div>
                          </div>
                          <div className="flex items-center gap-2 pl-2">
                            <div className={`flex-1 text-right text-[14px] font-black tracking-tight truncate ${winner === "A" ? "text-yellow-400" : "text-white"}`}>
                              {winner === "A" && "👑 "}
                              {getTeamNameNodes(m.teamA)}
                            </div>
                            <div className="flex gap-2 items-center shrink-0">
                              <span className="text-sm font-black text-white bg-brand-pink/20 border border-brand-pink/30 px-3 py-1 rounded-lg min-w-[3.5rem] text-center whitespace-nowrap shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                                {scoreText}
                              </span>
                            </div>
                            <div className={`flex-1 text-left text-[14px] font-black tracking-tight truncate ${winner === "B" ? "text-yellow-400" : "text-white"}`}>
                              {getTeamNameNodes(m.teamB)}
                              {winner === "B" && " 👑"}
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "operation" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[500px]">
            {/* Live Courts Column */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-primary text-lg uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  Quadras ao Vivo
                </h3>
                {data.matchQueue.length > 0 && (
                  <button 
                    onClick={handleCallNextMatches}
                    className="text-xs font-black text-brand-cyan hover:opacity-80 flex items-center gap-1 bg-brand-cyan/5 px-2 py-1 rounded border border-brand-cyan/20"
                  >
                    🔔 Chamar Próximas ({data.matchQueue.length})
                  </button>
                )}
              </div>
              
              {data.status === "planning" ? (
                <div className="text-center text-muted py-12 surface-card border-dashed">
                  O torneio ainda não foi iniciado. Vá na Visão Geral para iniciar.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-start">
                  {Array.from({ length: config.numCourts }, (_, i) => i + 1).map(c => {
                    const m = data.inProgressMatches[c];
                    return (
                      <div key={c} className={`surface-card border-l-4 ${m ? 'border-l-brand-cyan bg-brand-cyan/5 shadow-lg' : 'border-l-border-main opacity-60'} transition-all rounded-xl overflow-hidden`}>
                        <div className="flex justify-between items-center mb-3 px-1">
                          <div className="font-black text-brand-cyan uppercase tracking-widest text-sm">Quadra {c}</div>
                          {m && (
                            <div className="flex items-center gap-2">
                              {getFreeCourts().length > 0 && (
                                <button 
                                  onClick={() => setTransferModal({ isOpen: true, fromCourt: c })}
                                  className="text-[10px] font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                                  title="Mover partida para uma quadra livre"
                                >
                                  🔄 Trocar
                                </button>
                              )}
                              <span className="text-[10px] font-black tracking-widest text-brand-cyan bg-brand-cyan/20 border border-brand-cyan/30 px-2 py-0.5 rounded animate-pulse">AO VIVO</span>
                            </div>
                          )}
                        </div>
                        
                        {m ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 w-full mb-4 bg-black/20 p-2 rounded-lg border border-white/5">
                              {/* Team A */}
                              <div className="flex-1 text-right min-w-0">
                                <div className="text-[14px] text-white truncate tracking-tight">
                                  {getTeamNameNodes(m.teamA)}
                                </div>
                              </div>

                              {/* Placar */}
                              <div className="shrink-0">
                                <ScoreInput
                                  scoreA={String(data.matchResults[m.globalId]?.scoreA ?? "")}
                                  scoreB={String(data.matchResults[m.globalId]?.scoreB ?? "")}
                                  onChange={(newA, newB) => handleScoreChange(m.globalId, newA, newB)}
                                  isValid={isGame6ScoreValid(String(data.matchResults[m.globalId]?.scoreA ?? ""), String(data.matchResults[m.globalId]?.scoreB ?? ""))}
                                />
                              </div>

                              {/* Team B */}
                              <div className="flex-1 text-left min-w-0">
                                <div className="text-[14px] text-white truncate tracking-tight">
                                  {getTeamNameNodes(m.teamB)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 px-1">
                              <button 
                                onClick={() => handleFinishMatch(c)} 
                                className="flex-1 bg-brand-cyan hover:bg-cyan-500 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                              >
                                Finalizar Jogo
                              </button>
                              <button 
                                onClick={() => setRefereeMatch({ match: m, court: c })} 
                                className="bg-brand-pink text-white hover:bg-pink-600 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-colors shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                              >
                                🏆 Árbitro
                              </button>
                            </div>
                          </div>
                        ) : <div className="text-xs text-muted py-8 text-center font-bold italic uppercase tracking-tighter">Quadra Livre</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Queue Column */}
            <div className="flex flex-col border-l border-border-main/50 pl-4">
              <h3 className="font-black text-primary text-lg mb-3 uppercase tracking-tight flex items-center justify-between">
                Fila de Espera
                <span className="text-xs bg-brand-pink/10 text-brand-pink px-2 py-0.5 rounded-full">{data.matchQueue.length}</span>
              </h3>
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[600px]">
                {data.matchQueue.map((m, idx) => (
                  <div key={m.globalId} className="bg-surface border border-border-main p-2.5 rounded-xl flex items-center gap-3 transition-all hover:border-brand-pink/30 group">
                    <span className="text-[10px] font-black text-muted w-5 h-5 flex items-center justify-center bg-page rounded-full shrink-0 group-hover:bg-brand-pink/10 group-hover:text-brand-pink">{idx + 1}</span>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="flex-1 text-right text-[11px] font-bold text-primary truncate leading-tight">
                        {players[m.teamA[0]]} <span className="text-[9px] text-muted font-normal">&</span> {players[m.teamA[1]]}
                      </div>
                      <span className="text-[8px] text-muted font-black italic shrink-0">VS</span>
                      <div className="flex-1 text-left text-[11px] font-bold text-primary truncate leading-tight">
                        {players[m.teamB[0]]} <span className="text-[9px] text-muted font-normal">&</span> {players[m.teamB[1]]}
                      </div>
                    </div>
                  </div>
                ))}
                {data.matchQueue.length === 0 && (
                  <div className="text-xs text-muted italic text-center py-10 bg-page/30 rounded-2xl border border-dashed border-border-main">
                    Nenhuma partida na fila.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "standings" && (
          <div className="surface-card overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-primary">Classificação Final</h3>
                <TieBreakerInfo order={config.tiebreakerOrder} durationType={config.durationType} />
              </div>
              <button onClick={handleExportCSV} className="bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 border border-brand-cyan/20 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                📥 Exportar CSV
              </button>
            </div>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-muted border-b border-main">
                  <th className="pb-2 font-semibold">Pos</th>
                  <th className="pb-2 font-semibold">Jogador</th>
                  <th className="pb-2 font-semibold text-center">V</th>
                  <th className="pb-2 font-semibold text-center">SG</th>
                  <th className="pb-2 font-semibold text-center">GP</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, idx) => (
                  <tr key={r.index} className="border-b border-main/50 last:border-0">
                    <td className="py-2 text-muted font-bold">{idx + 1}</td>
                    <td className="py-2 text-primary font-medium">{r.name}</td>
                    <td className="py-2 text-center text-green-600 dark:text-green-400 font-bold">{r.wins}</td>
                    <td className="py-2 text-center text-primary font-bold">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                    <td className="py-2 text-center text-muted">{r.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer Court Modal */}
      {transferModal.isOpen && transferModal.fromCourt !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-main rounded-2xl w-full max-w-sm p-5 animate-fade-in shadow-2xl">
            <h3 className="font-bold text-lg text-primary mb-2">Trocar de Quadra</h3>
            <p className="text-sm text-secondary mb-4">
              A Quadra {transferModal.fromCourt} está ocupada. Selecione uma quadra livre para transferir este jogo:
            </p>
            <div className="space-y-2 mb-6">
              {getFreeCourts().length === 0 ? (
                <div className="text-sm text-red-500 font-bold p-3 bg-red-500/10 rounded border border-red-500/20 text-center">
                  Não há quadras livres no momento.
                </div>
              ) : (
                getFreeCourts().map(freeCourt => (
                  <button
                    key={freeCourt}
                    onClick={() => handleTransferCourt(transferModal.fromCourt!, freeCourt)}
                    className="w-full bg-bg-page border border-border-main hover:border-brand-cyan text-primary font-bold py-3 rounded-xl transition-all flex items-center justify-between px-4"
                  >
                    <span>Mover para Quadra {freeCourt}</span>
                    <span>➡️</span>
                  </button>
                ))
              )}
            </div>
            <button 
              className="btn-secondary w-full py-2 text-sm" 
              onClick={() => setTransferModal({ isOpen: false, fromCourt: null })}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
                    {players[match.teamA[0]]} <br/>
                    <span className="text-brand-pink">&</span> {players[match.teamA[1]]}
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
                    {players[match.teamB[0]]} <br/>
                    <span className="text-brand-pink">&</span> {players[match.teamB[1]]}
                  </div>
                </div>

                {!isGame6ScoreValid(res.scoreA, res.scoreB) && (
                  <div className="text-xs font-bold text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
                    ⚠️ A soma dos games deve ser exatamente 6 para este formato.
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

function TieBreakerInfo({ order, durationType }: { order?: string[]; durationType?: string }) {
  const [show, setShow] = useState(false);
  
  const defaultOrder = durationType === "game6"
    ? ["gamediff", "wins", "gamesfor"]
    : ["wins", "direct_confrontation", "gamediff", "gamesfor"];

  const currentOrder = order || defaultOrder;

  const labels: Record<string, string> = {
    wins: "Vitórias / Pontos",
    direct_confrontation: "Confronto Direto",
    gamediff: "Saldo de Games",
    gamesfor: "Games Pró (GP)",
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShow(!show)}
        className="w-5 h-5 rounded-full border border-brand-cyan/40 text-[11px] flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
      >
        i
      </button>
      {show && (
        <div className="absolute right-0 md:left-0 top-7 w-56 bg-surface border border-main p-4 rounded-xl shadow-2xl z-50 animate-fade-in">
          <p className="text-xs font-bold text-brand-cyan uppercase mb-2 tracking-wider">Critérios de Desempate</p>
          <ul className="space-y-1.5">
            {currentOrder.map((c, i) => (
              <li key={c} className="text-xs text-secondary font-medium">{i + 1}. {labels[c]}</li>
            ))}
          </ul>
          {currentOrder.includes("direct_confrontation") && (
            <p className="mt-3 pt-3 border-t border-main text-[10px] text-muted italic">
              * Confronto direto só se aplica entre exatamente 2 empatados.
            </p>
          )}
          {durationType === "game6" && (
            <p className="mt-3 pt-3 border-t border-main text-[10px] text-muted italic">
              * Empate 3-3 é válido (0 vitórias para cada).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
