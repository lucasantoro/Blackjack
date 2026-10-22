#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Aggiunge, elenca o rimuove i video del carosello in home.

Esempi
------
File locale (viene ottimizzato per il web e gli viene estratta la copertina):

    python scripts\\add_guild_video.py "C:\\Users\\lucas\\Downloads\\clip.mp4"

Con tutti i campi gia pronti, senza domande:

    python scripts\\add_guild_video.py "C:\\...\\clip.mp4" ^
        --title "Primo kill di Ula'tek" --author "Gearstrike" ^
        --tag "Kill" --description "La serata del first kill." ^
        --poster-at 42 --no-prompt

Video gia su YouTube o Twitch (nessun file copiato nel repo):

    python scripts\\add_guild_video.py --youtube dQw4w9WgXcQ --title "..."
    python scripts\\add_guild_video.py --twitch 2907028647 --title "..."

Gestione:

    python scripts\\add_guild_video.py --list
    python scripts\\add_guild_video.py --remove ulatek-cinematic
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(ROOT, "data", "guild-videos.json")
MEDIA_DIR = os.path.join(ROOT, "media", "videos")

# Qualita di compressione: piu alto = file piu piccolo e piu artefatti.
CRF = 28
MAX_WIDTH = 1280


# --------------------------------------------------------------------------- #
# utility
# --------------------------------------------------------------------------- #

def slugify(value):
    text = unicodedata.normalize("NFKD", str(value))
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "video"


def which(name):
    return shutil.which(name)


def require_ffmpeg():
    if not which("ffmpeg") or not which("ffprobe"):
        sys.exit(
            "Serve ffmpeg per importare un file video.\n"
            "Installalo con:  winget install Gyan.FFmpeg\n"
            "Poi riapri il terminale e rilancia lo script."
        )


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit("Comando fallito:\n  %s\n%s" % (" ".join(cmd), result.stderr[-800:]))
    return result.stdout.strip()


def probe_duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "csv=p=0", path])
    try:
        seconds = int(round(float(out)))
    except ValueError:
        return None, 0
    return "%d:%02d" % (seconds // 60, seconds % 60), seconds


def load_data():
    if not os.path.exists(DATA_FILE):
        return {"schemaVersion": 1, "videos": []}
    with open(DATA_FILE, encoding="utf-8") as fh:
        return json.load(fh)


def save_data(data):
    # I video restano ordinati dal piu recente al piu vecchio.
    data["videos"].sort(key=lambda v: str(v.get("date") or ""), reverse=True)
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def ask(label, default=""):
    suffix = " [%s]" % default if default else ""
    answer = input("%s%s: " % (label, suffix)).strip()
    return answer or default


# --------------------------------------------------------------------------- #
# import di un file locale
# --------------------------------------------------------------------------- #

def import_file(source, slug, poster_at):
    require_ffmpeg()
    if not os.path.exists(source):
        sys.exit("File non trovato: %s" % source)

    os.makedirs(MEDIA_DIR, exist_ok=True)
    video_out = os.path.join(MEDIA_DIR, slug + ".mp4")
    poster_out = os.path.join(MEDIA_DIR, slug + ".webp")

    duration_label, duration_sec = probe_duration(source)

    print("Ottimizzo il video per il web (puo richiedere qualche minuto)...")
    run([
        "ffmpeg", "-v", "error", "-y", "-i", source,
        # scala solo se piu largo del massimo, mantenendo le proporzioni
        "-vf", "scale='min(%d,iw)':-2" % MAX_WIDTH,
        "-c:v", "libx264", "-preset", "slow", "-crf", str(CRF),
        "-profile:v", "high", "-pix_fmt", "yuv420p",
        # moov in testa: la riproduzione parte senza scaricare tutto
        "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "112k",
        video_out,
    ])

    if poster_at is None:
        poster_at = max(1, int(duration_sec * 0.4)) if duration_sec else 1

    print("Estraggo la copertina al secondo %d..." % poster_at)
    run([
        "ffmpeg", "-v", "error", "-y", "-ss", str(poster_at), "-i", video_out,
        "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "80", poster_out,
    ])

    before = os.path.getsize(source) / 1048576.0
    after = os.path.getsize(video_out) / 1048576.0
    print("  %.1f MB -> %.1f MB" % (before, after))

    return {
        "type": "file",
        "src": "media/videos/%s.mp4" % slug,
        "poster": "media/videos/%s.webp" % slug,
        "duration": duration_label or "",
    }


# --------------------------------------------------------------------------- #
# comandi
# --------------------------------------------------------------------------- #

def cmd_list():
    data = load_data()
    if not data["videos"]:
        print("Nessun video nel carosello.")
        return
    print("%-26s %-12s %-10s %s" % ("ID", "DATA", "TIPO", "TITOLO"))
    for video in data["videos"]:
        kind = "youtube" if video.get("youtubeId") else ("twitch" if video.get("twitchVideoId") else "file")
        print("%-26s %-12s %-10s %s" % (video.get("id", ""), video.get("date", ""), kind, video.get("title", "")))


def cmd_remove(video_id, keep_files):
    data = load_data()
    match = next((v for v in data["videos"] if v.get("id") == video_id), None)
    if not match:
        sys.exit("Nessun video con id '%s'. Usa --list per vederli." % video_id)

    data["videos"] = [v for v in data["videos"] if v.get("id") != video_id]
    save_data(data)
    print("Rimosso dal carosello: %s" % video_id)

    if keep_files:
        return
    for key in ("src", "poster"):
        rel = match.get(key)
        if not rel or rel.startswith("http"):
            continue
        path = os.path.join(ROOT, rel.replace("/", os.sep))
        if os.path.exists(path):
            os.remove(path)
            print("  file rimosso: %s" % rel)


def cmd_add(args):
    data = load_data()

    title = args.title
    if not title and not args.no_prompt:
        title = ask("Titolo del video")
    if not title:
        sys.exit("Serve un titolo: usa --title.")

    slug = args.id or slugify(title)
    if any(v.get("id") == slug for v in data["videos"]):
        sys.exit("Esiste gia un video con id '%s'. Usane un altro con --id." % slug)

    if args.youtube:
        if not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", args.youtube):
            sys.exit("ID YouTube non valido: %s" % args.youtube)
        payload = {
            "type": "youtube",
            "youtubeId": args.youtube,
            "poster": "https://i.ytimg.com/vi/%s/hqdefault.jpg" % args.youtube,
            "duration": args.duration or "",
        }
    elif args.twitch:
        if not re.fullmatch(r"\d{6,}", args.twitch):
            sys.exit("ID video Twitch non valido: %s" % args.twitch)
        payload = {
            "type": "twitch",
            "twitchVideoId": args.twitch,
            "poster": "",
            "duration": args.duration or "",
        }
    else:
        if not args.source:
            sys.exit("Indica un file video, oppure usa --youtube / --twitch.")
        payload = import_file(args.source, slug, args.poster_at)
        if args.duration:
            payload["duration"] = args.duration

    author = args.author
    tag = args.tag
    description = args.description
    if not args.no_prompt:
        author = author or ask("Autore (chi l'ha montato)", "")
        tag = tag or ask("Etichetta breve", "Video")
        description = description or ask("Descrizione", "")

    entry = {
        "id": slug,
        "title": title,
        "author": author or "",
        "date": args.date or date.today().isoformat(),
        "tag": tag or "Video",
        "description": description or "",
    }
    entry.update(payload)

    data["videos"].append(entry)
    save_data(data)

    print("\nAggiunto al carosello della home:")
    print("  id:     %s" % slug)
    print("  titolo: %s" % title)
    print("\nControlla il risultato con:  python scripts\\serve.py")


def main():
    parser = argparse.ArgumentParser(
        description="Gestisce i video del carosello in home.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("source", nargs="?", help="file video locale da importare")
    parser.add_argument("--youtube", help="ID di un video YouTube gia pubblicato")
    parser.add_argument("--twitch", help="ID di un VOD Twitch")
    parser.add_argument("--id", help="id/slug personalizzato")
    parser.add_argument("--title", help="titolo mostrato sulla card")
    parser.add_argument("--author", help="chi ha montato il video")
    parser.add_argument("--tag", help="etichetta breve, es. Hype video / Kill / Clip")
    parser.add_argument("--description", help="una riga di descrizione")
    parser.add_argument("--date", help="data in formato AAAA-MM-GG (default: oggi)")
    parser.add_argument("--duration", help="durata mostrata, es. 1:58")
    parser.add_argument("--poster-at", type=int, help="secondo da cui estrarre la copertina")
    parser.add_argument("--no-prompt", action="store_true", help="non fare domande")
    parser.add_argument("--list", action="store_true", help="elenca i video")
    parser.add_argument("--remove", metavar="ID", help="rimuove un video dal carosello")
    parser.add_argument("--keep-files", action="store_true",
                        help="con --remove, lascia i file in media/videos/")

    args = parser.parse_args()

    if args.list:
        cmd_list()
    elif args.remove:
        cmd_remove(args.remove, args.keep_files)
    else:
        cmd_add(args)


if __name__ == "__main__":
    main()
