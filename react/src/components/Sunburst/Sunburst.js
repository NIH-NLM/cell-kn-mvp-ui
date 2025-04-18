import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from 'prop-types';
import SunburstConstructor from "../SunburstConstructor/SunburstConstructor";
import { mergeChildren } from "../Utils/Utils";

/**
 * React component for a simplified lazy-loading D3 Sunburst chart.
 */
const Sunburst = ({ addSelectedItem }) => {
  // --- State ---
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clickedItem, setClickedItem] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // --- Refs ---
  const svgContainerRef = useRef(null);
  const svgNodeRef = useRef(null);
  const popupRef = useRef(null);
  const currentHierarchyRootRef = useRef(null);

  // --- Data Fetching Logic ---
  const fetchSunburstData = useCallback(async (parentId = null, isInitialLoad = false) => {
    if (!isInitialLoad) setIsLoading(true); else setIsLoading(false);
    // CORRECTED URL based on your note
    const fetchUrl = "/arango_api/sunburst/";
    console.log(`Fetching data from ${fetchUrl}. Parent ID: ${parentId}, Initial: ${isInitialLoad}`);
    try {
      const response = await fetch(fetchUrl, {
        // *** THIS IS THE KEY PART - METHOD IS POST ***
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Include CSRF token if needed
          // 'X-CSRFToken': getCookie('csrftoken'),
        },
        // Body is empty {} for initial load, or {parent_id: ...} for subsequent loads
        body: JSON.stringify(parentId ? { parent_id: parentId } : {}),
      });

      if (!response.ok) {
         const errorText = await response.text();
         console.error(`Network response error: ${response.status} ${response.statusText}`, errorText);
         throw new Error(`Fetch failed: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Data received for Parent ID: ${parentId ? parentId : 'Initial'}.`);

      if (parentId) { // Merging children
        if (!Array.isArray(data)) throw new Error(`API returned incorrect type for children of ${parentId}`);
        setGraphData(prevData => {
          if (!prevData) return null;
          console.log(`Merging ${data.length} fetched children/grandchildren into parent ${parentId}`);
          return mergeChildren(prevData, parentId, data);
        });
      } else { // Initial load
        if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error("API returned incorrect type for initial load");
        console.log("Setting initial graph data (Root + L0 + L1)");
        setGraphData(data);
      }
    } catch (error) {
      console.error("Fetch/Process Error:", error);
      setGraphData(null);
    } finally {
      if (!isInitialLoad) setIsLoading(false);
    }
  }, []); // End fetchSunburstData

  // --- Initial Data Load useEffect ---
  useEffect(() => {
    console.log("Sunburst Component Mounted - Triggering initial data fetch.");
    // *** This calls fetchSunburstData, which uses POST ***
    fetchSunburstData(null, true);
    return () => { console.log("Sunburst Component Unmounting."); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSunburstData]);

  // --- D3 Graph Rendering/Updating useEffect ---
  useEffect(() => {
    if (graphData && svgContainerRef.current) {
      console.log(`--- D3 Render/Update Effect Triggered ---`);
      const sunburstInstance = SunburstConstructor(
        graphData, 928, handleSunburstClick, handleNodeClick,
        currentHierarchyRootRef.current
      );
      currentHierarchyRootRef.current = sunburstInstance.hierarchyRoot;
      if (svgNodeRef.current) { try { svgContainerRef.current.removeChild(svgNodeRef.current); } catch (e) { /* ignore */ } }
      if (sunburstInstance.svgNode) {
        svgNodeRef.current = sunburstInstance.svgNode;
        svgContainerRef.current.appendChild(svgNodeRef.current);
        console.log("Appended new SVG node.");
      } else { console.error("SunburstConstructor missing svgNode."); svgNodeRef.current = null; }
    } else {
        if (!graphData && svgNodeRef.current && svgContainerRef.current) {
             try { svgContainerRef.current.removeChild(svgNodeRef.current); } catch(e) { /* ignore */ }
             svgNodeRef.current = null; currentHierarchyRootRef.current = null;
        }
        console.log("Skipping D3 render: graphData is null or svgContainerRef not ready.");
    }
    return () => {
      console.log("Running D3 cleanup function (before next render or unmount).");
      if (svgNodeRef.current && svgContainerRef.current) { try { svgContainerRef.current.removeChild(svgNodeRef.current); } catch(e) { /* ignore */ } }
      svgNodeRef.current = null;
    };
  }, [graphData]);

  // --- Event Handlers ---
  const handleNodeClick = useCallback((event, d) => {
      console.log(`--- handleNodeClick ---`);
      let needsLoad = false;
      if (d.data._hasChildren) {
          if (!d.children) { needsLoad = true; }
          else { for (const child of d.children) { if (child.data._hasChildren && !child.children) { needsLoad = true; break; } } }
      }
      console.log(`Node Clicked: ID=${d.data._id}, Needs Load=${needsLoad}, IsLoading=${isLoading}`);

      if (needsLoad && !isLoading) {
          console.log(` ACTION: Load & Zoom for ${d.data._id}`);
          // *** This calls fetchSunburstData, which uses POST ***
          fetchSunburstData(d.data._id, false);
          return true; // Tell D3 constructor to ZOOM NOW
      } else if (!needsLoad && (d.children || d.parent)) {
           console.log(` ACTION: Zoom Only for ${d.data._id}`);
           return true; // Tell D3 constructor to ZOOM NOW
      } else {
           console.log(` ACTION: No Action (Loading or Leaf) for ${d.data._id}`);
           return false;
      }
  }, [fetchSunburstData, isLoading]);

  const handleSunburstClick = useCallback((e, dataNode) => { /* ... right click logic ... */ }, []);

  // --- Popup Handling ---
  useEffect(() => { /* ... outside click logic ... */ }, [popupVisible]);
  function handleSelectItem() { if (clickedItem) addSelectedItem(clickedItem); handlePopupClose(); }
  const handlePopupClose = () => { setPopupVisible(false); setClickedItem(null); };

  // --- Render ---
  console.log("--- Rendering Sunburst Component ---");
  return (
    <div className="sunburst-component-wrapper">
      <div data-testid="sunburst-container" id="sunburst-container" ref={svgContainerRef} className="sunburst-svg-container" style={{ position: 'relative', minHeight: '600px', width: '100%', maxWidth: '928px' }} >
        {isLoading && ( <div className="loading-overlay" data-testid="loading-overlay"><span>Loading...</span></div> )}
      </div>
      {popupVisible && clickedItem && (
        <div ref={popupRef} className="node-popup" data-testid="node-popup" style={{ position: 'absolute', left: `${popupPosition.x}px`, top: `${popupPosition.y}px` }} >
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}> {clickedItem.label || clickedItem._id} </p>
          {/* This link uses HASH routing, it does NOT send a GET to the API endpoint */}
          <a className="popup-button" data-testid="popup-button-goto" href={`/#/browse/${encodeURIComponent(clickedItem._id)}`} target="_blank" rel="noopener noreferrer" onClick={handlePopupClose} > Go To Page </a>
          {typeof addSelectedItem === 'function' && ( <button className="popup-button" data-testid="popup-button-add-origin" onClick={handleSelectItem} > Add as origin </button> )}
          <button className="popup-button x-button" data-testid="popup-button-close" onClick={handlePopupClose} aria-label="Close popup" > X </button>
        </div>
      )}
    </div>
  );
};

Sunburst.propTypes = {
  addSelectedItem: PropTypes.func.isRequired
};

export default Sunburst;