// Lightweight integration based on Miorey/wow-model-viewer.
// Source: https://github.com/Miorey/wow-model-viewer
// The viewer depends on Wowhead/Zam model assets and falls back to static images when unavailable.
(function () {
  const CONTENT_PATH = window.BLACKJACK_MODEL_CONTENT_PATH || "https://blackjack-wow-model-assets.lucasantoro2905.workers.dev/modelviewer/live/";
  const VIEWER_SCRIPT = `${CONTENT_PATH}viewer/viewer.min.js`;
  const JQUERY_SCRIPT = "https://code.jquery.com/jquery-3.7.1.min.js";
  const MODEL_TYPES = {
    item: 1,
    helm: 2,
    shoulder: 4,
    npc: 8,
    character: 16,
    humanoidnpc: 32,
    object: 64,
    armor: 128,
    path: 256,
    itemvisual: 512,
    collection: 1024
  };
  const MODEL_META_PATHS = {
    [MODEL_TYPES.item]: "item",
    [MODEL_TYPES.helm]: "item",
    [MODEL_TYPES.shoulder]: "item",
    [MODEL_TYPES.npc]: "npc",
    [MODEL_TYPES.humanoidnpc]: "npc",
    [MODEL_TYPES.object]: "object",
    [MODEL_TYPES.collection]: "collection"
  };
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

  function buildContentUrl(path) {
    return new URL(path, CONTENT_PATH).toString();
  }

  async function fetchModelMeta(displayId, modelType) {
    const metaPath = MODEL_META_PATHS[modelType] || "npc";
    const response = await fetch(buildContentUrl(`meta/${metaPath}/${displayId}.json`), {
      cache: "force-cache"
    });

    if (!response.ok) {
      throw new Error(`Model metadata unavailable: ${response.status}`);
    }

    return response.json();
  }

  async function hasModelGeometry(modelId) {
    const response = await fetch(buildContentUrl(`_exists/mo3/${modelId}.mo3`), {
      cache: "force-cache"
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return Boolean(payload.ok);
  }

  async function verifyModelAssets(displayId, modelType) {
    const meta = await fetchModelMeta(displayId, modelType);
    const modelId = Number(meta?.Model || 0);
    if (!modelId) {
      throw new Error("Model metadata did not include a geometry id");
    }

    const geometryAvailable = await hasModelGeometry(modelId);
    if (!geometryAvailable) {
      throw new Error(`Model geometry unavailable: ${modelId}`);
    }
  }

  async function createModel(container) {
    if (loadedModels.has(container)) return;

    const displayId = Number(container.dataset.displayId || 0);
    const modelType = MODEL_TYPES[String(container.dataset.modelType || "npc").toLowerCase()] || MODEL_TYPES.npc;
    if (!displayId) {
      showFallback(container);
      return;
    }

    loadedModels.add(container);
    setStatus(container, "Caricamento modello 3D...");

    try {
      await verifyModelAssets(displayId, modelType);
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
          type: modelType
        }
      };

      const model = new window.ZamModelViewer(options);
      container.__wowModel = model;
      container.classList.add("is-loaded");
      container.parentElement?.querySelector("[data-model-fallback]")?.classList.add("is-hidden");
      setStatus(container, "Modello 3D");
    } catch (error) {
      if (window.BLACKJACK_MODEL_DEBUG) {
        console.warn("Model viewer fallback:", error);
      }
      showFallback(container);
      setStatus(container, "Immagine statica");
    }
  }

  function loadActiveGuideModel(root = document) {
    const activePanel = root.querySelector(".guide-boss-card:not([hidden])");
    const modelContainer = activePanel?.querySelector("[data-wow-model]");
    if (modelContainer) {
      createModel(modelContainer);
    }
  }

  function loadAutoloadModels(root = document) {
    root.querySelectorAll("[data-wow-model][data-wow-model-autoload]").forEach(container => {
      createModel(container);
    });
  }

  window.BlackjackWowModels = {
    loadActiveGuideModel,
    loadAutoloadModels,
    createModel
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadAutoloadModels();
    loadActiveGuideModel();
  });
})();
