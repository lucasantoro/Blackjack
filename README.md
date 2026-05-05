# Blackjack

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

Esempio non interattivo:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --summary "Testo breve" --bio "Testo lungo" --image "../../members/img/ejlin.jpg" --no-prompt
```

Per cancellare un override:

```powershell
python .\scripts\add_raider_profile.py --name "Ejlin" --clear-summary --clear-bio --clear-image --no-prompt
```

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

### Rigenerare tutto il roster

```powershell
python .\scripts\sync_blizzard_roster.py
```

Il file generato e:

`data/aceofspades-roster.json`

La pagina coinvolta e:

`pages/high-roller/roster-aceofspades.html`

## File chiave

- `scripts/build_spettatori_diary.py` = genera l'indice articoli del diario
- `scripts/add_raider_profile.py` = aggiunge o modifica un raider
- `scripts/remove_raider_profile.py` = disattiva o rimuove un raider
- `scripts/sync_blizzard_roster.py` = sincronizza il roster dal Blizzard Armory
