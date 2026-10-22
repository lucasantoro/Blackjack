/* =========================================================
   BLACKJACK - BOOT
   Script minimo, caricato bloccante nell'head: deve girare
   prima del primo paint. Tutto il resto sta in site.js.
   ========================================================= */
(function () {
  "use strict";

  // 1. Segnala che JS e attivo. Il CSS usa .js per abilitare
  //    menu mobile e animazioni; senza JS il sito resta leggibile.
  document.documentElement.classList.add("js");

  // 2. Redirect a HTTPS solo sui domini ufficiali.
  var secureHosts = ["www.blackjackguild.it", "blackjackguild.it"];
  if (secureHosts.indexOf(window.location.hostname) !== -1 &&
      window.location.protocol !== "https:") {
    window.location.replace(
      "https://" + window.location.host +
      window.location.pathname + window.location.search + window.location.hash
    );
  }
})();
