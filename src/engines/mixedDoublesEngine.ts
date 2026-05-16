import type { EngineMatch } from "./super8Engine";

/**
 * Algoritmo de Troca de Casais (Mixed Doubles Rotating Partners)
 * 
 * Regra: Homem i joga com Mulher (i + r + 1) % N na rodada r.
 * Isso garante que ninguém jogue com seu parceiro original (Marido/Esposa) nos grupos.
 * N é o número de casais.
 */
export function generateMixedDoublesSchedule(
  numCouples: number,
  numCourts: number,
  groupFormat: "single" | "groups"
): EngineMatch[] {
  if (numCouples < 2) return [];

  if (groupFormat === "groups") {
    const half = Math.floor(numCouples / 2);
    const m1 = generateScheduleForN(half, numCourts, "gA_", 0);
    const m2 = generateScheduleForN(numCouples - half, numCourts, "gB_", half);
    
    const result: EngineMatch[] = [];
    let i = 0, j = 0;
    let matchCounter = 0;

    while (i < m1.length || j < m2.length) {
      if (i < m1.length) {
        result.push({ ...m1[i], globalId: `gA_${m1[i].id}`, court: (matchCounter % numCourts) + 1, round: Math.floor(matchCounter / numCourts) + 1 });
        matchCounter++;
        i++;
      }
      if (j < m2.length) {
        result.push({ ...m2[j], globalId: `gB_${m2[j].id}`, court: (matchCounter % numCourts) + 1, round: Math.floor(matchCounter / numCourts) + 1 });
        matchCounter++;
        j++;
      }
    }
    return result;
  }

  return generateScheduleForN(numCouples, numCourts);
}

function generateScheduleForN(N: number, courts: number, prefix: string = "", offset: number = 0): EngineMatch[] {
  const matches: EngineMatch[] = [];
  const R = N - 1; // N-1 rodadas para rotacionar parceiros

  for (let r = 0; r < R; r++) {
    const pairsThisRound: { man: number; woman: number }[] = [];
    
    for (let i = 0; i < N; i++) {
      const man = i;
      const woman = (i + r + 1) % N;
      pairsThisRound.push({ man: man + offset, woman: woman + offset });
    }

    // Embaralhar duplas para variar confrontos (opcional, mas bom para diversão)
    // Aqui vamos apenas parear em sequência por simplicidade determinística
    for (let k = 0; k < pairsThisRound.length; k += 2) {
      if (k + 1 >= pairsThisRound.length) continue; // BYE se ímpar

      const pairA = pairsThisRound[k];
      const pairB = pairsThisRound[k + 1];

      matches.push({
        id: `${prefix}r${r+1}_m${matches.length + 1}`,
        globalId: `${prefix}r${r+1}_m${matches.length + 1}`,
        // Convenção: [IndiceMulher, IndiceHomem] para cada time
        teamA: [pairA.woman, pairA.man],
        teamB: [pairB.woman, pairB.man],
        round: r + 1,
        court: 1, // Será ajustado no loop principal se necessário
      });
    }
  }

  // Ajustar quadras e rodadas globais para evitar sobreposição se necessário
  return matches.map((m, idx) => ({
    ...m,
    court: (idx % courts) + 1,
    round: Math.floor(idx / courts) + 1
  }));
}
