/* Blackjack - raid roster dashboard: pages/high-roller/roster-aceofspades.html */
(function () {
  "use strict";

  const rosterDataUrl = "../../data/aceofspades-roster.json";

  const roleConfig = {
    tank: {
      label: "Tank",
      shortLabel: "T",
      badgeClass: "role-tank",
      sectionCopy: "La prima linea: controllo del boss, posizionamento e ritmo del pull."
    },
    healer: {
      label: "Healer",
      shortLabel: "H",
      badgeClass: "role-healer",
      sectionCopy: "La rete di sicurezza del team: copertura, cooldown e stabilita del raid."
    },
    dps: {
      label: "DPS",
      shortLabel: "D",
      badgeClass: "role-dps",
      sectionCopy: "La linea offensiva: priorita, utility e pressione nelle finestre decisive."
    }
  };

  const roleOrder = ["tank", "healer", "dps"];

  const utilityConfig = [
    { label: "Bloodlust", classes: ["Shaman", "Mage", "Hunter", "Evoker"] },
    { label: "Combat Res", classes: ["Druid", "Paladin", "Warlock", "Death Knight"] },
    { label: "Fortitude", classes: ["Priest"] },
    { label: "Intellect", classes: ["Mage"] },
    { label: "Battle Shout", classes: ["Warrior"] },
    { label: "Mark of the Wild", classes: ["Druid"] },
    { label: "Mystic Touch", classes: ["Monk"] },
    { label: "Chaos Brand", classes: ["Demon Hunter"] }
  ];

  const state = {
    team: {},
    members: [],
    search: "",
    role: "all",
    className: "all",
    drawerMember: null,
    drawerOpener: null
  };

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function classSlug(name) {
    return normalizeText(name).replace(/[^a-z]/g, "");
  }

  function classIcon(name) {
    return `../../img/classes/${classSlug(name)}.png`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeHref(value) {
    return window.BJ && window.BJ.safeUrl ? window.BJ.safeUrl(value) : "";
  }

  function getMemberTagline(member) {
    return member.customTagline || member.tagline || "Presenza del roster";
  }

  function getMemberSummary(member) {
    return member.customSummary || member.summary || "Profilo rapido in aggiornamento.";
  }

  function getMemberBio(member) {
    return member.customBio || member.bio || "Profilo in aggiornamento.";
  }

  function getMemberImage(member) {
    if (member.customImage) return member.customImage;
    const source = member.sourceImage || member.image || "";
    return source.replace(/-avatar\.jpg(?:\?.*)?$/i, "-main-raw.png");
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
      const matchesClass = state.className === "all" || member.class === state.className;
      const haystack = normalizeText([
        member.name,
        member.class,
        member.spec,
        member.server,
        getMemberTagline(member)
      ].join(" "));
      const matchesSearch = !state.search || haystack.includes(normalizeText(state.search));
      return matchesRole && matchesClass && matchesSearch;
    });
  }

  function countByRole(members) {
    return members.reduce((counts, member) => {
      if (counts[member.role] != null) counts[member.role] += 1;
      return counts;
    }, { tank: 0, healer: 0, dps: 0 });
  }

  function renderOverview() {
    const box = document.getElementById("roster-overview");
    const members = getActiveMembers();
    const counts = countByRole(members);
    const teamName = escapeHtml(state.team.name || "Ace of Spades");

    box.innerHTML = `
      <div class="roster-overview__identity">
        <span class="roster-kicker"><i aria-hidden="true"></i> Active raid unit</span>
        <h2>${teamName}</h2>
        <p>Composizione ufficiale del progress. Profili, ruoli e collegamenti sempre sincronizzati con il roster di gilda.</p>
        <div class="roster-overview__actions">
          <a class="button-primary" href="aceofspades-progress.html">Progress stagione</a>
          <a class="button-secondary" href="../recruiting.html">Candidati al team</a>
        </div>
      </div>
      <div class="roster-overview__metrics" aria-label="Numeri del roster">
        <div class="roster-metric roster-metric--total">
          <span class="roster-metric__value">${members.length}</span>
          <span class="roster-metric__label">Raider attivi</span>
        </div>
        ${roleOrder.map(role => `
          <div class="roster-metric roster-metric--${role}">
            <span class="roster-metric__role">${roleConfig[role].shortLabel}</span>
            <span class="roster-metric__value">${counts[role]}</span>
            <span class="roster-metric__label">${roleConfig[role].label}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderFilters() {
    const container = document.getElementById("roster-filters");
    const filters = [
      { value: "all", label: "Tutto il team" },
      { value: "tank", label: "Tank" },
      { value: "healer", label: "Healer" },
      { value: "dps", label: "DPS" }
    ];

    container.innerHTML = filters.map(filter => `
      <button type="button" class="filter-chip ${state.role === filter.value ? "is-active" : ""}"
        data-role-filter="${filter.value}" aria-pressed="${state.role === filter.value}">
        ${filter.label}
      </button>
    `).join("");

    container.querySelectorAll("[data-role-filter]").forEach(button => {
      button.addEventListener("click", () => {
        state.role = button.getAttribute("data-role-filter") || "all";
        renderRoster();
      });
    });
  }

  function renderClassFilter() {
    const select = document.getElementById("roster-class-filter");
    const classes = [...new Set(getActiveMembers().map(member => member.class).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    select.innerHTML = `<option value="all">Tutte le classi</option>${classes.map(name =>
      `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
    ).join("")}`;
    select.value = state.className;
  }

  function renderComposition() {
    const box = document.getElementById("roster-composition");
    const members = getActiveMembers();
    if (!members.length) {
      box.hidden = true;
      return;
    }

    const counts = countByRole(members);
    const classCounts = new Map();
    members.forEach(member => {
      if (member.class && member.class !== "Unknown") {
        classCounts.set(member.class, (classCounts.get(member.class) || 0) + 1);
      }
    });

    const bars = roleOrder.map(role => {
      const count = counts[role];
      if (!count) return "";
      return `<span class="roster-bar__seg roster-bar__seg--${role}" style="flex:${count}" title="${roleConfig[role].label}: ${count}">
        <span>${roleConfig[role].label}</span><strong>${count}</strong>
      </span>`;
    }).join("");

    const chips = [...classCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => `<li class="class-chip class-mark--${classSlug(name)}">
        <span class="class-chip__dot" aria-hidden="true"></span>${escapeHtml(name)}<strong>${count}</strong>
      </li>`).join("");

    box.innerHTML = `
      <div class="roster-panel-heading">
        <div><span>Team balance</span><h3>Composizione</h3></div>
        <strong>${members.length} giocatori</strong>
      </div>
      <div class="roster-bar">${bars}</div>
      <ul class="class-chips">${chips}</ul>
    `;
    box.hidden = false;
  }

  function renderUtility() {
    const box = document.getElementById("roster-utility");
    const members = getActiveMembers();
    const classes = new Set(members.map(member => member.class));

    const rows = utilityConfig.map(utility => {
      const providers = utility.classes.filter(className => classes.has(className));
      const covered = providers.length > 0;
      return `<li class="utility-item ${covered ? "is-covered" : "is-missing"}">
        <span class="utility-item__state" aria-hidden="true">${covered ? "✓" : "!"}</span>
        <span><strong>${utility.label}</strong><small>${covered ? providers.join(" · ") : "Copertura assente"}</small></span>
      </li>`;
    }).join("");

    const coveredCount = utilityConfig.filter(utility => utility.classes.some(className => classes.has(className))).length;
    box.innerHTML = `
      <div class="roster-panel-heading">
        <div><span>Raid checks</span><h3>Utility coverage</h3></div>
        <strong>${coveredCount}/${utilityConfig.length}</strong>
      </div>
      <ul class="utility-grid">${rows}</ul>
    `;
    box.hidden = false;
  }

  function renderMedia(member, context) {
    const name = escapeHtml(member.name);
    const video = safeHref(getMemberVideo(member));
    const image = safeHref(getMemberImage(member));
    const eager = context === "drawer" ? "eager" : "lazy";
    const isArmoryRender = !member.customImage && /-main-raw\.png(?:\?.*)?$/i.test(image);

    if (video) {
      return `<video class="member-media member-media--custom" src="${escapeHtml(video)}" muted loop autoplay playsinline preload="metadata"></video>`;
    }
    if (image) {
      return `<img class="member-media ${isArmoryRender ? "member-media--armory" : "member-media--custom"}" src="${escapeHtml(image)}" alt="${name}" loading="${eager}" decoding="async">`;
    }
    return `<div class="member-card__fallback" aria-hidden="true">${name.slice(0, 1)}</div>`;
  }

  function renderMemberCard(member) {
    const name = escapeHtml(member.name);
    const memberKey = escapeHtml(member.slug || normalizeText(member.name));
    const memberClass = escapeHtml(member.class || "Classe in aggiornamento");
    const spec = escapeHtml(member.spec || "Specializzazione in aggiornamento");
    const server = escapeHtml(member.server || "");
    const roleInfo = roleConfig[member.role] || roleConfig.dps;
    const armory = member.armoryUrl ? safeHref(member.armoryUrl) : "";
    const rio = member.rio ? safeHref(member.rio) : "";

    return `
      <article class="member-card member-card--pro" data-class="${classSlug(member.class)}" data-role="${escapeHtml(member.role || "dps")}">
        <button class="member-card__open" type="button" data-member-key="${memberKey}" aria-label="Apri il profilo di ${name}">
          <span class="member-card__media">${renderMedia(member, "card")}<i class="member-card__gradient" aria-hidden="true"></i></span>
          <span class="member-card__body">
            <span class="member-card__eyebrow">
              <span class="role-badge ${roleInfo.badgeClass}">${roleInfo.label}</span>
              <span>${server}</span>
            </span>
            <span class="member-card__identity">
              <span class="class-mark class-mark--${classSlug(member.class)}">
                <img class="class-icon-small" src="${classIcon(member.class)}" alt="" loading="lazy" decoding="async" width="28" height="28">
              </span>
              <span><strong>${name}</strong><small>${spec} · ${memberClass}</small></span>
            </span>
            <span class="member-card__tagline">${escapeHtml(getMemberTagline(member))}</span>
            <span class="member-card__snippet">${escapeHtml(getMemberSummary(member))}</span>
            <span class="member-card__cta">Profilo completo <b aria-hidden="true">→</b></span>
          </span>
        </button>
        <footer class="member-card__footer">
          ${armory ? `<a href="${escapeHtml(armory)}" target="_blank" rel="noopener noreferrer">Armory</a>` : ""}
          ${rio ? `<a href="${escapeHtml(rio)}" target="_blank" rel="noopener noreferrer" aria-label="Raider.IO di ${name}"><img src="../../img/raiderio_logo.png" alt="Raider.IO"></a>` : ""}
        </footer>
      </article>
    `;
  }

  function openDrawer(member, opener) {
    const drawer = document.getElementById("roster-drawer");
    const content = document.getElementById("roster-drawer-content");
    const roleInfo = roleConfig[member.role] || roleConfig.dps;
    const name = escapeHtml(member.name);
    const armory = member.armoryUrl ? safeHref(member.armoryUrl) : "";
    const rio = member.rio ? safeHref(member.rio) : "";

    state.drawerMember = member;
    state.drawerOpener = opener || null;
    content.innerHTML = `
      <div class="roster-profile__media" data-class="${classSlug(member.class)}">${renderMedia(member, "drawer")}</div>
      <div class="roster-profile__content">
        <div class="roster-profile__badges">
          <span class="role-badge ${roleInfo.badgeClass}">${roleInfo.label}</span>
          <span>${escapeHtml(member.server || "")}</span>
        </div>
        <p class="roster-profile__kicker">${escapeHtml(getMemberTagline(member))}</p>
        <h2 id="roster-drawer-title">${name}</h2>
        <div class="roster-profile__spec">
          <img src="${classIcon(member.class)}" alt="" width="34" height="34">
          <span><strong>${escapeHtml(member.spec || "")}</strong><small>${escapeHtml(member.class || "")}</small></span>
        </div>
        <p class="roster-profile__bio">${escapeHtml(getMemberBio(member))}</p>
        <div class="roster-profile__links">
          ${armory ? `<a class="button-primary" href="${escapeHtml(armory)}" target="_blank" rel="noopener noreferrer">Apri Armory</a>` : ""}
          ${rio ? `<a class="button-secondary" href="${escapeHtml(rio)}" target="_blank" rel="noopener noreferrer">Raider.IO</a>` : ""}
        </div>
      </div>
    `;

    drawer.hidden = false;
    document.body.classList.add("roster-drawer-open");
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    drawer.querySelector(".roster-drawer__close").focus();
  }

  function closeDrawer() {
    const drawer = document.getElementById("roster-drawer");
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    document.body.classList.remove("roster-drawer-open");
    window.setTimeout(() => {
      drawer.hidden = true;
      document.getElementById("roster-drawer-content").innerHTML = "";
    }, 240);
    if (state.drawerOpener) state.drawerOpener.focus();
    state.drawerMember = null;
  }

  function bindRosterCards() {
    document.querySelectorAll("[data-member-key]").forEach(button => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-member-key");
        const member = getActiveMembers().find(item => (item.slug || normalizeText(item.name)) === key);
        if (member) openDrawer(member, button);
      });
    });
  }

  function renderRoster() {
    renderFilters();

    const container = document.getElementById("roster-container");
    const resultCount = document.getElementById("roster-result-count");
    const filteredMembers = getFilteredMembers();
    const total = getActiveMembers().length;
    resultCount.textContent = filteredMembers.length === total
      ? `${total} raider nel roster attivo`
      : `${filteredMembers.length} di ${total} raider mostrati`;

    if (!filteredMembers.length) {
      container.innerHTML = `<div class="empty-state">Nessun raider corrisponde ai filtri attuali.</div>`;
      return;
    }

    container.innerHTML = roleOrder.map(role => {
      const membersByRole = filteredMembers
        .filter(member => member.role === role)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!membersByRole.length) return "";

      const roleInfo = roleConfig[role];
      return `
        <section class="roster-role-section roster-role-section--${role}">
          <div class="roster-role-section__header">
            <div class="roster-role-section__title">
              <span class="roster-role-section__index">${roleInfo.shortLabel}</span>
              <div><span>Raid unit</span><h3>${roleInfo.label}</h3><p>${roleInfo.sectionCopy}</p></div>
            </div>
            <span class="roster-role-section__count">${membersByRole.length.toString().padStart(2, "0")}</span>
          </div>
          <div class="roster-role-grid">${membersByRole.map(renderMemberCard).join("")}</div>
        </section>
      `;
    }).join("");

    bindRosterCards();
  }

  async function loadRoster() {
    const response = await fetch(rosterDataUrl, { cache: "default" });
    if (!response.ok) throw new Error("Impossibile caricare il file roster.");

    const payload = await response.json();
    state.team = payload.team || {};
    state.members = payload.members || [];
    renderOverview();
    renderComposition();
    renderUtility();
    renderClassFilter();
    renderRoster();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("roster-search");
    const classFilter = document.getElementById("roster-class-filter");
    const drawer = document.getElementById("roster-drawer");

    search.addEventListener("input", event => {
      state.search = event.target.value;
      renderRoster();
    });

    classFilter.addEventListener("change", event => {
      state.className = event.target.value;
      renderRoster();
    });

    drawer.querySelectorAll("[data-roster-close]").forEach(button => button.addEventListener("click", closeDrawer));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !drawer.hidden) closeDrawer();
    });

    loadRoster().catch(error => {
      console.error(error);
      document.getElementById("roster-container").innerHTML = `<div class="empty-state">Impossibile caricare il roster in questo momento.</div>`;
    });
  });
})();
