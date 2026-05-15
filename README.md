# Blackjack

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
