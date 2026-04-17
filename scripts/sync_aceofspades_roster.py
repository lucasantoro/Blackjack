from __future__ import annotations

import json
import re
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import dataclass
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "aceofspades-roster.json"
MEMBERS_DIR = ROOT / "members"
WORKER_URL = "https://wild-mode-1b45.lucasantoro2905.workers.dev/progress-last"
DEFAULT_IMAGE = ""
PLACEHOLDER_TAGLINE = "Scheda in aggiornamento"
PLACEHOLDER_BIO = "Qui puoi aggiungere una presentazione personalizzata del player."


@dataclass
class LocalProfile:
    name: str
    tagline: str
    bio: str
    role: str
    class_name: str
    rio: str
    image: str


def clean_text(value: str) -> str:
    if not value:
        return ""

    if "Ã" in value or "â" in value:
        try:
            return value.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return value

    return value


def normalize_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", clean_text(value or "")).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]", "", ascii_value)


def slugify_name(value: str) -> str:
    return normalize_name(value) or "membro"


def normalize_class_name(value: str) -> str:
    mapping = {
        "deathknight": "Death Knight",
        "demonhunter": "Demon Hunter",
        "evoker": "Evoker",
        "shaman": "Shaman",
        "druid": "Druid",
        "warrior": "Warrior",
        "priest": "Priest",
        "mage": "Mage",
        "hunter": "Hunter",
        "warlock": "Warlock",
        "paladin": "Paladin",
        "monk": "Monk",
        "rogue": "Rogue",
    }
    compact = re.sub(r"\s+", "", value or "").lower()
    return mapping.get(compact, value or "Unknown")


def infer_role(role: str, tagline: str, bio: str, class_name: str) -> str:
    if role:
        return role.lower()

    text = f"{tagline} {bio}".lower()
    if "healer" in text or "guarit" in text:
        return "healer"
    if "tank" in text:
        return "tank"

    if class_name in {"Mage", "Hunter", "Warlock", "Rogue"}:
        return "dps"

    return "unknown"


def raider_io_url(name: str, server: str) -> str:
    encoded_name = urllib.parse.quote(name)
    encoded_server = urllib.parse.quote(server)
    return f"https://raider.io/characters/eu/{encoded_server}/{encoded_name}"


def extract(pattern: str, text: str, default: str = "") -> str:
    match = re.search(pattern, text, re.S)
    return clean_text(unescape(match.group(1).strip())) if match else default


def parse_local_profile(path: Path) -> LocalProfile:
    text = path.read_text(encoding="utf-8")

    image = extract(r'<img src="([^"]+)"', text, DEFAULT_IMAGE)
    name = extract(r"<h3>(.*?)</h3>", text, path.stem)
    tagline = extract(r'<p class="tagline">(.*?)</p>', text, PLACEHOLDER_TAGLINE)
    bio = extract(r'<p class="description-long">\s*(.*?)\s*</p>', text, PLACEHOLDER_BIO)
    role = extract(r'data-role="([^"]+)"', text, "")
    class_name = normalize_class_name(extract(r'data-class="([^"]+)"', text, "Unknown"))
    rio = extract(r'data-rio="([^"]+)"', text, "")

    return LocalProfile(
        name=clean_text(name.title() if name.isupper() else name),
        tagline=tagline,
        bio=re.sub(r"\s+", " ", bio).strip(),
        role=infer_role(role, tagline, bio, class_name),
        class_name=class_name,
        rio=rio,
        image=image,
    )


def fetch_worker_roster() -> list[dict]:
    request = urllib.request.Request(WORKER_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)
    return payload.get("roster", [])


def load_existing_data() -> dict[str, dict]:
    if not DATA_PATH.exists():
        return {}

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return {normalize_name(member["name"]): member for member in data.get("members", [])}


def build_member(entry: dict, existing: dict | None, local: LocalProfile | None) -> dict:
    name = entry["name"]
    server = clean_text(entry.get("server") or (existing or {}).get("server") or "Nemesis")
    class_name = normalize_class_name(clean_text(entry.get("class") or (existing or {}).get("class") or (local.class_name if local else "Unknown")))
    bio = (existing or {}).get("bio") or (local.bio if local else f"{name} fa parte del roster Ace of Spades. {PLACEHOLDER_BIO}")
    tagline = (existing or {}).get("tagline") or (local.tagline if local else PLACEHOLDER_TAGLINE)

    member = {
        "name": clean_text(name),
        "slug": slugify_name(name),
        "server": server,
        "class": class_name,
        "role": (existing or {}).get("role") or (local.role if local else infer_role("", tagline, bio, class_name)),
        "tagline": tagline,
        "bio": bio,
        "image": (existing or {}).get("image") or (local.image if local else DEFAULT_IMAGE),
        "rio": (existing or {}).get("rio") or (local.rio if local and local.rio else raider_io_url(name, server)),
        "profileStatus": (existing or {}).get("profileStatus") or ("custom" if local else "placeholder"),
        "active": True,
    }

    if member["tagline"] == PLACEHOLDER_TAGLINE and member["bio"].endswith(PLACEHOLDER_BIO):
        member["profileStatus"] = "placeholder"

    return member


def main() -> None:
    local_profiles = {
        normalize_name(profile.name): profile
        for profile in (parse_local_profile(path) for path in sorted(MEMBERS_DIR.glob("*.html")))
    }
    existing_members = load_existing_data()
    worker_roster = fetch_worker_roster()

    members = []
    for entry in worker_roster:
        key = normalize_name(entry["name"])
        members.append(build_member(entry, existing_members.get(key), local_profiles.get(key)))

    members.sort(key=lambda member: (member["role"], member["name"].lower()))

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "team": {
            "name": "Ace of Spades",
            "slug": "ace-of-spades",
            "source": "latest-worker-roster",
            "workerUrl": WORKER_URL,
        },
        "members": members,
    }
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
