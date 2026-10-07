const SITE_ROOT = new URL("../", window.location.href);
const guideId = new URLSearchParams(window.location.search).get("id");
let activeGuide = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("page-loaded");
  await loadGuide();
});

async function loadGuide() {
  try {
    const manifestResponse = await fetch(new URL("data/guides-manifest.json", SITE_ROOT), { cache: "no-store" });
    if (!manifestResponse.ok) throw new Error("Indice guide non disponibile");
    const manifest = await manifestResponse.json();
    const entry = (manifest.guides || []).find(item => item.id === guideId && item.type === "achievement");
    if (!entry?.source) throw new Error("Guida achievement non trovata");
    const guideResponse = await fetch(new URL(entry.source, SITE_ROOT), { cache: "no-store" });
    if (!guideResponse.ok) throw new Error("File guida non disponibile");
    activeGuide = await guideResponse.json();
    renderGuide(activeGuide);
  } catch (error) {
    console.error("Errore guida achievement:", error);
    document.getElementById("guide-content").innerHTML = '<div class="empty-state">La guida richiesta non e disponibile.</div>';
  }
}

function renderGuide(guide) {
  document.title = `Blackjack - ${guide.title}`;
  document.getElementById("guide-footer").textContent = `© 2026 Blackjack | ${guide.title}`;
  document.getElementById("guide-hero").innerHTML = `
    <div class="hero-content hero-content--wide">
      <div class="hero-tagline">${escapeHtml([guide.expansion, guide.instance].filter(Boolean).join(" | ") || "Guida achievement")}</div>
      <h2>${escapeHtml(guide.title)}</h2>
      <p>${escapeHtml(guide.subtitle || guide.summary)}</p>
      <div class="hero-stats">${(guide.stats || []).map(stat => `
        <div class="stat-chip"><span class="stat-chip__value">${escapeHtml(stat.value)}</span><span class="stat-chip__label">${escapeHtml(stat.label)}</span></div>
      `).join("")}</div>
    </div>`;

  const preparation = guide.preparation || {};
  document.getElementById("guide-content").innerHTML = `
    <section class="guide-feature">
      <div class="guide-feature__copy">
        <div class="eyebrow">Preparazione</div>
        <h2 class="section-title">${escapeHtml(preparation.title || "Prima di entrare")}</h2>
        ${(preparation.paragraphs || []).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        ${(preparation.checklist || []).length ? `<ul class="check-list">${preparation.checklist.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      </div>
      ${renderGuideCover(guide.cover || {})}
    </section>
    <section id="boss-guide">
      <div class="section-head section-head--center"><div class="eyebrow">Boss</div><h2 class="section-title">Seleziona il boss</h2><p class="section-subtitle">Ogni scheda raccoglie condizioni, passaggi e riferimenti utili.</p></div>
      <div class="guide-boss-tabs" role="tablist" aria-label="Boss della guida">
        ${(guide.bosses || []).map((boss, index) => `<button class="guide-boss-tab ${index === 0 ? "is-active" : ""}" type="button" role="tab" aria-selected="${index === 0}" data-guide-boss="${escapeHtml(boss.id)}">${escapeHtml(boss.name)}</button>`).join("")}
      </div>
      <div class="guide-boss-panels">${(guide.bosses || []).map((boss, index) => renderBoss(boss, index)).join("")}</div>
    </section>
    <section class="cta-final"><div class="cta-final__actions"><a href="guide.html" class="button-primary">Torna all'hub guide</a>${renderLinks(guide.links || [])}</div></section>`;

  initBossTabs();
  window.BlackjackWowModels?.loadAutoloadModels();
  window.BlackjackWowModels?.loadActiveGuideModel();
}

function renderGuideCover(cover) {
  const model = cover.modelDisplayId ? `<div class="guide-model-viewer guide-model-viewer--reward" data-wow-model data-wow-model-autoload data-model-type="${escapeHtml(cover.modelType || "npc")}" data-display-id="${Number(cover.modelDisplayId)}" data-aspect="1"></div>` : "";
  const image = cover.image ? `<img class="guide-model-fallback" data-model-fallback src="${escapeHtml(resolveAsset(cover.image))}" alt="${escapeHtml(cover.alt || activeGuide.title)}">` : '<div class="guide-media-placeholder" data-model-fallback>BJ</div>';
  return `<figure class="guide-feature__media">${model}${image}${model ? '<span class="guide-model-status" data-model-status>Modello 3D</span>' : ""}<figcaption>${escapeHtml(activeGuide.title)}</figcaption></figure>`;
}

function renderBoss(boss, index) {
  const model = boss.modelDisplayId ? `<div class="guide-model-viewer" data-wow-model data-model-type="${escapeHtml(boss.modelType || "npc")}" data-display-id="${Number(boss.modelDisplayId)}" data-aspect="1"></div>` : "";
  const image = boss.image ? `<img class="guide-model-fallback" data-model-fallback src="${escapeHtml(resolveAsset(boss.image))}" alt="${escapeHtml(boss.imageAlt || boss.name)}">` : '<div class="guide-media-placeholder" data-model-fallback>BJ</div>';
  return `<article class="guide-boss-card ${index === 0 ? "is-active" : ""}" role="tabpanel" data-guide-panel="${escapeHtml(boss.id)}" ${index === 0 ? "" : "hidden"}>
    <div class="guide-boss-card__media">${model}${image}${model ? '<span class="guide-model-status" data-model-status>Modello 3D</span>' : ""}</div>
    <div class="guide-boss-card__body"><div class="eyebrow">${escapeHtml(boss.name)}</div><h3>Achievement del boss</h3>${boss.intro ? `<p>${escapeHtml(boss.intro)}</p>` : ""}
      ${(boss.achievements || []).map(renderAchievement).join("")}
      ${(boss.notes || []).length ? `<div class="guide-note"><strong>Note</strong><ul>${boss.notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul></div>` : ""}
      ${renderReferences(boss.references || [])}
    </div>
  </article>`;
}

function renderAchievement(item) {
  return `<div class="guide-achievement"><h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.description)}</p>
    ${(item.steps || []).length ? `<ol>${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : ""}
    ${(item.waypoints || []).length ? `<div class="guide-waypoints">${item.waypoints.map(point => `<code>${escapeHtml(point)}</code>`).join("")}</div>` : ""}
  </div>`;
}

function renderReferences(items) {
  const available = items.filter(item => item.image);
  if (!available.length) return "";
  return `<div class="guide-visual-reference"><h4>Riferimenti visivi</h4>${available.map(item => `<figure><img src="${escapeHtml(resolveAsset(item.image))}" alt="${escapeHtml(item.alt || "Riferimento guida")}" loading="lazy"><figcaption>${escapeHtml(item.caption || "")}</figcaption></figure>`).join("")}</div>`;
}

function renderLinks(links) {
  return links.filter(link => link.url).map(link => `<a href="${escapeHtml(resolveAsset(link.url))}" class="button-secondary">${escapeHtml(link.label || "Approfondisci")}</a>`).join("");
}

function initBossTabs() {
  const tabs = Array.from(document.querySelectorAll("[data-guide-boss]"));
  const panels = Array.from(document.querySelectorAll("[data-guide-panel]"));
  const showBoss = (key, updateHash = true) => {
    const selected = panels.some(panel => panel.dataset.guidePanel === key) ? key : panels[0]?.dataset.guidePanel;
    tabs.forEach(tab => { const active = tab.dataset.guideBoss === selected; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); });
    panels.forEach(panel => { const active = panel.dataset.guidePanel === selected; panel.classList.toggle("is-active", active); panel.hidden = !active; });
    window.BlackjackWowModels?.loadActiveGuideModel();
    if (updateHash && selected) history.replaceState(null, "", `#${selected}`);
  };
  tabs.forEach(tab => tab.addEventListener("click", () => showBoss(tab.dataset.guideBoss)));
  if (tabs.length) showBoss(window.location.hash.slice(1) || tabs[0].dataset.guideBoss, false);
}

function resolveAsset(value) { return new URL(value, SITE_ROOT).href; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
