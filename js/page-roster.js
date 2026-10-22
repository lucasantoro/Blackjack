/* Blackjack - script di pagina: pages/high-roller/roster-aceofspades.html */
(function () {
  "use strict";

  const rosterDataUrl = "../../data/aceofspades-roster.json";

  const roleConfig = {
    tank: {
      label: "Tank",
      badgeClass: "role-tank",
      sectionCopy: "Chi apre la strada, detta il ritmo del pull e regge la pressione del fight."
    },
    healer: {
      label: "Healer",
      badgeClass: "role-healer",
      sectionCopy: "Chi tiene il team in piedi, rimette ordine e protegge la serata."
    },
    dps: {
      label: "DPS",
      badgeClass: "role-dps",
      sectionCopy: "Chi trasforma preparazione e uptime in danno, utility e chiusura dei boss."
    }
  };

  const roleOrder = ["tank", "healer", "dps"];

  const state = {
    members: [],
    search: "",
    role: "all"
  };

  function normalizeText(value) {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function classSlug(name) {
    return String(name || "").toLowerCase().replace(/[^a-z]/g, "");
  }

  function classIcon(name) {
    return `../../img/classes/${classSlug(name)}.png`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // Difesa in profondita: blocca javascript:/data:/vbscript: negli URL
  // che arrivano dai worker o dai file di contenuto.
  function safeHref(value) {
    return (window.BJ && window.BJ.safeUrl) ? window.BJ.safeUrl(value) : "";
  }

  function hasCustomProfile(member) {
    return Boolean(member.customTagline || member.customSummary || member.customBio || member.customImage || member.profileStatus === "custom");
  }

  function getMemberTagline(member) {
    if (member.customTagline) return member.customTagline;
    return member.tagline || "Presenza del roster";
  }

  function getMemberSummary(member) {
    if (member.customSummary) return member.customSummary;
    return member.summary || "Profilo rapido in aggiornamento.";
  }

  function getMemberBio(member) {
    if (member.customBio) return member.customBio;
    return member.bio || "Profilo in aggiornamento.";
  }

  function getMemberImage(member) {
    return member.customImage || member.sourceImage || member.image || "";
  }

  function getMemberVideo(member) {
    return member.customVideo || "";
  }

  function getActiveMembers() {
    return state.members.filter(member => member.active !== false);
  }

  function getFilteredMembers() {
    return getActiveMembers().filter(member => {
      const matchesRole = state.role === "all" || member.role === state.role;
      const haystack = normalizeText([member.name, member.class, member.spec, member.server, getMemberTagline(member)].join(" "));
      const matchesSearch = !state.search || haystack.includes(normalizeText(state.search));
      return matchesRole && matchesSearch;
    });
  }

  function renderFilters() {
    const container = document.getElementById("roster-filters");
    const filters = [
      { value: "all", label: "Tutti" },
      { value: "tank", label: "Tank" },
      { value: "healer", label: "Healer" },
      { value: "dps", label: "DPS" }
    ];

    container.innerHTML = filters.map(filter => `
      <button
        type="button"
        class="filter-chip ${state.role === filter.value ? "is-active" : ""}"
        data-role-filter="${filter.value}">
        ${filter.label}
      </button>
    `).join("");

    container.querySelectorAll("[data-role-filter]").forEach(button => {
      button.addEventListener("click", () => {
        state.role = button.getAttribute("data-role-filter");
        renderRoster();
      });
    });
  }

  function renderMemberCard(member) {
    const safeName = escapeHtml(member.name);
    const safeTagline = escapeHtml(getMemberTagline(member));
    const safeBio = escapeHtml(getMemberBio(member));
    const safeSummary = escapeHtml(getMemberSummary(member));
    const safeClass = escapeHtml(member.class || "Classe in aggiornamento");
    const safeSpec = escapeHtml(member.spec || "");
    const safeServer = escapeHtml(member.server || "");
    const roleInfo = roleConfig[member.role] || roleConfig.dps;
    const hasKnownClass = member.class && member.class !== "Unknown";
    const video = getMemberVideo(member);
    const image = getMemberImage(member);
    const hasVideo = Boolean(video);
    const hasImage = Boolean(image);
    const safeVideo = escapeHtml(safeHref(video));
    const safeImage = escapeHtml(safeHref(image));
    const safeArmoryUrl = member.armoryUrl ? escapeHtml(safeHref(member.armoryUrl)) : "";
    const safeRioUrl = member.rio ? escapeHtml(safeHref(member.rio)) : "";
    const cardMeta = [
      roleInfo.label,
      safeSpec,
      hasKnownClass ? safeClass : "",
      safeServer
    ].filter(Boolean).join(" | ");

    return `
      <article class="member-card member-card--compact" data-class="${classSlug(member.class)}" data-role="${escapeHtml(member.role || "dps")}">
        <div class="member-card__media">
          ${hasVideo
            ? `<video src="${safeVideo}" muted loop autoplay playsinline preload="metadata"></video>`
            : hasImage
            ? `<img src="${safeImage}" alt="${safeName}">`
            : `<div class="member-card__fallback" aria-hidden="true">${safeName.slice(0, 1)}</div>`}
        </div>

        <div class="member-card__body">
          <div class="member-card__top">
            <div class="member-card__heading">
              <h3 class="member-card__name">${safeName}</h3>
              <p class="tagline">${safeTagline}</p>
            </div>

            <div class="member-card__tags">
              ${hasKnownClass ? `<span class="class-mark class-mark--${classSlug(member.class)}" title="${safeClass}">
                <img class="class-icon-small" src="${classIcon(member.class)}" alt="${safeClass}" loading="lazy" decoding="async" width="30" height="30">
              </span>` : ""}
              <span class="role-badge ${roleInfo.badgeClass}">${roleInfo.label}</span>
            </div>
          </div>

          <p class="member-card__class">${[safeSpec, hasKnownClass ? safeClass : "Classe in aggiornamento"].filter(Boolean).join(" | ")}</p>
          <p class="member-card__snippet">${safeSummary}</p>

          <details class="member-details">
            <summary>${hasCustomProfile(member) ? "Apri profilo completo" : "Apri scheda"}</summary>
            <p>${safeBio}</p>
          </details>

          <div class="member-card__footer">
            <span class="member-card__class">${cardMeta}</span>
            <div class="member-card__links">
              ${safeArmoryUrl ? `
                <a href="${safeArmoryUrl}" target="_blank" rel="noopener noreferrer" class="armory-link">Armory</a>
              ` : ""}
              ${safeRioUrl ? `
                <a href="${safeRioUrl}" target="_blank" rel="noopener noreferrer" class="rio-btn--compact" aria-label="Apri il profilo Raider.IO di ${safeName}">
                  <img src="../../img/raiderio_logo.png" class="rio-logo" alt="Raider.IO">
                </a>
              ` : ""}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // Colpo d'occhio sulla composizione: quanti per ruolo e quante classi
  // diverse. Rende il roster leggibile prima ancora di scorrerlo.
  function renderComposition() {
    const box = document.getElementById("roster-composition");
    if (!box) return;

    const members = getActiveMembers();
    if (!members.length) { box.hidden = true; return; }

    const byRole = { tank: 0, healer: 0, dps: 0 };
    const classes = new Map();
    members.forEach(member => {
      if (byRole[member.role] != null) byRole[member.role] += 1;
      const name = member.class && member.class !== "Unknown" ? member.class : null;
      if (name) classes.set(name, (classes.get(name) || 0) + 1);
    });

    const total = members.length;
    const bars = roleOrder.map(role => {
      const count = byRole[role];
      if (!count) return "";
      const pct = Math.round((count / total) * 100);
      return `<span class="roster-bar__seg roster-bar__seg--${role}" style="flex:${count}" title="${roleConfig[role].label}: ${count}">
        <span>${roleConfig[role].label}</span><strong>${count}</strong>
      </span>`;
    }).join("");

    const chips = [...classes.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => `<li class="class-chip class-mark--${classSlug(name)}">
          <span class="class-chip__dot" aria-hidden="true"></span>${escapeHtml(name)}
          <strong>${count}</strong>
        </li>`).join("");

    box.innerHTML = `
      <div class="roster-bar">${bars}</div>
      <ul class="class-chips">${chips}</ul>
    `;
    box.hidden = false;
  }

  function renderRoster() {
    renderFilters();
    renderComposition();

    const container = document.getElementById("roster-container");
    const filteredMembers = getFilteredMembers();

    if (!filteredMembers.length) {
      container.innerHTML = `<div class="empty-state">Nessun Raider corrisponde ai filtri attuali.</div>`;
      return;
    }

    container.innerHTML = roleOrder.map(role => {
      const membersByRole = filteredMembers.filter(member => member.role === role);
      if (!membersByRole.length) return "";

      const roleInfo = roleConfig[role];
      return `
        <section class="roster-role-section">
          <div class="roster-role-section__header">
            <div>
              <h3>${roleInfo.label}</h3>
              <p>${roleInfo.sectionCopy}</p>
            </div>
            <span class="roster-role-section__count">${membersByRole.length} ${membersByRole.length === 1 ? "membro" : "membri"}</span>
          </div>

          <div class="roster-role-grid">
            ${membersByRole.map(renderMemberCard).join("")}
          </div>
        </section>
      `;
    }).join("");
  }

  async function loadRoster() {
    const response = await fetch(rosterDataUrl);
    if (!response.ok) {
      throw new Error("Impossibile caricare il file roster.");
    }

    const payload = await response.json();
    state.members = payload.members || [];
    renderRoster();
  }

  document.addEventListener("DOMContentLoaded", () => {

    const search = document.getElementById("roster-search");
    search.addEventListener("input", event => {
      state.search = event.target.value;
      renderRoster();
    });

    loadRoster().catch(error => {
      console.error(error);
      document.getElementById("roster-container").innerHTML = `
        <div class="empty-state">Impossibile caricare il roster in questo momento.</div>
      `;
    });
  });
})();
