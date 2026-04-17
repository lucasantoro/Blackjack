from __future__ import annotations

import json
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "aceofspades-roster.json"
URLS_PATH = ROOT / "data" / "aceofspades-armory-urls.txt"
USER_AGENT = "Mozilla/5.0"

TAGLINES = {
    "allenor": "La luce arriva puntuale",
    "aqualara": "Calma, acqua e cure giuste",
    "axlidan": "Taglia corto, poi rifinisce",
    "babayagaa": "La scopa vola, il danno pure",
    "blakthorn": "Luce ferma, tempi feroci",
    "dephias": "Eleganza losca, utilita vera",
    "drbobo": "Il caos giusto al momento giusto",
    "durst": "Fiato lungo e sangue freddo",
    "ejlin": "Passi leggeri, mani veloci",
    "gearstrike": "Primo sul pull, ultimo a cadere",
    "michele": "Precisione con accento elegante",
    "odetta": "Taglio netto, chiusura pulita",
    "ponzqt": "Numeri seri, aria rilassata",
    "preot": "Se serve ordine, arriva lui",
    "resal": "Affila il setup e non spreca niente",
    "siodexiel": "Controllo fine, zero scene",
    "takamura": "Entra piano, lascia il segno",
    "trolluido": "Radici salde, tempismo morbido",
    "zepyrot": "Gelo pulito, testa lucida",
}

FLAVOR = {
    "allenor": "Ha il passo da veterano tranquillo e quel modo di stare in raid che abbassa subito la confusione.",
    "aqualara": "Ha sempre un tocco ordinato, anche quando la serata decide di complicarsi da sola.",
    "axlidan": "Non ama perdere tempo e si vede: entra nel fight, legge il ritmo e mette subito pressione.",
    "babayagaa": "Porta in raid un'energia strana nel senso migliore: imprevedibile quanto basta, affidabile quando conta.",
    "blakthorn": "Ha un modo diretto di giocare: pochi fronzoli, molta sostanza e zero spazio per i pull molli.",
    "dephias": "Si muove con l'aria di chi ha gia visto tutto, poi trova sempre il dettaglio utile che manca al gruppo.",
    "drbobo": "Dietro il nome leggero c'e un player concreto, con tempi buoni e una discreta passione per i momenti sporchi.",
    "durst": "Sembra sempre avere una marcia in piu quando il fight si allunga e la precisione diventa tutto.",
    "ejlin": "Gioca con una pulizia che si nota subito: pochi sprechi, movimenti rapidi e tanta disciplina silenziosa.",
    "gearstrike": "Quando la pull parte, la sua presenza si sente subito: ordine davanti, ritmo chiaro per tutto il gruppo.",
    "michele": "Ha un gusto pulito per il gioco bene eseguito e quell'eleganza rara di chi non forza mai la mano.",
    "odetta": "Porta una calma quasi sospetta: sembra rilassato e intanto ha gia messo tutto nella posizione giusta.",
    "ponzqt": "Ha il profilo del player che non fa rumore ma ti ritrovi sempre tra quelli che tengono insieme il fight.",
    "preot": "Sa stare nel mezzo del caos senza farselo salire in testa, che per un raid e gia mezza vittoria.",
    "resal": "Ha il gusto delle scelte pulite e il talento di far sembrare semplice anche quello che semplice non e.",
    "siodexiel": "Resta composto anche quando gli altri stanno gia raccontando il wipe prima della fine del tentativo.",
    "takamura": "Ha un'impronta sobria ma incisiva: poche parole, molte cose fatte bene e sempre al momento giusto.",
    "trolluido": "Tiene un ritmo morbido ma costante, di quelli che aiutano il gruppo a non scivolare nel caos.",
    "zepyrot": "Ha quella precisione tranquilla di chi preferisce un fight pulito a un picco bello solo sul meter.",
}

ROLE_COPY = {
    "tank": " Davanti tiene la linea con pazienza, chiama il tempo del pull e assorbe pressione senza irrigidire la serata.",
    "healer": " In supporto porta lucidita, stabilita e quel tempismo che rimette in piedi il gruppo senza farne un dramma.",
    "dps": " Sul lato offensivo cerca danno pulito, utility vera e quel tipo di costanza che aiuta a chiudere bene i boss.",
    "unknown": " Si adatta bene al ritmo del team e resta una presenza utile sia quando serve spingere sia quando serve coprire.",
}

CLOSING_COPY = {
    "tank": " E quando serve prendersi la responsabilita del primo passo, di solito e gia avanti agli altri.",
    "healer": " Il risultato e una scheda che sa fare bene il suo lavoro senza perdere leggerezza di gruppo.",
    "dps": " Insomma, uno di quei Raider che ti fanno venire voglia di ripremere ready senza pensarci troppo.",
    "unknown": " E anche per questo e facile immaginarselo come una presenza preziosa nelle serate che contano.",
}


def clean_text(value: str) -> str:
    if not value:
        return ""
    if "Ã" in value or "Â" in value:
        try:
            return value.encode("latin1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return value
    return value


def normalize_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", clean_text(value or "")).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]", "", ascii_value)


def slugify(value: str) -> str:
    return normalize_name(value) or "membro"


def raider_io_url(name: str, server: str) -> str:
    return f"https://raider.io/characters/eu/{urllib.parse.quote(server)}/{urllib.parse.quote(name)}"


def load_urls() -> list[str]:
    return [
        line.strip()
        for line in URLS_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


def extract_json_object(text: str, marker: str) -> dict:
    start = text.find(marker)
    if start == -1:
        raise ValueError("Marker non trovato nella pagina Blizzard.")

    start += len(marker)
    depth = 0
    in_string = False
    escaped = False
    chars: list[str] = []

    for char in text[start:]:
        chars.append(char)

        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                break

    return json.loads("".join(chars))


def fetch_armory_profile(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=25) as response:
        html = response.read().decode("utf-8", "replace")

    payload = extract_json_object(html, "var characterProfileInitialState = ")
    character = payload["character"]
    spec = character.get("spec") or {}
    role = ((spec.get("role") or {}).get("slug") or "unknown").lower()

    return {
        "name": clean_text(character["name"]),
        "slug": slugify(clean_text(character["name"])),
        "server": clean_text(character["realm"]["name"]),
        "class": clean_text(character["class"]["name"]),
        "spec": clean_text(spec.get("name", "")),
        "role": {"damage": "dps", "healer": "healer", "tank": "tank"}.get(role, "unknown"),
        "armoryUrl": url,
        "rio": raider_io_url(clean_text(character["name"]), clean_text(character["realm"]["name"])),
        "sourceImage": (character.get("bust") or {}).get("url") or (character.get("avatar") or {}).get("url", ""),
    }


def generate_bio(member: dict) -> str:
    key = normalize_name(member["name"])
    flavor = FLAVOR.get(key, f"{member['name']} porta in raid presenza, ordine e un buon istinto per i momenti che contano.")
    spec_bits = [member.get("spec"), member.get("class")]
    spec_label = " ".join(bit for bit in spec_bits if bit).strip()
    role = member["role"]
    role_line = ROLE_COPY.get(role, ROLE_COPY["unknown"])
    closing = CLOSING_COPY.get(role, CLOSING_COPY["unknown"])
    return f"{member['name']} gioca come un {spec_label} che non cerca scena gratuita ma impatto vero. {flavor}{role_line}{closing}"


def load_existing_customizations() -> dict[str, dict]:
    if not DATA_PATH.exists():
        return {}

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    members = payload.get("members", [])
    return {
        normalize_name(member["name"]): {
            "customTagline": member.get("customTagline", ""),
            "customBio": member.get("customBio", ""),
            "customImage": member.get("customImage", ""),
            "active": member.get("active", True),
        }
        for member in members
    }


def build_member(url: str, customizations: dict[str, dict]) -> dict:
    member = fetch_armory_profile(url)
    key = normalize_name(member["name"])
    preserved = customizations.get(key, {})

    member.update(
        {
            "tagline": TAGLINES.get(key, "Presenza pulita nel roster"),
            "customTagline": preserved.get("customTagline", ""),
            "bio": generate_bio(member),
            "customBio": preserved.get("customBio", ""),
            "customImage": preserved.get("customImage", ""),
            "profileStatus": "custom" if any(preserved.get(field) for field in ("customTagline", "customBio", "customImage")) else "generated",
            "active": preserved.get("active", True),
        }
    )
    return member


def main() -> None:
    urls = load_urls()
    customizations = load_existing_customizations()
    members = [build_member(url, customizations) for url in urls]
    members.sort(key=lambda member: (member["role"], member["name"].lower()))

    payload = {
        "team": {
            "name": "Ace of Spades",
            "slug": "ace-of-spades",
            "source": "blizzard-armory",
            "sourceList": "data/aceofspades-armory-urls.txt",
        },
        "members": members,
    }
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Roster sincronizzato: {len(members)} schede aggiornate da Armory.")


if __name__ == "__main__":
    main()
