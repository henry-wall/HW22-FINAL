import { useState } from "react";
import type { TournamentConfig, TournamentFormat, PairingMode, CoupleMode, Category, VictoryCondition, TiebreakerCriterion, DurationType, TournamentGroupFormat, MatchSettings } from "../types/tournament";
import { getDefaultMatchSettings } from "../utils/matchSettingsUtils";

interface WizardState {
  step: number;
  format: TournamentFormat | null;
  pairingMode: PairingMode;
  coupleMode: CoupleMode;
  category: Category;
  victoryCondition: VictoryCondition;
  tiebreakerOrder: TiebreakerCriterion[];
  durationType: DurationType;
  numPlayers: number;
  numCourts: number;
  groupFormat: TournamentGroupFormat;
  tournamentName: string;
  matchSettings: MatchSettings;
}

const initial: WizardState = {
  step: 1,
  format: null,
  pairingMode: "random",
  coupleMode: "fixed",
  category: "masc",
  victoryCondition: "wins",
  tiebreakerOrder: ["wins", "direct_confrontation", "gamediff", "gamesfor"],
  durationType: "set6",
  numPlayers: 8,
  numCourts: 2,
  groupFormat: "single",
  tournamentName: "",
  matchSettings: getDefaultMatchSettings("set6"),
};

export function useWizard(onComplete: (config: TournamentConfig, players: string[] | { manName: string; womanName: string }[]) => void) {
  const [state, setState] = useState<WizardState>(initial);
  const [players, setPlayers] = useState<string[]>([]);
  const [couples, setCouples] = useState<{ manName: string; womanName: string }[]>([]);



  function update(partial: Partial<WizardState>) {
    setState(prev => {
      const next = { ...prev, ...partial };
      // Sync match settings if duration changes
      if (partial.durationType) {
        next.matchSettings = getDefaultMatchSettings(partial.durationType);
      }
      return next;
    });
  }

  function next() {
    setState(prev => {
      let nextStep = prev.step + 1;
      return { ...prev, step: nextStep };
    });
  }

  function back() {
    setState(prev => {
      let prevStep = prev.step - 1;
      return { ...prev, step: Math.max(1, prevStep) };
    });
  }

  function reset() {
    setState(initial);
    setPlayers([]);
    setCouples([]);
  }

  function getStepCount(): number {
    if (state.format === "mixeddoubles") return 5;
    if (state.format === "fixeddoubles" || state.format === "drawdoubles") return 5;
    return 6;
  }

  function getStepNames(): string[] {
    if (state.format === "mixeddoubles") {
      return ["Formato", "Casais", "Configurações", "Vitória", "Jogadores"];
    }
    if (state.format === "fixeddoubles") {
      return ["Formato", "Categoria", "Configurações", "Vitória", "Duplas"];
    }
    if (state.format === "drawdoubles") {
      return ["Formato", "Categoria", "Configurações", "Vitória", "Jogadores"];
    }
    return ["Formato", "Duplas", "Categoria", "Configurações", "Vitória", "Jogadores"];
  }

  function finish() {
    const config: TournamentConfig = {
      id: `t_${Date.now()}`,
      name: state.tournamentName || `Torneio ${new Date().toLocaleDateString("pt-BR")}`,
      format: state.format!,
      pairingMode: state.pairingMode,
      coupleMode: state.coupleMode,
      category: state.category,
      victoryCondition: state.victoryCondition,
      tiebreakerOrder: state.tiebreakerOrder,
      durationType: state.durationType,
      numPlayers: state.numPlayers,
      numCourts: state.numCourts,
      groupFormat: state.groupFormat,
      matchSettings: state.matchSettings,
      createdAt: new Date().toISOString(),
    };
    if (state.format === "mixeddoubles" || state.format === "fixeddoubles") {
      onComplete(config, couples);
    } else {
      onComplete(config, players);
    }
  }

  return {
    state,
    players,
    setPlayers,
    couples,
    setCouples,
    update,
    next,
    back,
    reset,
    finish,
    totalSteps: getStepCount(),
    stepNames: getStepNames(),
  };
}
