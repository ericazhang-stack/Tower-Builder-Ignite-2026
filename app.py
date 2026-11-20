from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import math
import sqlite3
import uuid
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "demo.sqlite3"
HEIGHT = (6.0, 7.0)
PACE = (3.0, 4.0)
GOAL = 12
CONFIG = {"height": HEIGHT, "pace": PACE, "goal": GOAL}


def score(rep):
    height = rep["height"]
    pace = rep["pace"]
    return {**rep, "speed": round(height / pace, 2),
            "onTarget": HEIGHT[0] <= height <= HEIGHT[1] and PACE[0] <= pace <= PACE[1]}


def initialize():
    with sqlite3.connect(DATABASE) as db:
        db.execute("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, recorded TEXT, pain INTEGER, reps TEXT)")
        for week in range(5):
            for visit in range(2):
                recorded = datetime.now(timezone.utc) - timedelta(days=31 - week * 7 - visit * 2)
                reps = [score({"height": round(5.65 + week * .19 + visit * .1 + math.sin(i * 2) * .55, 2),
                               "pace": round(2.65 + week * .19 + math.cos(i * 3) * .47, 2)})
                        for i in range(9 + min(week, 3))]
                db.execute("INSERT OR IGNORE INTO sessions VALUES (?, ?, ?, ?)",
                           (f"sample-{week}-{visit}", recorded.isoformat(), max(1, 5 - week), json.dumps(reps)))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "static"), **kwargs)

    def send_json(self, payload, status=200):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/sessions":
            with sqlite3.connect(DATABASE) as db:
                rows = db.execute("SELECT * FROM sessions ORDER BY recorded DESC").fetchall()
            self.send_json([{"id": key, "recorded": recorded, "pain": pain, "reps": json.loads(reps)}
                            for key, recorded, pain, reps in rows])
        elif path == "/api/config":
            self.send_json(CONFIG)
        elif path == "/physician":
            self.path = "/physician.html"
            super().do_GET()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != "/api/sessions":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", 0))
            if not 0 < size <= 32768:
                raise ValueError
            data = json.loads(self.rfile.read(size))
            key = str(uuid.UUID(data["id"]))
            pain = data["pain"]
            if pain is not None and (type(pain) is not int or not 0 <= pain <= 10):
                raise ValueError
            reps = data["reps"]
            if not isinstance(reps, list) or not 1 <= len(reps) <= GOAL:
                raise ValueError
            scored = []
            for rep in reps:
                height, pace = rep["height"], rep["pace"]
                if (type(height) not in (int, float) or type(pace) not in (int, float)
                        or not 0.01 <= height <= 9 or not .01 <= pace <= 120):
                    raise ValueError
                scored.append(score({"height": height, "pace": pace}))
        except (ValueError, TypeError, KeyError, UnicodeError):
            self.send_json({"error": "Invalid demo session."}, 400)
            return

        with sqlite3.connect(DATABASE) as db:
            db.execute("INSERT OR IGNORE INTO sessions VALUES (?, ?, ?, ?)",
                       (key, datetime.now(timezone.utc).isoformat(), pain, json.dumps(scored)))
        self.send_json({"id": key}, 201)


if __name__ == "__main__":
    initialize()
    with ThreadingHTTPServer(("127.0.0.1", 8000), Handler) as server:
        print("Tower Builder  http://127.0.0.1:8000", flush=True)
        server.serve_forever()
