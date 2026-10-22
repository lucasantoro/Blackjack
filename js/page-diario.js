/* Blackjack - script di pagina: pages/spettatori-diario.html */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
  });

  const DIARY_AUTO_URL = "https://blackjack-community-diary.lucasantoro2905.workers.dev?limit=8";
  const DIARY_ARTICLES_URL = "../data/spettatori-diary-manual.json";

  const achievementTotal = document.getElementById("achievement-total");
  const achievementLatestDate = document.getElementById("achievement-latest-date");
  const achievementLatestTitle = document.getElementById("achievement-latest-title");
  const achievementPanels = document.getElementById("achievement-panels");
  const achievementCategoryBoard = document.getElementById("achievement-category-board");
  const manualArticles = document.getElementById("manual-articles");
  const manualPrev = document.getElementById("manual-prev");
  const manualNext = document.getElementById("manual-next");
  const diaryNote = document.getElementById("diary-note");
  const diaryArticleModal = document.getElementById("diary-article-modal");
  const diaryArticleClose = document.getElementById("diary-article-close");
  const diaryArticleArt = document.getElementById("diary-article-art");
  const diaryArticleSubtitle = document.getElementById("diary-article-subtitle");
  const diaryArticleDate = document.getElementById("diary-article-date");
  const diaryArticleTitle = document.getElementById("diary-article-title");
  const diaryArticleBody = document.getElementById("diary-article-body");
  let diaryArticlesState = [];
  let diaryArticlePendingId = null;

  function escapeHtml(value) {
    return String(value ?? "")
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

  function normalizeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, options = {}) {
    const date = normalizeDate(value);
    if (!date) return "Data non disponibile";
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options
    });
  }

  function formatPanelPercent(value) {
    const percent = Number(value || 0);
    return `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
  }

  function deriveTotalFromPercent(count, percent) {
    const safeCount = Number(count || 0) || 0;
    const safePercent = Number(percent || 0) || 0;
    if (!safeCount || !safePercent) return 0;
    return Math.max(safeCount, Math.round((safeCount * 100) / safePercent));
  }

  function normalizePanelMetrics(item) {
    const count = Number(item?.count ?? item?.completedCount ?? 0) || 0;
    const percent = Number(item?.percent || 0) || 0;
    const totalAvailable = Number(item?.totalAvailable || 0) || deriveTotalFromPercent(count, percent);
    const points = Number(item?.points ?? item?.totalPoints ?? 0) || 0;
    const totalPointsAvailable = Number(item?.totalPointsAvailable || 0) || 0;

    return {
      ...item,
      count,
      percent,
      totalAvailable,
      points,
      totalPointsAvailable
    };
  }

  function renderAchievementSummary(payload) {
    const summary = payload?.summary || {};
    const categories = Array.isArray(summary.categoryPanels) && summary.categoryPanels.length
      ? summary.categoryPanels.map(normalizePanelMetrics)
      : Array.isArray(payload?.categories)
        ? payload.categories.map(item => normalizePanelMetrics({
            id: item.id,
            category: item.name,
            count: item.completedCount,
            totalAvailable: item.totalAvailable,
            points: item.totalPoints,
            totalPointsAvailable: item.totalPointsAvailable,
            percent: item.percent,
            latestDate: item.latestDate
          }))
        : [];
    const latest = summary.latestUnlock || null;
    const totalCompleted = summary.totalCompleted ?? payload?.metadata?.totalCompleted ?? 0;

    achievementTotal.textContent = totalCompleted ?? "-";
    achievementLatestDate.textContent = latest?.date ? formatDate(latest.date) : "-";
    achievementLatestTitle.textContent = latest?.title
      ? `${latest.title}${latest.category ? ` - ${latest.category}` : ""}`
      : "Nessuno sblocco recente disponibile.";

    achievementPanels.innerHTML = categories.length
      ? categories.map(item => `
          <article class="achievement-panel-card">
            <div class="achievement-panel-ring" style="--progress:${Math.max(0, Math.min(100, Number(item.percent || 0)))}%;">
              <span>${escapeHtml(formatPanelPercent(item.percent))}</span>
            </div>
            <h3>${escapeHtml(item.category || "Categoria")}</h3>
            <div class="achievement-panel-meta">
              <strong>${escapeHtml(`${item.count ?? 0}/${item.totalAvailable ?? 0}`)}</strong>
              <span>${escapeHtml(`${item.points ?? 0}/${item.totalPointsAvailable ?? 0} pt`)}</span>
              <span>${escapeHtml(item.latestDate ? `Ultimo ${formatDate(item.latestDate)}` : "Nessuno sblocco registrato")}</span>
            </div>
          </article>
        `).join("")
      : `<div class="empty-state">Categorie non disponibili.</div>`;

    diaryNote.textContent = `${totalCompleted ?? 0} achievement completati nella pagina di gilda.`;
  }

  function renderAchievementCategories(payload) {
    const categories = Array.isArray(payload?.categories) ? payload.categories.map(normalizePanelMetrics) : [];

    if (!categories.length) {
      achievementCategoryBoard.innerHTML = `<div class="empty-state">Storico categorie non disponibile.</div>`;
      return;
    }

    achievementCategoryBoard.innerHTML = categories.map(category => `
      <details class="achievement-history-card">
        <summary class="achievement-history-card__summary">
          <div>
            <h3>${escapeHtml(category.name || "Categoria")}</h3>
            <p>${escapeHtml(category.latestDate ? `Ultimo sblocco ${formatDate(category.latestDate)}` : "Nessuna data disponibile")}</p>
          </div>
          <strong>${escapeHtml(formatPanelPercent(category.percent))}</strong>
        </summary>
        <div class="achievement-history-card__body">
          <div class="achievement-history-card__stats">
            <span>${escapeHtml(`${category.completedCount ?? 0}/${category.totalAvailable ?? 0} achievement`)}</span>
            <span>${escapeHtml(`${category.totalPoints ?? 0}/${category.totalPointsAvailable ?? 0} pt`)}</span>
          </div>
          ${(Array.isArray(category.achievements) && category.achievements.length)
            ? category.achievements.map(item => `
                <article class="achievement-history-row">
                  <div class="achievement-history-row__icon">
                    ${item.image
                      ? `<img src="${escapeHtml(safeHref(item.image))}" alt="" loading="lazy" decoding="async">`
                      : `<span>${escapeHtml((item.title || "A").slice(0, 1))}</span>`}
                  </div>
                  <div class="achievement-history-row__copy">
                    <h4>${escapeHtml(item.title || "Achievement")}</h4>
                    <p>${escapeHtml(item.description || "Obiettivo di gilda registrato.")}</p>
                  </div>
                  <div class="achievement-history-row__meta">
                    <span>${escapeHtml(formatDate(item.date))}</span>
                    <small>${escapeHtml(item.detailCategory || category.name || "Achievement")}</small>
                    ${item.sourceUrl ? `<a href="${escapeHtml(safeHref(item.sourceUrl))}" target="_blank" rel="noopener noreferrer">Fonte</a>` : ""}
                  </div>
                </article>
              `).join("")
            : `<div class="empty-state">Nessun achievement registrato in questa categoria.</div>`}
        </div>
      </details>
    `).join("");
  }

  // Prime righe del corpo, tagliate su un confine di parola.
  function excerptOf(article, max) {
    const limit = max || 165;
    const body = Array.isArray(article && article.body) ? article.body : [];
    const text = String(body[0] || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (text.length <= limit) return text;
    const cut = text.slice(0, limit);
    return cut.slice(0, cut.lastIndexOf(" ")) + "…";
  }

  function renderManualArticles(items) {
    if (!Array.isArray(items) || !items.length) {
      manualArticles.innerHTML = `<div class="empty-state">Nessun articolo manuale disponibile.</div>`;
      diaryArticlesState = [];
      updateManualCarouselButtons();
      return;
    }

    diaryArticlesState = items;

    // Il primo articolo e il pezzo forte: card grande con estratto.
    manualArticles.innerHTML = items.map((article, index) => {
      const lead = index === 0 ? " diary-card--lead" : "";
      const excerpt = excerptOf(article);
      return `
        <article class="diary-card${lead}">
          <button class="diary-card__button" type="button" data-diary-article-index="${index}" aria-label="Apri articolo ${escapeHtml(article.title || "Articolo")}">
            <span class="diary-card__media">
              ${article.image
                ? `<img src="${escapeHtml(safeHref(article.image))}" alt="" loading="lazy" decoding="async">`
                : `<span class="diary-card__placeholder">${escapeHtml((article.title || "B").slice(0, 1))}</span>`}
            </span>
            <span class="diary-card__body">
              <span class="diary-card__meta">
                <span class="diary-card__kicker">${escapeHtml(article.subtitle || "Diario di serata")}</span>
                <time>${escapeHtml(formatDate(article.date))}</time>
              </span>
              <span class="diary-card__title">${escapeHtml(article.title || "Titolo in arrivo")}</span>
              ${excerpt ? `<span class="diary-card__excerpt">${escapeHtml(excerpt)}</span>` : ""}
              <span class="diary-card__cta">Leggi il racconto &rarr;</span>
            </span>
          </button>
        </article>
      `;
    }).join("");

    manualArticles.querySelectorAll("[data-diary-article-index]").forEach(button => {
      button.addEventListener("click", () => openDiaryArticleModal(Number(button.getAttribute("data-diary-article-index"))));
    });

    updateManualCarouselButtons();
    openPendingDiaryArticle();
  }

  function renderDiaryArticleArt(article) {
    if (!diaryArticleArt) return;
    diaryArticleArt.innerHTML = article?.image
      ? `<img src="${escapeHtml(safeHref(article.image))}" alt="${escapeHtml(article.title || "Articolo")}">`
      : `<div class="editorial-card__placeholder">${escapeHtml((article?.title || "B").slice(0, 1))}</div>`;
  }

  function openDiaryArticleModal(index) {
    const article = diaryArticlesState[index];
    if (!article || !diaryArticleModal) return;

    const paragraphs = Array.isArray(article.body)
      ? article.body
      : String(article.body || "").split(/\n{2,}/).filter(Boolean);

    renderDiaryArticleArt(article);
    diaryArticleSubtitle.textContent = article.subtitle || "Diario di serata";
    diaryArticleDate.textContent = formatDate(article.date);
    diaryArticleTitle.textContent = article.title || "Titolo in arrivo";
    diaryArticleBody.innerHTML = paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("");

    diaryArticleModal.classList.add("is-open");
    diaryArticleModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function findDiaryArticleIndexById(articleId) {
    if (!articleId) return -1;
    return diaryArticlesState.findIndex(article => article?.id === articleId);
  }

  function openPendingDiaryArticle() {
    if (!diaryArticlePendingId || !diaryArticlesState.length) return;
    const index = findDiaryArticleIndexById(diaryArticlePendingId);
    if (index === -1) return;
    openDiaryArticleModal(index);
    diaryArticlePendingId = null;
  }

  function readDiaryArticleFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get("article");
    diaryArticlePendingId = articleId ? articleId.trim() : null;
  }

  function closeDiaryArticleModal() {
    if (!diaryArticleModal) return;
    diaryArticleModal.classList.remove("is-open");
    diaryArticleModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function scrollManualCarousel(direction) {
    if (!manualArticles) return;
    const amount = Math.max(320, manualArticles.clientWidth * 0.85) * direction;
    manualArticles.scrollBy({ left: amount, behavior: "smooth" });
  }

  function updateManualCarouselButtons() {
    if (!manualArticles || !manualPrev || !manualNext) return;
    const maxScroll = Math.max(0, manualArticles.scrollWidth - manualArticles.clientWidth - 8);
    manualPrev.disabled = manualArticles.scrollLeft <= 8;
    manualNext.disabled = manualArticles.scrollLeft >= maxScroll;
  }

  async function loadAchievementBoard() {
    try {
      const response = await fetch(DIARY_AUTO_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Riepilogo achievement non disponibile");
      }
      const payload = await response.json();
      renderAchievementSummary(payload);
      renderAchievementCategories(payload);
    } catch (_error) {
      achievementTotal.textContent = "-";
      achievementLatestDate.textContent = "-";
      achievementLatestTitle.textContent = "Impossibile leggere gli achievement della gilda.";
      achievementPanels.innerHTML = `<div class="empty-state">Categorie non disponibili.</div>`;
      achievementCategoryBoard.innerHTML = `<div class="empty-state">Storico categorie non disponibile.</div>`;
      diaryNote.textContent = "Il riepilogo achievement non e disponibile al momento.";
    }
  }

  async function loadManualEntries() {
    try {
      const response = await fetch(DIARY_ARTICLES_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Articoli non disponibili");
      }
      const payload = await response.json();
      renderManualArticles(Array.isArray(payload.articles) ? payload.articles : []);
    } catch {
      manualArticles.innerHTML = `<div class="empty-state">Impossibile leggere gli articoli del diario.</div>`;
      updateManualCarouselButtons();
    }
  }

  if (manualPrev && manualNext) {
    manualPrev.addEventListener("click", () => scrollManualCarousel(-1));
    manualNext.addEventListener("click", () => scrollManualCarousel(1));
  }

  if (manualArticles) {
    manualArticles.addEventListener("scroll", updateManualCarouselButtons, { passive: true });
  }

  if (diaryArticleClose) {
    diaryArticleClose.addEventListener("click", closeDiaryArticleModal);
  }

  document.querySelectorAll("[data-close-diary-modal]").forEach(node => {
    node.addEventListener("click", closeDiaryArticleModal);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && diaryArticleModal?.classList.contains("is-open")) {
      closeDiaryArticleModal();
    }
  });

  window.addEventListener("resize", updateManualCarouselButtons);

  readDiaryArticleFromUrl();
  loadAchievementBoard();
  loadManualEntries();
})();
