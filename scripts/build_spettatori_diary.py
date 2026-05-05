from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_ROOT = ROOT / "content" / "spettatori-diario" / "articles"
OUTPUT_PATH = ROOT / "data" / "spettatori-diary-manual.json"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_paragraphs(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
      return []
    return [chunk.strip().replace("\n", " ") for chunk in text.split("\n\n") if chunk.strip()]


def rel_web_path(path: Path) -> str:
    return "../" + path.relative_to(ROOT).as_posix()


def resolve_image_path(article_dir: Path, metadata: dict) -> str:
    images_dir = article_dir / "images"
    requested = metadata.get("image", "").strip()
    if requested:
        candidate = images_dir / requested
        if candidate.exists():
            return rel_web_path(candidate)
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.webp", "*.svg", "*.gif"):
        matches = sorted(images_dir.glob(ext))
        if matches:
            return rel_web_path(matches[0])
    return ""


def build_article(article_dir: Path) -> dict:
    metadata_path = article_dir / "article.json"
    text_path = article_dir / "text" / "article.md"

    if not metadata_path.exists():
        raise FileNotFoundError(f"File mancante: {metadata_path}")
    if not text_path.exists():
        raise FileNotFoundError(f"File mancante: {text_path}")

    metadata = read_json(metadata_path)
    body = read_paragraphs(text_path)
    if not body:
        raise ValueError(f"Articolo senza contenuto: {text_path}")

    article_id = (metadata.get("id") or article_dir.name).strip()
    title = metadata.get("title", "").strip()
    subtitle = metadata.get("subtitle", "").strip()
    date = metadata.get("date", "").strip()
    if not title:
        raise ValueError(f"Titolo mancante in {metadata_path}")
    if not subtitle:
        raise ValueError(f"Sottotitolo mancante in {metadata_path}")
    if not date:
        raise ValueError(f"Data mancante in {metadata_path}")

    return {
        "id": article_id,
        "date": date,
        "subtitle": subtitle,
        "title": title,
        "image": resolve_image_path(article_dir, metadata),
        "body": body,
    }


def main() -> None:
    if not ARTICLES_ROOT.exists():
        raise SystemExit(f"Cartella articoli non trovata: {ARTICLES_ROOT}")

    articles = []
    for article_dir in sorted(path for path in ARTICLES_ROOT.iterdir() if path.is_dir()):
        articles.append(build_article(article_dir))

    articles.sort(key=lambda item: item["date"], reverse=True)
    payload = {"articles": articles}
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Indice diario aggiornato: {len(articles)} articoli.")


if __name__ == "__main__":
    main()
