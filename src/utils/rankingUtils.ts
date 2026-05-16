import type { TournamentConfig } from "../types/tournament";
import type { TournamentData } from "../hooks/useTournamentData";

export interface RankingItem {
  index: number;
  name: string;
  wins: number;
  diff: number;
  games: number; // Games For (GP)
  pts?: number; // Added for KingQueen compatibility
  isWinner?: boolean;
  isRunnerUp?: boolean;
}

export const sumScore = (val: string | number): number => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return String(val).split("/").reduce((acc, curr) => acc + (Number(curr) || 0), 0);
};

/**
 * Helper to check winner of direct match between two participants
 */
function getDirectWinner(idA: number, idB: number, matches: any[], results: any): number | null {
  const match = matches.find(m => 
    (m.teamA.includes(idA) && m.teamB.includes(idB)) ||
    (m.teamA.includes(idB) && m.teamB.includes(idA))
  );
  if (!match) return null;
  const res = results[match.globalId];
  if (!res || res.scoreA === "" || res.scoreB === "") return null;
  
  const isAInTeamA = match.teamA.includes(idA);
  if (sumScore(res.scoreA) > sumScore(res.scoreB)) return isAInTeamA ? idA : idB;
  if (sumScore(res.scoreB) > sumScore(res.scoreA)) return isAInTeamA ? idB : idA;
  return null;
}

/**
 * Advanced sort for fixed couples/players (Mixed/Super8)
 */
function advancedSort(items: RankingItem[], config: TournamentConfig, matches: any[], results: any): RankingItem[] {
  const isGame6 = config.durationType === "game6";
  const order = config.tiebreakerOrder || ["wins", "direct_confrontation", "gamediff", "gamesfor"];

  return [...items].sort((a, b) => {
    // For "Até 6 Games", game difference is always the primary criterion
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

    return 0; // Completely tied
  });
}

export function calculateMixedDoublesRanking(
  config: TournamentConfig,
  data: TournamentData,
  couples: { manName: string; womanName: string }[]
): RankingItem[] {
  const numPlayers = config.numPlayers;
  const wins = Array(numPlayers).fill(0);
  const diff = Array(numPlayers).fill(0);
  const games = Array(numPlayers).fill(0);

  data.completedMatches.forEach(m => {
    const res = data.matchResults[m.globalId];
    if (!res || res.scoreA === "" || res.scoreB === "") return;
    const sA = sumScore(res.scoreA);
    const sB = sumScore(res.scoreB);

    const uniqueTeamA = Array.from(new Set(m.teamA));
    const uniqueTeamB = Array.from(new Set(m.teamB));

    uniqueTeamA.forEach(p => {
      if (sA > sB) wins[p]++;
      diff[p] += (sA - sB);
      games[p] += sA;
    });
    uniqueTeamB.forEach(p => {
      if (sB > sA) wins[p]++;
      diff[p] += (sB - sA);
      games[p] += sB;
    });
  });

  const allRankings: RankingItem[] = Array.from({ length: numPlayers }, (_, i) => ({
    index: i,
    name: couples[i] ? `${couples[i].manName} & ${couples[i].womanName}` : `Casal ${i + 1}`,
    wins: wins[i],
    diff: diff[i],
    games: games[i]
  }));

  // Use advanced sort for Mixed Doubles
  const ranked = advancedSort(allRankings, config, data.completedMatches, data.matchResults);

  const finalMatch = data.completedMatches.find(m => m.round === 999);
  if (finalMatch) {
    const res = data.matchResults[finalMatch.globalId];
    if (res && res.scoreA !== "" && res.scoreB !== "") {
      const sA = sumScore(res.scoreA);
      const sB = sumScore(res.scoreB);
      const winnerIdx = sA > sB ? finalMatch.teamA[0] : finalMatch.teamB[0];
      const runnerUpIdx = sA > sB ? finalMatch.teamB[0] : finalMatch.teamA[0];

      ranked.forEach(r => {
        if (r.index === winnerIdx) r.isWinner = true;
        if (r.index === runnerUpIdx) r.isRunnerUp = true;
      });

      return [
        ...ranked.filter(r => r.index === winnerIdx),
        ...ranked.filter(r => r.index === runnerUpIdx),
        ...ranked.filter(r => r.index !== winnerIdx && r.index !== runnerUpIdx)
      ];
    }
  }

  return ranked;
}

export function calculateSuper8Ranking(
  config: TournamentConfig,
  data: TournamentData,
  players: string[]
): RankingItem[] {
  const numPlayers = config.numPlayers;
  const wins = Array(numPlayers).fill(0);
  const diff = Array(numPlayers).fill(0);
  const games = Array(numPlayers).fill(0);

  data.completedMatches.forEach(m => {
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
  });

  const allRankings = Array.from({ length: numPlayers }, (_, i) => ({
    index: i,
    name: players[i] || `Jogador ${i + 1}`,
    wins: wins[i],
    diff: diff[i],
    games: games[i]
  }) as RankingItem);

  return advancedSort(allRankings, config, data.completedMatches, data.matchResults);
}

export function calculateKingQueenRanking(
  config: TournamentConfig,
  data: TournamentData,
  players: string[]
): RankingItem[] {
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
        const sA = sumScore(res.scoreA);
        const sB = sumScore(res.scoreB);
        
        m.teamA.forEach((p: number) => { 
          diff[p] += sA - sB; 
          gp[p] += sA;
          if (sA > sB) wins[p]++; 
        });
        m.teamB.forEach((p: number) => { 
          diff[p] += sB - sA; 
          gp[p] += sB;
          if (sB > sA) wins[p]++; 
        });
      });
    });

    const seriesPlayers = data.seriesPlayerOrder?.[sIdx] || [];
    const seriesRanked: RankingItem[] = seriesPlayers.map(i => ({
      index: i,
      name: players[i] || `Jogador ${i + 1}`,
      wins: wins[i],
      diff: diff[i],
      games: gp[i]
    })).sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.games - a.games);

    if (sIdx === 0 && seriesRanked.length > 0) {
      seriesRanked[0].isWinner = true;
      if (seriesRanked[1]) seriesRanked[1].isRunnerUp = true;
    }

    globalRanking.push(...seriesRanked);
  });

  return globalRanking;
}
