export function formatMatchScore(scoreA?: string | number, scoreB?: string | number) {
  if (scoreA === undefined && scoreB === undefined) return { text: "-", winner: null, isTie: true };
  if (scoreA === "" && scoreB === "") return { text: "-", winner: null, isTie: true };

  const sA = String(scoreA || "0").split("/");
  const sB = String(scoreB || "0").split("/");
  
  const maxSets = Math.max(sA.length, sB.length);
  const sets = [];
  
  let winsA = 0;
  let winsB = 0;

  for (let i = 0; i < maxSets; i++) {
    const valA = Number(sA[i] || 0);
    const valB = Number(sB[i] || 0);
    if (valA > valB) winsA++;
    if (valB > valA) winsB++;
    sets.push(`${valA}:${valB}`);
  }

  const text = sets.join(" / ");
  
  let winner: "A" | "B" | "tie" | null = null;
  if (winsA > winsB) {
    winner = "A";
  } else if (winsB > winsA) {
    winner = "B";
  } else {
    // If set wins are tied, check total games
    const totalA = sA.reduce((acc, val) => acc + (Number(val) || 0), 0);
    const totalB = sB.reduce((acc, val) => acc + (Number(val) || 0), 0);
    if (totalA > totalB) winner = "A";
    else if (totalB > totalA) winner = "B";
    else winner = "tie";
  }

  return { text, winner, isTie: winner === "tie" };
}
