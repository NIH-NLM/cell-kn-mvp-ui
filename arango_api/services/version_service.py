"""Version metadata read from the loaded dataset.

The ETL version is stamped into the ``ckn_meta`` collection by whichever script
restored the data (``scripts/app/deploy-dataset.sh`` for deployed environments,
``scripts/dev/load-dump-local.sh`` locally). Reading it here means the reported
version describes the data actually loaded, rather than the ``ETL_VERSION`` pin,
which only records which dataset the checkout intends to run.
"""

import logging
import time

from arango_api.db import db_ontologies

logger = logging.getLogger(__name__)

META_COLLECTION = "ckn_meta"
META_KEY = "dataset"
UNKNOWN = "unknown"
CACHE_TTL_SECONDS = 60

# The footer requests this on every page load, but the value changes at most
# once per dataset restore. Expiry-only; there is nothing to invalidate.
_cache = {"value": None, "expires_at": 0.0}


def get_loaded_etl_version():
    """Return the ETL version stamped into the loaded dataset, or "unknown".

    Never raises. The version endpoint must answer even when ArangoDB is
    unreachable, so every failure mode — collection absent, document absent,
    connection error, open circuit breaker — collapses to "unknown". Saying
    "unknown" is the point: it is honest about not knowing, where the old
    behaviour asserted the pinned version with unearned confidence.
    """
    now = time.monotonic()
    if _cache["value"] is not None and now < _cache["expires_at"]:
        return _cache["value"]

    try:
        document = db_ontologies.collection(META_COLLECTION).get(META_KEY)
        version = (document or {}).get("etl_version") or UNKNOWN
    except Exception:
        logger.warning(
            "Could not read %s/%s; reporting %s",
            META_COLLECTION,
            META_KEY,
            UNKNOWN,
            exc_info=True,
        )
        version = UNKNOWN

    _cache["value"] = version
    _cache["expires_at"] = now + CACHE_TTL_SECONDS
    return version


def reset_cache():
    """Clear the cached version. Intended for tests."""
    _cache["value"] = None
    _cache["expires_at"] = 0.0
