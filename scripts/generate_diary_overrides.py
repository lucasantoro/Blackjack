from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OVERRIDES_PATH = ROOT / "data" / "hollowsoul-diary-overrides.json"
DEFAULT_SOURCE_URL = "https://blackjack-community-diary.lucasantoro2905.workers.dev"


def load_feed(source_url: str) -> list[dict]:
    request = urllib.request.Request(source_url, headers={"User-Agent": "Blackjack Diary Generator"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    return payload.get("articles", [])


def load_overrides() -> dict:
    if not OVERRIDES_PATH.exists():
        return {"overrides": {}}
    return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))


def save_overrides(payload: dict) -> None:
    OVERRIDES_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ask_model(article: dict) -> dict:
    base_url = os.environ.get("DIARY_LLM_BASE_URL", "").rstrip("/")
    model = os.environ.get("DIARY_LLM_MODEL", "").strip()
    api_key = os.environ.get("DIARY_LLM_API_KEY", "").strip()

    if not base_url or not model:
        raise RuntimeError("Set DIARY_LLM_BASE_URL and DIARY_LLM_MODEL before running the generator.")

    prompt = (
        "Scrivi un breve articolo in italiano per il diario di una gilda di World of Warcraft. "
        "Tono naturale, sobrio, non epico, non pomposo. "
        "Restituisci solo JSON con chiavi title, snippet, body, art. "
        "body deve essere 2 o 3 paragrafi brevi. "
        "art deve essere uno tra: achievement, legends, tour, treasure, transmog, pvp.\n\n"
        f"Titolo attuale: {article.get('title', '')}\n"
        f"Categoria: {article.get('category', '')}\n"
        f"Descrizione sorgente: {article.get('body', '')}\n"
        f"Data: {article.get('date', '')}\n"
    )

    payload = {
        "model": model,
        "temperature": 0.8,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "Sei un assistente che scrive micro-articoli per il diario di una gilda WoW."},
            {"role": "user", "content": prompt},
        ],
    }

    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {api_key}"} if api_key else {}),
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(error.read().decode("utf-8", "replace")) from error

    content = result["choices"][0]["message"]["content"]
    return json.loads(content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera override testuali per il diario degli spettatori.")
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    articles = load_feed(args.source_url)[: max(1, args.limit)]
    payload = load_overrides()
    overrides = payload.setdefault("overrides", {})

    generated = 0
    for article in articles:
        key = str(article.get("achievementId") or article.get("id"))
        if not key:
            continue
        if key in overrides and not args.force:
            continue

        generated_article = ask_model(article)
        overrides[key] = {
            "title": generated_article.get("title", article.get("title", "")),
            "snippet": generated_article.get("snippet", article.get("snippet", "")),
            "body": generated_article.get("body", article.get("body", "")),
            "art": generated_article.get("art", article.get("art", "achievement")),
        }
        generated += 1

    save_overrides(payload)
    print(f"Override generati: {generated}")


if __name__ == "__main__":
    main()
