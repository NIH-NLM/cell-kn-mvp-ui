import { useDispatch, useSelector } from "react-redux";
import { deleteHistoryEntry, restoreHistoryEntry, selectOriginHistory } from "store";

/**
 * Bottom filmstrip of auto-captured origin snapshots. Click a card to restore
 * it in place (positions preserved); use the delete control to remove it.
 */
const SavedGraphShelf = () => {
  const dispatch = useDispatch();
  const originHistory = useSelector(selectOriginHistory);
  const activeHistoryId = useSelector((s) => s.savedGraphs.activeHistoryId);

  // selectOriginHistory normalizes a stale/undefined array to [], so the shelf
  // never crashes the surrounding workspace.
  if (!originHistory.length) {
    return (
      <div className="saved-graph-shelf saved-graph-shelf--empty">
        Your graph history will appear here
      </div>
    );
  }

  return (
    <div className="saved-graph-shelf">
      {originHistory.map((entry) => {
        const restore = () => dispatch(restoreHistoryEntry(entry.id));
        // Repeated captures of one origin share a label, so surface the capture
        // time to tell them apart. It goes into the restore button's accessible
        // name — a title on the non-interactive card is not keyboard-reachable
        // and is announced inconsistently — with the title kept alongside it as
        // a hover affordance for sighted users.
        const parsedTimestamp = entry.timestamp == null ? undefined : new Date(entry.timestamp);
        const capturedAt =
          parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime())
            ? parsedTimestamp.toLocaleString()
            : undefined;
        const restoreLabel = capturedAt
          ? `Restore ${entry.label}, captured ${capturedAt}`
          : `Restore ${entry.label}`;
        return (
          <div
            key={entry.id}
            title={capturedAt}
            className={`saved-graph-card ${entry.id === activeHistoryId ? "saved-graph-card--active" : ""}`}
          >
            <button
              type="button"
              className="saved-graph-card-thumb"
              aria-label={restoreLabel}
              onClick={restore}
            >
              {entry.thumbnail ? (
                <img src={entry.thumbnail} alt={entry.label} />
              ) : (
                <span className="thumb-placeholder" />
              )}
            </button>
            <button
              type="button"
              className="saved-graph-card-title"
              aria-label={restoreLabel}
              onClick={restore}
            >
              {entry.label}
            </button>
            <button
              type="button"
              className="saved-graph-card-delete"
              aria-label={`Delete ${entry.label}`}
              onClick={() => dispatch(deleteHistoryEntry(entry.id))}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SavedGraphShelf;
