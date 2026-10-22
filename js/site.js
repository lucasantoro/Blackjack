/* =========================================================
   BLACKJACK - UTILITY CONDIVISE
   Caricato con defer su tutte le pagine. Espone window.BJ.
   ========================================================= */
(function () {
  "use strict";

  var config = window.BJ_CONFIG || {};

  /* ---------- Sicurezza: escape e validazione URL ---------- */

  // Escape per testo inserito in HTML.
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Accetta solo http/https assoluti o percorsi relativi sicuri.
  // Blocca javascript:, data:, vbscript: e URL protocol-relative.
  function safeUrl(value) {
    var raw = String(value == null ? "" : value).trim();
    if (!raw) return "";

    // Gli script Python girano su Windows e salvano percorsi con i
    // backslash: nel web sono separatori di cartella come gli altri.
    raw = raw.replace(/\\/g, "/");

    if (raw.indexOf("//") === 0) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      try {
        var parsed = new URL(raw);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return parsed.href;
        }
      } catch (err) { /* URL non valido */ }
      return "";
    }
    return raw;
  }

  // Come safeUrl ma solo per immagini remote su host attesi.
  var IMAGE_HOSTS = [
    "render.worldofwarcraft.com",
    "render-eu.worldofwarcraft.com",
    "render-us.worldofwarcraft.com",
    "static-cdn.jtvnw.net",
    "wow.zamimg.com"
  ];

  function safeImageUrl(value) {
    var url = safeUrl(value);
    if (!url) return "";
    if (!/^https?:/i.test(url)) return url; // relativo: ok
    try {
      var host = new URL(url).hostname;
      return IMAGE_HOSTS.indexOf(host) !== -1 ? url : "";
    } catch (err) {
      return "";
    }
  }

  /* ---------- Rete ---------- */

  function fetchJson(url, options) {
    var opts = options || {};
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, opts.timeout || 15000);

    return fetch(url, {
      signal: controller.signal,
      cache: opts.cache || "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    }).then(function (response) {
      clearTimeout(timer);
      if (!response.ok) throw new Error("HTTP " + response.status + " su " + url);
      return response.json();
    }, function (error) {
      clearTimeout(timer);
      throw error;
    });
  }

  /* ---------- Date ---------- */

  function toDate(value) {
    if (value == null || value === "") return null;
    var date = typeof value === "number" ? new Date(value) : new Date(String(value));
    return isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    var date = toDate(value);
    if (!date) return "";
    return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function formatDateLong(value) {
    var date = toDate(value);
    if (!date) return "";
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  }

  // "oggi", "ieri", "3 giorni fa", "2 settimane fa", "4 mesi fa"
  function relativeTime(value) {
    var date = toDate(value);
    if (!date) return "";
    var days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days < 0) return formatDate(date);
    if (days === 0) return "oggi";
    if (days === 1) return "ieri";
    if (days < 7) return days + " giorni fa";
    if (days < 14) return "una settimana fa";
    if (days < 31) return Math.floor(days / 7) + " settimane fa";
    if (days < 60) return "un mese fa";
    if (days < 365) return Math.floor(days / 30) + " mesi fa";
    if (days < 730) return "un anno fa";
    return Math.floor(days / 365) + " anni fa";
  }

  function formatDuration(seconds) {
    var total = Number(seconds);
    if (!isFinite(total) || total <= 0) return "";
    var hours = Math.floor(total / 3600);
    var minutes = Math.round((total % 3600) / 60);
    return hours ? hours + "h " + minutes + "m" : minutes + "m";
  }

  /* ---------- Twitch ---------- */

  function twitchEmbedUrl(options) {
    var opts = options || {};
    var parents = (config.twitchParents || []).slice();
    if (parents.indexOf(window.location.hostname) === -1 && window.location.hostname) {
      parents.push(window.location.hostname);
    }
    var params = new URLSearchParams();
    parents.forEach(function (parent) { params.append("parent", parent); });
    params.set("autoplay", "false");
    if (opts.channel) params.set("channel", opts.channel);
    if (opts.video) params.set("video", "v" + String(opts.video).replace(/^v/, ""));
    return "https://player.twitch.tv/?" + params.toString();
  }

  /* ---------- Link Discord (fallback al reclutamento) ---------- */

  function discordHref(rootPrefix) {
    var invite = (config.links || {}).discord;
    if (invite) return invite;
    return (rootPrefix || "") + "pages/recruiting.html";
  }

  /* ---------- Menu mobile ---------- */

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var list = document.getElementById("mainnav-list");
    if (!toggle || !list) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      list.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    list.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });

    var media = window.matchMedia("(min-width: 901px)");
    var onChange = function (event) { if (event.matches) setOpen(false); };
    if (media.addEventListener) media.addEventListener("change", onChange);
    else if (media.addListener) media.addListener(onChange);
  }

  /* ---------- Anno nel footer ---------- */

  function initFooterYear() {
    var slots = document.querySelectorAll("[data-current-year]");
    var year = String(new Date().getFullYear());
    Array.prototype.forEach.call(slots, function (slot) { slot.textContent = year; });
  }

  /* ---------- Link Discord nel markup ---------- */

  function initDiscordLinks() {
    var links = document.querySelectorAll("[data-discord-link]");
    Array.prototype.forEach.call(links, function (link) {
      var prefix = link.getAttribute("data-root-prefix") || "";
      var href = discordHref(prefix);
      link.setAttribute("href", href);
      if ((config.links || {}).discord) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  window.BJ = {
    config: config,
    escapeHtml: escapeHtml,
    safeUrl: safeUrl,
    safeImageUrl: safeImageUrl,
    fetchJson: fetchJson,
    toDate: toDate,
    formatDate: formatDate,
    formatDateLong: formatDateLong,
    relativeTime: relativeTime,
    formatDuration: formatDuration,
    twitchEmbedUrl: twitchEmbedUrl,
    discordHref: discordHref
  };

  initNav();
  initFooterYear();
  initDiscordLinks();
})();
