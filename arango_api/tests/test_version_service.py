"""Tests for the dataset version marker read.

The service must never raise: the version endpoint answers even when ArangoDB
is down, so every failure mode collapses to "unknown".
"""

from unittest import mock

from django.test import SimpleTestCase

from arango_api.services import version_service


class GetLoadedEtlVersionTestCase(SimpleTestCase):
    def setUp(self):
        version_service.reset_cache()

    def _patch_db(self, **kwargs):
        """Patch the module's db handle. kwargs go to the mock collection.get."""
        fake_db = mock.MagicMock()
        fake_db.collection.return_value.get = mock.Mock(**kwargs)
        return mock.patch.object(version_service, "db_ontologies", fake_db)

    def test_returns_stamped_version(self):
        with self._patch_db(return_value={"_key": "dataset", "etl_version": "v1.5.0-rc.1"}):
            self.assertEqual(version_service.get_loaded_etl_version(), "v1.5.0-rc.1")

    def test_missing_document_returns_unknown(self):
        with self._patch_db(return_value=None):
            self.assertEqual(version_service.get_loaded_etl_version(), "unknown")

    def test_document_without_version_field_returns_unknown(self):
        with self._patch_db(return_value={"_key": "dataset"}):
            self.assertEqual(version_service.get_loaded_etl_version(), "unknown")

    def test_database_error_returns_unknown(self):
        with self._patch_db(side_effect=RuntimeError("collection not found")):
            self.assertEqual(version_service.get_loaded_etl_version(), "unknown")

    def test_result_is_cached_within_ttl(self):
        # patch.object with an explicit `new` yields that object, not a patcher.
        with self._patch_db(return_value={"etl_version": "v1.5.0-rc.1"}) as fake_db:
            version_service.get_loaded_etl_version()
            version_service.get_loaded_etl_version()
            self.assertEqual(fake_db.collection.return_value.get.call_count, 1)

    def test_cache_expires_after_ttl(self):
        with self._patch_db(return_value={"etl_version": "v1.5.0-rc.1"}) as fake_db:
            with mock.patch.object(version_service.time, "monotonic", return_value=0.0):
                version_service.get_loaded_etl_version()
            later = version_service.CACHE_TTL_SECONDS + 1
            with mock.patch.object(version_service.time, "monotonic", return_value=later):
                version_service.get_loaded_etl_version()
            self.assertEqual(fake_db.collection.return_value.get.call_count, 2)
