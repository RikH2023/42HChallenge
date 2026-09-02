"""Flat-file JSON storage for reports and admin messages.

Fine for a prototype. Two safeguards that cost almost nothing:

  * a lock per file, so two simultaneous POSTs cannot interleave a
    read-modify-write and lose a record
  * atomic writes (temp file, then os.replace), so a crash mid-write cannot
    leave you with a truncated, unparseable JSON file

If this ever needs to handle real concurrent traffic, swap this module for
SQLite. Nothing outside it would have to change.
"""

import json
import os
import tempfile
import threading
from pathlib import Path

from models import Message, StoredReport

_DIR = Path(__file__).parent
REPORTS_FILE = _DIR / "reports.json"
MESSAGES_FILE = _DIR / "messages.json"

_locks: dict[Path, threading.Lock] = {}
_locks_guard = threading.Lock()


def _lock_for(path: Path) -> threading.Lock:
    with _locks_guard:
        return _locks.setdefault(path, threading.Lock())


def _read_raw(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError:
        # Corrupt file: fail loudly rather than silently wiping it.
        raise RuntimeError(f"{path} is not valid JSON")
    if not isinstance(data, list):
        raise RuntimeError(f"{path} should contain a list")
    return data


def _write_raw(path: Path, records: list[dict]) -> None:
    """Write atomically: temp file in the same directory, then replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(records, handle, indent=2, ensure_ascii=False)
        os.replace(temp_path, path)
    except BaseException:
        Path(temp_path).unlink(missing_ok=True)
        raise


def _append(path: Path, record: dict) -> None:
    with _lock_for(path):
        records = _read_raw(path)
        records.append(record)
        _write_raw(path, records)


# --------------------------------------------------------------------------
# Reports
# --------------------------------------------------------------------------


def add_report(report: StoredReport) -> None:
    _append(REPORTS_FILE, report.model_dump())


def list_reports() -> list[StoredReport]:
    with _lock_for(REPORTS_FILE):
        return [StoredReport(**record) for record in _read_raw(REPORTS_FILE)]


# --------------------------------------------------------------------------
# Admin messages
# --------------------------------------------------------------------------


def add_message(message: Message) -> None:
    _append(MESSAGES_FILE, message.model_dump())


def list_messages() -> list[Message]:
    with _lock_for(MESSAGES_FILE):
        return [Message(**record) for record in _read_raw(MESSAGES_FILE)]


def delete_message(message_id: str) -> bool:
    """Remove one message. Returns False if the id was not found."""
    with _lock_for(MESSAGES_FILE):
        records = _read_raw(MESSAGES_FILE)
        remaining = [r for r in records if r.get("id") != message_id]
        if len(remaining) == len(records):
            return False
        _write_raw(MESSAGES_FILE, remaining)
        return True