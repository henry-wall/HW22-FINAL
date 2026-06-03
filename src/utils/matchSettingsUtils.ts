import type { DurationType, MatchSettings } from "../types/tournament";

export function getDefaultMatchSettings(durationType: DurationType): MatchSettings {
  const isSuperTie = durationType === "supertie";
  const isShort = durationType === "shortset";
  const isGame6 = durationType === "game6";
  
  // Auto-derive gamesPerSet from durationType (not user-selectable)
  const getGamesPerSet = (type: DurationType) => {
    if (type === "shortset") return 4;
    if (type === "game6") return 7;
    if (type === "supertie") return 0; // N/A for super tie
    return 6; // set6
  };
  
  const gamesPerSet = getGamesPerSet(durationType);
  
  return {
    bestOf: isSuperTie ? 1 : (isShort ? 3 : 1),
    gamesPerSet,
    isNoAd: true,
    hasTieBreak: !isGame6 && durationType !== "supertie",
    tbTrigger: isShort ? 3 : 6,
    tbTarget: 7,
    superTieLastSet: durationType !== "supertie" && durationType !== "game6",
    superTieTarget: 10,
    firstServe: 0,
  };
}

/**
 * Derive gamesPerSet from durationType (auto-calculated, not user input)
 */
export function getGamesPerSetFromDurationType(durationType: DurationType): 0 | 4 | 6 | 7 | 8 {
  switch (durationType) {
    case "shortset":
      return 4;
    case "game6":
      return 7;
    case "supertie":
      return 0; // N/A
    case "set6":
    default:
      return 6;
  }
}

export function getTieBreakTrigger(gamesPerSet: 0 | 4 | 6 | 7 | 8): number {
  if (gamesPerSet === 4) return 3;
  if (gamesPerSet === 6) return 6;
  if (gamesPerSet === 8) return 8;
  return 0; // no tie-break for game6 (7 games) and supertie
}
