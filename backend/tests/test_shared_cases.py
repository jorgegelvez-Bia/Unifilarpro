"""Reglas Python contra los casos compartidos de shared/test-cases/."""

import copy
import json
from pathlib import Path

import pytest

from app.rules import checks, fill_defaults, fuse_for, meter_type, summary

CASES_DIR = Path(__file__).resolve().parents[2] / "shared" / "test-cases"
CASES = sorted(CASES_DIR.glob("*.json"))


def load(path: Path) -> tuple[dict, dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return fill_defaults(copy.deepcopy(data["diagram"])), data["expect"]


def test_hay_casos():
    assert len(CASES) >= 10


@pytest.mark.parametrize("path", CASES, ids=lambda p: p.stem)
def test_meter_type(path):
    d, exp = load(path)
    assert meter_type(d) == exp["meterType"]


@pytest.mark.parametrize("path", CASES, ids=lambda p: p.stem)
def test_fuse(path):
    d, exp = load(path)
    got = fuse_for(d)
    if exp["fuse"] is None:
        assert got is None
        return
    assert got is not None
    for k, v in exp["fuse"].items():
        if k == "In":
            assert got[k] == pytest.approx(v, abs=1e-3)
        else:
            assert got[k] == v, k


@pytest.mark.parametrize("path", CASES, ids=lambda p: p.stem)
def test_checks(path):
    d, exp = load(path)
    assert checks(d) == exp["checks"]


@pytest.mark.parametrize("path", CASES, ids=lambda p: p.stem)
def test_summaries(path):
    d, exp = load(path)
    by_id = {e["id"]: e for e in d["els"]}
    for id, text in exp.get("summaries", {}).items():
        assert summary(by_id[id], d) == text, id
