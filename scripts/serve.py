#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Anteprima locale del sito, prima di pubblicare su GitHub.

    python scripts\\serve.py

Apre http://127.0.0.1:4173 nel browser e serve la cartella del progetto.
Ctrl+C per fermare.

Perche proprio la porta 4173
----------------------------
I Cloudflare Worker della gilda accettano richieste solo da una lista di
origini note, e in quella lista c'e 127.0.0.1:4173. Su qualsiasi altra porta
il browser blocca le chiamate per CORS e vedresti la home senza bacheca,
senza progress e senza statistiche. Se cambi porta, aggiungi la nuova origine
in DEFAULT_ALLOWED_ORIGINS dei worker e ridistribuiscili.

Opzioni
-------
    --port 4173      cambia porta (vedi sopra)
    --no-browser     non aprire il browser
"""

import argparse
import os
import re
import sys
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PORT = 4173
CHUNK = 64 * 1024
RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")


class PreviewHandler(SimpleHTTPRequestHandler):
    """Server statico con cache disattivata, MIME corretti e richieste Range.

    Il supporto Range serve ai video: senza, il player riesce a partire ma non
    a spostarsi avanti e indietro nella timeline. GitHub Pages lo supporta,
    quindi l'anteprima si comporta come il sito pubblicato.
    """

    # Con HTTP/1.0 Chrome scarica i video in un colpo solo invece di chiedere
    # intervalli: serve 1.1 perche la timeline sia scorrevole.
    protocol_version = "HTTP/1.1"

    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        ".webp": "image/webp",
        ".webmanifest": "application/manifest+json",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mjs": "text/javascript",
        ".json": "application/json",
    })

    _range_length = None

    def send_head(self):
        self._range_length = None
        header = self.headers.get("Range")
        if not header:
            return super().send_head()

        match = RANGE_RE.match(header.strip())
        path = self.translate_path(self.path)
        if not match or os.path.isdir(path):
            return super().send_head()

        try:
            handle = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        size = os.fstat(handle.fileno()).st_size
        first, last = match.group(1), match.group(2)

        if first == "":
            # "bytes=-500": gli ultimi 500 byte
            length = int(last or 0)
            if length <= 0:
                return self._range_not_satisfiable(handle, size)
            start, end = max(0, size - length), size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1

        if start >= size or start > end:
            return self._range_not_satisfiable(handle, size)

        end = min(end, size - 1)
        handle.seek(start)
        self._range_length = end - start + 1

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(self._range_length))
        self.send_header("Last-Modified", self.date_time_string(os.fstat(handle.fileno()).st_mtime))
        self.end_headers()
        return handle

    def _range_not_satisfiable(self, handle, size):
        handle.close()
        self.send_response(416)
        self.send_header("Content-Range", "bytes */%d" % size)
        self.send_header("Content-Length", "0")
        self.end_headers()
        return None

    def copyfile(self, source, outputfile):
        if self._range_length is None:
            return super().copyfile(source, outputfile)
        remaining = self._range_length
        while remaining > 0:
            chunk = source.read(min(CHUNK, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    def end_headers(self):
        # Senza questo ricaricando la pagina vedresti ancora il CSS vecchio.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        if self._range_length is None:
            self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def log_message(self, fmt, *args):
        status = str(args[1]) if len(args) > 1 else ""
        # Rumore minimo: in console finiscono solo gli errori.
        if status.startswith(("4", "5")):
            sys.stderr.write("  %s %s\n" % (status, args[0]))


def main():
    parser = argparse.ArgumentParser(description="Anteprima locale del sito Blackjack.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    handler = partial(PreviewHandler, directory=ROOT)

    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        sys.exit(
            "Impossibile aprire la porta %d (%s).\n"
            "Probabilmente l'anteprima e gia in esecuzione in un altro terminale."
            % (args.port, error)
        )

    url = "http://127.0.0.1:%d/" % args.port
    print("Anteprima Blackjack")
    print("  cartella: %s" % ROOT)
    print("  indirizzo: %s" % url)
    if args.port != DEFAULT_PORT:
        print("  ATTENZIONE: fuori dalla porta %d i worker bloccano le chiamate (CORS)." % DEFAULT_PORT)
    print("  Ctrl+C per fermare.\n")

    if not args.no_browser:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAnteprima fermata.")
        server.server_close()


if __name__ == "__main__":
    main()
