const PDFJS_VERSION = "4.10.38";
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
const SITE_ROOT = new URL("../", window.location.href);
const guideId = new URLSearchParams(window.location.search).get("id");
const state = { pdf: null, entry: null, page: 1, zoom: 1, spread: false, renderToken: 0 };

initRaidGuide();

async function initRaidGuide() {
  try {
    const manifestResponse = await fetch(new URL("data/guides-manifest.json", SITE_ROOT), { cache: "no-store" });
    if (!manifestResponse.ok) throw new Error("Indice guide non disponibile");
    const manifest = await manifestResponse.json();
    state.entry = (manifest.guides || []).find(item => item.id === guideId && item.type === "raid");
    if (!state.entry?.file) throw new Error("Guida raid non trovata");

    const pdfUrl = new URL(state.entry.file, SITE_ROOT).href;
    renderHeader(state.entry, pdfUrl);
    bindControls();
    const pdfjsLib = await import(PDFJS_URL);
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    state.pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
    document.getElementById("pdf-page-count").textContent = state.pdf.numPages;
    document.getElementById("pdf-page-number").max = state.pdf.numPages;
    await renderCurrentPages();
  } catch (error) {
    console.error("Errore lettore PDF:", error);
    renderNativeFallback();
  }
}

function renderHeader(entry, pdfUrl) {
  document.title = `Blackjack - ${entry.title}`;
  // Il footer e condiviso fra tutte le pagine (vedi scripts/build_layout.py).
  document.getElementById("raid-guide-hero").innerHTML = `<div class="hero-content hero-content--wide">
    <div class="hero-tagline">Raid | Manuale PDF</div><h1 class="hero-title">${escapeHtml(entry.title)}</h1>
    <p>${escapeHtml(entry.summary || "Guida raid consultabile direttamente dal sito.")}</p>
    <div class="hero-stats"><div class="stat-chip"><span class="stat-chip__value">${escapeHtml(entry.pages || "PDF")}</span><span class="stat-chip__label">pagine</span></div><div class="stat-chip"><span class="stat-chip__value">${escapeHtml(formatSize(entry.sizeBytes))}</span><span class="stat-chip__label">documento originale</span></div></div>
  </div>`;
  const download = document.getElementById("pdf-download");
  download.href = pdfUrl;
  download.setAttribute("download", `${entry.title}.pdf`);
}

function bindControls() {
  document.getElementById("pdf-prev").addEventListener("click", () => changePage(-(state.spread ? 2 : 1)));
  document.getElementById("pdf-next").addEventListener("click", () => changePage(state.spread ? 2 : 1));
  document.getElementById("pdf-page-number").addEventListener("change", event => goToPage(Number(event.target.value)));
  document.getElementById("pdf-zoom-out").addEventListener("click", () => setZoom(state.zoom - 0.1));
  document.getElementById("pdf-zoom-in").addEventListener("click", () => setZoom(state.zoom + 0.1));
  document.getElementById("pdf-spread").addEventListener("click", () => {
    state.spread = !state.spread;
    document.getElementById("pdf-spread").classList.toggle("is-active", state.spread);
    document.getElementById("pdf-spread").textContent = state.spread ? "Pagina singola" : "Vista doppia";
    renderCurrentPages();
  });
  document.getElementById("pdf-fullscreen").addEventListener("click", () => document.getElementById("reader").requestFullscreen?.());
  document.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") changePage(-(state.spread ? 2 : 1));
    if (event.key === "ArrowRight") changePage(state.spread ? 2 : 1);
  });
  window.addEventListener("resize", debounce(() => state.pdf && renderCurrentPages(), 180));
}

async function renderCurrentPages() {
  if (!state.pdf) return;
  const token = ++state.renderToken;
  const stage = document.getElementById("pdf-book-stage");
  const status = document.getElementById("pdf-reader-status");
  const pages = state.spread && state.page < state.pdf.numPages ? [state.page, state.page + 1] : [state.page];
  stage.classList.toggle("is-spread", pages.length === 2);
  stage.innerHTML = "";
  status.textContent = `Caricamento ${pages.length === 2 ? `pagine ${pages[0]}-${pages[1]}` : `pagina ${pages[0]}`}...`;

  for (const pageNumber of pages) {
    const page = await state.pdf.getPage(pageNumber);
    if (token !== state.renderToken) return;
    const baseViewport = page.getViewport({ scale: 1 });
    const available = Math.max(280, stage.clientWidth - (pages.length === 2 ? 56 : 32));
    const targetWidth = pages.length === 2 ? available / 2 : Math.min(920, available);
    const viewport = page.getViewport({ scale: (targetWidth / baseViewport.width) * state.zoom });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.className = "pdf-book-page";
    canvas.dataset.page = String(pageNumber);
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    stage.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport, transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0] }).promise;
  }
  if (token !== state.renderToken) return;
  status.textContent = pages.length === 2 ? `Pagine ${pages[0]}-${pages[1]} di ${state.pdf.numPages}` : `Pagina ${state.page} di ${state.pdf.numPages}`;
  document.getElementById("pdf-page-number").value = state.page;
  document.getElementById("pdf-reader-progress-bar").style.width = `${Math.min(100, ((pages.at(-1)) / state.pdf.numPages) * 100)}%`;
  updateButtons();
}

function changePage(delta) { goToPage(state.page + delta); }
function goToPage(value) {
  if (!state.pdf) return;
  state.page = Math.max(1, Math.min(state.pdf.numPages, Math.round(value) || 1));
  renderCurrentPages();
}
function setZoom(value) {
  state.zoom = Math.max(0.6, Math.min(2, Math.round(value * 10) / 10));
  document.getElementById("pdf-zoom-label").textContent = `${Math.round(state.zoom * 100)}%`;
  renderCurrentPages();
}
function updateButtons() {
  document.getElementById("pdf-prev").disabled = state.page <= 1;
  document.getElementById("pdf-next").disabled = state.page >= state.pdf.numPages;
}

function renderNativeFallback() {
  const status = document.getElementById("pdf-reader-status");
  const stage = document.getElementById("pdf-book-stage");
  if (!state.entry?.file) {
    status.textContent = "Documento non disponibile.";
    stage.innerHTML = '<div class="empty-state">Impossibile aprire la guida raid.</div>';
    return;
  }
  const pdfUrl = new URL(state.entry.file, SITE_ROOT).href;
  status.textContent = "Lettore avanzato non disponibile: uso del visualizzatore PDF del browser.";
  stage.innerHTML = `<iframe class="pdf-native-fallback" src="${escapeHtml(pdfUrl)}#view=FitH" title="${escapeHtml(state.entry.title)}"></iframe>`;
}

function formatSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "PDF";
  return value >= 1048576 ? `${(value / 1048576).toFixed(1)} MB` : `${Math.ceil(value / 1024)} KB`;
}
function debounce(callback, delay) { let timer; return () => { clearTimeout(timer); timer = setTimeout(callback, delay); }; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
