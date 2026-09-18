import { useState } from "react";
import {
  BOT_LEVELS,
  BOARD_PRESETS,
  type BotLevelId,
  type BoardPresetId,
  type GameMode,
  type GameSettings,
} from "../game/settings";

type SettingsModalProps = {
  currentSettings: GameSettings;
  onApply: (settings: GameSettings, restartNow: boolean) => void;
  onClose: () => void;
};

export function SettingsModal({ currentSettings, onApply, onClose }: SettingsModalProps) {
  const [mode, setMode] = useState<GameMode>(currentSettings.mode);
  const [level, setLevel] = useState<BotLevelId>(currentSettings.botLevel);
  const [starter, setStarter] = useState<GameSettings["starter"]>(currentSettings.starter);
  const [preset, setPreset] = useState<BoardPresetId>(currentSettings.preset);

  const apply = (restartNow: boolean) => {
    onApply({ mode, botLevel: level, starter, preset }, restartNow);
    onClose();
  };

  const isPvp = mode === "pvp";

  return (
    <div
      className="modal-layer settings-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settings-box">
        <header className="settings-header">
          <div>
            <div className="modal-kicker">
              <span className="status-dot" /> MATCH CONFIGURATION
            </div>
            <h2 id="settings-title">
              SETUP &amp; <em>DIFFICULTY.</em>
            </h2>
          </div>
          <button className="course-close" type="button" onClick={onClose} aria-label="Close settings">
            ✕ <kbd>ESC</kbd>
          </button>
        </header>

        <div className="settings-body">
          <section className="settings-section">
            <div className="section-title">
              <span>01 // OPPONENT</span>
              <small>Bot AI or a local duel on one board</small>
            </div>
            <div className="starter-row is-two">
              <button
                type="button"
                className={`choice-pill ${!isPvp ? "is-active" : ""}`}
                onClick={() => setMode("bot")}
              >
                <span className="mini-disc mini-ai" />
                <div>
                  <strong>VS BOT AI</strong>
                  <span>You vs a searching engine at four depths</span>
                </div>
              </button>
              <button
                type="button"
                className={`choice-pill ${isPvp ? "is-active" : ""}`}
                onClick={() => setMode("pvp")}
              >
                <span className="pill-icon-two">
                  <span className="mini-disc mini-player" />
                  <span className="mini-disc mini-ai" />
                </span>
                <div>
                  <strong>TWO PLAYERS</strong>
                  <span>Pass &amp; play on the same board and mouse</span>
                </div>
              </button>
            </div>
          </section>

          <section className={`settings-section ${isPvp ? "is-disabled" : ""}`}>
            <div className="section-title">
              <span>02 // ENGINE STRENGTH</span>
              <small>{isPvp ? "Disabled in two-player mode" : "Iterative alpha-beta depth &amp; pruning"}</small>
            </div>
            <div className="level-grid">
              {(Object.keys(BOT_LEVELS) as BotLevelId[]).map((id) => {
                const item = BOT_LEVELS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={`level-card ${level === id ? "is-active" : ""}`}
                    onClick={() => setLevel(id)}
                  >
                    <div className="level-card-top">
                      <span className="level-badge">{item.badge}</span>
                      <strong>{item.name}</strong>
                    </div>
                    <p>{item.description}</p>
                    <div className="level-meta">
                      <span>Depth {item.depth}</span>
                      <span>~{item.timeBudget}ms</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="settings-section">
            <div className="section-title">
              <span>03 // OPENING INITIATIVE</span>
              <small>{isPvp ? "Which hand makes the first move" : "Who makes the opening move"}</small>
            </div>
            <div className="starter-row">
              <button
                type="button"
                className={`choice-pill ${starter === "p1" ? "is-active" : ""}`}
                onClick={() => setStarter("p1")}
              >
                <span className="mini-disc mini-player" />
                <div>
                  <strong>{isPvp ? "PLAYER 1 STARTS" : "YOU START (P1)"}</strong>
                  <span>Coral takes the initiative</span>
                </div>
              </button>
              <button
                type="button"
                className={`choice-pill ${starter === "p2" ? "is-active" : ""}`}
                onClick={() => setStarter("p2")}
              >
                <span className="mini-disc mini-ai" />
                <div>
                  <strong>{isPvp ? "PLAYER 2 STARTS" : "BOT STARTS (P2)"}</strong>
                  <span>Mint takes the initiative</span>
                </div>
              </button>
              <button
                type="button"
                className={`choice-pill ${starter === "random" ? "is-active" : ""}`}
                onClick={() => setStarter("random")}
              >
                <span className="pill-icon">🎲</span>
                <div>
                  <strong>COIN TOSS</strong>
                  <span>50 / 50 random starter</span>
                </div>
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div className="section-title">
              <span>04 // START FROM POSITION</span>
              <small>Practice specific tactical phases &amp; endgame parity</small>
            </div>
            <div className="preset-list">
              {(Object.keys(BOARD_PRESETS) as BoardPresetId[]).map((id) => {
                const item = BOARD_PRESETS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={`preset-card ${preset === id ? "is-active" : ""}`}
                    onClick={() => setPreset(id)}
                  >
                    <div className="preset-card-head">
                      <span className={`phase-badge badge-${item.phaseTag.toLowerCase()}`}>
                        {item.phaseTag}
                      </span>
                      <strong>{item.name}</strong>
                    </div>
                    <p>{item.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="settings-footer">
          <button className="text-button" type="button" onClick={onClose}>
            CANCEL
          </button>
          <div className="footer-actions">
            <button className="button button-secondary" type="button" onClick={() => apply(false)}>
              SAVE FOR NEXT MATCH
            </button>
            <button className="button button-primary" type="button" onClick={() => apply(true)}>
              APPLY &amp; START NOW <kbd>ENTER</kbd>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
