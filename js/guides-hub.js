const SITE_ROOT = new URL("../", window.location.href);
const MANIFEST_URL = new URL("data/guides-manifest.json", SITE_ROOT);
const state = { manifest: null, activeCategory: "all" };

document.addEventListener("DOMContentLoaded", async () => {
  await loadGuideLibrary();
});

async function loadGuideLibrary() {
  const container = document.getElementById("guide-library");
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Indice guide non disponibile");
    state.manifest = await response.json();
    renderCategoryTabs();
    renderGuideLibrary();
  } catch (error) {
    console.error("Errore guide:", error);
    container.innerHTML = '<div class="empty-state">Impossibile caricare la biblioteca delle guide.</div>';
  }
}

function renderCategoryTabs() {
  const tabs = document.getElementById("guide-category-tabs");
  const categories = state.manifest?.categories || [];
  const options = [{ id: "all", title: "Tutte" }, ...categories];
  tabs.innerHTML = options.map(category => `
    <button class="guide-category-tab ${category.id === state.activeCategory ? "is-active" : ""}"
      type="button" role="tab" aria-selected="${category.id === state.activeCategory}"
      data-guide-category="${escapeHtml(category.id)}">${escapeHtml(category.title)}</button>
  `).join("");
  tabs.querySelectorAll("[data-guide-category]").forEach(button => {
    button.addEventListener("click", () => {
      state.activeCategory = button.dataset.guideCategory;
      renderCategoryTabs();
      renderGuideLibrary();
    });
  });
}

function renderGuideLibrary() {
  const container = document.getElementById("guide-library");
  const all = state.manifest?.guides || [];
  const guides = state.activeCategory === "all"
    ? all
    : all.filter(guide => guide.type === state.activeCategory);

  if (!guides.length) {
    container.innerHTML = '<div class="empty-state">Nessuna guida disponibile in questa categoria.</div>';
    return;
  }

  // La guida aggiornata piu di recente apre la pagina; le altre seguono.
  const sorted = guides.slice().sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));

  container.innerHTML = `
    <div class="guide-grid">
      ${sorted.map((guide, index) => renderGuideTile(guide, index === 0)).join("")}
    </div>
  `;
}

// Senza copertina la card non resta vuota: si costruisce un fondo
// tipografico con il nome dell'istanza e il seme di picche.
function guideArt(guide) {
  const cover = guide.coverImage ? resolveAsset(guide.coverImage) : "";
  if (cover) {
    return `<span class="guide-tile__art">
      <img src="${escapeHtml(safeHref(cover))}" alt="" loading="lazy" decoding="async">
    </span>`;
  }
  // "Raid" per tre guide diverse non dice niente: meglio il nome
  // dell'istanza o, in mancanza, l'etichetta specifica della guida.
  const line = guide.instance || guide.badge || guide.expansion || "Gilda";
  return `<span class="guide-tile__art guide-tile__art--type" data-kind="${escapeHtml(guide.section || guide.type)}">
    <span class="guide-tile__suit" aria-hidden="true">&#9824;</span>
    <span class="guide-tile__artline">${escapeHtml(line)}</span>
  </span>`;
}

function guideMeta(guide) {
  if (guide.pages) return `${guide.pages} pagine &middot; PDF`;
  const bits = [guide.expansion, guide.instance].filter(Boolean).join(" · ");
  if (bits) return escapeHtml(bits);
  return guide.updated ? `Aggiornata ${escapeHtml(formatDate(guide.updated))}` : "Guida di gilda";
}

function renderGuideTile(guide, lead) {
  const href = resolveAsset(guide.href);
  const label = guide.section === "addons"
    ? "Vedi gli addon"
    : guide.pages ? "Apri il manuale" : "Apri la guida";

  return `
    <article class="guide-tile${lead ? " guide-tile--lead" : ""}">
      <a class="guide-tile__link" href="${escapeHtml(safeHref(href))}">
        ${guideArt(guide)}
        <span class="guide-tile__body">
          ${guide.badge ? `<span class="guide-tile__badge">${escapeHtml(guide.badge)}</span>` : ""}
          <span class="guide-tile__title">${escapeHtml(guide.title)}</span>
          <span class="guide-tile__summary">${escapeHtml(guide.summary || guide.subtitle || "")}</span>
          <span class="guide-tile__foot">
            <span class="guide-tile__meta">${guideMeta(guide)}</span>
            <span class="guide-tile__cta">${label} &rarr;</span>
          </span>
        </span>
      </a>
    </article>
  `;
}

function resolveAsset(value) { return new URL(value, SITE_ROOT).href; }
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("it-IT");
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Difesa in profondita: blocca javascript:/data:/vbscript: negli URL
// che arrivano dai worker o dai file di contenuto.
function safeHref(value) {
  return (window.BJ && window.BJ.safeUrl) ? window.BJ.safeUrl(value) : "";
}
