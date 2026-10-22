# Guide di gilda

La sezione Guide viene costruita dal file `data/guides-manifest.json`. Non bisogna creare nuove pagine HTML.

## Nuova guida achievement

1. Duplica `content/guides/achievement-template.json`.
2. Sposta la copia in `content/guides/achievements/` e rinominala, per esempio `ulduar.json`.
3. Compila il JSON senza aggiungere commenti e senza lasciare virgole dopo l'ultimo elemento.
4. Usa un `id` univoco composto solo da lettere minuscole, numeri e trattini.
5. Carica il singolo file JSON nel repository.

Campi minimi obbligatori:

- `id`
- `title`
- `summary`
- almeno un elemento in `bosses`

Immagini e modelli 3D sono facoltativi. Se `image` resta vuoto, il sito usa un segnaposto Blackjack. Un'immagine può essere:

- un URL completo, per esempio `https://.../immagine.jpg`;
- un percorso del sito, per esempio `img/guides/ulduar/copertina.jpg`.

Per mantenere davvero la guida in un solo file, lascia vuote le immagini oppure usa URL esterni. Se vengono usate immagini locali, vanno caricate separatamente nella cartella `img/guides/`.

## Nuova guida raid

1. Dai al PDF il titolo che vuoi vedere sul sito, per esempio `Palazzo Nerub-ar Normal e Heroic.pdf`.
2. Caricalo nella cartella corretta:
   - `content/guides/raids/fights/` per le strategie dei boss;
   - `content/guides/raids/preparation/` per procedure e attività pre-raid.

Il nome del file senza `.pdf` diventa automaticamente il titolo della guida. Il PDF originale resta scaricabile e viene mostrato nel lettore libro del sito.

## Addon obbligatori

L'elenco è nel singolo file `content/guides/raid-addons.json`. Modifica gli elementi di `addons` per aggiornare nome, descrizione e link CurseForge; gli strumenti usati solo nelle procedure pre-raid vanno invece in `preRaidTools`.

## Aggiornamento automatico

Il workflow `.github/workflows/update-guides-index.yml` parte quando cambia un file nelle cartelle delle guide. Valida i JSON, trova i PDF e aggiorna automaticamente `data/guides-manifest.json`.

Per aggiornare l'indice in locale:

```powershell
node .\scripts\build_guides_manifest.mjs
```

Se il generatore segnala un errore, il file JSON non rispetta il template oppure esiste già una guida con lo stesso `id`.
