export interface EngineMatch {
  id: string;
  globalId: string;
  teamA: number[];
  teamB: number[];
  court?: number;
  round?: number;
  group?: "A" | "B";
}

export function generateSuper8Schedule(
  numPlayers: number,
  numCourts: number
): EngineMatch[] {
  const VALID_N = [4, 5, 8, 9, 12, 13, 16];
  if (!VALID_N.includes(numPlayers)) return [];

  const total = numPlayers % 2 === 0 ? numPlayers : numPlayers + 1;
  const rounds = total - 1;
  const matches: EngineMatch[] = [];

  for (let r = 0; r < rounds; r++) {
    const fixed = 0;
    const rotating = Array.from({ length: total - 1 }, (_, i) => i + 1);
    const rotated = [...rotating.slice(r), ...rotating.slice(0, r)];

    if (rotated.length > 0 && fixed < numPlayers && rotated[rotated.length - 1] < numPlayers) {
      matches.push({
        id: `m${matches.length}`,
        globalId: `m${matches.length}`,
        teamA: [fixed, rotated[rotated.length - 1]],
        teamB: [-1, -1],
      });
    }

    for (let i = 0; i < Math.floor(rotated.length / 2); i++) {
      const a = rotated[i];
      const b = rotated[rotated.length - 2 - i];
      if (a < numPlayers && b < numPlayers && a !== b) {
        matches.push({
          id: `m${matches.length}`,
          globalId: `m${matches.length}`,
          teamA: [a, b],
          teamB: [-1, -1],
        });
      }
    }
  }

  const realMatches: EngineMatch[] = [];
  const used = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    if (matches[i].teamB[0] !== -1) continue;

    const pair1 = matches[i].teamA;
    const key1 = `${Math.min(pair1[0], pair1[1])}-${Math.max(pair1[0], pair1[1])}`;
    if (used.has(key1)) continue;

    for (let j = i + 1; j < matches.length; j++) {
      if (matches[j].teamB[0] !== -1) continue;

      const pair2 = matches[j].teamA;
      const key2 = `${Math.min(pair2[0], pair2[1])}-${Math.max(pair2[0], pair2[1])}`;
      if (used.has(key2)) continue;

      const hasCommon = pair1.some((p) => pair2.includes(p));
      if (!hasCommon) {
        realMatches.push({
          id: `m${realMatches.length}`,
          globalId: `m${realMatches.length}`,
          teamA: pair1,
          teamB: pair2,
          court: (realMatches.length % numCourts) + 1,
          round: Math.floor(realMatches.length / numCourts) + 1,
        });
        used.add(key1);
        used.add(key2);
        matches[j] = { ...matches[j], teamB: [0, 0] };
        break;
      }
    }
  }

  return realMatches;
}
