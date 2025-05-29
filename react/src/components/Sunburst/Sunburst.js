import React, { useEffect, useRef, useState, useCallback } from "react";
import SunburstConstructor from "../SunburstConstructor/SunburstConstructor";
import { getLabel, mergeChildren } from "../Utils/Utils";

const Sunburst = ({ addSelectedItem }) => {
  // --- State ---
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clickedItem, setClickedItem] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [zoomedNodeId, setZoomedNodeId] = useState(null);

  // --- Refs ---
  const svgContainerRef = useRef(null);
  const svgNodeRef = useRef(null);
  const popupRef = useRef(null);
  const currentHierarchyRootRef = useRef(null);
  const isLoadingRef = useRef(isLoading);
  const isInitialMountRef = useRef(true);

  const d3ClickedRef = useRef(null);
  const lastUsedGraphDataRef = useRef(null);

  const graphType = "phenotypes";

  // --- Data Fetching Logic ---
  const fetchSunburstData = useCallback(
    async (parentId = null, isInitialLoad = false) => {
      if (!isInitialLoad && isLoadingRef.current) {
        return;
      }
      setIsLoading(true);
      isLoadingRef.current = true;
      const fetchUrl = "/arango_api/sunburst/";
      try {
        const response = await fetch(fetchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parent_id: parentId, graph: graphType }),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Fetch failed: ${response.status} ${err}`);
        }
        const data = await response.json();
        if (parentId) {
          if (!Array.isArray(data))
            throw new Error(`API error for parent ${parentId}`);
          setGraphData((prevData) => {
            if (!prevData) return null;
            return mergeChildren(prevData, parentId, data);
          });
        } else {
          if (typeof data !== "object" || data === null || Array.isArray(data))
            throw new Error("API error for initial load/root");
          setGraphData(data);
          if (graphType === "phenotypes") {
            setZoomedNodeId("NCBITaxon/9606");
          } else {
            setZoomedNodeId(null);
          }
          currentHierarchyRootRef.current = null; // Reset since data structure changed
        }
      } catch (error) {
        console.error("Fetch/Process Error:", error);
        setGraphData(null);
        setZoomedNodeId(null);
        currentHierarchyRootRef.current = null;
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [graphType],
  );

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!graphData && !isLoadingRef.current) {
      // ensure not to fetch if already loading
      fetchSunburstData(null, true); // Pass true for initial load
    }
  }, []);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    setGraphData(null);
    setZoomedNodeId(null);
    currentHierarchyRootRef.current = null;
    setClickedItem(null);
    setPopupVisible(false);
    fetchSunburstData(null, false);
  }, [graphType, fetchSunburstData]);

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
    (event, d3Node) => {
      if (!d3Node.data._hasChildren) {
        return false;
      }
      const needsLoad = checkNeedsLoad(d3Node);
      const currentIsLoading = isLoadingRef.current;

      if (needsLoad && !currentIsLoading) {
        setZoomedNodeId(d3Node.data._id);
        fetchSunburstData(d3Node.data._id, false);
        return true;
      } else if (!needsLoad && d3Node.children) {
        setZoomedNodeId(d3Node.data._id); // Update React's state
        return true;
      } else if (currentIsLoading) {
        return false; // Do not animate if already loading new data
      }
      return false; // Default: do not animate
    },
    [fetchSunburstData],
  );

  const handleCenterClick = useCallback(() => {
    const currentHierarchy = currentHierarchyRootRef.current;
    const currentCenterId = zoomedNodeId;
    const currentIsLoading = isLoadingRef.current;

    if (!currentHierarchy) {
      setZoomedNodeId(null);
      if (d3ClickedRef.current && currentHierarchyRootRef.current) {
        // This attempts to zoom to the absolute root of the current hierarchy if available
        const absoluteRoot = currentHierarchyRootRef.current.find(
          (d) => d.depth === 0,
        );
        if (absoluteRoot) d3ClickedRef.current(null, absoluteRoot);
      }
      return;
    }

    const centeredNode = currentCenterId
      ? currentHierarchy.find((node) => node.data._id === currentCenterId)
      : currentHierarchy.find((d) => d.depth === 0); // Fallback to the actual root node of the hierarchy

    if (!centeredNode) {
      console.warn(
        "Center click: Cannot find current centered node. Resetting zoom to root.",
      );
      setZoomedNodeId(null);
      const absoluteRoot = currentHierarchyRootRef.current.find(
        (d) => d.depth === 0,
      );
      if (d3ClickedRef.current && absoluteRoot) {
        d3ClickedRef.current(null, absoluteRoot);
      }
      return;
    }

    const parentNode = centeredNode.parent;
    // Zoom to parent, or to absolute root if no parent
    const targetNodeForAnimation =
      parentNode || currentHierarchy.find((d) => d.depth === 0);

    if (targetNodeForAnimation) {
      const newZoomTargetId =
        targetNodeForAnimation.depth === 0
          ? null
          : targetNodeForAnimation.data._id;
      setZoomedNodeId(newZoomTargetId);

      // Trigger D3 animation
      if (d3ClickedRef.current) {
        d3ClickedRef.current(null, targetNodeForAnimation);
      }

      const needsLoadForParent = checkNeedsLoad(targetNodeForAnimation);
      if (
        needsLoadForParent &&
        !currentIsLoading &&
        targetNodeForAnimation.data &&
        targetNodeForAnimation.data._id
      ) {
        fetchSunburstData(targetNodeForAnimation.data._id, false);
      }
    }
  }, [zoomedNodeId, fetchSunburstData]);

  const handleSunburstClick = useCallback((e, dataNode) => {
    // For right-click
    setClickedItem(dataNode.data);
    setPopupPosition({
      x: e.clientX + 10 + window.scrollX,
      y: e.clientY + 10 + window.scrollY,
    });
    setPopupVisible(true);
  }, []);

  // --- D3 Graph Rendering/Updating useEffect ---
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    // Determine if a full D3 reconstruction is needed
    const needsFullReconstruction =
      !svgNodeRef.current || // No SVG exists yet
      (graphData !== lastUsedGraphDataRef.current && graphData !== null); // Graph data has changed and is not null

    if (graphData) {
      if (needsFullReconstruction) {
        // Full reconstruction
        if (svgNodeRef.current && container.contains(svgNodeRef.current)) {
          container.removeChild(svgNodeRef.current);
        }

        const sunburstInstance = SunburstConstructor(
          graphData,
          928, // Width
          handleSunburstClick, // For right-click
          handleNodeClick, // For arc left-click
          handleCenterClick, // For center left-click
          zoomedNodeId,
        );

        currentHierarchyRootRef.current = sunburstInstance.hierarchyRoot;
        d3ClickedRef.current = sunburstInstance.d3Clicked;

        if (sunburstInstance.svgNode) {
          svgNodeRef.current = sunburstInstance.svgNode;
          container.appendChild(svgNodeRef.current);
          lastUsedGraphDataRef.current = graphData;
        } else {
          console.error("SunburstConstructor did not return a valid svgNode.");
          svgNodeRef.current = null; // Ensure it's null if construction failed
          lastUsedGraphDataRef.current = null;
        }
      } else {
        // graphData exists, svgNodeRef.current exists, and graphData has not changed. Do nothing.
      }
    } else {
      if (svgNodeRef.current && container.contains(svgNodeRef.current)) {
        container.removeChild(svgNodeRef.current);
      }
      svgNodeRef.current = null;
      currentHierarchyRootRef.current = null;
      d3ClickedRef.current = null;
      lastUsedGraphDataRef.current = null;
    }
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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popupVisible]);

  function handleSelectItem() {
    if (clickedItem) {
      addSelectedItem(clickedItem);
    }
    handlePopupClose();
  }
  const handlePopupClose = () => {
    setPopupVisible(false);
    setClickedItem(null);
  };

  // --- Render ---
  return (
    <div className="sunburst-component-wrapper">
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
          }}
        >
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
            {getLabel(clickedItem)}{" "}
          </p>
          <a
            className="popup-button"
            data-testid="popup-button-goto"
            href={`/#/collections/${clickedItem._id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePopupClose}
          >
            Go To Page
          </a>
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
