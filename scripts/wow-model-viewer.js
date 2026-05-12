// Lightweight integration based on Miorey/wow-model-viewer.
// Source: https://github.com/Miorey/wow-model-viewer
// The viewer depends on Wowhead/Zam model assets and falls back to static images when unavailable.
(function () {
  const CONTENT_PATH = "https://wow.zamimg.com/modelviewer/live/";
  const VIEWER_SCRIPT = `${CONTENT_PATH}viewer/viewer.min.js`;
  const JQUERY_SCRIPT = "https://code.jquery.com/jquery-3.7.1.min.js";
  const NPC_TYPE = 8;
  const loadedModels = new WeakSet();
  let dependencyPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (existing.dataset.loaded === "true") resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function ensureWowheadGlobals() {
    window.CONTENT_PATH = window.CONTENT_PATH || CONTENT_PATH;
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;
    if (!window.WH) {
      window.WH = {};
    }
    window.WH.debug = window.WH.debug || function () {};
    window.WH.defaultAnimation = window.WH.defaultAnimation || "Stand";
    window.WH.WebP = window.WH.WebP || {
      getImageExtension() {
        return ".webp";
      }
    };
  }

  function loadDependencies() {
    if (!dependencyPromise) {
      dependencyPromise = Promise.resolve()
        .then(ensureWowheadGlobals)
        .then(() => window.jQuery ? undefined : loadScript(JQUERY_SCRIPT))
        .then(() => window.ZamModelViewer ? undefined : loadScript(VIEWER_SCRIPT));
    }
    return dependencyPromise;
  }

  function setStatus(container, status) {
    const statusNode = container.parentElement?.querySelector("[data-model-status]");
    if (statusNode) {
      statusNode.textContent = status;
    }
  }

  function showFallback(container) {
    container.classList.add("is-failed");
    container.parentElement?.querySelector("[data-model-fallback]")?.classList.remove("is-hidden");
  }

  async function createNpcModel(container) {
    if (loadedModels.has(container)) return;

    const displayId = Number(container.dataset.displayId || 0);
    if (!displayId) {
      showFallback(container);
      return;
    }

    loadedModels.add(container);
    setStatus(container, "Caricamento modello 3D...");

    try {
      await loadDependencies();
      if (!window.ZamModelViewer || !window.jQuery) {
        throw new Error("Wowhead model viewer unavailable");
      }

      const options = {
        type: 2,
        contentPath: window.CONTENT_PATH,
        container: window.jQuery(container),
        aspect: Number(container.dataset.aspect || 1),
        hd: true,
        models: {
          id: displayId,
          type: NPC_TYPE
        }
      };

      const model = new window.ZamModelViewer(options);
      container.__wowModel = model;
      container.classList.add("is-loaded");
      container.parentElement?.querySelector("[data-model-fallback]")?.classList.add("is-hidden");
      setStatus(container, "Modello 3D");
    } catch (error) {
      console.warn("Model viewer fallback:", error);
      showFallback(container);
      setStatus(container, "Immagine statica");
    }
  }

  function loadActiveGuideModel(root = document) {
    const activePanel = root.querySelector(".guide-boss-card:not([hidden])");
    const modelContainer = activePanel?.querySelector("[data-wow-model]");
    if (modelContainer) {
      createNpcModel(modelContainer);
    }
  }

  window.BlackjackWowModels = {
    loadActiveGuideModel,
    createNpcModel
  };

  document.addEventListener("DOMContentLoaded", () => loadActiveGuideModel());
})();
