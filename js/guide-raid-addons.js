const SITE_ROOT = new URL("../", window.location.href);
const DATA_URL = new URL("content/guides/raid-addons.json", SITE_ROOT);

document.addEventListener("DOMContentLoaded", loadRaidAddons);

async function loadRaidAddons() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Elenco addon non disponibile");
    const data = await response.json();
    document.title = `Blackjack - ${data.title}`;
    document.getElementById("addons-title").textContent = data.title;
    document.getElementById("addons-summary").textContent = data.summary;
    document.getElementById("mandatory-addons").innerHTML = data.addons.map((addon, index) => renderAddon(addon, index + 1, true)).join("");

    const toolsSection = document.getElementById("pre-raid-tools");
    const tools = Array.isArray(data.preRaidTools) ? data.preRaidTools : [];
    toolsSection.hidden = !tools.length;
    document.getElementById("activity-tools").innerHTML = tools.map((addon, index) => renderAddon(addon, index + 1, false)).join("");
  } catch (error) {
    console.error("Errore addon raid:", error);
    document.getElementById("mandatory-addons").innerHTML = '<div class="empty-state">Impossibile caricare l’elenco degli addon.</div>';
  }
}

function renderAddon(addon, position, mandatory) {
  return `
    <article class="raid-addon-card">
      <div class="raid-addon-card__number">${mandatory ? String(position).padStart(2, "0") : "SIM"}</div>
      <div class="raid-addon-card__body">
        <div class="editorial-card__meta"><span>${mandatory ? "Obbligatorio" : "Strumento pre-raid"}</span><strong>CurseForge</strong></div>
        <h3>${escapeHtml(addon.name)}</h3>
        <p>${escapeHtml(addon.purpose)}</p>
        <a class="team-btn" href="${escapeHtml(safeHref(addon.url))}" target="_blank" rel="noopener noreferrer">Apri su CurseForge</a>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

// Difesa in profondita: blocca javascript:/data:/vbscript: negli URL
// che arrivano dai worker o dai file di contenuto.
function safeHref(value) {
  return (window.BJ && window.BJ.safeUrl) ? window.BJ.safeUrl(value) : "";
}
