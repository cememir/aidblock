"""
Sentinel Community API — reference implementation.

Kullanıcıların sağ tıkla engellediği reklam kuralları (yalnızca hostname +
CSS seçici) burada toplanır ve oylanır. Net puanı +3'e ulaşan kurallar tüm
kullanıcılarda otomatik uygulanır; altındakiler istemcide evet/hayır sorusu
olarak gösterilir.

Çalıştırma:
    pip install fastapi uvicorn pydantic
    uvicorn main:app --host 0.0.0.0 --port 8080

Ardından eklenti ayarlarındaki "Topluluk API adresi" alanına sunucu adresini
girin (örn. https://sentinel-api.example.com).

Not: Bu, SQLite kullanan tek dosyalık bir referanstır. Üretimde PostgreSQL,
rate limiting ve kalıcı IP karması ile genişletilmesi önerilir.
"""

import re
import sqlite3
import time
from collections import defaultdict
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

DB_PATH = "sentinel.db"
HOST_RE = re.compile(r"^[a-z0-9.-]{3,255}$")
MAX_SELECTOR_LEN = 300
RATE_LIMIT_MAX = 60          # IP başına dakikada istek
RATE_PERIOD = 60.0

app = FastAPI(title="Sentinel Community API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # istekler chrome-extension:// kökeninden gelir
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_hits: dict[str, list[float]] = defaultdict(list)


def _rate_limit(request: Request) -> None:
    """Basit bellek-içi sliding window rate limit (IP başına)."""
    ip = request.client.host if request.client else "?"
    now = time.monotonic()
    window = [t for t in _hits[ip] if now - t < RATE_PERIOD]
    if len(window) >= RATE_LIMIT_MAX:
        raise HTTPException(429, "Too many requests")
    window.append(now)
    _hits[ip] = window


@contextmanager
def db():
    """SQLite bağlantısını context manager ile açar/kapatır."""
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def init_db() -> None:
    """Kural tablosunu oluşturur (host+selector tekildir)."""
    with db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS rules (
                   host     TEXT NOT NULL,
                   selector TEXT NOT NULL,
                   score    INTEGER NOT NULL DEFAULT 1,
                   created  INTEGER NOT NULL,
                   PRIMARY KEY (host, selector)
               )"""
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rules_host ON rules(host)")


class Report(BaseModel):
    host: str
    selector: str

    @field_validator("host")
    @classmethod
    def check_host(cls, v: str) -> str:
        v = v.lower().strip()
        if not HOST_RE.match(v):
            raise ValueError("invalid host")
        return v

    @field_validator("selector")
    @classmethod
    def check_selector(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > MAX_SELECTOR_LEN:
            raise ValueError("invalid selector")
        return v


class Vote(Report):
    vote: int

    @field_validator("vote")
    @classmethod
    def check_vote(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("vote must be +1 or -1")
        return v


@app.get("/rules/{host}")
def get_rules(host: str, request: Request):
    """Bir sitenin topluluk kurallarını puanlarıyla döndürür (en fazla 50)."""
    _rate_limit(request)
    host = host.lower().strip()
    if not HOST_RE.match(host):
        raise HTTPException(400, "invalid host")
    with db() as conn:
        rows = conn.execute(
            "SELECT selector, score FROM rules WHERE host = ? AND score > -3 "
            "ORDER BY score DESC LIMIT 50",
            (host,),
        ).fetchall()
    return [{"selector": s, "score": sc} for s, sc in rows]


@app.post("/report")
def report(body: Report, request: Request):
    """Yeni kural raporu: yoksa +1 puanla oluşturur, varsa puanını +1 artırır."""
    _rate_limit(request)
    with db() as conn:
        conn.execute(
            """INSERT INTO rules (host, selector, score, created)
               VALUES (?, ?, 1, ?)
               ON CONFLICT(host, selector) DO UPDATE SET score = score + 1""",
            (body.host, body.selector, int(time.time())),
        )
    return {"ok": True}


@app.post("/vote")
def vote(body: Vote, request: Request):
    """Beklemedeki kurala kullanıcı oyu uygular (+1 reklam / -1 değil)."""
    _rate_limit(request)
    with db() as conn:
        cur = conn.execute(
            "UPDATE rules SET score = score + ? WHERE host = ? AND selector = ?",
            (body.vote, body.host, body.selector),
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "rule not found")
    return {"ok": True}
