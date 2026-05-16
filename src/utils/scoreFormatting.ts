export function formatMatchScore(scoreA?: string | number, scoreB?: string | number) {
  if (scoreA === undefined && scoreB === undefined) return { text: "-", winner: null, isTie: true };
  if (scoreA === "" && scoreB === "") return { text: "-", winner: null, isTie: true };

  const sA = String(scoreA !== undefined && scoreA !== null ? scoreA : "").split("/");
  const sB = String(scoreB !== undefined && scoreB !== null ? scoreB : "").split("/");
  
  const maxSets = Math.max(sA.length, sB.length);
  const sets = [];
  
  let winsA = 0;
  let winsB = 0;

  for (let i = 0; i < maxSets; i++) {
    const valA = sA[i] || "";
    const valB = sB[i] || "";
    if (valA !== "" && valB !== "") {
      if (Number(valA) > Number(valB)) winsA++;
      if (Number(valB) > Number(valA)) winsB++;
    }
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
