from __future__ import annotations

import argparse
import json
import unicodedata
from pathlib import Path

from sync_blizzard_roster import main as sync_roster


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "aceofspades-roster.json"
URLS_PATH = ROOT / "data" / "aceofspades-armory-urls.txt"


def normalize_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii").lower()
    return "".join(ch for ch in ascii_value if ch.isalnum())


def load_roster() -> dict:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def save_roster(data: dict) -> None:
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_armory_urls() -> list[str]:
    return [
        line.strip()
        for line in URLS_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


def save_armory_urls(urls: list[str]) -> None:
    URLS_PATH.write_text("\n".join(urls) + "\n", encoding="utf-8")


def find_member(data: dict, name: str) -> dict | None:
    key = normalize_name(name)
    return next((member for member in data.get("members", []) if normalize_name(member.get("name", "")) == key), None)


def choose_action(interactive: bool, explicit_disable: bool, explicit_remove: bool) -> str:
    if explicit_remove:
        return "remove"
    if explicit_disable:
        return "disable"
    if not interactive:
        raise SystemExit("Serve specificare --remove oppure --disable quando usi --no-prompt.")

    value = input("Azione [remove/disable] (default: remove): ").strip().lower()
    if value in {"disable", "d"}:
        return "disable"
    return "remove"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Disattiva o rimuove un Raider dal roster Ace of Spades."
    )
    parser.add_argument("--name", help="Nome del personaggio da rimuovere o disattivare")
    parser.add_argument("--armory-url", help="URL Armory Blizzard del personaggio")
    parser.add_argument("--disable", action="store_true", help="Nasconde il player dal roster lasciandolo nei dati")
    parser.add_argument("--remove", action="store_true", help="Rimuove il player dal roster e dalla lista Armory")
    parser.add_argument("--no-prompt", action="store_true", help="Non chiedere input interattivo")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    interactive = not args.no_prompt

    if not args.name and not args.armory_url:
        if interactive:
            args.name = input("Nome del personaggio: ").strip() or None
            if not args.name:
                args.armory_url = input("URL Armory Blizzard (invio per saltare): ").strip() or None
        if not args.name and not args.armory_url:
            raise SystemExit("Serve almeno --name oppure --armory-url.")

    action = choose_action(interactive, args.disable, args.remove)

    roster = load_roster()
    target = find_member(roster, args.name) if args.name else None
    armory_url = (args.armory_url or (target or {}).get("armoryUrl") or "").strip()

    if action == "disable":
        if target is None and args.name:
            raise SystemExit(f"Player non trovato nel roster: {args.name}")
        if target is None and armory_url:
            target = next((member for member in roster.get("members", []) if member.get("armoryUrl", "").strip() == armory_url), None)
        if target is None:
            raise SystemExit("Impossibile trovare il player da disattivare.")

        target["active"] = False
        save_roster(roster)
        print(f"Player disattivato: {target['name']}")
        return

    urls = load_armory_urls()
    if armory_url:
        updated_urls = [url for url in urls if url.strip() != armory_url]
    elif target is not None:
        updated_urls = [url for url in urls if url.strip() != (target.get("armoryUrl") or "").strip()]
    else:
        raise SystemExit("Impossibile risalire all'URL Armory del player da rimuovere.")

    if len(updated_urls) == len(urls):
        raise SystemExit("Nessuna voce Armory rimossa. Controlla nome o URL.")

    save_armory_urls(updated_urls)
    sync_roster()

    if args.name:
        print(f"Player rimosso dal roster: {args.name}")
    else:
        print(f"Player rimosso dal roster tramite URL: {armory_url}")


if __name__ == "__main__":
    main()
