import { useMemo } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { removeNodeFromSlice, removeOriginNode } from "store";
import { getLabel } from "utils";
import "./OriginsSidebar.css";

/**
 * Slide-in panel listing the current live origins. Removing an origin
 * recomposes the graph (removeOriginNode) and keeps the staging cart coherent.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 */
const OriginsSidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { originNodeIds, nodes } = useSelector(
    (state) => ({
      originNodeIds: state.graph.present.originNodeIds,
      nodes: state.graph.present.graphData?.nodes,
    }),
    shallowEqual,
  );

  // Map each origin id to a display label from the live graph, falling back to
  // the id when the node document is not present.
  const labelById = useMemo(() => {
    const map = new Map();
    for (const node of nodes || []) {
      map.set(node._id ?? node.id, getLabel(node));
    }
    return map;
  }, [nodes]);

  if (!isOpen) return null;

  const handleRemove = (nodeId) => {
    dispatch(removeOriginNode(nodeId));
    dispatch(removeNodeFromSlice(nodeId));
  };

  return (
    <aside className="origins-sidebar" aria-label="Current origins">
      <div className="origins-sidebar-header">
        <h3 className="origins-sidebar-title">Origins</h3>
        <button
          type="button"
          className="origins-sidebar-close"
          onClick={onClose}
          aria-label="Close origins panel"
        >
          ×
        </button>
      </div>
      {originNodeIds.length === 0 ? (
        <p className="origins-sidebar-empty">No origins yet.</p>
      ) : (
        <ul className="origins-sidebar-list">
          {originNodeIds.map((nodeId) => {
            const label = labelById.get(nodeId) ?? nodeId;
            return (
              <li key={nodeId} className="origins-sidebar-item">
                <span className="origins-sidebar-label">{label}</span>
                <button
                  type="button"
                  className="origins-sidebar-remove"
                  onClick={() => handleRemove(nodeId)}
                  aria-label={`Remove ${label} as origin`}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

export default OriginsSidebar;
