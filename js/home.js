/* =========================================================
   BLACKJACK - HOME

   Due blocchi vivi:
   - "In onda": diretta Twitch, video della gilda e VOD in un
     unico schermo con la lista a fianco.
   - "Cosa e successo": un fatto in evidenza piu una timeline
     compatta, letta da Warcraft Logs, Armory e Twitch.

   Il DOM si costruisce con createElement/textContent: nessun
   innerHTML su dati remoti.
   ========================================================= */
(function () {
  "use strict";

  var BJ = window.BJ;
  var CFG = window.BJ_CONFIG || {};
  var W = CFG.workers || {};

  var TYPES = {
    raid:        { label: "Raid",        order: 1 },
    achievement: { label: "Achievement", order: 2 },
    video:       { label: "Video",       order: 3 },
    stream:      { label: "Stream",      order: 4 },
    guide:       { label: "Guida",       order: 5 }
  };

  var DIFFICULTY = { normal: "Normal", heroic: "Heroic", mythic: "Mythic" };

  var items = [];          // voci della timeline
  var stageItems = [];     // voci dello schermo "In onda"
  var videoIndex = {};
  var activeFilter = "all";
  var motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- helper ---------------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function setLink(node, href) {
    var url = BJ.safeUrl(href);
    if (!url) return node;
    node.href = url;
    if (/^https?:/i.test(url)) {
      node.target = "_blank";
      node.rel = "noopener noreferrer";
    }
    return node;
  }

  /* ---------------- sorgenti della timeline ---------------- */

  function fromRaid(data) {
    var out = [];
    var session = data && data.lastSession;
    if (!session || !session.report) return out;

    var when = session.report.endTime || session.report.startTime;
    var zone = (session.report.zone && session.report.zone.name) || "";
    var url = session.reportUrl;
    var bosses = Array.isArray(session.bossList) ? session.bossList : [];

    bosses.forEach(function (boss) {
      var pulls = Number(boss.pulls) || 0;
      if (!pulls) return;
      var kills = Number(boss.kills) || 0;
      var detail = Array.isArray(boss.pullsDetail) ? boss.pullsDetail : [];
      var killPull = null;
      for (var i = 0; i < detail.length; i++) {
        if (detail[i].kill) { killPull = detail[i]; break; }
      }
      var diff = DIFFICULTY[(killPull || detail[0] || {}).difficulty] || "";

      var stats = [];
      if (diff) stats.push({ value: diff, label: "difficoltà" });
      stats.push({ value: String(pulls), label: pulls === 1 ? "pull" : "pull" });
      if (!kills && boss.bestPercentage != null) {
        stats.push({ value: Number(boss.bestPercentage).toFixed(1) + "%", label: "miglior try" });
      }

      out.push({
        type: "raid",
        kill: kills > 0,
        pulls: pulls,
        weight: kills > 0 ? 3 : 1,
        kicker: kills > 0 ? "Boss chiuso" : "Progress",
        title: kills > 0 ? boss.bossName + " è andato giù" : boss.bossName + ", ci siamo quasi",
        meta: [zone, pulls + " pull"].filter(Boolean).join(" · "),
        stats: stats,
        date: when,
        href: url
      });
    });

    out.sort(function (a, b) { return b.weight - a.weight; });
    return out.slice(0, 4);
  }

  // Se l'ultimo report appartiene a un raid diverso dalla campagna aperta,
  // lastSession resta senza boss e la bacheca perdeva del tutto la voce Raid.
  // In quel caso si racconta lo stato della campagna.
  function fromCampaign(data) {
    if (!data || !data.progress) return [];
    var campaign = data.selectedCampaign || {};
    var when = (data.overview && data.overview.latestReportTime) || campaign.lastSeen;
    if (!when) return [];

    var best = null;
    ["mythic", "heroic", "normal"].forEach(function (key) {
      var block = data.progress[key];
      if (!block || !block.summary) return;
      var killed = Number(block.summary.killedBosses) || 0;
      if (killed && !best) {
        best = {
          key: key,
          killed: killed,
          total: Number(block.summary.totalBosses) || 0,
          pulls: Number(block.summary.totalPulls) || 0
        };
      }
    });
    if (!best) return [];

    var done = best.total && best.killed === best.total;
    return [{
      type: "raid",
      weight: 3,
      kicker: "Campagna",
      title: done
        ? campaign.name + " chiuso in " + DIFFICULTY[best.key]
        : campaign.name + ": " + best.killed + "/" + best.total + " in " + DIFFICULTY[best.key],
      meta: campaign.season ? campaign.expansion + " · " + campaign.season : (campaign.expansion || ""),
      stats: [
        { value: best.killed + "/" + best.total, label: "boss" },
        { value: String(best.pulls), label: "pull" },
        { value: DIFFICULTY[best.key], label: "difficoltà" }
      ],
      date: when,
      href: (CFG.links || {}).warcraftlogs
    }];
  }

  // Blizzard pubblica lo stesso achievement in piu difficolta:
  // "Gilda: X" e "Gilda: X [E]". Ne teniamo uno solo.
  function dedupeAchievements(list) {
    var groups = {}, order = [];
    list.forEach(function (entry) {
      var base = String(entry.title || "").replace(/\s*\[[A-Za-z]\]\s*$/, "").trim().toLowerCase();
      var key = base + "|" + String(entry.date || "").slice(0, 10);
      if (!groups[key]) { groups[key] = entry; order.push(key); }
      else if (String(entry.title || "").length > String(groups[key].title || "").length) {
        groups[key] = entry;
      }
    });
    return order.map(function (k) { return groups[k]; });
  }

  function fromAchievements(data) {
    var list = (data && data.summary && data.summary.recentAchievements) || (data && data.articles) || [];
    if (!Array.isArray(list)) return [];
    return dedupeAchievements(list).slice(0, 5).map(function (entry) {
      return {
        type: "achievement",
        weight: 2,
        kicker: "Achievement di gilda",
        title: entry.title || "Achievement sbloccato",
        meta: entry.detailCategory || "",
        date: entry.date,
        href: entry.sourceUrl,
        image: BJ.safeImageUrl(entry.image)
      };
    });
  }

  function fromGuides(data) {
    var guides = (data && data.guides) || [];
    if (!Array.isArray(guides)) return [];
    return guides
      .filter(function (g) { return g.updated; })
      .sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)); })
      .slice(0, 2)
      .map(function (guide) {
        return {
          type: "guide",
          weight: 1,
          kicker: "Nuova guida",
          title: guide.title || "Guida di gilda",
          meta: [guide.expansion, guide.instance].filter(Boolean).join(" · "),
          date: guide.updated,
          href: guide.href || "pages/guide.html"
        };
      });
  }

  function fromGuildVideosFeed(videos) {
    return videos.slice(0, 2).map(function (video) {
      return {
        type: "video",
        weight: 2,
        kicker: "Video",
        title: "Nuovo video della gilda",
        meta: [video.title, video.author ? "di " + video.author : "", video.duration || ""]
          .filter(Boolean).join(" · "),
        date: video.date,
        href: "#in-onda",
        image: BJ.safeUrl(video.poster),
        videoId: video.id
      };
    });
  }

  function fromTwitchFeed(data) {
    var videos = (data && Array.isArray(data.recentVideos)) ? data.recentVideos : [];
    return videos.slice(0, 2).map(function (video) {
      return {
        type: "stream",
        weight: 1,
        kicker: "Serata in diretta",
        title: video.title || "VOD Twitch",
        meta: [video.duration || "", video.view_count != null ? video.view_count + " visualizzazioni" : ""]
          .filter(Boolean).join(" · "),
        date: video.published_at,
        href: video.url,
        image: BJ.safeImageUrl(video.thumbnail_url)
      };
    });
  }

  /* ---------------- blocco "In onda" ---------------- */

  function guildVideos(data) {
    var list = (data && Array.isArray(data.videos)) ? data.videos : [];
    return list.filter(function (v) {
      return v && v.id && v.title && (v.src || v.youtubeId || v.twitchVideoId);
    });
  }

  function buildStageItems(twitch, videos) {
    var out = [];

    if (twitch && twitch.live) {
      out.push({
        id: "live",
        kind: "live",
        title: twitch.title || "Raid in diretta",
        meta: [twitch.game_name || "", twitch.viewer_count != null ? twitch.viewer_count + " in ascolto" : ""]
          .filter(Boolean).join(" · "),
        thumb: BJ.safeImageUrl(twitch.channel && twitch.channel.profile_image_url),
        badge: "LIVE"
      });
    }

    videos.forEach(function (video) {
      out.push({
        id: video.id,
        kind: "video",
        title: video.title,
        meta: [video.author ? "di " + video.author : "", BJ.formatDate(video.date)]
          .filter(Boolean).join(" · "),
        thumb: BJ.safeUrl(video.poster),
        preview: BJ.safeUrl(video.preview),
        badge: video.duration || "",
        video: video
      });
    });

    var vods = (twitch && Array.isArray(twitch.recentVideos)) ? twitch.recentVideos : [];
    vods.slice(0, 4).forEach(function (vod) {
      out.push({
        id: "vod-" + vod.id,
        kind: "vod",
        title: vod.title || "VOD Twitch",
        meta: BJ.formatDate(vod.published_at),
        thumb: BJ.safeImageUrl(vod.thumbnail_url),
        badge: vod.duration || "VOD",
        url: vod.url,
        twitchVideoId: vod.id
      });
    });

    return out;
  }

  function renderStageScreen(entry) {
    var screen = document.getElementById("stage-screen");
    if (!screen || !entry) return;

    screen.replaceChildren();

    if (entry.kind === "live") {
      var frame = document.createElement("iframe");
      frame.src = BJ.twitchEmbedUrl({ channel: CFG.twitchChannel });
      frame.title = "Diretta Twitch della gilda";
      frame.allowFullscreen = true;
      frame.setAttribute("frameborder", "0");
      frame.setAttribute("scrolling", "no");
      screen.appendChild(frame);
    } else {
      // Anteprima muta in loop: da movimento senza scaricare il video intero.
      if (entry.preview) {
        var loop = document.createElement("video");
        loop.src = entry.preview;
        loop.muted = true;
        loop.loop = true;
        loop.playsInline = true;
        loop.preload = "none";
        loop.setAttribute("aria-hidden", "true");
        if (entry.thumb) loop.poster = entry.thumb;
        loop.className = "stage-screen__loop";
        screen.appendChild(loop);
        startWhenVisible(loop);
      } else if (entry.thumb) {
        var img = el("img", "stage-screen__still");
        img.src = entry.thumb;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        screen.appendChild(img);
      } else {
        screen.appendChild(el("div", "stage-screen__empty", "Nessun video"));
      }

      var play = el("button", "stage-screen__play");
      play.type = "button";
      play.setAttribute("aria-label", "Guarda: " + entry.title);
      play.appendChild(el("span", "stage-screen__play-icon", "▶"));
      play.appendChild(el("span", "stage-screen__play-label", entry.kind === "vod" ? "Guarda il VOD" : "Guarda"));
      play.addEventListener("click", function () { openFull(entry); });
      screen.appendChild(play);
    }

    var status = document.getElementById("stage-status");
    if (status) {
      if (entry.kind === "live") {
        status.hidden = false;
        status.replaceChildren(el("span", "stage-status__dot"), document.createTextNode("Live ora"));
      } else {
        status.hidden = true;
      }
    }
  }

  // Il loop parte solo quando entra davvero nello schermo.
  function startWhenVisible(video) {
    if (!motionOk) return;
    if (!("IntersectionObserver" in window)) {
      video.preload = "auto";
      video.play().catch(function () {});
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          video.play().catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.25 });
    observer.observe(video);
  }

  function openFull(entry) {
    if (entry.kind === "video" && entry.video) {
      videoModal.open(entry.video);
    } else if (entry.kind === "vod") {
      videoModal.open({
        title: entry.title,
        description: entry.meta,
        twitchVideoId: entry.twitchVideoId
      });
    }
  }

  function renderStage(twitch, videosData) {
    var section = document.getElementById("in-onda");
    var list = document.getElementById("stage-list");
    var videos = guildVideos(videosData);

    videoIndex = {};
    videos.forEach(function (v) { videoIndex[v.id] = v; });

    stageItems = buildStageItems(twitch, videos);

    if (!stageItems.length) {
      if (section) section.hidden = true;
      return videos;
    }

    renderStageScreen(stageItems[0]);

    if (list) {
      list.replaceChildren();
      stageItems.slice(1, 6).forEach(function (entry) {
        var li = el("li", "stage-list__item");
        var button = el("button", "stage-list__button");
        button.type = "button";

        var thumb = el("span", "stage-list__thumb");
        if (entry.thumb) {
          var img = el("img");
          img.src = entry.thumb;
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";
          thumb.appendChild(img);
        }
        if (entry.badge) thumb.appendChild(el("span", "stage-list__badge", entry.badge));
        button.appendChild(thumb);

        var body = el("span", "stage-list__body");
        body.appendChild(el("span", "stage-list__title", entry.title));
        if (entry.meta) body.appendChild(el("span", "stage-list__meta", entry.meta));
        button.appendChild(body);

        button.addEventListener("click", function () {
          renderStageScreen(entry);
          Array.prototype.forEach.call(list.querySelectorAll(".stage-list__button"), function (other) {
            other.classList.remove("is-current");
          });
          button.classList.add("is-current");
        });

        li.appendChild(button);
        list.appendChild(li);
      });
      list.hidden = list.childNodes.length === 0;
    }

    return videos;
  }

  /* ---------------- player a comparsa ---------------- */

  function buildPlayer(video) {
    if (video.youtubeId && /^[A-Za-z0-9_-]{6,20}$/.test(video.youtubeId)) {
      var yt = document.createElement("iframe");
      yt.src = "https://www.youtube-nocookie.com/embed/" + video.youtubeId + "?autoplay=1&rel=0";
      yt.title = video.title;
      yt.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      yt.allowFullscreen = true;
      yt.setAttribute("frameborder", "0");
      return yt;
    }

    if (video.twitchVideoId && /^\d{6,}$/.test(String(video.twitchVideoId))) {
      var tw = document.createElement("iframe");
      tw.src = BJ.twitchEmbedUrl({ video: video.twitchVideoId });
      tw.title = video.title;
      tw.allowFullscreen = true;
      tw.setAttribute("frameborder", "0");
      return tw;
    }

    var src = BJ.safeUrl(video.src);
    if (!src) return null;
    var player = document.createElement("video");
    player.src = src;
    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
    player.preload = "metadata";
    var poster = BJ.safeUrl(video.poster);
    if (poster) player.poster = poster;
    return player;
  }

  var videoModal = {
    open: function (video) {
      if (!video) return;
      var root = document.getElementById("video-modal");
      var stage = document.getElementById("video-modal-stage");
      if (!root || !stage) return;

      var player = buildPlayer(video);
      if (!player) return;

      this.lastFocus = document.activeElement;
      stage.replaceChildren(player);

      var title = document.getElementById("video-modal-title");
      var desc = document.getElementById("video-modal-desc");
      if (title) title.textContent = video.title || "";
      if (desc) {
        desc.textContent = [video.description, video.author ? "Video di " + video.author : ""]
          .filter(Boolean).join(" · ");
      }

      root.hidden = false;
      document.body.classList.add("modal-open");
      var close = document.getElementById("video-modal-close");
      if (close) close.focus();
    },

    close: function () {
      var root = document.getElementById("video-modal");
      var stage = document.getElementById("video-modal-stage");
      if (!root || root.hidden) return;
      stage.replaceChildren();   // ferma la riproduzione, anche negli iframe
      root.hidden = true;
      document.body.classList.remove("modal-open");
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    }
  };

  function initVideoModal() {
    var root = document.getElementById("video-modal");
    if (!root) return;
    var close = document.getElementById("video-modal-close");
    if (close) close.addEventListener("click", function () { videoModal.close(); });
    root.addEventListener("click", function (event) {
      if (event.target === root || event.target.classList.contains("video-modal__backdrop")) {
        videoModal.close();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") videoModal.close();
    });
  }

  /* ---------------- timeline ---------------- */

  function renderLead(item) {
    var box = document.getElementById("pulse-lead");
    if (!box || !item) return;

    var link = document.getElementById("pulse-lead-link");
    setLink(link, item.href);
    if (item.videoId) {
      link.addEventListener("click", function (event) {
        var entry = stageItems.filter(function (s) { return s.id === item.videoId; })[0];
        if (!entry) return;
        event.preventDefault();
        renderStageScreen(entry);
        document.getElementById("in-onda").scrollIntoView({ behavior: motionOk ? "smooth" : "auto", block: "start" });
      });
    }

    var kicker = document.getElementById("pulse-lead-kicker");
    kicker.replaceChildren();
    kicker.appendChild(el("span", "pulse-pill pulse-pill--" + item.type, TYPES[item.type].label));
    var when = BJ.relativeTime(item.date);
    if (when) kicker.appendChild(el("span", "pulse-lead__when", when));

    document.getElementById("pulse-lead-title").textContent = item.title;
    document.getElementById("pulse-lead-meta").textContent = item.meta || "";

    var stats = document.getElementById("pulse-lead-stats");
    stats.replaceChildren();
    (item.stats || []).forEach(function (stat) {
      var li = el("li");
      li.appendChild(el("strong", null, stat.value));
      li.appendChild(el("span", null, stat.label));
      stats.appendChild(li);
    });

    box.hidden = false;
  }

  function renderRow(item) {
    var li = el("li", "pulse-row");
    li.setAttribute("data-type", item.type);

    var link = el("a", "pulse-row__link");
    setLink(link, item.href);
    if (item.videoId) {
      link.addEventListener("click", function (event) {
        var entry = stageItems.filter(function (s) { return s.id === item.videoId; })[0];
        if (!entry) return;
        event.preventDefault();
        renderStageScreen(entry);
        document.getElementById("in-onda").scrollIntoView({ behavior: motionOk ? "smooth" : "auto", block: "start" });
      });
    }

    link.appendChild(el("span", "pulse-pill pulse-row__pill pulse-pill--" + item.type, TYPES[item.type].label));

    var body = el("span", "pulse-row__body");
    body.appendChild(el("span", "pulse-row__title", item.title));
    if (item.meta) body.appendChild(el("span", "pulse-row__meta", item.meta));
    link.appendChild(body);

    var when = BJ.relativeTime(item.date);
    if (when) {
      var time = el("time", "pulse-row__when", when);
      var parsed = BJ.toDate(item.date);
      if (parsed) {
        time.dateTime = parsed.toISOString();
        time.title = BJ.formatDateLong(parsed);
      }
      link.appendChild(time);
    }

    li.appendChild(link);
    return li;
  }

  function renderFilters() {
    var box = document.getElementById("news-filters");
    if (!box) return;

    var present = {};
    items.forEach(function (item) { present[item.type] = true; });

    var filters = [{ value: "all", label: "Tutto" }];
    Object.keys(TYPES)
      .filter(function (k) { return present[k]; })
      .sort(function (a, b) { return TYPES[a].order - TYPES[b].order; })
      .forEach(function (k) { filters.push({ value: k, label: TYPES[k].label }); });

    if (filters.length < 3) { box.replaceChildren(); return; }

    box.replaceChildren();
    filters.forEach(function (filter) {
      var button = el("button", "pulse-chip" + (activeFilter === filter.value ? " is-active" : ""), filter.label);
      button.type = "button";
      button.setAttribute("aria-pressed", activeFilter === filter.value ? "true" : "false");
      button.addEventListener("click", function () {
        activeFilter = filter.value;
        renderFilters();
        renderFeed();
      });
      box.appendChild(button);
    });
  }

  // Sceglie il fatto da mettere in evidenza: fra quelli recenti vince il piu
  // significativo, non semplicemente il piu nuovo.
  function pickHeadline(list) {
    var limit = Date.now() - 14 * 86400000;
    var recent = list.filter(function (item) {
      var date = BJ.toDate(item.date);
      return date && date.getTime() >= limit;
    });
    var pool = recent.length ? recent : list;
    return pool.reduce(function (best, item) {
      if (!best) return item;
      var bw = best.weight || 0, iw = item.weight || 0;
      if (iw !== bw) return iw > bw ? item : best;
      var bd = BJ.toDate(best.date), id = BJ.toDate(item.date);
      var bt = bd ? bd.getTime() : 0, it = id ? id.getTime() : 0;
      if (it !== bt) return it > bt ? item : best;
      // Stesso giorno e stesso peso: vince il fight piu combattuto.
      return (item.pulls || 0) > (best.pulls || 0) ? item : best;
    }, null);
  }

  function renderFeed() {
    var feed = document.getElementById("news-grid");
    var note = document.getElementById("news-note");
    var lead = document.getElementById("pulse-lead");
    if (!feed) return;

    var visible = items.filter(function (item) {
      return activeFilter === "all" || item.type === activeFilter;
    });

    // In "Tutto" va in evidenza il fatto piu importante delle ultime due
    // settimane (un boss chiuso batte un achievement, non la data da sola);
    // filtrando per categoria resta tutto in lista.
    var rows = visible;
    if (activeFilter === "all" && visible.length) {
      var headline = pickHeadline(visible);
      renderLead(headline);
      rows = visible.filter(function (item) { return item !== headline; });
    } else if (lead) {
      lead.hidden = true;
    }

    feed.replaceChildren();
    if (!rows.length && !visible.length) {
      feed.appendChild(el("li", "pulse-empty", "Niente da mostrare in questa categoria."));
    } else {
      rows.slice(0, 7).forEach(function (item, index) {
        var row = renderRow(item);
        if (motionOk) {
          row.style.animationDelay = (index * 45) + "ms";
          row.classList.add("is-revealing");
        }
        feed.appendChild(row);
      });
    }

    if (note) {
      note.replaceChildren();
      var raider = setLink(el("a", null, "Raider.IO"), (CFG.links || {}).raiderio);
      var logs = setLink(el("a", null, "Warcraft Logs"), (CFG.links || {}).warcraftlogs);
      note.appendChild(document.createTextNode("Tutto in automatico da "));
      note.appendChild(logs);
      note.appendChild(document.createTextNode(", Armory e "));
      note.appendChild(raider);
      note.appendChild(document.createTextNode("."));
    }
  }

  /* ---------------- hero ---------------- */

  function renderHeroProgress(data) {
    var box = document.getElementById("hero-progress");
    var raidSlot = document.getElementById("hero-progress-raid");
    var chipSlot = document.getElementById("hero-progress-chips");
    if (!box || !data || !data.progress) return;

    raidSlot.textContent = (data.selectedCampaign || {}).name || "Raid in corso";
    chipSlot.replaceChildren();

    ["mythic", "heroic", "normal"].forEach(function (key) {
      var block = data.progress[key];
      if (!block || !block.summary) return;
      var killed = Number(block.summary.killedBosses) || 0;
      var total = Number(block.summary.totalBosses) || 0;
      if (!total) return;
      var chip = el("span", "progress-chip progress-chip--" + key);
      chip.appendChild(el("strong", null, killed + "/" + total));
      chip.appendChild(el("span", null, DIFFICULTY[key]));
      if (killed && killed === total) chip.classList.add("is-complete");
      chipSlot.appendChild(chip);
    });

    if (chipSlot.childNodes.length) box.hidden = false;
  }

  function countUp(node, target, suffix) {
    if (!node) return;
    if (!motionOk) { node.textContent = target + suffix; return; }
    var steps = 28, i = 0;
    var timer = setInterval(function () {
      i += 1;
      var eased = 1 - Math.pow(1 - i / steps, 3);
      node.textContent = Math.round(target * eased) + suffix;
      if (i >= steps) {
        clearInterval(timer);
        node.textContent = target + suffix;
      }
    }, 28);
  }

  function renderHeroMeta(stats) {
    if (!stats) return;
    var runs = document.getElementById("hero-meta-runs");
    var roster = document.getElementById("hero-meta-roster");

    if (runs && stats.guildRunsLast30 != null) {
      runs.replaceChildren(el("strong", null, "0"), document.createTextNode(" key chiuse questo mese"));
      countUp(runs.firstChild, Number(stats.guildRunsLast30), "");
    }
    if (roster && stats.activePlayersLast30 != null) {
      roster.replaceChildren(el("strong", null, "0"), document.createTextNode(" giocatori attivi"));
      countUp(roster.firstChild, Number(stats.activePlayersLast30), "");
    }
  }

  /* ---------------- inno ---------------- */

  function initAnthem() {
    var logo = document.getElementById("anthem-toggle");
    var audio = document.getElementById("anthem-audio");
    var hint = document.getElementById("anthem-hint");
    if (!logo || !audio) return;

    audio.volume = 0.2;

    function toggle() {
      if (audio.paused) audio.play().catch(function () {});
      else audio.pause();
    }

    logo.addEventListener("click", toggle);
    if (hint) hint.addEventListener("click", toggle);

    audio.addEventListener("play", function () {
      logo.classList.add("is-playing");
      logo.setAttribute("aria-pressed", "true");
      if (hint) { hint.textContent = "ferma l'inno"; hint.classList.add("is-playing"); }
    });

    function reset() {
      logo.classList.remove("is-playing");
      logo.setAttribute("aria-pressed", "false");
      if (hint) { hint.textContent = "ascolta l'inno"; hint.classList.remove("is-playing"); }
    }
    audio.addEventListener("pause", reset);
    audio.addEventListener("ended", reset);
  }

  /* ---------------- canto d'apertura ---------------- */

  function initIntro() {
    var overlay = document.getElementById("intro-overlay");
    var openBtn = document.getElementById("intro-open");
    if (!overlay || !openBtn) return;

    var scroll = overlay.querySelector(".intro-scroll");
    var closeBtn = document.getElementById("intro-close");
    var closeBtn2 = document.getElementById("intro-close-2");
    var enterBtn = document.getElementById("intro-enter");
    var audio = document.getElementById("anthem-audio");
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add("intro-open");
      if (scroll) scroll.scrollTop = 0;
      if (closeBtn) closeBtn.focus();
    }

    function close(startAudio) {
      overlay.classList.add("is-leaving");
      document.body.classList.remove("intro-open");
      if (startAudio && audio) audio.play().catch(function () {});
      setTimeout(function () {
        overlay.hidden = true;
        overlay.classList.remove("is-leaving");
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }, 420);
    }

    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", function () { close(false); });
    if (closeBtn2) closeBtn2.addEventListener("click", function () { close(false); });
    if (enterBtn) enterBtn.addEventListener("click", function () { close(true); });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.classList.contains("intro-backdrop")) close(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) close(false);
    });
  }

  /* ---------------- avvio ---------------- */

  function settled(promise) {
    return promise.then(
      function (value) { return { ok: true, value: value }; },
      function (error) { return { ok: false, error: error }; }
    );
  }

  // Il worker del progress interroga Warcraft Logs: quando la sua cache e
  // fredda la prima chiamata puo andare in timeout. Un secondo tentativo
  // trova la risposta gia pronta.
  function withRetry(make, attempts) {
    var left = (attempts || 2) - 1;
    return make().catch(function (error) {
      if (left <= 0) throw error;
      left -= 1;
      return make();
    });
  }

  function load() {
    Promise.all([
      settled(withRetry(function () {
        return BJ.fetchJson(W.raidProgress + "/progress-dashboard", { timeout: 30000 });
      })),
      settled(BJ.fetchJson(W.communityDiary + "/", { timeout: 20000 })),
      settled(BJ.fetchJson(W.twitch + "/?channel=" + encodeURIComponent(CFG.twitchChannel) + "&videos=6")),
      settled(BJ.fetchJson(W.communityStats + "/")),
      settled(BJ.fetchJson("data/guides-manifest.json", { cache: "default" })),
      settled(BJ.fetchJson("data/guild-videos.json", { cache: "default" }))
    ]).then(function (r) {
      var raid = r[0], diary = r[1], twitch = r[2], stats = r[3], guides = r[4], videos = r[5];

      var guildVideoList = renderStage(twitch.ok ? twitch.value : null, videos.ok ? videos.value : null);

      if (raid.ok) {
        var raidItems = fromRaid(raid.value);
        items = items.concat(raidItems.length ? raidItems : fromCampaign(raid.value));
        renderHeroProgress(raid.value);
      }
      if (diary.ok) items = items.concat(fromAchievements(diary.value));
      items = items.concat(fromGuildVideosFeed(guildVideoList));
      if (twitch.ok) items = items.concat(fromTwitchFeed(twitch.value));
      if (guides.ok) items = items.concat(fromGuides(guides.value));
      if (stats.ok) renderHeroMeta(stats.value);

      items = items.filter(function (item) { return item && item.title; });
      items.sort(function (a, b) {
        var da = BJ.toDate(a.date), db = BJ.toDate(b.date);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });

      renderFilters();
      renderFeed();
    });
  }

  initAnthem();
  initIntro();
  initVideoModal();
  load();
})();
