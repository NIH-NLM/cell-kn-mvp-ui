/**
 * SkeletonWrapper — accessible loading region.
 * Wraps skeleton placeholders with role="status" + aria-live="polite"
 * so screen readers announce the loading state. The visible children
 * are purely decorative (aria-hidden) while the visually-hidden span
 * provides the spoken announcement.
 */
export function SkeletonWrapper({ children, label = "Loading..." }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <output> cannot contain block-level children like <table>
    <div role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}

/**
 * SkeletonTable — animated placeholder for a search results table.
 *
 * Props:
 *   rows    — number of placeholder rows to render, default 5
 *   columns — number of placeholder columns per row, default 3
 */
export function SkeletonTable({ rows = 5, columns = 3 }) {
  return (
    <table className="skeleton-table" aria-hidden="true">
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, colIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder, no stable key available
            <th key={colIndex}>
              <div className="skeleton skeleton-table-header" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder, no stable key available
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder, no stable key available
              <td key={colIndex}>
                <div className="skeleton skeleton-table-cell" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
