from __future__ import annotations

import argparse
import json
import unicodedata
import urllib.parse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "aceofspades-roster.json"
DEFAULT_IMAGE = "../../img/logo.png"
PLACEHOLDER_BIO = "Qui puoi aggiungere una presentazione personalizzata del player."


def normalize_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii").lower()
    return "".join(ch for ch in ascii_value if ch.isalnum())


def slugify_name(value: str) -> str:
    return normalize_name(value) or "membro"


def raider_io_url(name: str, server: str) -> str:
    return f"https://raider.io/characters/eu/{urllib.parse.quote(server)}/{urllib.parse.quote(name)}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Aggiunge o aggiorna una scheda Raider nel roster Ace of Spades.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--class", dest="class_name", required=True)
    parser.add_argument("--server", required=True)
    parser.add_argument("--role", default="unknown", choices=["tank", "healer", "dps", "unknown"])
    parser.add_argument("--tagline", default="Scheda in aggiornamento")
    parser.add_argument("--bio", default=PLACEHOLDER_BIO)
    parser.add_argument("--image", default=DEFAULT_IMAGE)
    parser.add_argument("--rio", default=None)
    args = parser.parse_args()

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    members = data.get("members", [])
    key = normalize_name(args.name)

    payload = {
        "name": args.name,
        "slug": slugify_name(args.name),
        "server": args.server,
        "class": args.class_name,
        "role": args.role,
        "tagline": args.tagline,
        "bio": args.bio,
        "image": args.image,
        "rio": args.rio or raider_io_url(args.name, args.server),
        "profileStatus": "custom" if args.bio != PLACEHOLDER_BIO else "placeholder",
        "active": True,
    }

    replaced = False
    for index, member in enumerate(members):
        if normalize_name(member["name"]) == key:
            members[index] = payload
            replaced = True
            break

    if not replaced:
        members.append(payload)

    members.sort(key=lambda member: (member["role"], member["name"].lower()))
    data["members"] = members
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
