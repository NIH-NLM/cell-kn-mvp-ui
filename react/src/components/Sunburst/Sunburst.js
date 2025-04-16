import { useEffect, useRef, useState, useCallback } from "react";
import SunburstConstructor from "../SunburstConstructor/SunburstConstructor";
import { mergeChildren } from "../Utils/Utils";

const Sunburst = ({ addSelectedItem }) => {
  const [graphData, setGraphData] = useState(null); // Initialize as null
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [clickedItem, setClickedItem] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const svgContainerRef = useRef(null); // Ref for the SVG container
  const svgNodeRef = useRef(null); // Ref for the actual SVG node returned by D3
  const popupRef = useRef(null);
  const currentHierarchyRootRef = useRef(null); // Store the D3 hierarchy root

  // --- Data Fetching ---
  const fetchSunburstData = useCallback(async (parentId = null) => {
    setIsLoading(true);
    try {
      const response = await fetch("/arango_api/sunburst/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Send parent_id if provided
        body: JSON.stringify(parentId ? { parent_id: parentId } : {}),
      });
      if (!response.ok) {
        throw new Error(
          `Network response was not ok (status: ${response.status})`,
        );
      }
      const data = await response.json();
      console.log(data);

      if (parentId) {
        setGraphData((prevData) => {
          if (!prevData) return prevData;
          return mergeChildren(prevData, parentId, data);
        });
      } else {
        setGraphData(data);
      }
    } catch (error) {
      console.error("Failed to fetch sunburst data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Initial Data Load ---
  useEffect(() => {
    // Fetch root data on mount
    fetchSunburstData();
  }, [fetchSunburstData]);

  // --- D3 Graph Update ---
  useEffect(() => {
    if (graphData && svgContainerRef.current) {
      // Create or update the graph
      const { svgNode, hierarchyRoot } = SunburstConstructor(
        graphData,
        928, // size
        handleSunburstClick, // Right-click handler
        handleNodeClick, // Left-click handler for zoom/load
        currentHierarchyRootRef.current, // Pass previous hierarchy for transitions
      );

      // Store the new hierarchy root for the next update
      currentHierarchyRootRef.current = hierarchyRoot;

      // Manage the SVG node addition/replacement
      if (svgNodeRef.current) {
        svgContainerRef.current.removeChild(svgNodeRef.current);
      }
      svgNodeRef.current = svgNode;
      svgContainerRef.current.appendChild(svgNode);
    } else if (!graphData && svgNodeRef.current && svgContainerRef.current) {
      // If graphData becomes null remove the SVG
      svgContainerRef.current.removeChild(svgNodeRef.current);
      svgNodeRef.current = null;
      currentHierarchyRootRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (svgNodeRef.current && svgContainerRef.current) {
        // Check ref validity before trying removal
        try {
          svgContainerRef.current.removeChild(svgNodeRef.current);
        } catch (e) {
          // Ignore errors if node already removed elsewhere
        }
      }
      svgNodeRef.current = null;
      currentHierarchyRootRef.current = null;
    };
  }, [graphData]);

  // --- Event Handlers ---

  // Left Click: Handles Zooming and Lazy Loading
  const handleNodeClick = useCallback(
    (event, d) => {
      if (d.data._hasChildren && !d.children && !isLoading) {
        console.log("Fetching children for:", d.data._id);
        fetchSunburstData(d.data._id);
      } else if (d.children || d.depth === 0) {
        return true;
      }
      return false;
    },
    [fetchSunburstData, isLoading],
  );

  // Right Click: Handles Popup Menu
  const handleSunburstClick = useCallback((e, dataNode) => {
    // Use dataNode.data to get original data object
    setClickedItem(dataNode.data);

    const { clientX, clientY } = e;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    setPopupPosition({ x: clientX + 10 + scrollX, y: clientY + 10 + scrollY });
    setPopupVisible(true);
  }, []);

  // --- Popup Logic ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        handlePopupClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <div>
      {/* Container for D3 SVG */}
      <div
        data-testid="sunburst-container"
        id="sunburst-container"
        ref={svgContainerRef}
        style={{ position: "relative" }}
      >
        {/* Loading Indicator */}
        {isLoading && <div className="loading-overlay">Loading...</div>}
      </div>

      {/* Popup */}
      {popupVisible && clickedItem && (
        <div
          ref={popupRef}
          className="node-popup"
          style={{
            position: "absolute",
            display: "flex",
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            zIndex: 1000,
          }}
        >
          <a
            className="popup-button"
            data-testid="popup-button"
            href={`/#/browse/${clickedItem["_id"]}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePopupClose}
          >
            Go To Page
          </a>
          <button className="popup-button" onClick={handleSelectItem}>
            Add as origin
          </button>
          <button className="x-button" onClick={handlePopupClose}>
            X
          </button>
        </div>
      )}
    </div>
  );
};

export default Sunburst;
