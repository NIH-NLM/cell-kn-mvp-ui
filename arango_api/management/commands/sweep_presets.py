"""
Execute every workflow preset against the loaded dataset and report on it.

The DB-free guards in `arango_api/tests/test_workflow_presets.py` catch pinned
identifiers that the ETL has renamed, but they cannot tell whether a preset
still returns anything. Only running the presets against a real dump can, and
CI has no real dump — so this is a command you run after loading one.

    ./venv/bin/python manage.py sweep_presets
    ./venv/bin/python manage.py sweep_presets --update-baseline

Exits non-zero when a preset errors, returns nothing, or falls materially below
its recorded baseline. That last case is the one worth having: an ETL predicate
rename dropped one preset from 104 nodes to 9 while still "passing".
"""

import json
import os
import tempfile
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from arango_api.services import workflow_service
from arango_api.workflow_presets import WORKFLOW_PRESETS

BASELINE_PATH = Path(__file__).resolve().parents[2] / "preset_baselines.json"

# Fraction a preset's terminal node count may fall below baseline before it is
# reported. Node counts move a little between dataset releases; a quarter of the
# result set disappearing is not drift, it is a break.
DEFAULT_TOLERANCE = 0.25


def _write_baseline(counts, path=None):
    """Write the baseline atomically so an interrupted run cannot truncate it.

    The destination is resolved at call time rather than bound as a default, so
    that it honours the module attribute.
    """
    path = Path(path) if path is not None else BASELINE_PATH
    payload = json.dumps(counts, indent=2, sort_keys=True) + "\n"
    handle, tmp_name = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(handle, "w") as tmp:
            tmp.write(payload)
        os.replace(tmp_name, path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise


class Command(BaseCommand):
    help = "Run every workflow preset against the loaded dataset and check for regressions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--update-baseline",
            action="store_true",
            help="Record the current counts as the baseline instead of checking against it.",
        )
        parser.add_argument(
            "--tolerance",
            type=float,
            default=DEFAULT_TOLERANCE,
            help=f"Allowed fractional drop below baseline (default {DEFAULT_TOLERANCE}).",
        )
        parser.add_argument(
            "--preset",
            help="Sweep only this preset id.",
        )

    def handle(self, *args, **options):
        tolerance = options["tolerance"]
        if not 0 <= tolerance < 1:
            raise CommandError(
                f"--tolerance must be at least 0 and below 1, got {tolerance}"
            )

        presets = WORKFLOW_PRESETS
        if options["preset"]:
            presets = [p for p in presets if p["id"] == options["preset"]]
            if not presets:
                raise CommandError(f"No preset with id {options['preset']!r}")

        baseline = {}
        if BASELINE_PATH.exists():
            baseline = json.loads(BASELINE_PATH.read_text())

        results = {}
        failures = []

        for preset in presets:
            preset_id = preset["id"]
            try:
                outcome = workflow_service.execute_preset(preset_id)
            except Exception as exc:  # noqa: BLE001 - report, do not abort the sweep
                failures.append(f"{preset_id}: raised {type(exc).__name__}: {exc}")
                self.stdout.write(f"EXC   {preset_id}")
                continue

            errors = outcome.get("errors") or {}
            phases = outcome.get("phases") or {}
            counts = [
                (pid, len(data.get("nodes") or [])) for pid, data in phases.items()
            ]
            terminal = counts[-1][1] if counts else 0
            results[preset_id] = terminal

            # A null node means an origin no longer resolves; it used to reach the
            # client and break rendering outright.
            nulls = sum(
                1
                for data in phases.values()
                for node in (data.get("nodes") or [])
                if node is None
            )

            trail = " -> ".join(str(n) for _, n in counts)
            if errors:
                failures.append(f"{preset_id}: {errors}")
                self.stdout.write(f"ERR   {preset_id}  [{trail}]")
            elif nulls:
                failures.append(f"{preset_id}: {nulls} null node(s) in results")
                self.stdout.write(f"NULL  {preset_id}  [{trail}]")
            elif terminal == 0:
                failures.append(f"{preset_id}: returned no nodes")
                self.stdout.write(f"EMPTY {preset_id}  [{trail}]")
            else:
                expected = baseline.get(preset_id)
                floor = expected * (1 - tolerance) if expected else None
                if floor is not None and terminal < floor:
                    failures.append(
                        f"{preset_id}: {terminal} nodes, baseline {expected} "
                        f"(below the {tolerance:.0%} tolerance)"
                    )
                    self.stdout.write(
                        f"DROP  {preset_id}  [{trail}]  baseline {expected}"
                    )
                else:
                    self.stdout.write(f"ok    {preset_id}  [{trail}]")

        if options["update_baseline"]:
            # Recording a broken sweep would bake the breakage in as the number
            # to beat, so the next run would report success.
            if failures:
                for failure in failures:
                    self.stderr.write(f"  {failure}")
                raise CommandError(
                    "Refusing to update the baseline while "
                    f"{len(failures)} preset(s) need attention"
                )
            # Merge rather than replace: --preset sweeps one id, and writing
            # only that entry would drop every other preset's baseline.
            merged = {**baseline, **results}
            _write_baseline(merged)
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nRecorded {len(results)} preset(s) in {BASELINE_PATH.name} "
                    f"({len(merged)} total)"
                )
            )
            return

        self.stdout.write("")
        if failures:
            for failure in failures:
                self.stderr.write(f"  {failure}")
            raise SystemExit(
                f"{len(failures)} of {len(presets)} presets need attention"
            )
        self.stdout.write(
            self.style.SUCCESS(f"All {len(presets)} presets returned data")
        )
