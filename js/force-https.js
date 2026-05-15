(() => {
  const secureHosts = new Set([
    "www.blackjackguild.it",
    "blackjackguild.it"
  ]);

  if (!secureHosts.has(window.location.hostname)) {
    return;
  }

  if (window.location.protocol === "https:") {
    return;
  }

  const target = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
})();
