import type { DurationType, MatchSettings } from "../types/tournament";

export function getDefaultMatchSettings(durationType: DurationType): MatchSettings {
  const isSuperTie = durationType === "supertie";
  const isShort = durationType === "shortset";
  const isGame6 = durationType === "game6";
  
  return {
    bestOf: isSuperTie ? 1 : (isShort ? 3 : 1),
    gamesPerSet: isShort ? 4 : 6,
    isNoAd: true,
    hasTieBreak: !isGame6 && durationType !== "supertie",
    tbTrigger: isShort ? 3 : 6,
    tbTarget: 7,
    superTieLastSet: durationType !== "supertie" && durationType !== "game6",
    superTieTarget: 10,
    firstServe: 0,
  };
}

export function getTieBreakTrigger(gamesPerSet: number): number {
  if (gamesPerSet === 4) return 3;
  if (gamesPerSet === 6) return 6;
  if (gamesPerSet === 8) return 8;
  return 6;
}
