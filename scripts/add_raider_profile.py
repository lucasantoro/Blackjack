from __future__ import annotations

import argparse
import json
import unicodedata
import urllib.parse
from pathlib import Path

from sync_blizzard_roster import fetch_armory_profile, main as sync_roster


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "aceofspades-roster.json"
URLS_PATH = ROOT / "data" / "aceofspades-armory-urls.txt"


def normalize_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii").lower()
    return "".join(ch for ch in ascii_value if ch.isalnum())


def slugify_name(value: str) -> str:
    return normalize_name(value) or "membro"


def raider_io_url(name: str, server: str) -> str:
    return f"https://raider.io/characters/eu/{urllib.parse.quote(server)}/{urllib.parse.quote(name)}"


def prompt_text(label: str, current: str = "", allow_empty: bool = True) -> str:
    suffix = f" [{current}]" if current else ""
    value = input(f"{label}{suffix}: ").strip()
    if not value and current:
        return current
    if not value and allow_empty:
        return ""
    return value


def prompt_bool(label: str, current: bool) -> bool:
    default = "Y/n" if current else "y/N"
    value = input(f"{label} [{default}]: ").strip().lower()
    if not value:
        return current
    return value in {"y", "yes", "s", "si"}


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


def ensure_armory_url(armory_url: str) -> None:
    normalized = armory_url.strip()
    if not normalized:
        return

    urls = load_armory_urls()
    if normalized not in urls:
        urls.append(normalized)
        save_armory_urls(urls)


def find_member(data: dict, name: str) -> dict | None:
    key = normalize_name(name)
    return next((member for member in data.get("members", []) if normalize_name(member.get("name", "")) == key), None)


def update_custom_fields(target: dict, args: argparse.Namespace, interactive: bool) -> None:
    current_tagline = target.get("customTagline", "")
    current_summary = target.get("customSummary", "")
    current_bio = target.get("customBio", "")
    current_image = target.get("customImage", "")
    current_active = bool(target.get("active", True))

    if args.clear_tagline:
        target["customTagline"] = ""
    elif args.tagline is not None:
        target["customTagline"] = args.tagline
    elif interactive:
        target["customTagline"] = prompt_text("Tagline personalizzata (vuoto = nessuna)", current_tagline)

    if args.clear_summary:
        target["customSummary"] = ""
    elif args.summary is not None:
        target["customSummary"] = args.summary
    elif interactive:
        target["customSummary"] = prompt_text("Testo breve personalizzato (vuoto = nessuno)", current_summary)

    if args.clear_bio:
        target["customBio"] = ""
    elif args.bio is not None:
        target["customBio"] = args.bio
    elif interactive:
        target["customBio"] = prompt_text("Testo lungo personalizzato (vuoto = nessuno)", current_bio)

    if args.clear_image:
        target["customImage"] = ""
    elif args.image is not None:
        target["customImage"] = args.image
    elif interactive:
        target["customImage"] = prompt_text("Immagine personalizzata URL/path (vuoto = nessuna)", current_image)

    if args.active is not None:
        target["active"] = args.active == "true"
    elif interactive:
        target["active"] = prompt_bool("Profilo attivo", current_active)

    target["profileStatus"] = "custom" if any(
        target.get(field) for field in ("customTagline", "customSummary", "customBio", "customImage")
    ) else "generated"


def patch_member_fields(target: dict, args: argparse.Namespace) -> None:
    if args.server:
        target["server"] = args.server
    if args.class_name:
        target["class"] = args.class_name
    if args.spec is not None:
        target["spec"] = args.spec
    if args.role:
        target["role"] = args.role
    if args.armory_url:
        target["armoryUrl"] = args.armory_url
    if args.rio:
        target["rio"] = args.rio
    elif args.server and not target.get("rio"):
        target["rio"] = raider_io_url(target["name"], target["server"])


def build_placeholder_member(args: argparse.Namespace) -> dict:
    server = args.server or "Nemesis"
    return {
        "name": args.name,
        "slug": slugify_name(args.name),
        "server": server,
        "class": args.class_name or "Unknown",
        "spec": args.spec or "",
        "role": args.role or "unknown",
        "armoryUrl": args.armory_url or "",
        "rio": args.rio or raider_io_url(args.name, server),
        "sourceImage": "",
        "tagline": "",
        "summary": "",
        "customTagline": "",
        "customSummary": "",
        "bio": "",
        "customBio": "",
        "customImage": "",
        "profileStatus": "generated",
        "active": True,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Aggiunge un Raider al roster Ace of Spades e applica bio/foto/tagline personalizzate."
    )
    parser.add_argument("--armory-url", help="URL Armory Blizzard del personaggio")
    parser.add_argument("--name", help="Nome del personaggio, usato se non passi armory-url o come override")
    parser.add_argument("--tagline")
    parser.add_argument("--summary")
    parser.add_argument("--bio")
    parser.add_argument("--image")
    parser.add_argument("--clear-tagline", action="store_true")
    parser.add_argument("--clear-summary", action="store_true")
    parser.add_argument("--clear-bio", action="store_true")
    parser.add_argument("--clear-image", action="store_true")
    parser.add_argument("--role", choices=["tank", "healer", "dps", "unknown"])
    parser.add_argument("--class", dest="class_name")
    parser.add_argument("--spec")
    parser.add_argument("--server")
    parser.add_argument("--rio")
    parser.add_argument("--active", choices=["true", "false"])
    parser.add_argument("--no-prompt", action="store_true", help="Non chiedere input interattivo.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    interactive = not args.no_prompt

    armory_url = args.armory_url
    detected_profile = None

    if not armory_url and interactive:
        armory_url = input("URL Armory Blizzard del personaggio (invio per saltare): ").strip() or None

    if armory_url:
        detected_profile = fetch_armory_profile(armory_url)
        ensure_armory_url(armory_url)
        sync_roster()
        if not args.name:
            args.name = detected_profile["name"]
        if not args.server:
            args.server = detected_profile["server"]
        if not args.class_name:
            args.class_name = detected_profile["class"]
        if args.spec is None:
            args.spec = detected_profile["spec"]
        if not args.role:
            args.role = detected_profile["role"]
        if not args.rio:
            args.rio = detected_profile["rio"]
        args.armory_url = armory_url

    if not args.name:
        if interactive:
            args.name = input("Nome del personaggio: ").strip()
        if not args.name:
            raise SystemExit("Serve almeno --name oppure --armory-url.")

    data = load_roster()
    target = find_member(data, args.name)

    if target is None:
        target = build_placeholder_member(args)
        data.setdefault("members", []).append(target)

    patch_member_fields(target, args)
    update_custom_fields(target, args, interactive)

    data["members"].sort(key=lambda member: (member.get("role", "unknown"), member.get("name", "").lower()))
    save_roster(data)

    print(f"Profilo aggiornato: {target['name']}")
    print(f"- armory: {target.get('armoryUrl') or 'non impostato'}")
    print(f"- tagline custom: {'si' if target.get('customTagline') else 'no'}")
    print(f"- testo breve custom: {'si' if target.get('customSummary') else 'no'}")
    print(f"- bio custom: {'si' if target.get('customBio') else 'no'}")
    print(f"- immagine custom: {'si' if target.get('customImage') else 'no'}")


if __name__ == "__main__":
    main()
