/* Blackjack - script di pagina: pages/recruiting.html */
(function () {
  "use strict";

  const specByClass = {
    "Death Knight": ["Blood", "Frost", "Unholy"],
    "Demon Hunter": ["Devourer", "Havoc", "Vengeance"],
    "Druid": ["Balance", "Feral", "Guardian", "Restoration"],
    "Evoker": ["Augmentation", "Devastation", "Preservation"],
    "Hunter": ["Beast Mastery", "Marksmanship", "Survival"],
    "Mage": ["Arcane", "Fire", "Frost"],
    "Monk": ["Brewmaster", "Mistweaver", "Windwalker"],
    "Paladin": ["Holy", "Protection", "Retribution"],
    "Priest": ["Discipline", "Holy", "Shadow"],
    "Rogue": ["Assassination", "Outlaw", "Subtlety"],
    "Shaman": ["Elemental", "Enhancement", "Restoration"],
    "Warlock": ["Affliction", "Demonology", "Destruction"],
    "Warrior": ["Arms", "Fury", "Protection"]
  };

  const RECRUITING_WORKER = "https://blackjack-recruiting.lucasantoro2905.workers.dev";
  const classSelect = document.getElementById("classSelect");
  const specSelect = document.getElementById("specSelect");
  const applyForm = document.getElementById("applyForm");
  const applyStatus = document.getElementById("apply-status");
  const applySubmit = document.getElementById("apply-submit");
  const turnstileNote = document.getElementById("turnstile-note");

  let turnstileWidgetId = null;
  let turnstileToken = "";
  let turnstileReady = false;

  classSelect.addEventListener("change", () => {
    const selectedClass = classSelect.value;
    specSelect.innerHTML = "";

    if (!selectedClass || !specByClass[selectedClass]) {
      specSelect.innerHTML = `<option value="">Seleziona prima una classe...</option>`;
      return;
    }

    specSelect.innerHTML = `<option value="">Seleziona la specializzazione...</option>`;
    specByClass[selectedClass].forEach(spec => {
      const option = document.createElement("option");
      option.value = spec;
      option.textContent = spec;
      specSelect.appendChild(option);
    });
  });

  function setApplyStatus(message, kind = "") {
    applyStatus.textContent = message || "";
    applyStatus.className = kind ? `apply-status is-${kind}` : "apply-status";
  }

  function syncSubmitState() {
    const enabled = turnstileReady && Boolean(turnstileToken);
    applySubmit.disabled = !enabled;
    applySubmit.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  function resetTurnstileState(message) {
    turnstileReady = true;
    turnstileToken = "";
    if (message) {
      turnstileNote.textContent = message;
    }
    syncSubmitState();
  }

  async function loadTurnstile() {
    try {
      const response = await fetch(`${RECRUITING_WORKER}/config`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Config Turnstile non disponibile");
      }

      const payload = await response.json();
      if (!payload?.siteKey) {
        throw new Error("TURNSTILE_SITE_KEY non configurata");
      }

      const container = document.getElementById("turnstile-container");
      const renderWidget = () => {
        if (!window.turnstile || !container || turnstileWidgetId !== null) return;
        turnstileWidgetId = window.turnstile.render(container, {
          sitekey: payload.siteKey,
          theme: "dark",
          callback(token) {
            turnstileReady = true;
            turnstileToken = token || "";
            turnstileNote.textContent = "Verifica completata. Ora puoi inviare la candidatura.";
            syncSubmitState();
          },
          "expired-callback"() {
            resetTurnstileState("La verifica anti-bot e scaduta. Completala di nuovo.");
          },
          "timeout-callback"() {
            resetTurnstileState("La verifica anti-bot e scaduta. Completala di nuovo.");
          },
          "error-callback"(code) {
            turnstileReady = false;
            turnstileToken = "";
            turnstileNote.textContent = `Errore verifica anti-bot (${code || "sconosciuto"}). Ricarica la pagina oppure riprova tra poco.`;
            syncSubmitState();
          }
        });
        turnstileReady = true;
        turnstileNote.textContent = "Completa la verifica anti-bot prima di inviare la candidatura.";
        syncSubmitState();
      };

      if (window.turnstile) {
        renderWidget();
        return;
      }

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (window.turnstile) {
          clearInterval(timer);
          renderWidget();
        } else if (attempts > 50) {
          clearInterval(timer);
          turnstileReady = false;
          turnstileToken = "";
          turnstileNote.textContent = "Impossibile caricare la verifica anti-bot.";
          syncSubmitState();
        }
      }, 200);
    } catch (error) {
      turnstileReady = false;
      turnstileToken = "";
      turnstileNote.textContent = error instanceof Error ? error.message : "Impossibile caricare la verifica anti-bot.";
      syncSubmitState();
    }
  }

  applyForm.addEventListener("submit", async event => {
    event.preventDefault();
    setApplyStatus("");

    if (turnstileWidgetId === null || !window.turnstile) {
      setApplyStatus("La verifica anti-bot non e pronta. Ricarica la pagina e riprova.", "error");
      return;
    }

    if (!turnstileToken) {
      setApplyStatus("Completa la verifica anti-bot prima di inviare la candidatura.", "error");
      return;
    }

    const payload = {
      discord: document.getElementById("discordInput").value,
      character: document.getElementById("characterInput").value,
      className: classSelect.value,
      spec: specSelect.value,
      logs: document.getElementById("logsInput").value,
      availability: document.getElementById("availabilityInput").value,
      motivation: document.getElementById("motivationInput").value,
      website: document.getElementById("websiteInput").value,
      turnstileToken
    };

    applySubmit.disabled = true;
    applySubmit.setAttribute("aria-disabled", "true");
    setApplyStatus("Invio candidatura in corso...", "pending");

    try {
      const response = await fetch(RECRUITING_WORKER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        throw new Error(result?.details || result?.error || "Invio candidatura non riuscito");
      }

      applyForm.reset();
      specSelect.innerHTML = `<option value="">Seleziona prima una classe...</option>`;
      window.turnstile.reset(turnstileWidgetId);
      resetTurnstileState("Completa di nuovo la verifica anti-bot se vuoi inviare un'altra candidatura.");
      setApplyStatus("Candidatura inviata con successo.", "success");
    } catch (error) {
      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
      }
      resetTurnstileState("Completa di nuovo la verifica anti-bot prima di riprovare.");
      setApplyStatus(error instanceof Error ? error.message : "Invio candidatura non riuscito.", "error");
    } finally {
      syncSubmitState();
    }
  });

  syncSubmitState();
  loadTurnstile();
})();
