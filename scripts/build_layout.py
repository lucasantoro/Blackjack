# -*- coding: utf-8 -*-
"""Rigenera head, header e footer di tutte le pagine da un'unica sorgente.

Uso:  python scripts/build_layout.py

Ogni pagina viene riscritta tra i marcatori <!--#bj:head--> / <!--#bj:header--> /
<!--#bj:footer-->. Per aggiungere una voce di menu o cambiare la CSP basta
modificare questo file ed eseguirlo: le 15 pagine restano allineate.
"""
import os, re, io

ROOT = r"Z:\Blackjack"
os.chdir(ROOT)
SITE = "https://www.blackjackguild.it"

CSP = (
    "default-src 'self'; "
    "upgrade-insecure-requests; "
    "base-uri 'self'; "
    "object-src 'none'; "
    "form-action 'self'; "
    "manifest-src 'self'; "
    "script-src 'self' https://challenges.cloudflare.com https://code.jquery.com "
    "https://cdn.jsdelivr.net https://blackjack-wow-model-assets.lucasantoro2905.workers.dev; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://wow.zamimg.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: blob: https://render.worldofwarcraft.com https://render-eu.worldofwarcraft.com "
    "https://render-us.worldofwarcraft.com https://static-cdn.jtvnw.net https://wow.zamimg.com "
    "https://i.ytimg.com; "
    "media-src 'self' blob:; "
    "worker-src 'self' blob: https://cdn.jsdelivr.net; "
    "connect-src 'self' https://blackjack-twitch-status.lucasantoro2905.workers.dev "
    "https://blackjack-raid-progress.lucasantoro2905.workers.dev "
    "https://blackjack-community-stats.lucasantoro2905.workers.dev "
    "https://blackjack-community-diary.lucasantoro2905.workers.dev "
    "https://blackjack-recruiting.lucasantoro2905.workers.dev "
    "https://blackjack-wow-model-assets.lucasantoro2905.workers.dev "
    "https://wow.zamimg.com https://cdn.jsdelivr.net; "
    "frame-src https://player.twitch.tv https://challenges.cloudflare.com "
    "https://www.youtube-nocookie.com https://www.youtube.com"
)

PAGES = {
    "index.html": (
        "home",
        "Blackjack | Gilda WoW italiana su Nemesis EU",
        "Gilda italiana su Nemesis EU: raid progress con il team Ace of Spades, Mythic+ e una community attiva ogni giorno. Ultime attività, kill e achievement sempre aggiornati.",
        ["js/home.js"],
    ),
    "pages/raider.html": (
        "raider",
        "Raider | Blackjack",
        "Il reparto raid dei Blackjack: metodo, progress live del team Ace of Spades e accesso al roster.",
        ["js/page-raider.js"],
    ),
    "pages/spettatori.html": (
        "spettatori",
        "Spettatori | Blackjack",
        "La community dei Blackjack: Mythic+ senza stress, alt run, eventi social, achievement di gilda e il diario delle serate.",
        ["js/page-spettatori.js", "js/page-diario.js"],
    ),
    "pages/guide.html": (
        "guide",
        "Guide di gilda | Blackjack",
        "La biblioteca dei Blackjack: guide achievement boss per boss, strategie raid e addon obbligatori.",
        ["js/guides-hub.js"],
    ),
    "pages/guide-detail.html": (
        "guide",
        "Guida achievement | Blackjack",
        "Guida achievement della gilda Blackjack, con criteri boss per boss e immagini di riferimento.",
        ["scripts/wow-model-viewer.js", "js/guide-detail.js"],
    ),
    "pages/guide-raid.html": (
        "guide",
        "Guida raid | Blackjack",
        "Guide raid dei Blackjack consultabili pagina per pagina direttamente dal sito.",
        [],  # guide-raid.js e un modulo ES, caricato in fondo al body
    ),
    "pages/guide-raid-addons.html": (
        "guide",
        "Addon obbligatori | Blackjack",
        "La configurazione minima di addon richiesta a ogni raider Blackjack prima della serata.",
        ["js/guide-raid-addons.js"],
    ),
    "pages/recruiting.html": (
        "recruiting",
        "Reclutamento | Blackjack",
        "Candidati ai Blackjack: raid lunedì e mercoledì 21:30-23:30 su Nemesis EU. Compila il modulo di ingresso.",
        ["https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", "js/page-recruiting.js"],
    ),
    "pages/statuto.html": (
        "statuto",
        "Statuto della gilda | Blackjack",
        "Le regole dei Blackjack: comportamento, raid, loot e vita di gilda in un documento unico.",
        ["js/page-statuto.js"],
    ),
    "pages/high-roller/aceofspades.html": (
        "raider",
        "Ace of Spades | Team raid Blackjack",
        "Il team raid Ace of Spades: come lavoriamo, progress per difficoltà, ultima sessione e timeline dei boss.",
        ["js/page-progress.js"],
    ),
    "pages/high-roller/roster-aceofspades.html": (
        "raider",
        "Roster Ace of Spades | Blackjack",
        "Il roster completo del team raid Ace of Spades, diviso per ruolo con link ad Armory e Raider.IO.",
        ["js/page-roster.js"],
    ),
}

NAV_ITEMS = [
    ("home", "index.html", "Home"),
    ("raider", "pages/raider.html", "Raider"),
    ("spettatori", "pages/spettatori.html", "Spettatori"),
    ("guide", "pages/guide.html", "Guide"),
    ("recruiting", "pages/recruiting.html", "Reclutamento"),
    ("statuto", "pages/statuto.html", "Statuto"),
]


def prefix_for(path):
    return "../" * path.count("/")


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def build_head(path, nav, title, desc, scripts):
    r = prefix_for(path)
    url = SITE + "/" + ("" if path == "index.html" else path)
    og = SITE + "/img/og-cover.jpg"
    lines = [
        "<!--#bj:head-->",
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1">',
        '  <meta http-equiv="Content-Security-Policy" content="%s">' % CSP,
        '  <meta name="referrer" content="strict-origin-when-cross-origin">',
        "  <title>%s</title>" % esc(title),
        '  <meta name="description" content="%s">' % esc(desc),
        '  <meta name="theme-color" content="#07110f">',
        '  <link rel="canonical" href="%s">' % url,
        '  <meta property="og:type" content="website">',
        '  <meta property="og:site_name" content="Blackjack">',
        '  <meta property="og:locale" content="it_IT">',
        '  <meta property="og:title" content="%s">' % esc(title),
        '  <meta property="og:description" content="%s">' % esc(desc),
        '  <meta property="og:url" content="%s">' % url,
        '  <meta property="og:image" content="%s">' % og,
        '  <meta property="og:image:width" content="1200">',
        '  <meta property="og:image:height" content="630">',
        '  <meta property="og:image:alt" content="Blackjack, gilda italiana su Nemesis EU">',
        '  <meta name="twitter:card" content="summary_large_image">',
        '  <meta name="twitter:title" content="%s">' % esc(title),
        '  <meta name="twitter:description" content="%s">' % esc(desc),
        '  <meta name="twitter:image" content="%s">' % og,
        '  <link rel="icon" href="%simg/icons/favicon.ico" sizes="any">' % r,
        '  <link rel="icon" type="image/png" sizes="32x32" href="%simg/icons/icon-32.png">' % r,
        '  <link rel="apple-touch-icon" href="%simg/icons/apple-touch-icon.png">' % r,
        '  <link rel="manifest" href="%ssite.webmanifest">' % r,
        '  <link rel="preconnect" href="https://fonts.googleapis.com">',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&amp;family=Manrope:wght@400;500;600;700;800&amp;display=swap">',
        '  <link rel="stylesheet" href="%scss/style.css?v=24">' % r,
        '  <script src="%sjs/boot.js"></script>' % r,
        '  <script src="%sjs/config.js" defer></script>' % r,
        '  <script src="%sjs/site.js" defer></script>' % r,
    ]
    for item in scripts:
        # Gli URL assoluti (CDN di terze parti) non vanno prefissati.
        if item.startswith("https://"):
            lines.append('  <script src="%s" async defer></script>' % item)
        else:
            lines.append('  <script src="%s%s" defer></script>' % (r, item))
    lines.append("<!--#/bj:head-->")
    return "\n".join(lines)


def build_header(path, nav):
    r = prefix_for(path)
    items = []
    for key, href, label in NAV_ITEMS:
        active = ' class="active" aria-current="page"' if key == nav else ""
        items.append('        <li><a href="%s%s"%s>%s</a></li>' % (r, href, active, label))
    return "\n".join([
        "<!--#bj:header-->",
        '<a class="skip-link" href="#contenuto">Salta al contenuto</a>',
        '<header class="site-header">',
        '  <nav class="mainnav" aria-label="Navigazione principale">',
        '    <a href="%sindex.html" class="nav-brand">' % r,
        '      <img src="%simg/blackjack_logo.png" alt="" width="56" height="56" decoding="async">' % r,
        "      <span>Blackjack</span>",
        "    </a>",
        '    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mainnav-list">',
        '      <span class="nav-toggle__bars" aria-hidden="true"></span>',
        '      <span class="nav-toggle__text">Menu</span>',
        "    </button>",
        '    <ul class="mainnav__list" id="mainnav-list">',
        "\n".join(items),
        "    </ul>",
        "  </nav>",
        "</header>",
        "<!--#/bj:header-->",
    ])


def build_footer(path):
    r = prefix_for(path)
    cols = [
        ("Gilda", [(r + "index.html", "Home"), (r + "pages/statuto.html", "Statuto"),
                   (r + "pages/recruiting.html", "Reclutamento")]),
        ("Raid", [(r + "pages/high-roller/aceofspades.html", "Ace of Spades"),
                  (r + "pages/high-roller/roster-aceofspades.html", "Roster"),
                  (r + "pages/recruiting.html", "Candidati")]),
        ("Community", [(r + "pages/spettatori.html", "Spettatori"),
                       (r + "pages/spettatori.html#diario", "Diario"),
                       (r + "pages/guide.html", "Guide")]),
    ]
    out = ["<!--#bj:footer-->", '<footer class="site-footer">',
           '  <div class="site-footer__grid">',
           '    <div class="site-footer__brand">',
           '      <img src="%simg/blackjack_logo.png" alt="" width="48" height="48" loading="lazy" decoding="async">' % r,
           "      <div>",
           "        <strong>Blackjack</strong>",
           "        <p>Gilda italiana su Nemesis EU. Raid progress, Mythic+ e una community attiva tutti i giorni.</p>",
           "      </div>",
           "    </div>",
           '    <nav class="site-footer__nav" aria-label="Mappa del sito">']
    for title, links in cols:
        out.append("      <div>")
        out.append('        <h2 class="site-footer__title">%s</h2>' % title)
        out.append("        <ul>")
        for href, label in links:
            out.append('          <li><a href="%s">%s</a></li>' % (href, label))
        out.append("        </ul>")
        out.append("      </div>")
    out += [
        "      <div>",
        '        <h2 class="site-footer__title">Fuori dal sito</h2>',
        "        <ul>",
        '          <li><a href="https://raider.io/guilds/eu/nemesis/Blackjack" target="_blank" rel="noopener noreferrer">Raider.IO</a></li>',
        '          <li><a href="https://www.warcraftlogs.com/guild/id/808206" target="_blank" rel="noopener noreferrer">Warcraft Logs</a></li>',
        '          <li><a href="https://www.twitch.tv/londe83" target="_blank" rel="noopener noreferrer">Twitch</a></li>',
        "        </ul>",
        "      </div>",
        "    </nav>",
        "  </div>",
        '  <div class="site-footer__bottom">',
        '    <p>&copy; <span data-current-year>2026</span> Blackjack &middot; Gilda italiana su Nemesis EU</p>',
        '    <a class="button-ghost" data-discord-link data-root-prefix="%s" href="%spages/recruiting.html">Entra in gilda</a>' % (r, r),
        "  </div>",
        "</footer>",
        "<!--#/bj:footer-->",
    ]
    return "\n".join(out)


TRANSITION_PATTERNS = [
    re.compile(r'document\.addEventListener\("DOMContentLoaded",\s*function\s*\(\)\s*\{\s*document\.body\.classList\.add\("page-loaded"\);\s*\}\);\s*', re.S),
    re.compile(r'document\.querySelectorAll\("a"\)\.forEach\(link\s*=>\s*\{.*?\n\}\);\s*', re.S),
    re.compile(r'^[ \t]*document\.body\.classList\.add\("page-loaded"\);[ \t]*\n', re.M),
]

SCRIPT_RE = re.compile(r'[ \t]*<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>[ \t]*\n?', re.S)

report = []


def replace_block(html, name, replacement):
    """Riscrive il blocco <!--#bj:NAME--> ... <!--#/bj:NAME-->.

    Alla prima esecuzione i marcatori non ci sono ancora: in quel caso
    sostituisce il tag <NAME> ... </NAME>, qualunque attributo abbia.
    """
    marked = re.compile(r"<!--#bj:%s-->.*?<!--#/bj:%s-->" % (name, name), re.S)
    if marked.search(html):
        return marked.sub(lambda m: replacement, html, count=1)

    bare = re.compile(r"<%s(?:\s[^>]*)?>.*?</%s>" % (name, name), re.S)
    if bare.search(html):
        return bare.sub(lambda m: replacement, html, count=1)

    print("   !! blocco %s non trovato" % name)
    return html


def migrate(path, nav, title, desc, scripts, write_js=None):
    with io.open(path, encoding="utf-8") as fh:
        html = fh.read()

    html = re.sub(r"<head>.*?</head>",
                  lambda m: "<head>\n%s\n</head>" % build_head(path, nav, title, desc, scripts),
                  html, count=1, flags=re.S)

    # Header e footer: se i marcatori ci sono gia si riscrive quel blocco,
    # altrimenti si sostituisce il tag intero (prima esecuzione sulla pagina).
    html = replace_block(html, "header", build_header(path, nav))
    html = replace_block(html, "footer", build_footer(path))

    if 'data-nav=' not in html:
        if '<body class="page-transition ' in html:
            html = html.replace('<body class="page-transition ', '<body data-nav="%s" class="' % nav, 1)
        else:
            html = re.sub(r'<body class="', '<body data-nav="%s" class="' % nav, html, count=1)

    # Bersaglio della skip-link: solo se non esiste gia e solo su un <main>
    # che non ha un id proprio (guide-detail e guide-raid lo usano via JS).
    if 'id="contenuto"' not in html:
        main_tag = re.search(r"<main[^>]*>", html)
        if main_tag and "id=" not in main_tag.group(0):
            html = html[:main_tag.start()] + main_tag.group(0).replace("<main", '<main id="contenuto"', 1) + html[main_tag.end():]

    collected = []

    def grab(match):
        collected.append(match.group(1))
        return ""

    html = SCRIPT_RE.sub(grab, html)

    code = "\n\n".join(c.strip() for c in collected).strip()
    removed = 0
    for pat in TRANSITION_PATTERNS:
        code, n = pat.subn("", code)
        removed += n
    code = re.sub(r"\n{3,}", "\n\n", code).strip()

    if write_js and code:
        body = "\n".join(("  " + l if l.strip() else l) for l in code.splitlines())
        with io.open(write_js, "w", encoding="utf-8", newline="\n") as fh:
            fh.write('/* Blackjack - script di pagina: %s */\n(function () {\n  "use strict";\n\n' % path)
            fh.write(body)
            fh.write("\n})();\n")
        report.append("   JS -> %-28s %4d righe, %d blocchi transizione rimossi" % (write_js, len(code.splitlines()), removed))
    elif code:
        report.append("   !! JS scartato ma NON vuoto (%d righe): %s" % (len(code.splitlines()), code[:120]))
    elif collected:
        report.append("   JS inline rimosso (solo transizione)")

    html = re.sub(r"\n{3,}", "\n\n", html)
    with io.open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)
    report.append("OK %s" % path)


TARGET_JS = {
    "pages/spettatori.html": "js/page-spettatori.js",
    "pages/recruiting.html": "js/page-recruiting.js",
    "pages/statuto.html": "js/page-statuto.js",
    "pages/high-roller/roster-aceofspades.html": "js/page-roster.js",
}

for path, (nav, title, desc, scripts) in PAGES.items():
    migrate(path, nav, title, desc, scripts, TARGET_JS.get(path))

print("\n".join(report))
