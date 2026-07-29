import StepProgress from "./StepProgress";
import Step1Format from "./Step1Format";
import Step2Couple from "./Step2Couple";
import Step3Category from "./Step3Category";
import Step4Settings from "./Step4Settings";
import Step5Victory from "./Step5Victory";
import Step6Players from "./Step6Players";
import DrawCeremonyModal from "./DrawCeremonyModal";
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
  const [showDrawCeremony, setShowDrawCeremony] = useState(false);
  const [drawCeremonyData, setDrawCeremonyData] = useState<{
    players: string[];
    couples: { manName: string; womanName: string }[];
    format: TournamentConfig["format"];
    numPlayers: number;
    numCourts: number;
    config: TournamentConfig;
  } | null>(null);
  
  const { state, players, setPlayers, couples, setCouples, update, next, back, finish: finishWizard, totalSteps, stepNames } = useWizard(
    (config, playersList) => {
      if (!state.useDraw) {
        onComplete(config, playersList, selectedEventId);
        return;
      }

      const nextPlayers = Array.isArray(playersList) && typeof playersList[0] === "string"
        ? (playersList as string[])
        : [];
      const nextCouples = Array.isArray(playersList) && typeof playersList[0] === "object"
        ? (playersList as { manName: string; womanName: string }[])
        : [];

      // Store data for draw ceremony
      setDrawCeremonyData({
        players: nextPlayers,
        couples: nextCouples,
        format: config.format!,
        numPlayers: state.numPlayers,
        numCourts: state.numCourts,
        config: {
          ...config,
          drawEnabled: state.useDraw,
          drawMode: state.drawMode,
          drawSeeded: state.drawSeeded,
        },
      });
      setShowDrawCeremony(true);
    }
  );

  const finish = finishWizard;

  function renderStep() {
    const isMixed = state.format === "mixeddoubles";

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

    // Step 2 — Couple mode (Mixed) or Category (Others)
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
      return (
        <Step3Category
          selected={state.category}
          onChange={(c) => update({ category: c })}
          onNext={next}
          onBack={back}
        />
      );
    }

    // Step 3 — Settings (All Formats)
    if (state.step === 3) {
      return (
        <Step4Settings
          format={state.format!}
          numPlayers={state.numPlayers}
          numCourts={state.numCourts}
          durationType={state.durationType}
          groupFormat={state.groupFormat}
          playoffFormat={state.playoffFormat}
          tournamentName={state.tournamentName}
          matchSettings={state.matchSettings}
          onChangeNum={(n) => update({ numPlayers: n })}
          onChangeCourts={(n) => update({ numCourts: n })}
          onChangeDuration={(d) => update({ durationType: d })}
          onChangeGroup={(g) => update({ groupFormat: g })}
          onChangePlayoff={(p) => update({ playoffFormat: p })}
          onChangeName={(name) => update({ tournamentName: name })}
          onChangeMatchSettings={(s) => update({ matchSettings: s })}
          useDraw={state.useDraw}
          drawMode={state.drawMode}
          drawSeeded={state.drawSeeded}
          onToggleDraw={() => update({ useDraw: !state.useDraw })}
          onChangeDrawMode={(mode) => update({ drawMode: mode })}
          onToggleSeeded={() => update({ drawSeeded: !state.drawSeeded })}
          onNext={next}
          onBack={back}
        />
      );
    }

    // Step 4 — Victory (All Formats)
    if (state.step === 4) {
      return (
        <Step5Victory
          order={state.tiebreakerOrder}
          onChange={(order) => update({ tiebreakerOrder: order })}
          onNext={next}
          onBack={back}
        />
      );
    }

    // Step 5 — Players (All Formats)
    if (state.step === 5) {
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

      {/* Draw Ceremony Modal */}
      {showDrawCeremony && drawCeremonyData && (
        <DrawCeremonyModal
          isOpen={showDrawCeremony}
          data={drawCeremonyData}
          onConfirm={(drawnPlayers, drawnCouples, drawSummary) => {
            const configWithDraw = {
              ...drawCeremonyData.config,
              drawEnabled: true,
              drawMode: drawCeremonyData.config.drawMode ?? "full",
              drawSeeded: drawCeremonyData.config.drawSeeded ?? false,
              drawOrder: drawCeremonyData.format === "fixeddoubles" || drawCeremonyData.format === "mixeddoubles"
                ? (drawnCouples?.map(c => `${c.manName} & ${c.womanName}`) ?? [])
                : (drawnPlayers ?? []),
              drawGroups: drawSummary?.groups,
              drawCouplesOrder: drawnCouples ?? [],
            };

            // Call the original onComplete with the stored data
            onComplete(configWithDraw,
              drawCeremonyData.format === "fixeddoubles" || drawCeremonyData.format === "mixeddoubles"
                ? (drawnCouples ?? drawCeremonyData.couples)
                : (drawnPlayers ?? drawCeremonyData.players),
              selectedEventId
            );
            setShowDrawCeremony(false);
          }}
          onCancel={() => {
            setShowDrawCeremony(false);
          }}
        />
      )}
    </div>
  );
}
