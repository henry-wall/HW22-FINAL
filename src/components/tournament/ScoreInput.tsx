import { useState, useEffect } from "react";
import { formatMatchScore } from "../../utils/scoreFormatting";

interface ScoreInputProps {
  scoreA: string;
  scoreB: string;
  onChange: (scoreA: string, scoreB: string) => void;
  isValid?: boolean;
}

export function ScoreInput({ scoreA, scoreB, onChange, isValid = true }: ScoreInputProps) {
  const [localVal, setLocalVal] = useState("");

  // Initialize and sync from external state if it matches a nicely formatted version
  useEffect(() => {
    if (!scoreA && !scoreB) {
      setLocalVal("");
      return;
    }
    const formatted = formatMatchScore(scoreA, scoreB).text;
    // Only update local value if it parses to the same score to allow user typing
    const parsed = parseScoreInput(localVal);
    if (parsed.scoreA !== scoreA || parsed.scoreB !== scoreB) {
      setLocalVal(formatted === "-" ? "" : formatted);
    }
  }, [scoreA, scoreB]);

  const parseScoreInput = (text: string) => {
    if (!text.trim()) return { scoreA: "", scoreB: "" };
    const sets = text.split("/").map(s => s.trim());
    const a: string[] = [];
    const b: string[] = [];
    sets.forEach(s => {
      const parts = s.split(":");
      a.push(parts[0] ? parts[0].trim() : "0");
      b.push(parts[1] ? parts[1].trim() : "0");
    });
    return { scoreA: a.join("/"), scoreB: b.join("/") };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow numbers, spaces, slashes and colons
    if (!/^[0-9\s/: ]*$/.test(val)) return;
    
    setLocalVal(val);
    const { scoreA: newA, scoreB: newB } = parseScoreInput(val);
    onChange(newA, newB);
  };

  const handleBlur = () => {
    if (!scoreA && !scoreB) {
      setLocalVal("");
      return;
    }
    const formatted = formatMatchScore(scoreA, scoreB).text;
    setLocalVal(formatted === "-" ? "" : formatted);
  };

  return (
    <input
      type="text"
      className={`w-32 h-9 input-dark text-center text-sm font-black px-2 shadow-inner ${
        !isValid ? "border-red-500 shadow-red-500/10" : "border-border-main"
      }`}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="Ex: 6:2 / 4:6 / 10:8"
    />
  );
}
