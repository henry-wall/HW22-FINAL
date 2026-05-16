import StepProgress from "./StepProgress";
import Step1Format from "./Step1Format";
import Step2Pairing from "./Step2Pairing";
import Step2Couple from "./Step2Couple";
import Step3Category from "./Step3Category";
import Step4Settings from "./Step4Settings";
import Step5Victory from "./Step5Victory";
import Step6Players from "./Step6Players";
import { useWizard } from "../../hooks/useWizard";
import type { TournamentConfig, TournamentEvent } from "../../types/tournament";
import { useState } from "react";

interface TournamentWizardProps {
  events: TournamentEvent[];
  onComplete: (config: TournamentConfig, players: string[] | { manName: string; womanName: string }[], eventId?: string) => void;
  onCancel: () => void;
}

export default function TournamentWizard({ events, onComplete, onCancel }: TournamentWizardProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const { state, players, setPlayers, couples, setCouples, update, next, back, finish: finishWizard, totalSteps, stepNames } = useWizard(
    (config, playersList) => onComplete(config, playersList, selectedEventId)
  );

  const finish = finishWizard;

  function renderStep() {
    const isMixed = state.format === "mixeddoubles";
    const isFixed = state.format === "fixeddoubles";
    const isDraw = state.format === "drawdoubles";
    const isNewDoubles = isFixed || isDraw;

    // Step 1 — Format (all formats)
    if (state.step === 1) {
      return (
        <Step1Format
          selected={state.format}
          onChange={(f) => update({ format: f })}
          onNext={next}
        />
      );
    }

    // Step 2 — Pairing mode (Super8/KQ), Couple mode (Mixed), or Category (New Doubles)
    if (state.step === 2) {
      if (isMixed) {
        return (
          <Step2Couple
            selected={state.coupleMode}
            onChange={(m) => update({ coupleMode: m })}
            onNext={next}
            onBack={back}
          />
        );
      }
      if (isNewDoubles) {
        return (
          <Step3Category
            selected={state.category}
            onChange={(c) => update({ category: c })}
            onNext={next}
            onBack={back}
          />
        );
      }
      return (
        <Step2Pairing
          selected={state.pairingMode}
          onChange={(m) => update({ pairingMode: m })}
          onNext={next}
          onBack={back}
        />
      );
    }

    // Step 3 — Category (Super8/KQ) or Settings (Mixed / New Doubles)
    if (state.step === 3) {
      if (isMixed || isNewDoubles) {
        return (
          <Step4Settings
            format={state.format!}
            numPlayers={state.numPlayers}
            numCourts={state.numCourts}
            durationType={state.durationType}
            groupFormat={state.groupFormat}
            tournamentName={state.tournamentName}
            matchSettings={state.matchSettings}
            onChangeNum={(n) => update({ numPlayers: n })}
            onChangeCourts={(n) => update({ numCourts: n })}
            onChangeDuration={(d) => update({ durationType: d })}
            onChangeGroup={(g) => update({ groupFormat: g })}
            onChangeName={(name) => update({ tournamentName: name })}
            onChangeMatchSettings={(s) => update({ matchSettings: s })}
            onNext={next}
            onBack={back}
          />
        );
      }
      return (
        <Step3Category
          selected={state.category}
          onChange={(c) => update({ category: c })}
          onNext={next}
          onBack={back}
        />
      );
    }

    // Step 4 — Settings (Super8/KQ) or Victory (Mixed / New Doubles)
    if (state.step === 4) {
      if (isMixed || isNewDoubles) {
        return (
          <Step5Victory
            order={state.tiebreakerOrder}
            onChange={(order) => update({ tiebreakerOrder: order })}
            durationType={state.durationType}
            onNext={next}
            onBack={back}
          />
        );
      }
      return (
          <Step4Settings
            format={state.format!}
            numPlayers={state.numPlayers}
            numCourts={state.numCourts}
            durationType={state.durationType}
            groupFormat={state.groupFormat}
            tournamentName={state.tournamentName}
            matchSettings={state.matchSettings}
            onChangeNum={(n) => update({ numPlayers: n })}
            onChangeCourts={(n) => update({ numCourts: n })}
            onChangeDuration={(d) => update({ durationType: d })}
            onChangeGroup={(g) => update({ groupFormat: g })}
            onChangeName={(name) => update({ tournamentName: name })}
            onChangeMatchSettings={(s) => update({ matchSettings: s })}
            onNext={next}
            onBack={back}
          />
      );
    }

    // Step 5 — Victory (Super8/KQ) or Players (Mixed / New Doubles)
    if (state.step === 5) {
      if (isMixed || isNewDoubles) {
        return (
          <Step6Players
            format={state.format!}
            coupleMode={state.coupleMode}
            numPlayers={state.numPlayers}
            players={players}
            couples={couples}
            onPlayersChange={setPlayers}
            onCouplesChange={setCouples}
            onFinish={finish}
            onBack={back}
          />
        );
      }
      return (
        <Step5Victory
          order={state.tiebreakerOrder}
          onChange={(order) => update({ tiebreakerOrder: order })}
          durationType={state.durationType}
          onNext={next}
          onBack={back}
        />
      );
    }

    // Step 6 — Players (Super8/KQ)
    if (state.step === 6) {
      return (
        <Step6Players
          format={state.format!}
          coupleMode={state.coupleMode}
          numPlayers={state.numPlayers}
          players={players}
          couples={couples}
          onPlayersChange={setPlayers}
          onCouplesChange={setCouples}
          onFinish={finish}
          onBack={back}
        />
      );
    }

    return null;
  }

  return (
    <div className="min-h-dvh flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-text-secondary text-sm font-medium hover:text-text-primary transition-colors"
        >
          ✕ Cancelar
        </button>
        <span className="text-sm font-bold text-text-primary">Novo Torneio</span>
        <div style={{ width: 70 }} />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <StepProgress
          current={state.step}
          total={totalSteps}
          stepNames={stepNames}
        />

        {/* Event Picker (optional) */}
        {events.length > 0 && (
          <div className="mb-4 p-3 rounded-xl border border-border-main bg-surface">
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">🗂️ Vincular a um Evento (opcional)</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedEventId(undefined)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  !selectedEventId
                    ? "bg-brand-pink text-white border border-brand-pink"
                    : "border border-border-main text-muted hover:border-brand-pink/50"
                }`}
              >
                Avulso
              </button>
              {events.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedEventId === ev.id
                      ? "bg-brand-pink text-white border border-brand-pink"
                      : "border border-border-main text-muted hover:border-brand-pink/50"
                  }`}
                >
                  {ev.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {renderStep()}
      </div>
    </div>
  );
}
