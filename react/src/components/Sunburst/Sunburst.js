import React, { useEffect, useRef, useState, useCallback } from "react";
import SunburstConstructor from "../SunburstConstructor/SunburstConstructor"; // Adjust path
import { mergeChildren } from "../Utils/Utils"; // Adjust path if needed

/**
 * React component for lazy-loading Sunburst, managing zoom state in React.
 */
const Sunburst = ({ addSelectedItem }) => {
  // --- State ---
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clickedItem, setClickedItem] = useState(null); // For popup
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [zoomedNodeId, setZoomedNodeId] = useState(null); // null = top root

  // --- Refs ---
  const svgContainerRef = useRef(null);
  const svgNodeRef = useRef(null);
  const popupRef = useRef(null);
  const currentHierarchyRootRef = useRef(null);

  // --- Data Fetching Logic ---
  const fetchSunburstData = useCallback(
    async (parentId = null, isInitialLoad = false) => {
      if (!isInitialLoad) setIsLoading(true);
      else setIsLoading(false);
      // CORRECTED URL based on your note
      const fetchUrl = "/arango_api/sunburst/";
      console.log(
        `Fetching data from ${fetchUrl}. Parent ID: ${parentId}, Initial: ${isInitialLoad}`,
      );
      try {
        const response = await fetch(fetchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parentId ? { parent_id: parentId } : {}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Network response error: ${response.status} ${response.statusText}`,
            errorText,
          );
          throw new Error(`Fetch failed: ${response.status}`);
        }
        const data = await response.json();
        console.log(
          `Data received for Parent ID: ${parentId ? parentId : "Initial"}. Type: ${typeof data}, IsArray: ${Array.isArray(data)}`,
        );

        if (parentId) {
          // Merging children (expecting array C+G)
          if (!Array.isArray(data)) {
            console.error(
              `API error: Expected an array of children for parent ${parentId}, but got:`,
              typeof data,
            );
            throw new Error(
              `API returned incorrect data type for children of ${parentId}`,
            );
          }
          setGraphData((prevData) => {
            if (!prevData) {
              console.warn(
                "Cannot merge children, previous graphData is null.",
              );
              return null;
            }
            console.log(
              `Merging ${data.length} fetched children/grandchildren into parent ${parentId}`,
            );
            return mergeChildren(prevData, parentId, data); // mergeChildren expects 'data' to be the array of children
          });
        } else {
          // Initial load (expecting root object)
          if (
            typeof data !== "object" ||
            data === null ||
            Array.isArray(data)
          ) {
            console.error(
              "API error: Expected a root object for initial load, but got:",
              typeof data,
            );
            throw new Error(
              "API returned incorrect data type for initial load",
            );
          }
          console.log("Setting initial graph data (Root + L0 + L1)");
          setGraphData(data);
          // Reset zoom to top level when initial data is loaded/reloaded
          setZoomedNodeId(null);
          currentHierarchyRootRef.current = null; // Clear hierarchy ref as well
        }
      } catch (error) {
        console.error("Failed to fetch or process sunburst data:", error);
        setGraphData(null); // Clear graph on error
        setZoomedNodeId(null); // Reset zoom on error
        currentHierarchyRootRef.current = null;
      } finally {
        // Hide loading indicator only if it was started (background fetch)
        if (!isInitialLoad) {
          setIsLoading(false);
        }
      }
    },
    [],
  ); // End fetchSunburstData

  // --- Initial Data Load useEffect ---
  useEffect(() => {
    console.log("Sunburst Component Mounted - Triggering initial data fetch.");
    fetchSunburstData(null, true); // true = isInitialLoad
    return () => {
      console.log("Sunburst Component Unmounting.");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSunburstData]); // Runs once on mount

  // --- D3 Graph Rendering/Updating useEffect ---
  useEffect(() => {
    // Guard conditions: Need data and the container div ref
    if (graphData && svgContainerRef.current) {
      console.log(`--- D3 Render/Update Effect Triggered ---`);
      console.log(`Rendering with target center node ID: ${zoomedNodeId}`);

      // Call the D3 constructor function, passing necessary data and callbacks
      const sunburstInstance = SunburstConstructor(
        graphData, // The current hierarchical data
        928, // Chart size (diameter)
        handleSunburstClick, // Callback for right-clicks
        handleNodeClick, // Callback for left-clicks on arcs
        handleCenterClick, // <<< NEW: Callback for center clicks
        zoomedNodeId, // <<< ID of node to initially center on
        // No previous hierarchy passed for simplicity now
      );

      // *** Store the returned hierarchy object for zoom-out logic ***
      currentHierarchyRootRef.current = sunburstInstance.hierarchyRoot;

      // --- Manage the SVG DOM Node ---
      // Remove the previous SVG node if it exists
      if (svgNodeRef.current) {
        try {
          svgContainerRef.current.removeChild(svgNodeRef.current);
          console.log("Removed old SVG node.");
        } catch (e) {
          console.warn(
            "Attempted to remove SVG node that might already be gone:",
            e,
          );
        }
      }

      // Append the new SVG node returned by the constructor
      if (sunburstInstance.svgNode) {
        svgNodeRef.current = sunburstInstance.svgNode;
        svgContainerRef.current.appendChild(svgNodeRef.current);
        console.log("Appended new SVG node.");
      } else {
        console.error("SunburstConstructor did not return a valid svgNode!");
        svgNodeRef.current = null;
      }
    } else if (!graphData && svgNodeRef.current && svgContainerRef.current) {
      // If graphData becomes null (e.g., after an error), clean up the SVG
      console.log("Graph data is null/falsy. Cleaning up existing SVG.");
      try {
        svgContainerRef.current.removeChild(svgNodeRef.current);
      } catch (e) {
        /* ignore if already removed */
      }
      svgNodeRef.current = null;
      currentHierarchyRootRef.current = null; // Clear hierarchy ref
    } else {
      console.log(
        "Skipping D3 render: graphData is null or svgContainerRef not ready.",
      );
    }

    // --- Effect Cleanup ---
    // Runs BEFORE the effect runs again, or on unmount.
    return () => {
      console.log(
        "Running D3 cleanup function (before next render or unmount).",
      );
      // Clean up the SVG node created by *this* effect instance
      if (svgNodeRef.current && svgContainerRef.current) {
        try {
          svgContainerRef.current.removeChild(svgNodeRef.current);
          console.log("Cleaned up SVG node in effect return.");
        } catch (e) {
          console.warn(
            "Cleanup: Attempted to remove SVG node that might already be gone:",
            e,
          );
        }
      }
      // Reset the ref for the next run
      svgNodeRef.current = null;
    };
    // Dependencies: Re-run when data changes, handlers change (shouldn't), or zoom state changes.
  }, [graphData, zoomedNodeId]);

  // --- Event Handlers ---

  /**
   * Handles LEFT clicks on sunburst nodes (arcs).
   * Determines if data needs loading for the next level(s).
   * Sets the `zoomedNodeId` state (triggering re-render).
   * Returns true to signal SunburstConstructor to run its internal zoom animation (on the *old* SVG).
   */
  const handleNodeClick = useCallback(
    (event, d) => {
      // d = D3 hierarchy node
      console.log(`--- handleNodeClick (Arc) ---`);
      console.log(
        `Node Clicked: ID=${d.data._id}, Label=${d.data.label}, Depth=${d.depth}`,
      );
      console.log(
        `_hasChildren=${d.data._hasChildren}, d.children exists=${!!d.children}`,
      );

      if (!d.data._hasChildren) {
        console.log(
          ` ACTION: No Action (Leaf Node - _hasChildren is false) for ${d.data._id}`,
        );
        // Returning false prevents the internal D3 'clicked' animation function from running.
        return false;
      }

      // Determine if the *next* level needs loading.
      let needsLoad = false;
      if (d.data._hasChildren) {
        // Backend indicates children exist
        if (!d.children) {
          needsLoad = true;
          console.log(
            ` -> Needs Load: Yes (d.children missing despite _hasChildren=true)`,
          );
        } else {
          // Check if any child C needs its children G loaded.
          for (const child of d.children) {
            if (child.data._hasChildren && !child.children) {
              needsLoad = true;
              console.log(
                ` -> Needs Load: Yes (Child ${child.data._id} needs grandchildren loaded)`,
              );
              break;
            }
          }
          if (!needsLoad)
            console.log(
              ` -> Needs Load: No (All necessary grandchildren seem loaded)`,
            );
        }
      } else {
        console.log(` -> Needs Load: No (_hasChildren is false)`);
      }
      console.log(` isLoading state: ${isLoading}`);

      // --- Decision Logic ---
      if (needsLoad && !isLoading) {
        // Need to load data, not currently loading
        console.log(` ACTION: Load & Zoom IN to ${d.data._id}`);
        setZoomedNodeId(d.data._id); // Set target center for next render
        fetchSunburstData(d.data._id, false); // Trigger background fetch
        return true; // Tell D3 constructor to ZOOM NOW (on the old SVG)
      } else if (!needsLoad && d.parent) {
        // Data is loaded AND we are not clicking the root node (d.parent exists)
        // Allow zoom in if not already at root
        console.log(` ACTION: Zoom IN to ${d.data._id} (No Load)`);
        setZoomedNodeId(d.data._id); // Set target center for next render
        return true; // Tell D3 constructor to ZOOM NOW (on the old SVG)
      } else if (isLoading) {
        // Currently fetching data, prevent interactions
        console.log(` ACTION: No Action (Currently Loading) for ${d.data._id}`);
        return false; // Prevent zoom/click action
      } else {
        // Leaf node (_hasChildren=false) or root node (d.parent is null)
        console.log(` ACTION: No Action (Leaf or Root Node) for ${d.data._id}`);
        return false; // Prevent zoom/click action
      }
    },
    [fetchSunburstData, isLoading],
  ); // Dependencies

  /**
   * Handles LEFT clicks on the center circle or text (Zoom Out).
   * Calculates the parent ID and updates the React state `zoomedNodeId`.
   * Does NOT return anything, the state update triggers the re-render.
   */
  const handleCenterClick = useCallback(() => {
    console.log(`--- handleCenterClick (Zoom Out) ---`);
    const currentHierarchy = currentHierarchyRootRef.current;
    const currentCenterId = zoomedNodeId; // Get ID currently centered

    if (!currentHierarchy) {
      console.warn(" Cannot zoom out: D3 hierarchy reference is missing.");
      setZoomedNodeId(null); // Reset to root as failsafe
      return;
    }

    if (!currentCenterId) {
      console.log(" Already at root (zoomedNodeId is null). No action.");
      return; // Already at the top level
    }

    // Find the currently centered node in the D3 hierarchy stored in the ref
    const centeredNode = currentHierarchy.find(
      (node) => node.data._id === currentCenterId,
    );

    if (!centeredNode) {
      console.warn(
        ` Could not find node ${currentCenterId} in current D3 hierarchy. Resetting to root.`,
      );
      setZoomedNodeId(null); // Reset to root on error
      return;
    }

    if (centeredNode.parent) {
      // Get the parent node's ID. Handle case where root node's data might not have _id
      const parentId = centeredNode.parent.data
        ? centeredNode.parent.data._id
        : null;
      // Check if parent is the absolute root (which might have _id like 'root_nlm' or its data is null)
      if (parentId && centeredNode.parent.depth > 0) {
        console.log(` Zooming Out: Setting center to Parent ID: ${parentId}`);
        setZoomedNodeId(parentId); // Update React state to the parent ID
      } else {
        // Parent is the top-level root (depth 0)
        console.log(` Zooming Out: Setting center to Top Root (null)`);
        setZoomedNodeId(null); // Update React state to the top root
      }
    } else {
      // This node has no parent according to hierarchy, means it's a top-level (L0) node. Zoom to root.
      console.log(
        ` Zooming Out: Clicked node ${currentCenterId} has no parent. Setting center to Root (null).`,
      );
      setZoomedNodeId(null); // Update React state to the top root
    }
  }, [zoomedNodeId]); // Dependency on zoomedNodeId to know current center

  /**
   * Handles RIGHT clicks on sunburst nodes (arcs) for the context menu.
   */
  const handleSunburstClick = useCallback((e, dataNode) => {
    // dataNode = D3 hierarchy node
    console.log("--- handleSunburstClick (Right Click) ---");
    console.log("Node R-Clicked:", dataNode.data);
    setClickedItem(dataNode.data); // Store the raw data

    const { clientX, clientY } = e;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    setPopupPosition({ x: clientX + 10 + scrollX, y: clientY + 10 + scrollY }); // Position popup
    setPopupVisible(true); // Show popup
  }, []); // No dependencies needed

  // --- Popup Handling ---

  // Effect to add/remove listener for clicks outside the popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        handlePopupClose();
      }
    };
    if (popupVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      // Cleanup
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popupVisible]); // Re-run when popup visibility changes

  // Handler for the "Add as origin" button in the popup
  function handleSelectItem() {
    if (clickedItem) {
      console.log("Popup Action: Add as origin ->", clickedItem);
      addSelectedItem(clickedItem); // Execute the callback prop
    }
    handlePopupClose(); // Close popup
  }

  // Function to close the popup and clear related state
  const handlePopupClose = () => {
    console.log("Closing popup.");
    setPopupVisible(false);
    setClickedItem(null);
  };

  // --- Render ---
  console.log("--- Rendering Sunburst Component ---");
  return (
    <div className="sunburst-component-wrapper">
      {/* Container for the D3 SVG chart */}
      <div
        data-testid="sunburst-container"
        id="sunburst-container"
        ref={svgContainerRef} // Ref for D3 to mount the SVG
        className="sunburst-svg-container" // CSS class for styling
        style={{
          position: "relative",
          minHeight: "600px",
          width: "100%",
          maxWidth: "928px",
        }}
      >
        {/* Loading Indicator Overlay */}
        {isLoading && (
          <div className="loading-overlay" data-testid="loading-overlay">
            <span>Loading...</span>
          </div>
        )}
        {/* D3 SVG element will be appended here by the useEffect hook */}
      </div>

      {/* Context Menu Popup (Rendered conditionally) */}
      {popupVisible && clickedItem && (
        <div
          ref={popupRef} // Ref for outside click detection
          className="node-popup"
          data-testid="node-popup"
          // Style applies position calculated in the right-click handler
          style={{
            position: "absolute", // Positioned relative to viewport or nearest positioned ancestor
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            zIndex: 1001, // Ensure popup is above overlay potentially
          }}
        >
          {/* Popup Content */}
          <p
            style={{
              margin: "0 0 5px 0",
              fontWeight: "bold",
              borderBottom: "1px solid #ccc",
              paddingBottom: "3px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {clickedItem.label || clickedItem._id}{" "}
            {/* Display label or fallback to ID */}
          </p>
          <a
            className="popup-button"
            data-testid="popup-button-goto"
            // Ensure ID is URL-safe
            href={`/#/browse/${clickedItem._id}`}
            target="_blank" // Open in new tab
            rel="noopener noreferrer" // Security best practice
            onClick={handlePopupClose} // Close popup when link is clicked
          >
            Go To Page
          </a>
          {/* Ensure addSelectedItem prop is a function before rendering */}
          {typeof addSelectedItem === "function" && (
            <button
              className="popup-button"
              data-testid="popup-button-add-origin"
              onClick={handleSelectItem}
            >
              Add as origin
            </button>
          )}
          <button
            className="popup-button x-button"
            data-testid="popup-button-close"
            onClick={handlePopupClose}
            aria-label="Close popup" // Accessibility
          >
            X
          </button>
        </div>
      )}
    </div>
  );
};

export default Sunburst;
