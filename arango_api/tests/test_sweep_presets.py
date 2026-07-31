"""
Tests for the sweep_presets management command.

The preset execution itself needs a loaded dataset, so these stub it out and
cover the surrounding behaviour: what gets written to the baseline, and when
the command refuses to write at all.
"""

import json
import tempfile
from pathlib import Path
from unittest import TestCase, mock

from django.core.management import call_command
from django.core.management.base import CommandError

MODULE = "arango_api.management.commands.sweep_presets"


def _outcome(count, errors=None, nodes=None):
    """Shape a fake execute_preset() return with a single phase."""
    phase_nodes = (
        nodes if nodes is not None else [{"_id": f"CL/{i}"} for i in range(count)]
    )
    return {
        "phases": {"phase-1": {"nodes": phase_nodes, "links": []}},
        "errors": errors or {},
    }


class SweepPresetsBaselineTests(TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.baseline_path = Path(self._tmp.name) / "preset_baselines.json"
        patcher = mock.patch(f"{MODULE}.BASELINE_PATH", self.baseline_path)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self._tmp.cleanup)

    def _run(self, presets, outcomes, **kwargs):
        preset_defs = [{"id": pid, "phases": []} for pid in presets]
        with (
            mock.patch(f"{MODULE}.WORKFLOW_PRESETS", preset_defs),
            mock.patch(f"{MODULE}.workflow_service") as service,
        ):
            service.execute_preset.side_effect = lambda pid: outcomes[pid]
            call_command("sweep_presets", **kwargs)

    def test_targeted_update_preserves_other_baselines(self):
        """--preset with --update-baseline must not drop the other entries.

        Writing only the swept preset would silently discard every other
        baseline, disabling the regression check it exists to provide.
        """
        self.baseline_path.write_text(json.dumps({"alpha": 100, "beta": 200}))

        self._run(
            ["alpha", "beta"],
            {"alpha": _outcome(90), "beta": _outcome(200)},
            preset="alpha",
            update_baseline=True,
        )

        recorded = json.loads(self.baseline_path.read_text())
        self.assertEqual(recorded, {"alpha": 90, "beta": 200})

    def test_update_refuses_when_a_preset_is_empty(self):
        """An empty result must not become the new baseline."""
        self.baseline_path.write_text(json.dumps({"alpha": 100}))

        with self.assertRaises(CommandError):
            self._run(
                ["alpha"],
                {"alpha": _outcome(0)},
                update_baseline=True,
            )

        self.assertEqual(json.loads(self.baseline_path.read_text()), {"alpha": 100})

    def test_update_refuses_when_a_preset_errors(self):
        self.baseline_path.write_text(json.dumps({"alpha": 100}))

        with self.assertRaises(CommandError):
            self._run(
                ["alpha"],
                {"alpha": _outcome(5, errors={"phase-1": "boom"})},
                update_baseline=True,
            )

        self.assertEqual(json.loads(self.baseline_path.read_text()), {"alpha": 100})

    def test_null_nodes_are_reported_as_a_failure(self):
        """A null node means an origin no longer resolves."""
        with self.assertRaises(SystemExit):
            self._run(
                ["alpha"],
                {"alpha": _outcome(0, nodes=[None, {"_id": "CL/1"}])},
            )

    def test_drop_below_tolerance_fails(self):
        self.baseline_path.write_text(json.dumps({"alpha": 100}))

        with self.assertRaises(SystemExit):
            self._run(["alpha"], {"alpha": _outcome(50)})

    def test_small_drop_within_tolerance_passes(self):
        self.baseline_path.write_text(json.dumps({"alpha": 100}))

        self._run(["alpha"], {"alpha": _outcome(90)})


class SweepPresetsArgumentTests(TestCase):
    def test_unknown_preset_id_fails(self):
        """A typo'd id must not exit successfully having swept nothing."""
        with mock.patch(f"{MODULE}.WORKFLOW_PRESETS", [{"id": "alpha", "phases": []}]):
            with self.assertRaises(CommandError):
                call_command("sweep_presets", preset="nope")

    def test_tolerance_outside_range_is_rejected(self):
        for bad in (-0.1, 1.0, 1.5):
            with self.subTest(tolerance=bad):
                with self.assertRaises(CommandError):
                    call_command("sweep_presets", tolerance=bad)
