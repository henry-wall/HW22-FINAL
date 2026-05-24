import type { TournamentConfig } from "../types/tournament";
import type { TournamentData } from "../hooks/useTournamentData";

export interface RankingItem {
  index: number;
  name: string;
  wins: number;
  diff: number;
  games: number; // Games For (GP)
  pts?: number;
  isWinner?: boolean;
  isRunnerUp?: boolean;
}

/**
 * Soma o total de games de um placar armazenado (ex: "6/4/10" → 20).
 * Usado para calcular SALDO DE GAMES e GAMES PRÓ — NÃO para determinar vencedor da partida.
 */
export const sumScore = (val: string | number): number => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return String(val).split("/").reduce((acc, curr) => acc + (Number(curr) || 0), 0);
};

/**
 * Determina o vencedor de uma partida contando SETS ganhos (não total de games).
 *
 * Placar armazenado: scoreA = "6/4/10", scoreB = "4/6/8"
 *   Set 1: 6 > 4 → A vence  |  Set 2: 4 < 6 → B vence  |  Set 3: 10 > 8 → A vence
 *   Resultado: A venceu 2-1 em sets → retorna 'A'
 *
 * Empate em sets → desempate por total de games (saldo).
 *
 * ⚠️ BUG ANTERIOR: usava sumScore() direto, que soma TODOS os games de todos os sets.
 *    Exemplo errado: A vence (4:3 / 0:4 / 4:3) → sumScore(A)=8 < sumScore(B)=10 → B ganhava ❌
 *    Com getMatchWinner: sets A=2, sets B=1 → A ganha ✅
 */
export function getMatchWinner(
  scoreA: string | number,
  scoreB: string | number
): "A" | "B" | "tie" {
  const sA = String(scoreA ?? "").split("/");
  const sB = String(scoreB ?? "").split("/");
  const maxSets = Math.max(sA.length, sB.length);

  let winsA = 0;
  let winsB = 0;

  for (let i = 0; i < maxSets; i++) {
    const a = sA[i] ?? "";
    const b = sB[i] ?? "";
    if (a !== "" && b !== "") {
      const na = Number(a);
      const nb = Number(b);
      if (na > nb) winsA++;
      else if (nb > na) winsB++;
    }
  }

  if (winsA > winsB) return "A";
  if (winsB > winsA) return "B";

  // Sets empatados → desempate por total de games
  const totalA = sA.reduce((acc, v) => acc + (Number(v) || 0), 0);
  const totalB = sB.reduce((acc, v) => acc + (Number(v) || 0), 0);
  if (totalA > totalB) return "A";
  if (totalB > totalA) return "B";
  return "tie";
}

/**
 * Verifica vencedor do confronto direto entre dois participantes.
 * Usa getMatchWinner (por sets), não sumScore.
 */
function getDirectWinner(
  idA: number,
  idB: number,
  matches: any[],
  results: any
): number | null {
  const match = matches.find(
    (m) =>
      (m.teamA.includes(idA) && m.teamB.includes(idB)) ||
      (m.teamA.includes(idB) && m.teamB.includes(idA))
  );
  if (!match) return null;

  const res = results[match.globalId];
  if (!res || res.scoreA === "" || res.scoreB === "") return null;

  const winner = getMatchWinner(res.scoreA, res.scoreB);
  if (winner === "tie") return null;

  const isAInTeamA = match.teamA.includes(idA);
  if (winner === "A") return isAInTeamA ? idA : idB;
  return isAInTeamA ? idB : idA;
}

/**
 * Ordenação avançada respeitando tiebreakerOrder configurado pelo organizador.
 *
 * Formato "Até 6 Games" (game6): saldo de games é o critério primário pois não há
 * "set" — cada partida vale 6 games no total e o vencedor é quem tem mais games.
 */
function advancedSort(
  items: RankingItem[],
  config: TournamentConfig,
  matches: any[],
  results: any
): RankingItem[] {
  const isGame6 = config.durationType === "game6";
  const order = config.tiebreakerOrder || [
    "wins",
    "direct_confrontation",
    "gamediff",
    "gamesfor",
  ];

  return [...items].sort((a, b) => {
    // Em game6 não há "sets" — o saldo de games é sempre o critério primário
    if (isGame6) {
      if (a.diff !== b.diff) return b.diff - a.diff;
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.games - a.games;
    }

    for (const criterion of order) {
      if (criterion === "wins" && a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      if (criterion === "gamediff" && a.diff !== b.diff) {
        return b.diff - a.diff;
      }
      if (criterion === "gamesfor" && a.games !== b.games) {
        return b.games - a.games;
      }
      if (criterion === "direct_confrontation") {
        const directWinner = getDirectWinner(a.index, b.index, matches, results);
        if (directWinner !== null) {
          return directWinner === a.index ? -1 : 1;
        }
      }
    }

    return 0; // Completamente empatados
  });
}

// ---------------------------------------------------------------------------
// MIXED DOUBLES (Troca de Casais)
// ---------------------------------------------------------------------------

export function calculateMixedDoublesRanking(
  config: TournamentConfig,
  data: TournamentData,
  couples: { manName: string; womanName: string }[]
): RankingItem[] {
  const numPlayers = config.numPlayers;
  const wins = Array(numPlayers).fill(0);
  const diff = Array(numPlayers).fill(0);
  const games = Array(numPlayers).fill(0);

  data.completedMatches.forEach((m) => {
    const res = data.matchResults[m.globalId];
    if (!res || res.scoreA === "" || res.scoreB === "") return;

    // getMatchWinner determina o vencedor por sets, não por soma de games
    const winner = getMatchWinner(res.scoreA, res.scoreB);
    const sA = sumScore(res.scoreA);
    const sB = sumScore(res.scoreB);

    const uniqueTeamA = Array.from(new Set(m.teamA));
    const uniqueTeamB = Array.from(new Set(m.teamB));

    uniqueTeamA.forEach((p) => {
      if (winner === "A") wins[p]++;
      diff[p] += sA - sB;
      games[p] += sA;
    });
    uniqueTeamB.forEach((p) => {
      if (winner === "B") wins[p]++;
      diff[p] += sB - sA;
      games[p] += sB;
    });
  });

  const allRankings: RankingItem[] = Array.from({ length: numPlayers }, (_, i) => ({
    index: i,
    name: couples[i]
      ? `${couples[i].manName} & ${couples[i].womanName}`
      : `Casal ${i + 1}`,
    wins: wins[i],
    diff: diff[i],
    games: games[i],
  }));

  const ranked = advancedSort(
    allRankings,
    config,
    data.completedMatches,
    data.matchResults
  );

  // Se houver final explícita (round 999), destacar campeão e vice
  const finalMatch = data.completedMatches.find((m) => m.round === 999);
  if (finalMatch) {
    const res = data.matchResults[finalMatch.globalId];
    if (res && res.scoreA !== "" && res.scoreB !== "") {
      const finalWinner = getMatchWinner(res.scoreA, res.scoreB);
      const winnerIdx =
        finalWinner === "A" ? finalMatch.teamA[0] : finalMatch.teamB[0];
      const runnerUpIdx =
        finalWinner === "A" ? finalMatch.teamB[0] : finalMatch.teamA[0];

      ranked.forEach((r) => {
        if (r.index === winnerIdx) r.isWinner = true;
        if (r.index === runnerUpIdx) r.isRunnerUp = true;
      });

      return [
        ...ranked.filter((r) => r.index === winnerIdx),
        ...ranked.filter((r) => r.index === runnerUpIdx),
        ...ranked.filter(
          (r) => r.index !== winnerIdx && r.index !== runnerUpIdx
        ),
      ];
    }
  }

  return ranked;
}

// ---------------------------------------------------------------------------
// SUPER 8
// ---------------------------------------------------------------------------

export function calculateSuper8Ranking(
  config: TournamentConfig,
  data: TournamentData,
  players: string[]
): RankingItem[] {
  const numPlayers = config.numPlayers;
  const wins = Array(numPlayers).fill(0);
  const diff = Array(numPlayers).fill(0);
  const games = Array(numPlayers).fill(0);

  data.completedMatches.forEach((m) => {
    const res = data.matchResults[m.globalId];
    if (!res || res.scoreA === "" || res.scoreB === "") return;

    // getMatchWinner determina o vencedor por sets, não por soma de games
    const winner = getMatchWinner(res.scoreA, res.scoreB);
    const sA = sumScore(res.scoreA);
    const sB = sumScore(res.scoreB);

    [...m.teamA].forEach((p) => {
      if (winner === "A") wins[p]++;
      diff[p] += sA - sB;
      games[p] += sA;
    });
    [...m.teamB].forEach((p) => {
      if (winner === "B") wins[p]++;
      diff[p] += sB - sA;
      games[p] += sB;
    });
  });

  const allRankings = Array.from(
    { length: numPlayers },
    (_, i) =>
      ({
        index: i,
        name: players[i] || `Jogador ${i + 1}`,
        wins: wins[i],
        diff: diff[i],
        games: games[i],
      } as RankingItem)
  );

  return advancedSort(
    allRankings,
    config,
    data.completedMatches,
    data.matchResults
  );
}

// ---------------------------------------------------------------------------
// KING & QUEEN
// ---------------------------------------------------------------------------

export function calculateKingQueenRanking(
  config: TournamentConfig,
  data: TournamentData,
  players: string[]
): RankingItem[] {
  // Fase de grupos ainda sem séries: usa lógica igual ao Super8
  if (!data.seriesRounds || data.seriesRounds.length === 0) {
    return calculateSuper8Ranking(config, data, players);
  }

  const globalRanking: RankingItem[] = [];

  data.seriesRounds.forEach((series: any, sIdx: number) => {
    const wins = Array(config.numPlayers).fill(0);
    const diff = Array(config.numPlayers).fill(0);
    const gp = Array(config.numPlayers).fill(0);

    series.forEach((rnd: any) => {
      rnd.matches.forEach((m: any) => {
        const res = data.matchResults[m.globalId];
        if (!res || res.scoreA === "" || res.scoreB === "") return;

        // getMatchWinner determina o vencedor por sets, não por soma de games
        const winner = getMatchWinner(res.scoreA, res.scoreB);
        const sA = sumScore(res.scoreA);
        const sB = sumScore(res.scoreB);

        m.teamA.forEach((p: number) => {
          diff[p] += sA - sB;
          gp[p] += sA;
          if (winner === "A") wins[p]++;
        });
        m.teamB.forEach((p: number) => {
          diff[p] += sB - sA;
          gp[p] += sB;
          if (winner === "B") wins[p]++;
        });
      });
    });

    const seriesPlayers: number[] = data.seriesPlayerOrder?.[sIdx] || [];

    const seriesItems: RankingItem[] = seriesPlayers.map((i) => ({
      index: i,
      name: players[i] || `Jogador ${i + 1}`,
      wins: wins[i],
      diff: diff[i],
      games: gp[i],
    }));

    // Usa advancedSort para respeitar tiebreakerOrder do organizador,
    // incluindo confronto direto (antes: sort() hardcoded sem confronto direto)
    const allSeriesMatches = series.flatMap((rnd: any) => rnd.matches);
    const seriesRanked = advancedSort(
      seriesItems,
      config,
      allSeriesMatches,
      data.matchResults
    );

    // Destaca campeão e vice da série ouro (índice 0)
    if (sIdx === 0 && seriesRanked.length > 0) {
      seriesRanked[0].isWinner = true;
      if (seriesRanked[1]) seriesRanked[1].isRunnerUp = true;
    }

    globalRanking.push(...seriesRanked);
  });

  return globalRanking;
}
