import { GraphContext } from "contexts";
import { useContext, useEffect, useState } from "react";
import { fetchCollectionCount } from "services";

// The counts shown on the search landing, in display order.
const STATS = [
  { key: "CS", label: "Cell sets" },
  { key: "CL", label: "Cell types" },
  { key: "GS", label: "Genes" },
  { key: "PUB", label: "Publications" },
  { key: "CSD", label: "Cell set datasets" },
];

const numberFormat = new Intl.NumberFormat("en-US");

// Loading state: every stat back to null (renders as a dash) until it resolves.
const loadingCounts = () => Object.fromEntries(STATS.map((s) => [s.key, null]));

/**
 * "Network at a glance": live per-collection counts fetched in parallel on mount.
 * Each stat is independent — a failed fetch shows a dash and never blocks the rest.
 */
const NetworkStats = () => {
  const { graphType } = useContext(GraphContext);
  // null = still loading; a number = resolved; "—" written on failure.
  const [counts, setCounts] = useState(loadingCounts);

  useEffect(() => {
    let cancelled = false;
    // Reset to loading when the graph changes so counts from the previous graph
    // aren't shown under the new selection while the new fetches are in flight.
    setCounts(loadingCounts());
    for (const { key } of STATS) {
      fetchCollectionCount(key, graphType)
        .then((count) => {
          if (!cancelled) setCounts((prev) => ({ ...prev, [key]: count }));
        })
        .catch(() => {
          if (!cancelled) setCounts((prev) => ({ ...prev, [key]: "—" }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [graphType]);

  return (
    <dl className="network-stats">
      {STATS.map(({ key, label }) => {
        const value = counts[key];
        const display =
          value === null ? "—" : typeof value === "number" ? numberFormat.format(value) : value;
        return (
          <div key={key} className="network-stat">
            <dd className="network-stat-value">{display}</dd>
            <dt className="network-stat-label">{label}</dt>
          </div>
        );
      })}
    </dl>
  );
};

export default NetworkStats;
