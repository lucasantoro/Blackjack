/* Blackjack - script di pagina: pages/high-roller/aceofspades-progress.html */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
  });

  const WORKER_PROGRESS = "https://blackjack-raid-progress.lucasantoro2905.workers.dev";
  const WORKER_TWITCH = "https://blackjack-twitch-status.lucasantoro2905.workers.dev";
  const TWITCH_CHANNEL = "londe83";

  const difficultyLabels = {
    overview: "Riepilogo",
    normal: "Normal",
    heroic: "Heroic",
    mythic: "Mythic"
  };

  const state = window.blackjackProgressState = {
    summaryPayload: null,
    lastSession: null,
    activeView: "overview"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return "Data non disponibile";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Data non disponibile";
    return date.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatSeconds(totalSeconds) {
    if (totalSeconds == null || Number.isNaN(totalSeconds)) return "n/d";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  function formatPercent(value) {
    if (value == null || Number.isNaN(Number(value))) return "n/d";
    return `${Number(value).toFixed(2).replace(/\.00$/, "")}%`;
  }

  function makeZoneLabel(zone) {
    if (!zone) return "Raid";
    return [zone.expansion, zone.season, zone.name].filter(Boolean).join(" - ");
  }

  function getProgress(diff) {
    return state.summaryPayload?.progress?.[diff] || {
      bossList: [],
      summary: {
        totalBosses: 0,
        killedBosses: 0,
        inProgressBosses: 0,
        totalPulls: 0,
        bestProgress: null
      }
    };
  }

  function selectedZone() {
    return state.summaryPayload?.selectedCampaign || null;
  }

  function renderContext() {
    const context = document.getElementById("progress-context");
    if (!context) return;

    const zone = selectedZone();
    if (!zone) {
      context.textContent = "Progress attuale e storico del team, con selezione della campagna raid e dettaglio per difficoltà.";
      return;
    }

    context.textContent = `Campagna visualizzata: ${makeZoneLabel(zone)}. La pagina apre automaticamente la campagna raid attuale, ma puoi passare allo storico dal menu.`;
  }

  function renderMetricCards() {
    const metrics = document.getElementById("progress-metrics");
    const zone = selectedZone();
    const overview = state.summaryPayload?.overview || {};
    const mythic = getProgress("mythic").summary;
    const heroic = getProgress("heroic").summary;

    if (!metrics || !zone) return;

    metrics.innerHTML = `
      <div class="metric-card">
        <span class="metric-card__value">${escapeHtml(zone.name)}</span>
        <span class="metric-card__label">raid visualizzato</span>
      </div>
      <div class="metric-card">
        <span class="metric-card__value">${mythic.killedBosses}/${mythic.totalBosses}</span>
        <span class="metric-card__label">boss mythic chiusi</span>
      </div>
      <div class="metric-card">
        <span class="metric-card__value">${heroic.killedBosses}/${heroic.totalBosses}</span>
        <span class="metric-card__label">boss heroic chiusi</span>
      </div>
      <div class="metric-card">
        <span class="metric-card__value">${overview.reportsCount ?? 0}</span>
        <span class="metric-card__label">report archiviati</span>
      </div>
      <div class="metric-card">
        <span class="metric-card__value">${formatDateTime(overview.latestReportTime)}</span>
        <span class="metric-card__label">ultimo report del raid</span>
      </div>
    `;
  }

  function renderRaidSelector() {
    const select = document.getElementById("raid-selector");
    const history = state.summaryPayload?.history || [];
    const currentZoneId = state.summaryPayload?.currentCampaignId;
    const currentSelection = selectedZone();

    if (!select) return;

    // Le campagne senza report non hanno niente da mostrare: finiscono in
    // fondo. Il resto e ordinato dalla piu recente alla piu vecchia.
    const sortedHistory = history.slice().sort((a, b) => {
      const emptyA = (a.reportCount || 0) === 0;
      const emptyB = (b.reportCount || 0) === 0;
      if (emptyA !== emptyB) return emptyA ? 1 : -1;
      return String(b.startDate || "").localeCompare(String(a.startDate || ""));
    });

    const groups = sortedHistory.reduce((result, zone) => {
      const expansion = zone.expansion || "Archivio";
      if (!result.has(expansion)) result.set(expansion, []);
      result.get(expansion).push(zone);
      return result;
    }, new Map());

    select.innerHTML = Array.from(groups.entries()).map(([expansion, zones]) => `
      <optgroup label="${escapeHtml(expansion)}">
        ${zones.map(zone => {
          const currentSuffix = zone.id === currentZoneId ? " - attuale" : "";
          const reports = `${zone.reportCount || 0} report`;
          const label = `${zone.season || "Archivio"} - ${zone.name} - ${zone.bossCount} boss - ${reports}${currentSuffix}`;
          return `<option value="${escapeHtml(zone.id)}" ${zone.id === currentSelection?.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
        }).join("")}
      </optgroup>
    `).join("");

    select.onchange = async (event) => {
      const zoneId = event.target.value;
      await loadProgress(zoneId);
    };
  }

  function renderViewTabs() {
    const container = document.getElementById("progress-view-tabs");
    if (!container) return;

    container.querySelectorAll("button").forEach(button => {
      const isActive = button.dataset.view === state.activeView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.onclick = () => {
        state.activeView = button.dataset.view;
        renderViewTabs();
        renderProgressView();
      };
    });
  }

  function renderOverviewTab() {
    const diffs = ["normal", "heroic", "mythic"];
    const cards = diffs.map(diff => {
      const summary = getProgress(diff).summary;
      return `
        <article class="progress-summary-card">
          <div class="progress-summary-card__eyebrow">${difficultyLabels[diff]}</div>
          <div class="progress-summary-card__value">${summary.killedBosses}/${summary.totalBosses}</div>
          <div class="progress-summary-card__meta">
            <span>${summary.totalPulls} pull</span>
            <span>${summary.inProgressBosses} boss aperti</span>
            <span>best ${formatPercent(summary.bestProgress)}</span>
          </div>
        </article>
      `;
    }).join("");

    const overview = state.summaryPayload?.overview || {};

    return `
      <div class="progress-summary-strip">
        ${cards}
        <article class="progress-summary-card progress-summary-card--accent">
          <div class="progress-summary-card__eyebrow">Archivio raid</div>
          <div class="progress-summary-card__value">${overview.reportsCount ?? 0}</div>
          <div class="progress-summary-card__meta">
            <span>${overview.totalBosses ?? 0} boss tracciati</span>
            <span>${formatDateTime(overview.latestReportTime)}</span>
          </div>
        </article>
      </div>
      <p class="progress-view-note">Usa le tab sopra per entrare nel dettaglio di una singola difficoltà.</p>
    `;
  }

  function renderDifficultyTab(diff) {
    const payload = getProgress(diff);
    const summary = payload.summary;
    const bossRows = (payload.bossList || []).map(boss => {
      const isKilled = boss.kills > 0;
      const chipClass = isKilled ? "boss-killed" : boss.bestPercentage != null ? "boss-progress" : "";
      const statusText = isKilled ? "Kill" : boss.bestPercentage != null ? `Best ${formatPercent(boss.bestPercentage)}` : "Nessun pull";

      return `
          <div class="progress-boss-row">
          <div class="progress-boss-row__copy">
            <strong>${escapeHtml(boss.bossName)}</strong>
            <span>${boss.pulls} pull${boss.pulls === 1 ? "" : "s"} - ${boss.wipes} wipe${boss.wipes === 1 ? "" : "s"}</span>
          </div>
          <span class="progress-boss-chip ${chipClass}">${statusText}</span>
        </div>
      `;
    }).join("");

    if (!payload.bossList.length) {
      return `<div class="empty-state">Nessun dato disponibile per ${escapeHtml(difficultyLabels[diff])}.</div>`;
    }

    return `
      <div class="progress-difficulty-layout">
        <div class="progress-headline">
          <div>
            <p class="widget-desc">${escapeHtml(makeZoneLabel(selectedZone()))}</p>
            <h3 class="widget-title">${escapeHtml(difficultyLabels[diff])}</h3>
          </div>
          <span class="progress-card-badge">${summary.killedBosses}/${summary.totalBosses} boss chiusi</span>
        </div>

        <div class="progress-stats-row">
          <div class="progress-mini-stat">
            <span class="progress-mini-stat__value">${summary.killedBosses}</span>
            <span class="progress-mini-stat__label">boss chiusi</span>
          </div>
          <div class="progress-mini-stat">
            <span class="progress-mini-stat__value">${summary.inProgressBosses}</span>
            <span class="progress-mini-stat__label">boss aperti</span>
          </div>
          <div class="progress-mini-stat">
            <span class="progress-mini-stat__value">${summary.totalPulls}</span>
            <span class="progress-mini-stat__label">pull totali</span>
          </div>
          <div class="progress-mini-stat">
            <span class="progress-mini-stat__value">${formatPercent(summary.bestProgress)}</span>
            <span class="progress-mini-stat__label">miglior try aperto</span>
          </div>
        </div>

        <div class="progress-boss-list">
          ${bossRows}
        </div>
      </div>
    `;
  }

  function renderProgressView() {
    const container = document.getElementById("progress-view");
    const explainer = document.getElementById("progress-view-explainer");
    if (!container) return;

    container.innerHTML = state.activeView === "overview"
      ? renderOverviewTab()
      : renderDifficultyTab(state.activeView);

    if (explainer) {
      const totalBosses = selectedZone()?.bossCount ?? 0;
      explainer.textContent = state.activeView === "overview"
        ? `Il riepilogo mostra l'intera campagna raid. I valori x/y indicano boss chiusi su ${totalBosses} totali.`
        : `${difficultyLabels[state.activeView]} mostra boss chiusi su ${totalBosses} totali della campagna raid selezionata.`;
    }
  }

  function renderSessionSummary() {
    const container = document.getElementById("last-session-summary");
    const title = document.getElementById("last-session-title");
    const report = state.lastSession?.report;

    if (!container || !title) return;

    if (!report) {
      title.textContent = "Ultima sessione registrata";
      container.innerHTML = `<div class="empty-state">Nessuna sessione disponibile per il raid selezionato.</div>`;
      return;
    }

    title.textContent = `Ultima sessione - ${report.zone?.name || "Raid"}`;
    container.innerHTML = `
      <h3 class="widget-title">${escapeHtml(report.title || "Ultimo report")}</h3>
      <p class="widget-desc">${escapeHtml(report.zone?.name || "Raid")} - chiusura ${escapeHtml(formatDateTime(report.endTime))}</p>
      <div class="session-meta-grid">
        <div class="progress-mini-stat">
          <span class="progress-mini-stat__value">${state.lastSession.summary.totalKills}</span>
          <span class="progress-mini-stat__label">kill</span>
        </div>
        <div class="progress-mini-stat">
          <span class="progress-mini-stat__value">${state.lastSession.summary.totalWipes}</span>
          <span class="progress-mini-stat__label">wipe</span>
        </div>
        <div class="progress-mini-stat">
          <span class="progress-mini-stat__value">${state.lastSession.summary.totalPulls}</span>
          <span class="progress-mini-stat__label">pull</span>
        </div>
        <div class="progress-mini-stat">
          <span class="progress-mini-stat__value">${formatPercent(state.lastSession.summary.bestPercentage)}</span>
          <span class="progress-mini-stat__label">best try</span>
        </div>
        <div class="progress-mini-stat">
          <span class="progress-mini-stat__value">${formatSeconds(state.lastSession.summary.durationSec)}</span>
          <span class="progress-mini-stat__label">durata</span>
        </div>
      </div>
    `;
  }

  function renderReportLink() {
    const reportLink = document.getElementById("last-session-report-link");
    if (!reportLink) return;

    if (!state.lastSession?.reportUrl) {
      reportLink.classList.add("hidden");
      reportLink.removeAttribute("href");
      return;
    }

    reportLink.href = state.lastSession.reportUrl;
    reportLink.classList.remove("hidden");
  }

  function buildTimeline() {
    const container = document.getElementById("dot-timeline");
    if (!container) return;

    const rows = (state.lastSession?.bossList || [])
      .filter(boss => (boss.pullsDetail || []).length)
      .map(boss => {
        const dots = boss.pullsDetail.map(pull => {
          const tipLines = [
            `Pull ${pull.index}`,
            pull.kill ? "Kill" : `Wipe ${formatPercent(pull.fightPercentage)}`,
            difficultyLabels[pull.difficulty] || String(pull.difficulty || "").toUpperCase(),
            formatSeconds(pull.durationSec)
          ];

          return `
            <span
              class="dot ${pull.kill ? "dot-kill" : "dot-progress"}"
              data-tip="${escapeHtml(tipLines.join("\n"))}"
              title="${escapeHtml(tipLines.join(" | "))}">
            </span>
          `;
        }).join("");

        return `
          <div class="dot-row">
            <div class="dot-boss-name">${escapeHtml(boss.bossName)}</div>
            <div class="dot-line">${dots}</div>
          </div>
        `;
      }).join("");

    container.innerHTML = rows || `<div class="empty-state">Nessun pull boss disponibile nel report più recente.</div>`;
  }

  async function fetchProgressDashboard(zoneId) {
    const query = zoneId ? `?campaignId=${encodeURIComponent(zoneId)}` : "";
    const response = await fetch(`${WORKER_PROGRESS}/progress-dashboard${query}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Progress dashboard non disponibile");
    }
    return response.json();
  }

  async function fetchTwitchLive() {
    const response = await fetch(`${WORKER_TWITCH}/?channel=${encodeURIComponent(TWITCH_CHANNEL)}`, {
      cache: "no-store"
    });
    if (!response.ok) {
        throw new Error("Diretta Twitch non disponibile");
    }
    return response.json();
  }

  function renderTwitchLive(data) {
    const pill = document.getElementById("live-status-pill");
    const description = document.getElementById("live-description");
    const shell = document.getElementById("live-player-shell");
    if (!pill || !description || !shell) return;

    if (!data || !data.live) {
      pill.classList.remove("live-status-live");
      pill.classList.add("live-status-offline");
      pill.innerHTML = '<span class="live-dot"></span> Offline';
      description.textContent = "Il canale e offline. La prossima diretta appare qui appena il raid va live.";
      shell.innerHTML = "";
      return;
    }

    pill.classList.remove("live-status-offline");
    pill.classList.add("live-status-live");
    pill.innerHTML = '<span class="live-dot"></span> Live ora';

    const bits = [
      data.title || "Diretta raid",
      data.game_name ? `Gioco: ${data.game_name}` : "",
      data.viewer_count != null ? `Viewers: ${data.viewer_count}` : ""
    ].filter(Boolean);
    description.textContent = bits.join(" - ");

    shell.innerHTML = `
      <iframe
        src="https://player.twitch.tv/?channel=${encodeURIComponent(TWITCH_CHANNEL)}&parent=${window.location.hostname}"
        frameborder="0"
        allowfullscreen="true"
        scrolling="no"
        title="Live Twitch ${escapeHtml(TWITCH_CHANNEL)}">
      </iframe>
    `;
  }

  async function loadProgress(zoneId) {
    state.summaryPayload = await fetchProgressDashboard(zoneId);
    if (!state.summaryPayload?.selectedCampaign) {
      throw new Error("Raid selezionato non disponibile");
    }

    if (!["overview", "normal", "heroic", "mythic"].includes(state.activeView)) {
      state.activeView = "overview";
    }

    renderContext();
    renderMetricCards();
    renderRaidSelector();
    renderViewTabs();
    renderProgressView();

    state.lastSession = state.summaryPayload.lastSession || null;
    renderSessionSummary();
    renderReportLink();
    buildTimeline();
  }

  async function initProgressPage() {
    try {
      await loadProgress();
    } catch (error) {
      console.error("Errore progress:", error);
      document.getElementById("progress-view").innerHTML = `<div class="empty-state">Impossibile caricare il progress del team.</div>`;
      document.getElementById("last-session-summary").innerHTML = `<div class="empty-state">Sessione non disponibile.</div>`;
      document.getElementById("dot-timeline").innerHTML = `<div class="empty-state">Timeline non disponibile.</div>`;
    }

    try {
      const twitchData = await fetchTwitchLive();
      renderTwitchLive(twitchData);
    } catch (error) {
      console.error("Errore live Twitch:", error);
    }
  }

  initProgressPage();
})();
