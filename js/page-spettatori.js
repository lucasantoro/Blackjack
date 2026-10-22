/* Blackjack - script di pagina: pages/spettatori.html
   Numeri della community letti dal worker Raider.IO. */
(function () {
  "use strict";

  var BJ = window.BJ;
  var CFG = window.BJ_CONFIG || {};

  function set(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value == null || value === "" ? "—" : String(value);
  }

  function text(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  BJ.fetchJson((CFG.workers && CFG.workers.communityStats) + "/")
    .then(function (data) {
      var payload = (data && typeof data.summary === "object" && data.summary) ? data.summary : data;
      var leaders = Array.isArray(payload.scoreLeaders) ? payload.scoreLeaders : [];
      var top = leaders[0] || null;

      set("stat-tracked", payload.trackedCharacters);
      text("stat-tracked-hint", payload.activePlayersLast30 != null
        ? payload.activePlayersLast30 + " con almeno una key negli ultimi 30 giorni."
        : "Attività recente non disponibile.");

      set("stat-peak-score", payload.peakScore != null ? Math.round(payload.peakScore) : null);
      text("stat-peak-score-hint", top
        ? top.name + " guida il roster tracciato con " + top.score + " punti."
        : "Nessun leader score disponibile.");

      set("stat-avg-score", payload.avgScoreTop10);
      set("stat-guild-runs", payload.guildRunsLast30);

      text("stats-note", payload.updatedAt
        ? "Panoramica aggiornata " + BJ.relativeTime(payload.updatedAt) + "."
        : "Panoramica aggiornata periodicamente.");
    })
    .catch(function (error) {
      console.error("Errore statistiche community:", error);
      ["stat-tracked", "stat-peak-score", "stat-avg-score", "stat-guild-runs"].forEach(function (id) {
        set(id, null);
      });
      text("stat-tracked-hint", "Impossibile leggere i profili tracciati.");
      text("stat-peak-score-hint", "Impossibile leggere il leader score.");
      text("stats-note", "Statistiche non disponibili al momento.");
    });
})();
