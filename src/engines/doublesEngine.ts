import type { EngineMatch } from "./super8Engine";

/**
 * Generates a round-robin schedule for fixed doubles.
 * numPairs: number of pairs (teams)
 * numCourts: number of courts available
 * groupFormat: "single" (all against all) or "groups" (split in 2 groups)
 */
export function generateDoublesSchedule(numPairs: number, _numCourts: number, groupFormat: "single" | "groups" = "single"): EngineMatch[] {
  if (groupFormat === "groups") {
    return generateGroupsDoublesSchedule(numPairs);
  }

  // Single group round-robin
  // Using circle method for round robin
  const pairs = Array.from({ length: numPairs }, (_, i) => i);
  if (numPairs % 2 !== 0) {
    pairs.push(-1); // Bye
  }

  const n = pairs.length;
  const numRounds = n - 1;
  const matchesPerRound = n / 2;
  const matches: EngineMatch[] = [];
  let globalId = 0;

  for (let r = 0; r < numRounds; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const p1 = pairs[m];
      const p2 = pairs[n - 1 - m];

      if (p1 !== -1 && p2 !== -1) {
        matches.push({
          id: `m_${globalId}`,
          globalId: `md_${globalId}`,
          round: r + 1,
          teamA: [p1], // In this engine, teamA[0] is the index of the couple
          teamB: [p2],
          court: 0,
        });
        globalId++;
      }
    }
    // Rotate pairs (keep first element fixed)
    pairs.splice(1, 0, pairs.pop()!);
  }

  return matches;
}

function generateGroupsDoublesSchedule(numPairs: number): EngineMatch[] {
  const half = Math.ceil(numPairs / 2);
  const groupA = Array.from({ length: half }, (_, i) => i);
  const groupB = Array.from({ length: numPairs - half }, (_, i) => i + half);

  const matchesA = generateRoundRobin(groupA, "A");
  const matchesB = generateRoundRobin(groupB, "B");

  // Merge and sort by round
  const all = [...matchesA, ...matchesB].sort((a, b) => (a.round || 0) - (b.round || 0));
  
  // Re-assign globalIds
  return all.map((m, i) => ({ ...m, id: `m_${i}`, globalId: `md_${i}` }));
}

function generateRoundRobin(teamIndices: number[], groupLabel: "A" | "B"): EngineMatch[] {
  const pairs = [...teamIndices];
  if (pairs.length % 2 !== 0) {
    pairs.push(-1);
  }

  const n = pairs.length;
  const numRounds = n - 1;
  const matchesPerRound = n / 2;
  const matches: EngineMatch[] = [];

  for (let r = 0; r < numRounds; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const p1 = pairs[m];
      const p2 = pairs[n - 1 - m];

      if (p1 !== -1 && p2 !== -1) {
        matches.push({
          id: "",
          globalId: "",
          round: r + 1,
          teamA: [p1],
          teamB: [p2],
          court: 0,
          group: groupLabel
        });
      }
    }
    pairs.splice(1, 0, pairs.pop()!);
  }
  return matches;
}

/**
 * For Draw Doubles: shuffles players into pairs
 */
export function shufflePlayersIntoPairs(players: string[]): { manName: string; womanName: string }[] {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const pairs: { manName: string; womanName: string }[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push({
      manName: shuffled[i] || `Jogador ${i + 1}`,
      womanName: shuffled[i + 1] || `Jogador ${i + 2}`
    });
  }
  return pairs;
}
