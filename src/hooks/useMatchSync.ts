import { useCallback, useEffect, useRef } from "react";
import { useTournamentData } from "./useTournamentData";
import type { EngineMatch } from "../engines/super8Engine";

/**
 * Hook para sincronizar resultados entre as abas de partidas e operação.
 * Garante que os placares sejam válidos e consistentes em todo o sistema.
 */
export function useMatchSync(tournamentId: string) {
  const { data, updateField, updateData, isLoaded } = useTournamentData(tournamentId);
  const lastValidationRef = useRef<string>("");

  /**
   * Valida se um placar é válido para o formato do torneio
   */
  const validateScore = useCallback((
    scoreA: string | number,
    scoreB: string | number,
    _durationType?: string
  ): { isValid: boolean; error?: string } => {
    const sA = String(scoreA).trim();
    const sB = String(scoreB).trim();

    // Empty scores are valid (not yet entered)
    if (!sA && !sB) {
      return { isValid: true };
    }

    // If one is empty and the other isn't, it's invalid
    if (!sA || !sB) {
      return { isValid: false, error: "Ambos os placares devem ser preenchidos" };
    }

    // Parse sets format (e.g., "6/4" or "6:2/4:6/10:8")
    const parseSets = (score: string): number[][] => {
      const sets = score.split("/").map(s => {
        const parts = s.split(":");
        return [parseInt(parts[0]) || 0, parseInt(parts[1]) || 0];
      });
      return sets;
    };

    try {
      const setsA = parseSets(sA);
      const setsB = parseSets(sB);

      // Must have same number of sets
      if (setsA.length !== setsB.length) {
        return { isValid: false, error: "Número de sets diferentes entre os times" };
      }

      // Validate each set
      for (let i = 0; i < setsA.length; i++) {
        const [a, b] = setsA[i];
        const [c, d] = setsB[i];
        
        // Games must be non-negative
        if (a < 0 || b < 0 || c < 0 || d < 0) {
          return { isValid: false, error: "Placar inválido" };
        }

        // A team must win at least one set
        if (i === 0 && setsA.length === 1) {
          const totalA = a + c;
          const totalB = b + d;
          if (totalA === 0 && totalB === 0) {
            return { isValid: false, error: "Placar não pode ser 0x0" };
          }
        }
      }

      return { isValid: true };
    } catch {
      return { isValid: false, error: "Formato de placar inválido" };
    }
  }, []);

  /**
   * Atualiza o placar de uma partida com validação e sincronização
   */
  const updateMatchScore = useCallback((
    globalId: string,
    scoreA: string | number,
    scoreB: string | number,
    durationType?: string
  ) => {
    const validation = validateScore(scoreA, scoreB, durationType);
    if (!validation.isValid) {
      console.warn(`Placar inválido para ${globalId}:`, validation.error);
      return false;
    }

    // Update matchResults
    const newResults = { ...data.matchResults };
    newResults[globalId] = { scoreA, scoreB };
    updateField("matchResults", newResults);

    // Clear liveScores for this match (since we have a final score now)
    if (data.liveScores?.[globalId]) {
      const newLiveScores = { ...data.liveScores };
      delete newLiveScores[globalId];
      updateField("liveScores", newLiveScores);
    }

    return true;
  }, [data.matchResults, data.liveScores, updateField, validateScore]);

  /**
   * Verifica e sincroniza todos os resultados pendentes
   * Útil para ser chamado quando o usuário muda de aba
   */
  const syncAllResults = useCallback(() => {
    if (!data) return;

    const newResults = { ...data.matchResults };
    const newLiveScores = { ...data.liveScores };
    let hasChanges = false;

    // Check all in-progress matches
    Object.values(data.inProgressMatches).forEach((match: EngineMatch) => {
      const result = newResults[match.globalId];
      
      // If there's a final score, clear the live score
      if (result?.scoreA && result?.scoreB && newLiveScores[match.globalId]) {
        delete newLiveScores[match.globalId];
        hasChanges = true;
      }
    });

    // Check completed matches - ensure they have valid scores
    data.completedMatches.forEach((match: EngineMatch) => {
      const result = newResults[match.globalId];
      if (!result?.scoreA || !result?.scoreB) {
        console.warn(`Partida concluída sem placar: ${match.globalId}`);
      }
    });

    if (hasChanges) {
      updateData({ liveScores: newLiveScores });
    }

    return hasChanges;
  }, [data, updateData]);

  /**
   * Verifica se há inconsistências no estado do torneio
   */
  const checkConsistency = useCallback((): {
    hasIssues: boolean;
    issues: string[];
  } => {
    if (!data) return { hasIssues: false, issues: [] };

    const issues: string[] = [];

    // Check for matches without scores in completed
    data.completedMatches.forEach((match: EngineMatch) => {
      const result = data.matchResults[match.globalId];
      if (!result?.scoreA && !result?.scoreB) {
        issues.push(`Partida concluída sem placar: ${match.globalId}`);
      }
    });

    // Check for matches with live scores but no final result
    Object.entries(data.liveScores || {}).forEach(([globalId, _liveScore]: [string, any]) => {
      const result = data.matchResults[globalId];
      if (!result?.scoreA && !result?.scoreB) {
        // Live score exists but no final score - this is OK during the match
      }
    });

    return {
      hasIssues: issues.length > 0,
      issues
    };
  }, [data]);

  /**
   * Força sincronização quando há mudança de dados
   */
  useEffect(() => {
    if (!isLoaded) return;

    const currentJson = JSON.stringify({
      matchResults: data.matchResults,
      liveScores: data.liveScores,
      inProgressMatches: data.inProgressMatches
    });

    // Only sync if something changed
    if (currentJson !== lastValidationRef.current) {
      lastValidationRef.current = currentJson;
      
      // Auto-sync: clear live scores when final scores exist
      const newLiveScores = { ...(data.liveScores || {}) };
      let needsUpdate = false;

      Object.keys(newLiveScores).forEach(globalId => {
        const result = data.matchResults[globalId];
        if (result?.scoreA && result?.scoreB) {
          delete newLiveScores[globalId];
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        updateField("liveScores", newLiveScores);
      }
    }
  }, [data.matchResults, data.liveScores, isLoaded, updateField]);

  return {
    validateScore,
    updateMatchScore,
    syncAllResults,
    checkConsistency,
    isLoaded
  };
}