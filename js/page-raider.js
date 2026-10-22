/* Blackjack - pagina Raider.
   Riempie la striscia progress nell'hero e i due riquadri del team con
   numeri veri, cosi la pagina non e solo testo. */
(function () {
  "use strict";

  var BJ = window.BJ;
  var CFG = window.BJ_CONFIG || {};
  var W = CFG.workers || {};
  var DIFFICULTY = { normal: "Normal", heroic: "Heroic", mythic: "Mythic" };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function renderProgress(data) {
    var box = document.getElementById("hero-progress");
    var raidSlot = document.getElementById("hero-progress-raid");
    var chipSlot = document.getElementById("hero-progress-chips");
    if (!box || !data || !data.progress) return;

    raidSlot.textContent = (data.selectedCampaign || {}).name || "Raid in corso";
    chipSlot.replaceChildren();

    var best = null;
    ["mythic", "heroic", "normal"].forEach(function (key) {
      var block = data.progress[key];
      if (!block || !block.summary) return;
      var killed = Number(block.summary.killedBosses) || 0;
      var total = Number(block.summary.totalBosses) || 0;
      if (!total) return;

      var chip = el("span", "progress-chip progress-chip--" + key);
      chip.appendChild(el("strong", null, killed + "/" + total));
      chip.appendChild(el("span", null, DIFFICULTY[key]));
      if (killed && killed === total) chip.classList.add("is-complete");
      chipSlot.appendChild(chip);

      // Il riquadro mostra la difficolta piu alta con almeno un kill.
      if (!best && killed > 0) best = { key: key, killed: killed, total: total };
    });

    if (chipSlot.childNodes.length) box.hidden = false;

    var figure = document.getElementById("portal-progress");
    var desc = document.getElementById("portal-progress-desc");
    if (figure && best) {
      figure.textContent = best.killed + "/" + best.total;
      if (desc) {
        desc.textContent = DIFFICULTY[best.key] + " su " +
          ((data.selectedCampaign || {}).name || "raid attuale") + ".";
      }
    }
  }

  // Numeri di campagna: sempre popolati, anche quando l'ultimo report
  // appartiene a un raid diverso da quello aperto.
  function renderSeason(data) {
    if (!data) return;
    var campaign = data.selectedCampaign || {};
    var overview = data.overview || {};

    var best = null, pulls = 0;
    ["mythic", "heroic", "normal"].forEach(function (key) {
      var block = data.progress && data.progress[key];
      if (!block || !block.summary) return;
      pulls += Number(block.summary.totalPulls) || 0;
      var killed = Number(block.summary.killedBosses) || 0;
      if (killed && !best) {
        best = { key: key, killed: killed, total: Number(block.summary.totalBosses) || 0 };
      }
    });

    function set(id, value) {
      var node = document.getElementById(id);
      if (node && value != null && value !== "") node.textContent = String(value);
    }

    if (best) {
      set("season-boss", best.killed + "/" + best.total);
      set("season-boss-label", "boss chiusi in " + DIFFICULTY[best.key]);
    }
    set("season-pulls", pulls || null);
    set("season-reports", overview.reportsCount);
    set("season-last", BJ.formatDate(overview.latestReportTime));

    var note = document.getElementById("season-note");
    if (note && campaign.name) {
      note.textContent = campaign.name +
        (campaign.season ? " · " + campaign.expansion + " " + campaign.season : "") + ".";
    }
  }

  function renderRoster(data) {
    var figure = document.getElementById("portal-roster");
    if (!figure || !data) return;
    var members = Array.isArray(data.members) ? data.members : [];
    var active = members.filter(function (m) { return m.active !== false; });
    figure.textContent = String(active.length);
  }

  // Come nella home: la prima chiamata puo trovare la cache del worker
  // fredda, la seconda no.
  function fetchProgress() {
    return BJ.fetchJson(W.raidProgress + "/progress-dashboard", { timeout: 30000 });
  }

  fetchProgress()
    .catch(fetchProgress)
    .then(function (data) { renderProgress(data); renderSeason(data); })
    .catch(function () { /* la pagina resta leggibile senza i numeri */ });

  BJ.fetchJson("../data/aceofspades-roster.json", { cache: "default" })
    .then(renderRoster)
    .catch(function () { /* idem */ });
})();
