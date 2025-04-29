import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import SunburstConstructor from "../SunburstConstructor/SunburstConstructor";
import { mergeChildren } from "../Utils/Utils";
import { GraphContext } from "../Contexts/Contexts";

const Sunburst = ({ addSelectedItem }) => {
  // --- State ---
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clickedItem, setClickedItem] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [zoomedNodeId, setZoomedNodeId] = useState(null); // null = top root

  // --- Refs ---
  const svgContainerRef = useRef(null);
  const svgNodeRef = useRef(null);
  const popupRef = useRef(null);
  const currentHierarchyRootRef = useRef(null);
  const isLoadingRef = useRef(isLoading);
  const isInitialMountRef = useRef(true);

  // -- Contexts --
  const { graphType, setGraphType } = useContext(GraphContext);

  // --- Data Fetching Logic ---
  const fetchSunburstData = useCallback(
    async (parentId = null, isInitialLoad = false) => {
      // Use the ref to check loading state to avoid infinite loops if fetch is rapid
      if (!isInitialLoad && isLoadingRef.current) {
        return;
      }

      setIsLoading(true); // Always set loading true when fetch starts
      isLoadingRef.current = true;

      const fetchUrl = "/arango_api/sunburst/";
      try {
        const response = await fetch(fetchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_id: parentId,
            graph: graphType, // Use the latest graphType from context
          }),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Fetch failed: ${response.status} ${err}`);
        }
        const data = await response.json();

        if (parentId) {
          // Merge
          if (!Array.isArray(data))
            throw new Error(`API error for parent ${parentId}`);
          setGraphData((prevData) => {
            if (!prevData) {
              console.warn("Trying to merge into null data, resetting.");
              return null; // Should not happen if root loaded first
            }
            return mergeChildren(prevData, parentId, data);
          });
        } else {
          // Initial load or graphType change load
          if (typeof data !== "object" || data === null || Array.isArray(data))
            throw new Error("API error for initial load/root");
          setGraphData(data);
          // Reset zoom only when fetching root data
          if (graphType == "phenotypes") {
            setZoomedNodeId("NCBITaxon/9606");
          } else {
            setZoomedNodeId(null);
          }
          currentHierarchyRootRef.current = null;
        }
      } catch (error) {
        console.error("Fetch/Process Error:", error);
        // Reset state on error
        setGraphData(null);
        setZoomedNodeId(null);
        currentHierarchyRootRef.current = null;
      } finally {
        // Always set loading false when fetch finishes (success or error)
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [graphType],
  );

  // Update isLoadingRef whenever isLoading state changes
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // --- Initial Data Load useEffect ---
  useEffect(() => {
    // Fetch initial data only if it hasn't been fetched yet
    if (!graphData) {
      fetchSunburstData(null, false);
    }
  }, []);

  // --- useEffect for Reloading on graphType Change ---
  useEffect(() => {
    // Skip the logic on the initial render/mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false; // Set flag to false after first mount
      return;
    }

    // Reset state to prepare for new graph data
    setGraphData(null); // Clear existing data
    setZoomedNodeId(null); // Reset zoom to root
    currentHierarchyRootRef.current = null; // Clear hierarchy reference
    setClickedItem(null);
    setPopupVisible(false);

    // Fetch new root data for the selected graphType
    // Pass `false` for isInitialLoad to let fetchSunburstData handle setIsLoading
    fetchSunburstData(null, false);

    // Dependency array ensures this runs only when graphType changes
  }, [graphType, fetchSunburstData]); // Include fetchSunburstData as it depends on graphType too

  // Checks if a given D3 hierarchy node needs its grandchildren loaded
  const checkNeedsLoad = (d) => {
    if (!d) return false;
    let needsLoad = false;
    if (d.data._hasChildren) {
      if (!d.children) {
        needsLoad = true;
      } else {
        for (const child of d.children) {
          if (child.data._hasChildren && !child.children) {
            needsLoad = true;
            break;
          }
        }
      }
    }
    return needsLoad;
  };

  // --- Event Handlers ---

  const handleNodeClick = useCallback(
    (event, d) => {
      if (!d.data._hasChildren) {
        return false;
      }
      const needsLoad = checkNeedsLoad(d);
      const currentIsLoading = isLoadingRef.current; // Read from ref

      if (needsLoad && !currentIsLoading) {
        setZoomedNodeId(d.data._id); // Zoom first
        fetchSunburstData(d.data._id, false); // Then fetch
        return true; // Indicate zoom/load happened
      } else if (!needsLoad && d.parent) {
        setZoomedNodeId(d.data._id);
        return true; // Indicate zoom happened
      } else if (currentIsLoading) {
        return false;
      } else {
        // e.g., clicking the already zoomed node that doesn't need loading
        return false;
      }
    },
    [fetchSunburstData],
  );

  const handleCenterClick = useCallback(
    () => {
      const currentHierarchy = currentHierarchyRootRef.current;
      const currentCenterId = zoomedNodeId;
      const currentIsLoading = isLoadingRef.current; // Read from ref

      if (!currentHierarchy || !currentCenterId) {
        setZoomedNodeId(null);
        return;
      }
      const centeredNode = currentHierarchy.find(
        (node) => node.data._id === currentCenterId,
      );
      if (!centeredNode) {
        console.warn(
          `Center click: Cannot find centered node ${currentCenterId}. Resetting zoom.`,
        );
        setZoomedNodeId(null);
        return;
      }
      const parentNode = centeredNode.parent;
      if (parentNode) {
        const parentId = parentNode.data ? parentNode.data._id : null;
        // Zoom to parent if it is not the hidden root (depth 0)
        const newZoomedId = parentId && parentNode.depth > 0 ? parentId : null;
        setZoomedNodeId(newZoomedId);

        // Check if the parent needs data loaded
        const needsLoadForParent = checkNeedsLoad(parentNode);
        if (needsLoadForParent && !currentIsLoading && parentId) {
          fetchSunburstData(parentId, false);
        }
      } else {
        // Already at the root, clicking center zooms out to null
        setZoomedNodeId(null);
      }
    },
    [zoomedNodeId, fetchSunburstData], // Depends on zoomedNodeId and fetchSunburstData
  );

  const handleSunburstClick = useCallback((e, dataNode) => {
    setClickedItem(dataNode.data);
    const { clientX, clientY } = e;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    setPopupPosition({ x: clientX + 10 + scrollX, y: clientY + 10 + scrollY });
    setPopupVisible(true);
  }, []);

  // --- D3 Graph Rendering/Updating useEffect ---
  useEffect(() => {
    // Only attempt to render if graphData is present and container exists
    if (graphData && svgContainerRef.current) {
      // Ensure previous SVG is removed ONLY if it exists
      if (
        svgNodeRef.current &&
        svgContainerRef.current.contains(svgNodeRef.current)
      ) {
        try {
          svgContainerRef.current.removeChild(svgNodeRef.current);
        } catch (e) {
          console.warn("Ignoring error during SVG removal:", e);
          /* ignore - node might already be detached */
        }
        svgNodeRef.current = null; // Clear the ref after removal
      }

      try {
        const sunburstInstance = SunburstConstructor(
          graphData,
          928, // Width
          handleSunburstClick,
          handleNodeClick,
          handleCenterClick,
          zoomedNodeId,
        );

        currentHierarchyRootRef.current = sunburstInstance.hierarchyRoot; // Store the hierarchy

        if (sunburstInstance.svgNode) {
          svgNodeRef.current = sunburstInstance.svgNode;
          svgContainerRef.current.appendChild(svgNodeRef.current);
        } else {
          console.error("SunburstConstructor did not return a valid svgNode.");
          svgNodeRef.current = null;
        }
      } catch (error) {
        console.error(
          "Error during SunburstConstructor execution or SVG append:",
          error,
        );
        // Attempt cleanup even on error
        if (
          svgNodeRef.current &&
          svgContainerRef.current.contains(svgNodeRef.current)
        ) {
          svgContainerRef.current.removeChild(svgNodeRef.current);
        }
        svgNodeRef.current = null;
        currentHierarchyRootRef.current = null;
        // Optionally set an error state to display to the user
      }
    } else if (!graphData && svgContainerRef.current) {
      // Handle the case where data is null
      if (
        svgNodeRef.current &&
        svgContainerRef.current.contains(svgNodeRef.current)
      ) {
        try {
          svgContainerRef.current.removeChild(svgNodeRef.current);
        } catch (e) {
          /* ignore */
        }
        svgNodeRef.current = null;
      }
      currentHierarchyRootRef.current = null; // Also clear hierarchy ref when data is null
    }

    return () => {};
  }, [
    graphData,
    zoomedNodeId,
    handleSunburstClick,
    handleNodeClick,
    handleCenterClick,
  ]);

  // --- Popup Handling ---
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
  }, [popupVisible]);

  // Handler for the "Add as origin" button in the popup
  function handleSelectItem() {
    if (clickedItem) {
      addSelectedItem(clickedItem);
    }
    handlePopupClose();
  }

  // Function to close the popup and clear related state
  const handlePopupClose = () => {
    setPopupVisible(false);
    setClickedItem(null);
  };

  // --- Render ---
  return (
    <div className="sunburst-component-wrapper">
      {/* Container for the D3 SVG chart */}
      <div
        data-testid="sunburst-container"
        id="sunburst-container"
        ref={svgContainerRef}
        className="sunburst-svg-container"
        style={{
          position: "relative",
          minHeight: "600px",
          width: "100%",
          maxWidth: "928px",
          margin: "0 auto",
        }}
      >
        {/* Loading Indicator Overlay */}
        {isLoading && (
          <div className="loading-overlay" data-testid="loading-overlay">
            <span>Loading...</span>
          </div>
        )}
        {/* The SVG will be appended here by the useEffect */}
      </div>

      {/* Popup */}
      {popupVisible && clickedItem && (
        <div
          ref={popupRef}
          className="node-popup"
          data-testid="node-popup"
          style={{
            position: "absolute",
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
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
              maxWidth: "200px",
            }}
          >
            {clickedItem.label || clickedItem._id}{" "}
            {/* Display label or fallback to ID */}
          </p>
          <a
            className="popup-button"
            data-testid="popup-button-goto"
            href={`/#/browse/${clickedItem._id}`}
            target="_blank" // Open in new tab
            rel="noopener noreferrer"
            onClick={handlePopupClose}
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
            aria-label="Close popup"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
};

export default Sunburst;
