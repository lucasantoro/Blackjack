from __future__ import annotations

import argparse
import json
import unicodedata
import urllib.parse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "aceofspades-roster.json"


def normalize_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii").lower()
    return "".join(ch for ch in ascii_value if ch.isalnum())


def slugify_name(value: str) -> str:
    return normalize_name(value) or "membro"


def raider_io_url(name: str, server: str) -> str:
    return f"https://raider.io/characters/eu/{urllib.parse.quote(server)}/{urllib.parse.quote(name)}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Aggiunge o aggiorna i campi personalizzati di una scheda Raider.")
    parser.add_argument("--name", required=True)
    parser.add_argument("--tagline")
    parser.add_argument("--bio")
    parser.add_argument("--image")
    parser.add_argument("--clear-tagline", action="store_true")
    parser.add_argument("--clear-bio", action="store_true")
    parser.add_argument("--clear-image", action="store_true")
    parser.add_argument("--role", choices=["tank", "healer", "dps", "unknown"])
    parser.add_argument("--class", dest="class_name")
    parser.add_argument("--spec")
    parser.add_argument("--server")
    parser.add_argument("--armory-url")
    parser.add_argument("--rio")
    parser.add_argument("--active", choices=["true", "false"])
    args = parser.parse_args()

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    members = data.get("members", [])
    key = normalize_name(args.name)

    target = next((member for member in members if normalize_name(member["name"]) == key), None)
    if target is None:
        target = {
            "name": args.name,
            "slug": slugify_name(args.name),
            "server": args.server or "Nemesis",
            "class": args.class_name or "Unknown",
            "spec": args.spec or "",
            "role": args.role or "unknown",
            "armoryUrl": args.armory_url or "",
            "rio": args.rio or raider_io_url(args.name, args.server or "Nemesis"),
            "sourceImage": "",
            "tagline": "",
            "customTagline": "",
            "bio": "",
            "customBio": "",
            "customImage": "",
            "profileStatus": "generated",
            "active": True,
        }
        members.append(target)

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

    if args.clear_tagline:
        target["customTagline"] = ""
    elif args.tagline is not None:
        target["customTagline"] = args.tagline
    if args.clear_bio:
        target["customBio"] = ""
    elif args.bio is not None:
        target["customBio"] = args.bio
    if args.clear_image:
        target["customImage"] = ""
    elif args.image is not None:
        target["customImage"] = args.image
    if args.active is not None:
        target["active"] = args.active == "true"

    target["profileStatus"] = "custom" if any(target.get(field) for field in ("customTagline", "customBio", "customImage")) else "generated"

    members.sort(key=lambda member: (member["role"], member["name"].lower()))
    data["members"] = members
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
