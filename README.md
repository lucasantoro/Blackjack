# Blackjack

Sito della gilda Blackjack (Nemesis EU). Sito statico su GitHub Pages +
Cloudflare Workers per i dati live.

## Struttura del sito

```text
index.html                home: bacheca "Ultime attività" + video della gilda
pages/                    pagine interne
media/videos/             i video caricati dalla gilda
css/style.css             unico foglio di stile
data/guild-videos.json    elenco dei video del carosello
js/config.js              UNICO posto dove stanno endpoint e link esterni
js/boot.js                script bloccante minimo (classe .js + redirect HTTPS)
js/site.js                utility condivise (window.BJ), menu mobile, footer
js/home.js                bacheca, carosello video e player
js/page-*.js              uno script per pagina
scripts/serve.py          anteprima locale
scripts/add_guild_video.py aggiunge/rimuove i video della home
scripts/build_layout.py   rigenera head/header/footer di tutte le pagine
scripts/build_sitemap.mjs rigenera sitemap.xml
workers/cloudflare/       i Worker
```

## Vedere il sito in locale prima di pubblicare

```powershell
python .\scripts\serve.py
```

Apre `http://127.0.0.1:4173` nel browser e serve la cartella del progetto.
Ctrl+C per fermare. Dopo ogni modifica basta ricaricare la pagina: la cache è
disattivata, quindi vedi sempre l'ultima versione.

**Usa sempre la porta 4173.** I Cloudflare Worker accettano richieste solo da
origini note e `127.0.0.1:4173` è fra quelle. Su un'altra porta il browser
blocca le chiamate per CORS e vedresti la home senza bacheca, senza progress e
senza statistiche. Se ti serve davvero un'altra porta, aggiungila in
`DEFAULT_ALLOWED_ORIGINS` dei worker e ridistribuiscili.

Il server gestisce anche le richieste Range, quindi i video si possono
scorrere nella timeline esattamente come sul sito pubblicato.

## Video della gilda (carosello in home)

I video stanno in `media/videos/`, l'elenco in `data/guild-videos.json`.
Compaiono sia nel carosello sia fra le card della bacheca.

### Aggiungere un video

Da un file locale (serve `ffmpeg`: `winget install Gyan.FFmpeg`):

```powershell
python .\scripts\add_guild_video.py "C:\Users\lucas\Downloads\clip.mp4"
```

Lo script comprime il video per il web, mette il `moov` in testa (parte subito
senza scaricare tutto), estrae la copertina e ti chiede titolo, autore,
etichetta e descrizione.

Senza domande:

```powershell
python .\scripts\add_guild_video.py "C:\...\clip.mp4" --title "Primo kill di Ula'tek" --author "Gearstrike" --tag "Kill" --description "La serata del first kill." --poster-at 42 --no-prompt
```

Se il video è già su YouTube o Twitch non viene copiato niente nel repo:

```powershell
python .\scripts\add_guild_video.py --youtube dQw4w9WgXcQ --title "Montaggio stagione 2"
python .\scripts\add_guild_video.py --twitch 2907028647 --title "Serata completa"
```

### Gestire i video

```powershell
python .\scripts\add_guild_video.py --list
python .\scripts\add_guild_video.py --remove ulatek-cinematic
```

`--remove` cancella anche i file in `media/videos/`; con `--keep-files` li
lascia dove sono.

### Occhio al peso

Ogni video caricato resta nel repository. Un paio di minuti a 1280px pesa
15-20 MB: va benissimo per qualche video all'anno, meno per decine. Quando
inizia a diventare tanta roba, carica i montaggi lunghi su YouTube e aggiungili
con `--youtube`: il sito li mostra allo stesso modo senza appesantire il repo.

### Modificare menu, footer o meta tag

Non si toccano le 15 pagine a mano. Si modifica **`scripts/build_layout.py`**
(voci di menu, titoli, descrizioni, CSP, colonne del footer) e si lancia:

```powershell
python .\scripts\build_layout.py
```

Lo script riscrive solo le zone fra i marcatori `<!--#bj:head-->`,
`<!--#bj:header-->` e `<!--#bj:footer-->`: il contenuto delle pagine non viene
toccato.

Dopo aver aggiunto o rimosso una pagina:

```powershell
node .\scripts\build_sitemap.mjs
```

### Link e endpoint

Tutti gli URL esterni e i Worker stanno in **`js/config.js`**. Il link Discord
e `links.discord`: finché resta `null`, i bottoni "Entra in gilda" portano alla
pagina di reclutamento. Appena incolli l'invito, tutti i bottoni del sito lo
usano automaticamente.

### Bacheca "Ultime attività" (home)

`js/home.js` unisce in una sola lista ordinata per data:

- kill e progress dei boss (worker `blackjack-raid-progress`, ultimo report)
- achievement di gilda (worker `blackjack-community-diary`, Armory Blizzard)
- dirette e VOD Twitch (worker `blackjack-twitch-status`)
- guide nuove (`data/guides-manifest.json`)
- articoli del diario (`data/spettatori-diary-manual.json`)

Le card sono costruite con `createElement`/`textContent`: nessun `innerHTML` su
dati remoti.

### Sicurezza

- Content-Security-Policy in ogni pagina (generata da `build_layout.py`):
  `script-src 'self'` + soli domini necessari, `object-src 'none'`,
  `base-uri 'self'`, `upgrade-insecure-requests`.
- Nessuno script inline e nessun attributo `onclick`: tutto in file esterni.
- Ogni URL che finisce in `href`/`src` passa da `BJ.safeUrl`, che blocca
  `javascript:`, `data:` e `vbscript:`.
- Embed YouTube su `youtube-nocookie.com`.

### Da fare dopo questa revisione

1. **Redeploy di `blackjack-raid-progress`** (il file `-unified`): ho aggiunto
   **Kith'ix** alla lista boss di *The Venomous Abyss*. Il catalogo delle
   campagne è scritto a mano nel worker: finché non lo ridistribuisci, i pull
   su Kith'ix non vengono conteggiati nel progress (in home compare lo stesso,
   letto dal titolo del report).

   Ogni volta che il tier riceve un boss nuovo va aggiunto lì, in
   `RAID_CAMPAIGNS`.

2. **Redeploy di `blackjack-recruiting`**: l'etichetta del messaggio Discord ora
   è "Disponibilità" con l'accento.

   Attenzione: `workers/cloudflare/` è in `.gitignore`, quindi i Worker non
   finiscono nel repository. La correzione esiste solo nella copia locale: se
   lavori da un'altra macchina non la trovi, e senza redeploy il messaggio su
   Discord resta quello vecchio.

3. **Invito Discord** in `js/config.js` (`links.discord`).

4. ~~Autore del cinematic~~ fatto: Zasty.

5. **Vecchio file**: `workers/cloudflare/blackjack-raid-progress.js` è una
   versione superata (quella in uso è `-unified`, come dichiara
   `workerVersion` nelle risposte). Si può eliminare.

## Guide Achievement e Collezioni

La sezione guide parte da:

`pages/guide.html`

La prima guida completa e:

`pages/guide/firelands.html`

Le immagini della guida Firelands sono in:

`img/guides/firelands/`

Il loader 3D opzionale per i boss e:

`scripts/wow-model-viewer.js`

Usa i metodi di `Miorey/wow-model-viewer` e il viewer Wowhead/Zam. In produzione deve usare il proxy:

`workers/cloudflare/blackjack-wow-model-assets.js`

Nome Worker suggerito:

`blackjack-wow-model-assets`

Il proxy evita i blocchi CORS sugli asset `https://wow.zamimg.com/modelviewer/live/`. Se il viewer o il proxy
non sono disponibili, la guida resta leggibile tramite immagine statica di fallback.
Il loader usa il viewer Wowhead/Zam versionato in `modelviewer/live/deployment/viewer/` e controlla la presenza della
geometria `.m2` prima di inizializzare il canvas 3D. Se gli asset non sono disponibili, il sito usa direttamente il fallback.

Il formato pensato per ogni guida e:

- hub generale con card per espansione/raid
- pagina dettaglio con introduzione, checklist, boss per boss e immagini
- contenuto riscritto in italiano partendo dalle guide Drive della gilda

## Diario degli Spettatori

Gli articoli del diario stanno in:

`content/spettatori-diario/articles/`

Ogni articolo ha questa struttura:

```text
content/spettatori-diario/articles/2026-05-05-nome-articolo/
  article.json
  images/
    cover.png
  text/
    article.md
```

### `article.json`

```json
{
  "id": "nome-articolo",
  "date": "2026-05-05",
  "subtitle": "Achievement Run | Ulduar",
  "title": "Titolo articolo",
  "image": "cover.png"
}
```

### `text/article.md`

- Scrivi l'articolo qui.
- Ogni paragrafo va separato con una riga vuota.

### Pubblicare un nuovo articolo

1. Crea una nuova cartella dentro `content/spettatori-diario/articles/`
2. Aggiungi `article.json`
3. Aggiungi la cover in `images/`
4. Aggiungi il testo in `text/article.md`
5. Rigenera l'indice:

```powershell
python .\scripts\build_spettatori_diary.py
```

Il file che legge la pagina e:

`data/spettatori-diary-manual.json`

La pagina coinvolta e:

`pages/spettatori-diario.html`

### Come appare il diario

- nel carosello vedi solo `immagine`, `sottotitolo`, `data` e `titolo`
- cliccando la card si apre un overlay con il testo completo
- se aggiungi o modifichi articoli, devi sempre rigenerare l'indice con:

```powershell
python .\scripts\build_spettatori_diary.py
```

## Roster Ace of Spades

### Aggiungere un nuovo raider

Metodo completo:

1. Lancia:

```powershell
python .\scripts\add_raider_profile.py
```

2. Inserisci l'URL Armory Blizzard del personaggio
3. Lo script:
   - aggiunge l'URL in `data/aceofspades-armory-urls.txt`
   - sincronizza il roster
   - ti permette di impostare testo breve, bio lunga, immagine custom e stato attivo

Metodo diretto:

```powershell
python .\scripts\add_raider_profile.py --armory-url "https://worldofwarcraft.blizzard.com/en-gb/character/eu/nemesis/nomepg"
```

### Cosa aggiorna davvero il roster

Il roster finale letto dal sito e:

`data/aceofspades-roster.json`

La lista sorgente degli armory e:

`data/aceofspades-armory-urls.txt`

La pagina coinvolta e:

`pages/high-roller/roster-aceofspades.html`

Lo script di sync completo e:

```powershell
python .\scripts\sync_blizzard_roster.py
```

Nota:

- il sync completo interroga tutti gli Armory e puo richiedere un po' di tempo
- se un player in game logga una offspec o un ruolo secondario, puoi forzare spec e ruolo manualmente con gli override sotto
- summary e bio generate vengono ricostruite dal sync; i campi `custom*` e `override*` invece vengono preservati

### Modificare bio, testo breve o foto di un raider

Usa lo stesso script cercando il player per nome:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin"
```

Campi disponibili:

- `customTagline` = tagline breve sopra la scheda
- `customSummary` = testo breve nella card
- `customBio` = testo lungo nell'overlay / scheda
- `customImage` = immagine custom
- `overrideClass` = forza la classe mostrata nel roster
- `overrideSpec` = forza la spec mostrata nel roster
- `overrideRole` = forza il ruolo mostrato nel roster (`tank`, `healer`, `dps`, `unknown`)

Esempio non interattivo:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --summary "Testo breve" --bio "Testo lungo" --image "../../members/img/ejlin.jpg" --no-prompt
```

### Modificare solo un campo specifico

Lo script cambia solo i campi che passi. Tutto il resto resta invariato.

Solo testo breve:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --summary "Tank mobile, pull puliti e ritmo chiaro." --no-prompt
```

Solo bio lunga:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --bio "Testo lungo nuovo..." --no-prompt
```

Solo foto:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --image "../../members/img/ejlin.jpg" --no-prompt
```

Solo tagline:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --tagline "Prima sul pull, calma sul fight" --no-prompt
```

Per cancellare un override:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --clear-summary --clear-bio --clear-image --no-prompt
```

### Forzare spec o ruolo quando l'Armory mostra una offspec

Esempio: healer che in game ha loggato dps, o tank che ha fatto contenuto in offspec.

```powershell
python .\scripts\add_raider_profile.py --name "Aqualara" --override-class "Shaman" --override-spec "Restoration" --override-role healer --no-prompt
```

```powershell
python .\scripts\add_raider_profile.py --name "Michelè" --override-class "Death Knight" --override-spec "Unholy" --override-role dps --no-prompt
```

Per rimuovere gli override e tornare ai valori letti da Armory:

```powershell
python .\scripts\add_raider_profile.py --name "Aqualara" --clear-override-class --clear-override-spec --clear-override-role --no-prompt
```

Gli override vengono salvati nel JSON finale e vengono riapplicati automaticamente ad ogni sync successivo.

### Disattivare o rimuovere un raider

Per nasconderlo dal sito ma lasciarlo nei dati:

```powershell
python .\scripts\remove_raider_profile.py --name "Ejlin" --disable --no-prompt
```

Per rimuoverlo davvero dal roster e dalla lista Armory:

```powershell
python .\scripts\remove_raider_profile.py --name "Ejlin" --remove --no-prompt
```

Puoi usare anche l'URL Armory:

```powershell
python .\scripts\remove_raider_profile.py --armory-url "https://worldofwarcraft.blizzard.com/en-gb/character/eu/nemesis/ejlin" --remove --no-prompt
```

### Flusso pratico consigliato per il roster

Nuovo player:

1. aggiungi l'Armory con `add_raider_profile.py` oppure metti l'URL in `data/aceofspades-armory-urls.txt`
2. lancia il sync
3. se serve, aggiungi `customTagline`, `customSummary`, `customBio`, `customImage`
4. se serve, aggiungi `overrideClass`, `overrideSpec`, `overrideRole`

Player gia presente:

1. se devi cambiare solo un testo o la foto, usa `add_raider_profile.py --name "..."`
2. se devi forzare il ruolo/spec perche l'Armory mostra una offspec, usa gli override
3. se devi solo nasconderlo, usa `remove_raider_profile.py --disable`
4. se devi eliminarlo davvero, usa `remove_raider_profile.py --remove`

## File chiave

- `scripts/build_spettatori_diary.py` = genera l'indice articoli del diario
- `scripts/add_raider_profile.py` = aggiunge o modifica un raider
- `scripts/remove_raider_profile.py` = disattiva o rimuove un raider
- `scripts/sync_blizzard_roster.py` = sincronizza il roster dal Blizzard Armory
