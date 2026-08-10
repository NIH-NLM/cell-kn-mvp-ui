"""
Unit tests for the shared AQL identifier guard (no database required).

The serializer and service layers each have their own tests covering how they
use this guard. These cover the guard's own contract, which both layers and any
future caller depend on.
"""

from django.test import SimpleTestCase

from arango_api.aql_safety import is_safe_aql_identifier


class IsSafeAqlIdentifierTestCase(SimpleTestCase):
    """Tests for is_safe_aql_identifier."""

    def test_accepts_plain_identifiers(self):
        for name in ("Label", "label", "gene_symbol", "F1", "_key", "_from"):
            self.assertTrue(is_safe_aql_identifier(name), name)

    def test_rejects_injection_characters(self):
        # These reach AQL as doc.`<field>`, so a backtick would close the
        # accessor and let the rest of the value be parsed as query text.
        for name in ("Label`", "`Label`", "a.b", "a b", "a-b", "a;b", "a`,doc.x"):
            self.assertFalse(is_safe_aql_identifier(name), name)

    def test_rejects_trailing_newline(self):
        # `$` matches before a trailing newline, so the pattern uses \Z.
        self.assertFalse(is_safe_aql_identifier("Label\n"))

    def test_rejects_leading_digit_and_empty(self):
        self.assertFalse(is_safe_aql_identifier("1Label"))
        self.assertFalse(is_safe_aql_identifier(""))

    def test_rejects_non_strings_without_raising(self):
        # A guard that raises where a caller expects a predicate invites the
        # failure it exists to prevent.
        for value in (None, 123, 1.5, True, ["Label"], {"Label": 1}, object()):
            self.assertFalse(is_safe_aql_identifier(value), repr(value))
