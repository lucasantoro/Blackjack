<?php
// Carica i video dal feed RSS ufficiale di YouTube (senza API).
$feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6xFbvCrfpcJ-7m3r_bQR0g';
$keyword = '[Blackjack]';

/**
 * Formatta una data ISO per la visualizzazione.
 *
 * @param string $value
 * @return string
 */
function formatPublishedDate(string $value): string
{
  $timestamp = strtotime($value);
  if ($timestamp === false) {
    return '';
  }

  return date('d/m/Y', $timestamp);
}

/**
 * Effettua il parsing del feed RSS e restituisce i video filtrati.
 *
 * @param string $url
 * @param string $keyword
 * @return array<int, array<string, string>>
 */
function fetchYoutubeRssVideos(string $url, string $keyword): array
{
  $context = stream_context_create([
    'http' => [
      'timeout' => 6
    ]
  ]);

  $rawFeed = @file_get_contents($url, false, $context);
  if ($rawFeed === false) {
    return [];
  }

  libxml_use_internal_errors(true);
  $xml = simplexml_load_string($rawFeed);
  if ($xml === false) {
    return [];
  }

  $namespaces = $xml->getNamespaces(true);
  $videos = [];

  foreach ($xml->entry as $entry) {
    $yt = $entry->children($namespaces['yt'] ?? '');
    $media = $entry->children($namespaces['media'] ?? '');

    $videoId = trim((string) $yt->videoId);
    if ($videoId === '') {
      continue;
    }

    $title = trim((string) $entry->title);
    $description = trim((string) ($media->group->description ?? $entry->summary ?? ''));
    $published = trim((string) $entry->published);

    $haystack = mb_strtolower($title . ' ' . $description);
    if ($keyword !== '' && mb_strpos($haystack, mb_strtolower($keyword)) === false) {
      continue;
    }

    $videos[] = [
      'id' => $videoId,
      'title' => $title,
      'description' => $description,
      'published' => $published,
      'publishedFormatted' => formatPublishedDate($published)
    ];
  }

  return $videos;
}

$videos = fetchYoutubeRssVideos($feedUrl, $keyword);
?>
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Blackjack – Video divertenti</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="icon" href="data:;base64,iVBORw0KGgo=">
</head>

<body class="page-transition blackjack-bg">

<header>
  <nav class="mainnav">
    <ul>
      <li><a href="../index.html">Home</a></li>
      <li><a href="raider.html">Raider</a></li>
      <li><a href="hollowsoul.html">Spettatori</a></li>
      <li><a href="recruiting.html">Reclutamento</a></li>
      <li><a href="statuto.html">Statuto</a></li>
    </ul>
  </nav>
</header>

<nav class="subnav">
  <ul>
    <li><a href="hollowsoul.html">Community</a></li>
    <li><a href="hollowsoul-video.php" class="active">Video divertenti</a></li>
    <li><a href="hollowsoul-eventi.html">Eventi di gilda</a></li>
  </ul>
</nav>

<section class="hero">
  <div class="hero-content">
    <h2>Video divertenti della gilda</h2>
    <p>
      Clip leggere, wipe epici e momenti da ridere insieme: il lato più creativo degli Spettatori.
    </p>
  </div>
</section>

<div class="bg-container bg-main-logo">
  <main class="panel">

    <h2 class="section-title">La nostra videoteca</h2>
    <p class="section-subtitle">
      Una selezione automatica dal feed RSS ufficiale di YouTube con tutti i video che
      contengono “[Blackjack]” nel titolo o nella descrizione.
    </p>

    <section class="video-grid" aria-live="polite">
      <?php if (empty($videos)) : ?>
        <p class="media-status">Nessun video disponibile al momento.</p>
      <?php else : ?>
        <?php foreach ($videos as $video) : ?>
          <article class="video-card">
            <div class="video-player">
              <iframe
                src="https://www.youtube.com/embed/<?php echo htmlspecialchars($video['id'], ENT_QUOTES, 'UTF-8'); ?>"
                title="<?php echo htmlspecialchars($video['title'], ENT_QUOTES, 'UTF-8'); ?>"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>
            <div class="video-body">
              <h3><?php echo htmlspecialchars($video['title'], ENT_QUOTES, 'UTF-8'); ?></h3>
              <?php if (!empty($video['publishedFormatted'])) : ?>
                <p class="media-meta">
                  Pubblicato il
                  <time datetime="<?php echo htmlspecialchars($video['published'], ENT_QUOTES, 'UTF-8'); ?>">
                    <?php echo htmlspecialchars($video['publishedFormatted'], ENT_QUOTES, 'UTF-8'); ?>
                  </time>
                </p>
              <?php endif; ?>
              <?php if (!empty($video['description'])) : ?>
                <p><?php echo htmlspecialchars($video['description'], ENT_QUOTES, 'UTF-8'); ?></p>
              <?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      <?php endif; ?>
    </section>

  </main>
</div>

<footer>
  <p>&copy; 2025 Blackjack</p>
</footer>

<script>
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-loaded");
});

document.querySelectorAll("a").forEach(link => {
  if (link.hostname === window.location.hostname) {
    link.addEventListener("click", event => {
      event.preventDefault();
      const href = link.getAttribute("href");
      document.body.classList.remove("page-loaded");
      setTimeout(() => { window.location.href = href; }, 300);
    });
  }
});
</script>

</body>
</html>
