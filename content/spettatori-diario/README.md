# Diario degli Spettatori

Questa cartella contiene gli articoli manuali della pagina diario.

## Struttura

Ogni articolo vive in una sua cartella dentro `articles/`:

```text
content/spettatori-diario/articles/
  2026-04-16-mplus-night/
    article.json
    images/
      cover.svg
    text/
      article.md
```

## File richiesti

### `article.json`

```json
{
  "id": "serata-mplus-esempio",
  "date": "2026-04-16",
  "subtitle": "Mythic+ night | Chiavi e rotazioni",
  "title": "Una sera di chiavi giocata bene, senza perdere ritmo",
  "description": "Testo breve usato nella card del carosello.",
  "image": "cover.svg"
}
```

### `text/article.md`

Contiene il testo dell'articolo.  
Ogni paragrafo va separato con una riga vuota.

### `images/`

Contiene l'immagine di copertina dell'articolo.

## Aggiornamento indice

Dopo aver aggiunto o modificato un articolo, esegui:

```powershell
python .\scripts\build_spettatori_diary.py
```

Lo script rigenera `data/spettatori-diary-manual.json`, che è il file letto dalla pagina.
