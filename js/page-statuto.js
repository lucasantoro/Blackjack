/* Blackjack - script di pagina: pages/statuto.html */
(function () {
  "use strict";

  const statuteSections = [
    {
      id: "identita",
      label: "Identità",
      title: "Identità del tavolo",
      intro: "Blackjack nasce per tenere insieme maturità, esperienza e voglia di giocare bene con altre persone.",
      rules: [
        "La gilda accoglie giocatori con storie molto diverse, dal progress più spinto al gioco più rilassato. Quello che conta davvero è l'atteggiamento: rispetto, affidabilità e spirito di squadra vengono prima del personaggio e del log.",
        "Qui si scherza, si ride e si osa, ma la tossicità resta fuori dal casino. Se il tono di una persona rovina l'ambiente, il problema non è il wipe o il risultato del raid: è il comportamento."
      ]
    },
    {
      id: "struttura",
      label: "Struttura",
      title: "Struttura della gilda",
      intro: "Ogni ruolo ha una responsabilità precisa all'interno del tavolo.",
      rules: [
        "Casino Royale è il Guild Master: definisce la direzione della gilda e chiude le decisioni importanti. Pit Boss è il Vice GM: supporta il banco, coordina lo staff e tiene la macchina in ordine.",
        "Jack è l'Officer Raid: segue roster, progress, analisi dei fight, meccaniche, build e disciplina del gruppo. Dealer è l'Officer Eventi & Social: organizza mount run, achievement, eventi community e serate leggere.",
        "High Roller identifica i raider attivi del progress. Buy-In è il grado di prova per i nuovi membri. Split è il ruolo degli alt. Spettatore è il grado social per chi vive la community senza obblighi di roster."
      ]
    },
    {
      id: "obiettivi",
      label: "Obiettivi",
      title: "Obiettivi di gilda",
      intro: "Il nostro obiettivo principale resta semplice: divertirci insieme in un ambiente stabile.",
      rules: [
        "Blackjack vuole essere una gilda di persone adulte, ma con lo spirito giusto per ridere, giocare e costruire un gruppo che duri nel tempo. Vincere conta, ma non vale mai la pena farlo bruciando il clima interno.",
        "Discord non è obbligatorio fuori raid, ma è fortemente consigliato. Chi entra nella vita della gilda si integra molto più facilmente; chi resta sempre ai margini può comunque giocare con noi, ma inevitabilmente vivrà meno la parte sociale."
      ]
    },
    {
      id: "comportamento",
      label: "Comportamento",
      title: "Comportamento in gilda",
      intro: "Il rispetto viene prima della performance.",
      rules: [
        "Sono richiesti educazione, rispetto e buon senso verso tutti i membri. Non sono tollerati flame, insulti, provocazioni, atteggiamenti tossici o il classico atteggiamento da 'so tutto io'.",
        "Le antipatie personali non devono mai trasformarsi in un problema di gilda. Se nasce un conflitto, va gestito con maturità o portato allo staff prima che diventi rumore per tutto il gruppo."
      ]
    },
    {
      id: "raid",
      label: "Raid",
      title: "Raid e progress",
      intro: "Il raid richiede rispetto del gruppo, preparazione e comunicazione chiara.",
      rules: [
        "I giorni ufficiali di raid sono lunedì e mercoledì, dalle 21:30 alle 23:30. Alle 21:30 si pulla: la puntualità non e opzionale, perché il ritardo di pochi rallenta l'intera serata. Chi sa già di arrivare tardi deve avvisare il raid leader e, quando e pronto davanti all'istanza, resta in attesa del group senza interrompere il ritmo del raid.",
        "Chi entra in raid deve arrivare preparato. Le meccaniche base dei fight farmati devono essere già note, gli addon richiesti dalla gilda sono obbligatori, e gli strumenti indicati dallo staff come WowAudit e RC Loot Council non sono facoltativi. Lo stesso vale per socket, enchant e consumabili: presentarsi senza il minimo indispensabile penalizza tutto il gruppo e può incidere anche sulle priorità di loot, salvo casi in cui si sia l'unico richiedente.",
        {
          body: "Il progress con il main resta riservato alla gilda dal mercoledì al lunedì inclusi. Il martedì pre-reset il main e libero. Gli alt possono invece essere usati liberamente durante la settimana. Se vuoi provare con il main una difficoltà superiore rispetto a quella affrontata con la gilda, devi avvisare il raid leader prima di farlo.",
          bullets: [
            "Se sei in progress Normal e vuoi provare Heroic con il main, va comunicato prima.",
            "Se sei in progress Heroic e vuoi provare Mythic con il main, va comunicato prima.",
            "Nei giorni e negli orari ufficiali di raid non si raida con altre gilde con il personaggio coinvolto nel roster."
          ]
        },
        "Discord e obbligatorio almeno in ascolto durante il raid. Dubbi, chiarimenti e strategie si sistemano prima del pull. UI e keybind restano liberi, ma se emergono problemi evidenti lo staff può chiedere un confronto serio e disponibilità ad adattarsi per il bene del gruppo."
      ]
    },
    {
      id: "loot",
      label: "Loot",
      title: "Loot e priorità",
      intro: "Il loot serve al progresso del gruppo, non al tornaconto del singolo.",
      rules: [
        "Nei BIS contano attendance, performance e impatto sul raid, sempre in modo equilibrato. Quando serve, tank e healer possono avere priorità. Per i set, la precedenza va a chi chiude bonus x2 o x4.",
        "Il loot assegnabile va sempre passato al giocatore incaricato tramite RC Loot Council. Discussioni, pressioni o lamentele durante il raid non sono accettate: se c'e un dubbio, si chiarisce a fine serata con lo staff."
      ]
    },
    {
      id: "ruoli",
      label: "Accesso ruoli",
      title: "Accesso ai ruoli",
      intro: "I ruoli si guadagnano con presenza, atteggiamento e affidabilità.",
      rules: [
        "Il passaggio da Buy-In a High Roller richiede almeno quattro serate organizzate, presenza affidabile, atteggiamento positivo e spirito di squadra. La promozione non dipende solo dal danno o dall'hps: contano anche puntualità, preparazione e comportamento.",
        "Le nomine a Officer o Conta Carte vengono decise dal Casino Royale e dal Pit Boss in base alle necessità della gilda e alla fiducia costruita nel tempo."
      ]
    },
    {
      id: "sanzioni",
      label: "Sanzioni",
      title: "Sanzioni",
      intro: "Quando una regola viene ignorata, lo staff interviene in modo proporzionato.",
      rules: [
        "Il primo passo e sempre il confronto: richiamo verbale o chiarimento privato. Se il problema continua, si può arrivare a declassamento, esclusione temporanea dal raid o limitazione della partecipazione agli eventi.",
        "Nei casi gravi o ripetuti, lo staff può sospendere o rimuovere definitivamente un membro. Tossicità seria, mancanza di rispetto e comportamenti che danneggiano il gruppo possono portare a un intervento diretto senza passaggi intermedi."
      ]
    }
  ];

  const statuteState = { activeIndex: 0 };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // Lo statuto e un documento: si legge tutto. Prima stava dietro a
  // prev/next e mostrava due regole alla volta, sembrando incompleto.
  function renderStatuteIndex() {
    const container = document.getElementById("statute-index");
    if (!container) return;
    container.innerHTML = statuteSections.map((section, index) => `
      <a class="statute-chip" href="#statuto-${escapeHtml(section.id)}">
        <span class="statute-chip__num">${String(index + 1).padStart(2, "0")}</span>
        ${escapeHtml(section.label)}
      </a>
    `).join("");
  }

  function renderStatuteRule(rule, index) {
    const body = typeof rule === "string" ? rule : (rule && rule.body) || "";
    const bullets = (rule && Array.isArray(rule.bullets))
      ? `<ul class="statute-rule-bullets">${rule.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "";
    return `
      <li class="statute-rule">
        <span class="statute-rule__index" aria-hidden="true">${index + 1}</span>
        <div class="statute-rule__copy">
          <p>${escapeHtml(body)}</p>
          ${bullets}
        </div>
      </li>
    `;
  }

  function renderStatute() {
    renderStatuteIndex();

    const container = document.getElementById("statute-body");
    if (!container) return;

    container.innerHTML = statuteSections.map((section, index) => `
      <section class="statute-section" id="statuto-${escapeHtml(section.id)}">
        <div class="statute-section__head">
          <span class="statute-section__num">${String(index + 1).padStart(2, "0")}</span>
          <h2 class="statute-section__title">${escapeHtml(section.title)}</h2>
          <p class="statute-section__intro">${escapeHtml(section.intro)}</p>
        </div>
        <ol class="statute-rule-list">
          ${section.rules.map(renderStatuteRule).join("")}
        </ol>
      </section>
    `).join("");
  }

  renderStatute();
})();
