"""Reglas eléctricas (fuente oficial). El frontend tiene una copia en TypeScript
en frontend/src/checks/ que se compara con los casos de shared/test-cases/."""

from app.rules.checks import checks
from app.rules.common import fill_defaults
from app.rules.fuse import apply_auto_fuse, fuse_for
from app.rules.meter_type import meter_type
from app.rules.summary import summary

__all__ = ["apply_auto_fuse", "checks", "fill_defaults", "fuse_for", "meter_type", "summary"]
