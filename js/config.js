/* =========================================================
   BLACKJACK - CONFIGURAZIONE UNICA DEL SITO
   Tutti gli endpoint e i link esterni stanno qui.
   Cambiare un valore qui lo cambia su tutte le pagine.
   ========================================================= */
window.BJ_CONFIG = {
  guild: {
    name: "Blackjack",
    realm: "Nemesis",
    region: "EU",
    team: "Ace of Spades"
  },

  // Endpoint Cloudflare Workers
  workers: {
    twitch: "https://blackjack-twitch-status.lucasantoro2905.workers.dev",
    raidProgress: "https://blackjack-raid-progress.lucasantoro2905.workers.dev",
    communityStats: "https://blackjack-community-stats.lucasantoro2905.workers.dev",
    communityDiary: "https://blackjack-community-diary.lucasantoro2905.workers.dev",
    recruiting: "https://blackjack-recruiting.lucasantoro2905.workers.dev",
    modelAssets: "https://blackjack-wow-model-assets.lucasantoro2905.workers.dev"
  },

  // Link esterni ufficiali della gilda
  links: {
    // TODO: quando hai l'invito Discord definitivo, incollalo qui.
    // Finche resta null, tutti i bottoni "Discord" portano al reclutamento.
    discord: null,
    raiderio: "https://raider.io/guilds/eu/nemesis/Blackjack",
    warcraftlogs: "https://www.warcraftlogs.com/guild/id/808206",
    twitch: "https://www.twitch.tv/londe83"
  },

  twitchChannel: "londe83",

  // Domini autorizzati per l'embed del player Twitch
  twitchParents: [
    "www.blackjackguild.it",
    "blackjackguild.it",
    "lucasantoro.github.io",
    "localhost",
    "127.0.0.1"
  ]
};
