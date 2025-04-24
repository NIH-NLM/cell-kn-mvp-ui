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

  // -- Contexts --
  const { graphType, setGraphType } = useContext(GraphContext);

  // --- Data Fetching Logic ---
  const fetchSunburstData = useCallback(
    async (parentId = null, isInitialLoad = false) => {
      if (!isInitialLoad && isLoadingRef.current) {
        return;
      }

      if (!isInitialLoad) {
        setIsLoading(true);
        isLoadingRef.current = true;
      } else {
        setIsLoading(false);
        isLoadingRef.current = false;
      }

      const fetchUrl = "/arango_api/sunburst/";
      try {
        const response = await fetch(fetchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_id: parentId,
            graph: graphType,
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
            if (!prevData) return null;
            return mergeChildren(prevData, parentId, data);
          });
        } else {
          // Initial load
          if (typeof data !== "object" || data === null || Array.isArray(data))
            throw new Error("API error for initial load");
          setGraphData(data);
          setZoomedNodeId(null);
          currentHierarchyRootRef.current = null;
        }
      } catch (error) {
        console.error("Fetch/Process Error:", error);
        setGraphData(null);
        setZoomedNodeId(null);
        currentHierarchyRootRef.current = null;
      } finally {
        if (!isInitialLoad) {
          setIsLoading(false);
          isLoadingRef.current = false;
        }
      }
    },
    // isLoading checked via ref
    [graphType],
  );

  const isLoadingRef = useRef(isLoading);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // --- Initial Data Load useEffect ---
  useEffect(() => {
    // Only fetch if graphData is null
    if (!graphData) {
      fetchSunburstData(null, true);
    } else {
    }
    return () => {};
  }, [fetchSunburstData]);

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
        setZoomedNodeId(d.data._id);
        fetchSunburstData(d.data._id, false);
        return true;
      } else if (!needsLoad && d.parent) {
        setZoomedNodeId(d.data._id);
        return true;
      } else if (currentIsLoading) {
      } else {
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
          ` Cannot find centered node ${currentCenterId}. Resetting.`,
        );
        setZoomedNodeId(null);
        return;
      }
      const parentNode = centeredNode.parent;
      if (parentNode) {
        const parentId = parentNode.data ? parentNode.data._id : null;
        const newZoomedId = parentId && parentNode.depth > 0 ? parentId : null;
        const needsLoadForParent = checkNeedsLoad(parentNode);
        setZoomedNodeId(newZoomedId);
        if (needsLoadForParent && !currentIsLoading && parentId) {
          fetchSunburstData(parentId, false);
        }
      } else {
        setZoomedNodeId(null);
      }
    },
    // isLoading checked via ref
    [zoomedNodeId, fetchSunburstData],
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
    if (graphData && svgContainerRef.current) {
      const sunburstInstance = SunburstConstructor(
        graphData,
        928,
        handleSunburstClick,
        handleNodeClick,
        handleCenterClick,
        zoomedNodeId,
      );
      currentHierarchyRootRef.current = sunburstInstance.hierarchyRoot;
      if (svgNodeRef.current) {
        try {
          svgContainerRef.current.removeChild(svgNodeRef.current);
        } catch (e) {
          /* ignore */
        }
      }
      if (sunburstInstance.svgNode) {
        svgNodeRef.current = sunburstInstance.svgNode;
        svgContainerRef.current.appendChild(svgNodeRef.current);
      } else {
        console.error("SunburstConstructor missing svgNode.");
        svgNodeRef.current = null;
      }
    } else {
      /* TODO: cleanup logic */
    }
    return () => {
      /* TODO: remove SVG cleanup */
    };
  }, [graphData, zoomedNodeId]);

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
        }}
      >
        {/* Loading Indicator Overlay */}
        {isLoading && (
          <div className="loading-overlay" data-testid="loading-overlay">
            <span>Loading...</span>
          </div>
        )}
      </div>

      {popupVisible && clickedItem && (
        <div
          ref={popupRef}
          className="node-popup"
          data-testid="node-popup"
          style={{
            position: "absolute",
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            zIndex: 1001,
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
            X
          </button>
        </div>
      )}
    </div>
  );
};

export default Sunburst;
