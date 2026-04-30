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
    "belluccio": "Colpi puliti, ritmo costante",
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

PROFILE_COPY = {
    "retribution|paladin|dps": {
        "summaries": [
            "Retribution ordinato, utility presente e danno pulito nelle finestre che contano.",
            "Presenza stabile in melee, cooldown messi bene e supporto vero al ritmo del raid.",
        ],
        "bios": [
            "Gioca Retribution con un'impostazione molto ordinata: entra bene nelle finestre di danno, tiene il ritmo senza sprecare utility e resta leggibile anche nei fight piu affollati. E uno di quei melee che non portano rumore, ma danno struttura al pull e chiudono bene i momenti importanti.",
            "Il suo Retribution ha un taglio concreto: uptime serio, supporto al gruppo quando serve e una buona lettura del fight nelle fasi che puniscono gli errori. Non cerca scena gratuita, ma rendimento stabile e presenza chiara in ogni pull.",
        ],
    },
    "devourer|demon hunter|dps": {
        "summaries": [
            "Mobilita alta, ingresso rapido nel fight e grande continuita sulle transizioni.",
            "Velocita, pressione e movimenti puliti senza perdere lucidita nei momenti sporchi.",
        ],
        "bios": [
            "Gioca Devourer con un profilo molto dinamico: sa entrare subito nel ritmo del fight, copre bene le transizioni e sfrutta la mobilita per stare dove serve senza perdere uptime. Il valore si vede soprattutto quando il pull cambia passo e il raid ha bisogno di una risposta rapida ma ordinata.",
            "Il suo Demon Hunter porta velocita senza confusione: pochi movimenti sprecati, pressione costante e buon controllo dei momenti in cui il boss costringe il gruppo a reagire in fretta. E un profilo utile quando servono iniziativa e disciplina nello stesso pull.",
        ],
    },
    "frost|mage|dps": {
        "summaries": [
            "Cast puliti, grande controllo del ritmo e presenza costante da ranged.",
            "Frost molto ordinato: poco spreco, buon posizionamento e fight sempre leggibile.",
        ],
        "bios": [
            "Gioca Frost con un'impostazione pulita: buon posizionamento, cast stabili e una lettura del fight che aiuta il gruppo a non scomporsi. Si nota soprattutto nei try lunghi, dove la costanza e la disciplina da ranged valgono piu di un picco isolato.",
            "Il suo Frost Mage tiene insieme controllo e continuita: non forza, non sporca e sfrutta bene le finestre utili senza perdere compostezza. E il tipo di ranged che rende la serata piu ordinata mentre continua a fare il proprio lavoro con precisione.",
        ],
    },
    "subtlety|rogue|dps": {
        "summaries": [
            "Entrate pulite, burst ben allineato e grande presenza nei momenti chiave.",
            "Subtlety preciso: fa poco rumore ma pesa sempre quando il fight si stringe.",
        ],
        "bios": [
            "Gioca Subtlety con una mano molto precisa: entra bene nelle finestre di burst, gestisce i movimenti senza perdere lucidita e resta efficace anche quando il fight si sporca. E un melee tecnico che da valore al raid soprattutto nei passaggi in cui l'esecuzione deve restare pulita.",
            "Il suo Rogue lavora bene nei dettagli: danno messo al momento giusto, transizioni ordinate e una buona capacita di restare utile anche nei fight piu irregolari. Quando il gruppo ha bisogno di precisione e presenza rapida, questo profilo si sente.",
        ],
    },
    "unholy|death knight|dps": {
        "summaries": [
            "Pressione costante, ritmo pesante e grande tenuta nei try lunghi.",
            "Unholy solido: presenza continua, buona tenuta e ottimo valore nei fight estesi.",
        ],
        "bios": [
            "Gioca Unholy con un'impronta molto stabile: tiene il boss sotto pressione, regge bene i momenti sporchi e non perde struttura quando il fight si allunga. E un dps che lavora bene sulla continuita e che tende a farsi sentire davvero sulla durata della serata.",
            "Il suo Death Knight porta peso senza disordine: poche esitazioni, buon uptime e una presenza che resta utile anche quando la pull smette di essere lineare. In progress questo tipo di costanza ha sempre un valore molto concreto.",
        ],
    },
    "augmentation|evoker|dps": {
        "summaries": [
            "Supporto offensivo fatto bene, buff ben messi e grande lettura del gruppo.",
            "Augmentation lucido: alza il livello del raid senza appesantire il pull.",
        ],
        "bios": [
            "Gioca Augmentation con una lettura molto orientata al gruppo: buff usati con criterio, buona percezione dei momenti chiave e una presenza che aumenta la qualita generale del raid. Il valore emerge soprattutto quando serve far rendere meglio il team invece di inseguire il singolo numero.",
            "Il suo Evoker lavora bene sulla sincronia del raid: resta lucido, gestisce i tempi con buon senso e aiuta il gruppo a salire di tono nelle finestre davvero importanti. E un profilo utile quando il progress richiede coordinazione oltre alla pura esecuzione individuale.",
        ],
    },
    "affliction|warlock|dps": {
        "summaries": [
            "Controllo lungo, danno affidabile e ottima tenuta nei fight piu pesanti.",
            "Affliction composto: costruisce pressione senza perdere ordine o lucidita.",
        ],
        "bios": [
            "Gioca Affliction con grande calma: tiene bene i tempi lunghi, costruisce pressione senza strafare e resta molto leggibile quando il fight chiede pazienza. E uno di quei ranged che aiutano il raid a non perdere forma nei try che si trascinano.",
            "Il suo Warlock punta tutto sulla continuita: poco spreco, buona disciplina e un ritmo che resta affidabile anche quando la pull si appesantisce. In progress questo tipo di presenza stabilizza molto la serata.",
        ],
    },
    "demonology|warlock|dps": {
        "summaries": [
            "Setup metodico, pressione continua e ottima struttura nei try lunghi.",
            "Demonology ordinato: costruisce bene il danno e regge il fight senza scomporsi.",
        ],
        "bios": [
            "Gioca Demonology con un'impostazione molto metodica: prepara bene i momenti importanti, mantiene ordine nel setup e regge bene i fight che premiano continuita e sangue freddo. E un ranged che da sicurezza al gruppo mentre fa crescere il pull.",
            "Il suo Warlock ha una struttura molto solida: danno costruito con criterio, buona costanza e poca dispersione nei passaggi che contano davvero. Quando il boss richiede disciplina e presenza lunga, questo profilo aiuta parecchio.",
        ],
    },
    "restoration|shaman|healer": {
        "summaries": [
            "Cure lucide, ottima stabilita del raid e buon tempismo sui picchi.",
            "Healing molto ordinato: rimette insieme il gruppo senza rallentare la serata.",
        ],
        "bios": [
            "Gioca Restoration con una mano molto affidabile: tiene il raid leggibile, regge bene i picchi di danno e usa il kit con buon tempismo invece di rincorrere la cura inutile. E il tipo di healer che aiuta la serata a restare composta anche quando il fight accelera.",
            "Il suo Shaman porta stabilita vera: pochi sprechi, buon senso sui cooldown e una presenza costante che rimette ordine quando il raid rischia di scomporsi. In progress e una base molto utile per dare continuita ai try.",
        ],
    },
    "holy|paladin|healer": {
        "summaries": [
            "Supporto diretto, tempi stretti e grande presenza sui target che contano.",
            "Holy concreto: cura con precisione e tiene i momenti pesanti sotto controllo.",
        ],
        "bios": [
            "Gioca Holy con un profilo molto concreto: presidia bene i momenti pericolosi, cura con precisione e non spreca attenzione sui target sbagliati. E una presenza utile soprattutto quando il raid ha bisogno di decisioni rapide e supporto molto leggibile.",
            "Il suo Paladin punta su lucidita e presenza: tempi buoni, ottima resa nei passaggi critici e una gestione molto pratica del fight. Quando la pull si fa tesa, questo tipo di healer aiuta a tenere il gruppo al suo posto.",
        ],
    },
    "discipline|priest|healer": {
        "summaries": [
            "Ottimo anticipo, grande ordine nei danni in arrivo e raid piu stabile.",
            "Discipline tecnico: prepara bene i momenti chiave e tiene il gruppo coperto.",
        ],
        "bios": [
            "Gioca Discipline con un taglio molto tecnico: lavora bene in anticipo, prepara i momenti chiave e fa in modo che il raid non arrivi scoperto nelle fasi pesanti. E un healer che alza la qualita complessiva del gruppo quando il fight richiede pianificazione.",
            "Il suo Priest gestisce il danno prima che esploda: buona lettura del ritmo, tempi ordinati e tanta disciplina nei momenti in cui la pull va costruita con precisione. Questo profilo si nota soprattutto nelle serate di progress vero.",
        ],
    },
    "restoration|druid|healer": {
        "summaries": [
            "Copertura continua, movimento pulito e grande tenuta del raid nel lungo periodo.",
            "Restoration fluido: accompagna il gruppo bene anche quando il fight si sporca.",
        ],
        "bios": [
            "Gioca Restoration con un ritmo molto fluido: accompagna bene i fight lunghi, smussa gli errori e aiuta il gruppo a non perdere tenuta quando la pull si complica. E una presenza molto utile quando serve continuita invece di reazione nervosa.",
            "Il suo Druid tiene insieme copertura e mobilita: resta pulito nei movimenti, non spreca e rimane affidabile anche quando il boss prova a spezzare il raid. Questo tipo di healer fa crescere la stabilita generale della serata.",
        ],
    },
    "brewmaster|monk|tank": {
        "summaries": [
            "Mobilita alta, pull sotto controllo e linea chiara per tutto il gruppo.",
            "Brewmaster pulito: prende spazio bene e tiene il fight molto leggibile.",
        ],
        "bios": [
            "Gioca Brewmaster con una presenza molto pulita: si muove bene, prende spazio quando serve e imposta il pull in modo leggibile per tutto il gruppo. E un tank che aiuta il raid a seguire una linea chiara fin dai primi secondi della pull.",
            "Il suo Monk tiene insieme mobilita e ordine: regge la pressione senza irrigidire il ritmo del raid e rende piu semplice leggere il fight nei passaggi piu scomodi. Quando serve fluidita davanti al boss, questo profilo e molto utile.",
        ],
    },
    "protection|warrior|tank": {
        "summaries": [
            "Apre il pull con decisione e tiene la forma del fight molto chiara.",
            "Protection solido: linea pulita, buona gestione dei pesi e grande presenza davanti.",
        ],
        "bios": [
            "Gioca Protection con una presenza molto netta: apre bene il pull, tiene ordine davanti e rende il fight piu facile da leggere anche per il resto del gruppo. E il tipo di tank che da struttura alla serata gia dai primi secondi.",
            "Il suo Warrior regge bene i momenti pesanti senza sporcare il ritmo: linee pulite, decisioni chiare e una grande presenza davanti al boss. Quando il raid ha bisogno di stabilita vera, questo profilo si sente subito.",
        ],
    },
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


def sanitize_custom_text(value: str) -> str:
    text = clean_text(str(value or "")).strip()
    if not text:
        return ""
    if text.lower().startswith(("http://", "https://")):
        return ""
    return text


def normalize_name(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", clean_text(value or "")).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]", "", ascii_value)


def slugify(value: str) -> str:
    return normalize_name(value) or "membro"


def stable_index(seed: str, length: int) -> int:
    if length <= 0:
        return 0
    total = 0
    for char in str(seed or ""):
        total += ord(char)
    return total % length


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
    key = generated_profile_key(member)
    profile = PROFILE_COPY.get(key)
    if profile and profile.get("bios"):
        return profile["bios"][stable_index(member["name"], len(profile["bios"]))]

    name_key = normalize_name(member["name"])
    flavor = FLAVOR.get(name_key, f"{member['name']} porta in raid presenza, ordine e un buon istinto per i momenti che contano.")
    spec_bits = [member.get("spec"), member.get("class")]
    spec_label = " ".join(bit for bit in spec_bits if bit).strip()
    role = member["role"]
    role_line = ROLE_COPY.get(role, ROLE_COPY["unknown"])
    closing = CLOSING_COPY.get(role, CLOSING_COPY["unknown"])
    return f"{member['name']} gioca come un {spec_label} che non cerca scena gratuita ma impatto vero. {flavor}{role_line}{closing}"


def generate_summary(member: dict) -> str:
    key = generated_profile_key(member)
    profile = PROFILE_COPY.get(key)
    if profile and profile.get("summaries"):
        return profile["summaries"][stable_index(member["name"], len(profile["summaries"]))]

    role = member.get("role", "unknown")
    fallback = {
        "tank": "Tiene il pull ordinato e rende il fight facile da leggere.",
        "healer": "Tiene il raid stabile e risponde bene ai momenti pesanti.",
        "dps": "Porta continuita, danno pulito e buon ritmo di fight.",
        "unknown": "Resta una presenza utile e affidabile nel roster.",
    }
    return fallback.get(role, fallback["unknown"])


def generated_profile_key(member: dict) -> str:
    return "|".join([
        str(member.get("spec", "")).strip().lower(),
        str(member.get("class", "")).strip().lower(),
        str(member.get("role", "")).strip().lower(),
    ])


def load_existing_customizations() -> dict[str, dict]:
    if not DATA_PATH.exists():
        return {}

    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    members = payload.get("members", [])
    return {
        normalize_name(member["name"]): {
            "customTagline": sanitize_custom_text(member.get("customTagline", "")),
            "customSummary": sanitize_custom_text(member.get("customSummary", "")),
            "customBio": sanitize_custom_text(member.get("customBio", "")),
            "customImage": clean_text(member.get("customImage", "")).strip(),
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
            "summary": generate_summary(member),
            "customTagline": preserved.get("customTagline", ""),
            "customSummary": preserved.get("customSummary", ""),
            "bio": generate_bio(member),
            "customBio": preserved.get("customBio", ""),
            "customImage": preserved.get("customImage", ""),
            "profileStatus": "custom" if any(preserved.get(field) for field in ("customTagline", "customSummary", "customBio", "customImage")) else "generated",
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
