import type { EngineMatch } from "./super8Engine";

export interface KingQueenRound {
  round: number;
  matches: EngineMatch[];
}

export function generateKingQueenSchedule(
  numPlayers: number,
  numCourts: number
): KingQueenRound[][] {
  const numGroups = Math.max(1, Math.floor(numPlayers / 4));
  const newGroupRounds: KingQueenRound[][] = [];

  for (let g = 0; g < numGroups; g++) {
    const players4 = [g * 4, g * 4 + 1, g * 4 + 2, g * 4 + 3];
    newGroupRounds.push(generateKingRounds(players4, `g${g}`, g, numCourts));
  }
  return newGroupRounds;
}

export function generateKingQueenSeries(
  rankedPlayerIndices: number[],
  numCourts: number
): { seriesPlayerOrder: number[][]; seriesRounds: KingQueenRound[][] } {
  const numGroups = Math.floor(rankedPlayerIndices.length / 4);
  const seriesPlayerOrder: number[][] = [];
  const seriesRounds: KingQueenRound[][] = [];

  for (let s = 0; s < numGroups; s++) {
    const seriesPlayers = rankedPlayerIndices.slice(s * 4, s * 4 + 4);
    if (seriesPlayers.length < 4) break;
    seriesPlayerOrder.push(seriesPlayers);
    seriesRounds.push(generateKingRounds(seriesPlayers, `s${s}`, s, numCourts));
  }
  return { seriesPlayerOrder, seriesRounds };
}

export function generateKingRounds(playerIndices: number[], prefix: string, courtBase: number, numCourts: number): KingQueenRound[] {
  const [p0, p1, p2, p3] = playerIndices;
  const pairings = [
    { teamA: [p0, p1], teamB: [p2, p3] },
    { teamA: [p0, p2], teamB: [p1, p3] },
    { teamA: [p0, p3], teamB: [p1, p2] },
  ];

  return pairings.map((pairing, r) => ({
    round: r + 1,
    matches: [{
      id: `${prefix}R${r + 1}M1`,
      globalId: `${prefix}_r${r + 1}_m1`,
      round: r + 1,
      teamA: pairing.teamA,
      teamB: pairing.teamB,
      court: (courtBase % Math.max(1, numCourts)) + 1,
    }],
  }));
}
