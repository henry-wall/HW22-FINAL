import { useState, useMemo, useEffect } from "react";
import type { TournamentConfig } from "../../../types/tournament";
import { useTournamentData } from "../../../hooks/useTournamentData";
import { generateKingQueenSchedule, generateKingQueenSeries } from "../../../engines/kingQueenEngine";
import type { KingQueenRound } from "../../../engines/kingQueenEngine";
import type { EngineMatch } from "../../../engines/super8Engine";
import { formatMatchScore } from "../../../utils/scoreFormatting";
import { ScoreInput } from "../ScoreInput";
import RefereeScoreboard from "../RefereeScoreboard";

interface KingQueenDashboardProps {
  config: TournamentConfig;
  players: string[];
}

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SERIES_NAMES = ["Ouro 🥇", "Prata 🥈", "Bronze 🥉", "Cobre 🥉", "Ferro ⚙️", "Cristal 🔮", "Elite 🏆", "Acesso 🚀"];
const SERIES_COLORS = [
  { bg: "#FFF3C4", border: "#F59E0B", text: "#92400E" }, // Ouro
  { bg: "#E5E7EB", border: "#9CA3AF", text: "#374151" }, // Prata
  { bg: "#FFEDD5", border: "#EA580C", text: "#7C2D12" }, // Bronze
  { bg: "#FDF4FF", border: "#D946EF", text: "#701A75" }, // Cobre
  { bg: "#F1F5F9", border: "#64748B", text: "#1E293B" }, // Ferro
  { bg: "#ECFDF5", border: "#10B981", text: "#064E3B" }, // Cristal
];

export default function KingQueenDashboard({ config, players }: KingQueenDashboardProps) {
  const { data, updateData, updateField, isLoaded } = useTournamentData(config.id);
  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "operation" | "series" | "standings">("overview");
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean; fromCourt: number | null }>({
    isOpen: false,
    fromCourt: null
  });
  const [refereeMatch, setRefereeMatch] = useState<{ match: EngineMatch; court: number } | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Initial generation
  useEffect(() => {
    if (isLoaded && (!data.groupRounds || data.groupRounds.length === 0)) {
      const groupRounds = generateKingQueenSchedule(config.numPlayers, config.numCourts);
      updateData({
        ...data,
        groupRounds,
        seriesRounds: [],
        seriesPlayerOrder: [],
        status: "planning",
        players // Salva os nomes para o Modo TV
      });
    }
  }, [isLoaded, config.numPlayers, config.numCourts]);

  const numGroups = Math.max(1, Math.floor(config.numPlayers / 4));

  const handleScoreChange = (globalId: string, scoreA: string, scoreB: string) => {
    const copy = { ...data.matchResults };
    if (!copy[globalId]) copy[globalId] = { scoreA: "", scoreB: "" };
    copy[globalId] = { ...copy[globalId], scoreA, scoreB };
    updateField("matchResults", copy);
  };

  const isGame6ScoreValid = (scoreA: string | number, scoreB: string | number): boolean => {
    if (config.durationType !== "game6") return true;
    if (scoreA === "" || scoreB === "") return true;
    const sumScore = (val: string | number) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      return String(val).split("/").reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    };
    return sumScore(scoreA) + sumScore(scoreB) === 6;
  };

  // Group standings
  const groupStandings = useMemo(() => {
    const pts = Array(config.numPlayers).fill(0);
    const w = Array(config.numPlayers).fill(0);
    const diff = Array(config.numPlayers).fill(0);
    const gp = Array(config.numPlayers).fill(0);

    if (data.groupRounds) {
      data.groupRounds.forEach((rounds) => {
        rounds.forEach((rnd: KingQueenRound) => {
          rnd.matches.forEach(m => {
            const res = data.matchResults[m.globalId];
            if (!res || res.scoreA === "" || res.scoreB === "") return;
            const sumScore = (val: string | number) => {
              if (typeof val === "number") return val;
              if (!val) return 0;
              return String(val).split("/").reduce((acc, curr) => acc + (Number(curr) || 0), 0);
            };
            const sA = sumScore(res.scoreA);
            const sB = sumScore(res.scoreB);
            
            const pA = m.teamA;
            const pB = m.teamB;

            pA.forEach(p => { diff[p] += sA - sB; gp[p] += sA; });
            pB.forEach(p => { diff[p] += sB - sA; gp[p] += sB; });
            
            if (sA > sB) {
              pA.forEach(p => { pts[p] += 3; w[p]++; });
            } else if (sB > sA) {
              pB.forEach(p => { pts[p] += 3; w[p]++; });
            }
          });
        });
      });
    }

    return Array.from({ length: config.numPlayers }, (_, i) => ({
      index: i,
      name: players[i] || `Jogador ${i + 1}`,
      pts: pts[i],
      wins: w[i],
      diff: diff[i],
      games: gp[i]
    })).sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.games - a.games);
  }, [data.groupRounds, data.matchResults, players, config.numPlayers]);

  const handleGenerateSeries = () => {
    const rankedIndices = groupStandings.map(s => s.index);
    const { seriesPlayerOrder, seriesRounds } = generateKingQueenSeries(rankedIndices, config.numCourts);
    
    // Anexar as partidas finais à fila de espera caso a operação já tenha iniciado
    const newSeriesMatches: EngineMatch[] = [];
    seriesRounds.forEach(roundArr => {
      roundArr.forEach((rnd: KingQueenRound) => {
        rnd.matches.forEach((m: EngineMatch) => newSeriesMatches.push(m));
      });
    });

    updateData({
      ...data,
      seriesRounds,
      seriesPlayerOrder,
      matches: [...(data.matches || []), ...newSeriesMatches],
      matchQueue: [...(data.matchQueue || []), ...newSeriesMatches]
    });
    setActiveTab("series");
  };

  const handleStartOperation = () => {
    const allMatches: EngineMatch[] = [];
    if (data.groupRounds) {
      data.groupRounds.forEach((group: KingQueenRound[]) => {
        group.forEach((rnd: KingQueenRound) => {
          rnd.matches.forEach((m: EngineMatch) => allMatches.push(m));
        });
      });
    }

    const inProgress: Record<number, EngineMatch> = {};
    const remainingQueue = [...allMatches];

    for (let i = 1; i <= config.numCourts; i++) {
      const busy = new Set<number>();
      Object.values(inProgress).forEach((m) => {
        m.teamA.forEach((p: number) => busy.add(p));
        m.teamB.forEach((p: number) => busy.add(p));
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
      matches: allMatches,
      matchQueue: remainingQueue,
      inProgressMatches: inProgress,
      completedMatches: []
    });
    setActiveTab("operation");
  };

  const handleCallNextMatches = () => {
    handleCallNextMatchesForData(data);
  };

  const handleCallNextMatchesForData = (currentData: any) => {
    const newInProgress = { ...(currentData.inProgressMatches || {}) };
    const newQueue = [...(currentData.matchQueue || [])];
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
    const newCompleted = [...(data.completedMatches || []), finishedMatch];
    const newQueue = [...(data.matchQueue || [])];

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

  const handleTransferCourt = (fromCourt: number, toCourt: number) => {
    const matchToTransfer = data.inProgressMatches[fromCourt];
    if (!matchToTransfer) return;

    const newInProgress = { ...data.inProgressMatches };
    delete newInProgress[fromCourt];
    newInProgress[toCourt] = { ...matchToTransfer, court: toCourt };

    updateField("inProgressMatches", newInProgress);
    setTransferModal({ isOpen: false, fromCourt: null });

    setTimeout(() => {
      handleCallNextMatchesForData({...data, inProgressMatches: newInProgress});
    }, 0);
  };

  const getFreeCourts = () => {
    const freeCourts: number[] = [];
    if (!data.inProgressMatches) return freeCourts;
    for (let c = 1; c <= config.numCourts; c++) {
      if (!data.inProgressMatches[c]) freeCourts.push(c);
    }
    return freeCourts;
  };

  // Series standings
  const getSeriesStandings = (s: number) => {
    const pts = Array(config.numPlayers).fill(0);
    const w = Array(config.numPlayers).fill(0);
    const diff = Array(config.numPlayers).fill(0);
    const gp = Array(config.numPlayers).fill(0);

    if (data.seriesRounds && data.seriesRounds[s]) {
      const sumScore = (val: string | number) => {
        if (typeof val === "number") return val;
        if (!val) return 0;
        return String(val).split("/").reduce((acc, curr) => acc + (Number(curr) || 0), 0);
      };

      data.seriesRounds[s].forEach((rnd: KingQueenRound) => {
        rnd.matches.forEach(m => {
          const res = data.matchResults[m.globalId];
          if (!res || res.scoreA === "" || res.scoreB === "") return;
          const sA = sumScore(res.scoreA);
          const sB = sumScore(res.scoreB);
          
          const pA = m.teamA;
          const pB = m.teamB;

          pA.forEach(p => { diff[p] += sA - sB; gp[p] += sA; });
          pB.forEach(p => { diff[p] += sB - sA; gp[p] += sB; });
          
          if (sA > sB) {
            pA.forEach(p => { pts[p] += 3; w[p]++; });
          } else if (sB > sA) {
            pB.forEach(p => { pts[p] += 3; w[p]++; });
          }
        });
      });
    }

    const playerIndices = data.seriesPlayerOrder?.[s] || [];
    return playerIndices.map(i => ({
      index: i,
      name: players[i] || `Jogador ${i + 1}`,
      pts: pts[i],
      wins: w[i],
      diff: diff[i],
      games: gp[i]
    })).sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.games - a.games);
  };

  const handleExportCSV = () => {
    const header = ["Posição", "Grupo", "Jogador", "Vitórias", "Saldo de Games", "Pontos"];
    const rows = groupStandings.map((r, idx) => [
      idx + 1,
      GROUP_LETTERS[Math.floor(r.index / 4)],
      r.name,
      r.wins,
      r.diff,
      r.pts
    ]);
    const csv = [header.join(";"), ...rows.map(r => r.map(cell => `"${cell}"`).join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Classificacao_KingQueen_FaseGrupos.csv`;
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
      <div className="flex px-5 gap-2 mb-4 overflow-x-auto hide-scrollbar">
        {[
          { id: "overview", label: "Visão Geral" },
          { id: "groups", label: "Fase de Grupos" },
          { id: "operation", label: "Operação" },
          ...(numGroups >= 2 ? [{ id: "series", label: "Séries (Finais)" }] : []),
          { id: "standings", label: "Classificação Geral" }
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

      {/* Quick Edit Modal */}
      {editingMatchId && (() => {
        // Find match in either groups or series
        let match: EngineMatch | undefined;
        
        data.groupRounds?.forEach((group: any) => {
          group.forEach((rnd: any) => {
            const found = rnd.matches.find((m: any) => m.globalId === editingMatchId);
            if (found) match = found;
          });
        });

        if (!match) {
          data.seriesRounds?.forEach((series: any) => {
            series.forEach((rnd: any) => {
              const found = rnd.matches.find((m: any) => m.globalId === editingMatchId);
              if (found) match = found;
            });
          });
        }

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
                      onChange={(newA, newB) => handleScoreChange(editingMatchId!, newA, newB)}
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

      <div className="px-5 flex-1 overflow-y-auto pb-10">
        
        {activeTab === "overview" && (
          <div className="surface-card">
            <h3 className="font-bold text-primary mb-2">Resumo King & Queen</h3>
            <p className="text-sm text-secondary mb-4">
              Formato dividido em 2 fases: Fase de grupos, onde todos jogam dentro de seus grupos de 4 pessoas, seguida pelas Finais divididas em Séries (Ouro, Prata, etc.) baseadas na classificação.
            </p>
            
            {data.status === "planning" ? (
              <button onClick={handleStartOperation} className="btn-primary w-full mb-4">
                ▶ Iniciar Torneio (Modo Operação)
              </button>
            ) : (
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg border border-green-500/20 text-sm font-bold text-center mb-4">
                🟢 Torneio em andamento
              </div>
            )}

            {numGroups >= 2 && (!data.seriesRounds || data.seriesRounds.length === 0) && (
              <button onClick={handleGenerateSeries} className="btn-cyan w-full">
                🏆 Gerar Séries Finais
              </button>
            )}
            {numGroups >= 2 && data.seriesRounds && data.seriesRounds.length > 0 && (
              <div className="text-green-600 dark:text-green-400 font-bold text-sm text-center border border-green-500/20 p-3 rounded bg-green-500/10">
                Séries já geradas! Confira a aba "Séries (Finais)".
              </div>
            )}
          </div>
        )}

        {activeTab === "groups" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.groupRounds?.map((rounds: KingQueenRound[], g: number) => {
              const myStandings = groupStandings.filter(s => Math.floor(s.index / 4) === g);
              return (
              <div key={g} className="surface-card p-0 overflow-hidden">
                <div className="p-4 bg-brand-pink/5">
                  <div className="font-black text-brand-pink mb-4 text-xl text-center">Grupo {GROUP_LETTERS[g]}</div>
                  
                  <div className="bg-bg-page/50 p-3 rounded-lg mb-4 border border-border-main">
                    {myStandings.map((st, i) => (
                      <div key={st.index} className="flex justify-between items-center text-sm py-1 border-b border-border-main last:border-0">
                        <span className={`${i === 0 ? "text-brand-pink font-bold" : "text-secondary"}`}>{i+1}. {st.name}</span>
                        <div className="flex gap-2">
                          <span className="text-muted font-bold">{st.pts} pts</span>
                          <span className="text-muted text-xs w-6 text-right">{st.diff > 0 ? `+${st.diff}` : st.diff}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {rounds.map(rnd => (
                  <div key={rnd.round} className="mb-4 last:mb-0">
                    <div className="text-xs text-muted font-bold mb-2 uppercase tracking-widest">Rodada {rnd.round}</div>
                    {rnd.matches.map(m => {
                      const { text: scoreText, winner } = formatMatchScore(data.matchResults[m.globalId]?.scoreA, data.matchResults[m.globalId]?.scoreB);
                      return (
                        <div 
                          key={m.globalId} 
                          onClick={() => setEditingMatchId(m.globalId)}
                          className="flex flex-col p-3 bg-bg-page/50 rounded-lg border border-border-main mb-2 cursor-pointer hover:border-brand-pink/50 transition-all group"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`flex-1 text-right text-[12px] font-bold truncate ${winner === "A" ? "text-yellow-400" : "text-primary"}`}>
                              {winner === "A" && "👑 "}
                              {players[m.teamA[0]]} & {players[m.teamA[1]]}
                            </div>
                            <div className="flex gap-2 items-center shrink-0">
                              <span className="text-sm font-black text-white bg-black/40 px-3 py-1 rounded-lg min-w-[3rem] text-center whitespace-nowrap group-hover:bg-brand-pink/20 transition-colors">
                                {scoreText}
                              </span>
                            </div>
                            <div className={`flex-1 text-left text-[12px] font-bold truncate ${winner === "B" ? "text-yellow-400" : "text-primary"}`}>
                              {players[m.teamB[0]]} & {players[m.teamB[1]]}
                              {winner === "B" && " 👑"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {activeTab === "series" && data.seriesRounds && data.seriesRounds.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.seriesRounds.map((rounds: KingQueenRound[], s: number) => {
              const color = SERIES_COLORS[s % SERIES_COLORS.length];
              const standings = getSeriesStandings(s);
              return (
                <div key={s} className="surface-card p-0 overflow-hidden" style={{ borderTop: `4px solid ${color.border}` }}>
                  <div className="p-4" style={{ backgroundColor: `${color.bg}08`, height: "100%" }}>
                    <div className="font-black text-xl mb-4 text-center" style={{ color: color.border }}>Série {SERIES_NAMES[s] || `${s+1}`}</div>
                    
                    <div className="bg-bg-page/50 p-3 rounded-lg mb-4 border border-border-main">
                      {standings.map((st, i) => (
                        <div key={st.index} className="flex justify-between items-center text-sm py-1 border-b border-border-main last:border-0">
                          <span className={`${i === 0 ? "text-yellow-600 dark:text-yellow-400 font-bold" : "text-secondary"}`}>{i+1}. {st.name}</span>
                          <div className="flex gap-2">
                            <span className="text-muted font-bold">{st.pts} pts</span>
                            <span className="text-muted text-xs w-6 text-right">{st.diff > 0 ? `+${st.diff}` : st.diff}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                      return (
                        <div 
                              key={m.globalId} 
                              onClick={() => setEditingMatchId(m.globalId)}
                              className="flex flex-col p-3 bg-black/40 rounded-xl border border-white/10 shadow-lg relative overflow-hidden mb-2 cursor-pointer hover:border-brand-cyan/50 transition-all group"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-cyan/50 group-hover:bg-brand-cyan"></div>
                              <div className="text-[10px] text-brand-cyan/70 font-black text-center uppercase tracking-widest mb-2 px-2 flex justify-between">
                                <span>Quadra {m.court}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">✏️ Editar</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 pl-2">
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                  <div className="flex-1 text-right text-[14px] text-white truncate tracking-tight">{getTeamNameNodes(m.teamA)}</div>
                                  <div className="mx-3 text-[10px] text-white/40 font-bold uppercase">vs</div>
                                  <div className="flex-1 text-left text-[14px] text-white truncate tracking-tight">{getTeamNameNodes(m.teamB)}</div>
                                </div>
                                <div className="shrink-0 font-black text-white bg-brand-cyan/20 px-3 py-1 rounded-lg min-w-[3rem] text-center">
                                  {formatMatchScore(data.matchResults[m.globalId]?.scoreA, data.matchResults[m.globalId]?.scoreB).text}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "series" && (!data.seriesRounds || data.seriesRounds.length === 0) && (
          <div className="text-center py-10 surface-card">
            <h3 className="text-lg font-bold text-primary mb-2">Fase Final ainda não gerada</h3>
            <p className="text-muted text-sm mb-4">Complete os jogos da fase de grupos e gere a fase final na aba "Visão Geral".</p>
          </div>
        )}

        {activeTab === "standings" && (
          <div className="surface-card overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs text-secondary bg-brand-pink/5 p-2 rounded border border-brand-pink/20 italic">
                * Esta é a classificação da Fase de Grupos.
              </div>
              <button onClick={handleExportCSV} className="bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 border border-brand-cyan/20 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                📥 Exportar CSV
              </button>
            </div>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-muted border-b border-main">
                  <th className="pb-2 font-semibold">Pos</th>
                  <th className="pb-2 font-semibold text-center">Gr</th>
                  <th className="pb-2 font-semibold">Jogador</th>
                  <th className="pb-2 font-semibold text-center">Pts</th>
                  <th className="pb-2 font-semibold text-center">SG</th>
                  <th className="pb-2 font-semibold text-center text-brand-pink/70">GP</th>
                </tr>
              </thead>
              <tbody>
                {groupStandings.map((r, idx) => (
                  <tr key={r.index} className="border-b border-border-main/50 last:border-0">
                    <td className="py-2 text-muted font-bold">{idx + 1}</td>
                    <td className="py-2 text-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-page text-secondary border border-main font-bold">
                        {GROUP_LETTERS[Math.floor(r.index / 4)]}
                      </span>
                    </td>
                    <td className="py-2 text-primary font-medium">{r.name}</td>
                    <td className="py-2 text-center text-green-600 dark:text-green-400 font-bold">{r.pts}</td>
                    <td className="py-2 text-center text-primary font-bold">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                    <td className="py-2 text-center text-brand-pink/70 font-medium">{r.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {data.matchQueue && data.matchQueue.length > 0 && (
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
                    const m = data.inProgressMatches?.[c];
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
                                  scoreA={String(data.matchResults?.[m.globalId]?.scoreA ?? "")}
                                  scoreB={String(data.matchResults?.[m.globalId]?.scoreB ?? "")}
                                  onChange={(newA, newB) => handleScoreChange(m.globalId, newA, newB)}
                                  isValid={isGame6ScoreValid(String(data.matchResults?.[m.globalId]?.scoreA ?? ""), String(data.matchResults?.[m.globalId]?.scoreB ?? ""))}
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
                        ) : (
                          <div className="text-xs text-muted py-8 text-center font-bold italic uppercase tracking-tighter">Quadra Livre</div>
                        )}
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
                <span className="text-xs bg-brand-pink/10 text-brand-pink px-2 py-0.5 rounded-full">{data.matchQueue?.length || 0}</span>
              </h3>
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[600px]">
                {data.matchQueue?.map((m: any, idx: number) => (
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
                {(!data.matchQueue || data.matchQueue.length === 0) && (
                  <div className="text-xs text-muted italic text-center py-10 bg-page/30 rounded-2xl border border-dashed border-border-main">
                    Nenhuma partida na fila.
                  </div>
                )}
              </div>
            </div>
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
    </div>
  );
}


