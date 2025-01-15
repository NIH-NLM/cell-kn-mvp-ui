import { useContext, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import SunburstConstructor from "./SunburstConstructor";
import { GraphNameContext } from "./Contexts";

const Sunburst = ({ addSelectedItem }) => {
  const [graphData, setGraphData] = useState({});
  const [graph, setGraph] = useState(null);
  const [clickedItem, setClickedItem] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const popupRef = useRef(null);

  const graphName = useContext(GraphNameContext);

  // Fetch new graph data
  useEffect(() => {
    // Ensure graph only renders once at a time
    let isMounted = true;
    getGraphData(graphName).then((data) => {
      if (isMounted) {
        setGraphData(data);
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Update graph if data changes
  useEffect(() => {
    if (Object.keys(graphData).length !== 0) {
      //TODO: Review size
      const g = SunburstConstructor(graphData, 928, handleSunburstClick);
      setGraph(g);
    }
  }, [graphData]);

  // Remove and rerender graph on any changes
  useEffect(() => {
    if (graph) {
      const chartContainer = d3.select("#sunburst-container");
      chartContainer.selectAll("*").remove();
      chartContainer.append(() => graph);
    }
  }, [graph]);

  // Add event listeners to close popup window if clicks occur outside popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the popup
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        handlePopupClose();
      }
    };

    // Add event listener for clicks on the document
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup the event listener when the component unmounts or popup visibility changes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* TODO: optimize lazy loading of sunburst to allow for the entire dataset to be in sunburst */
  let getGraphData = async (graphName) => {
    let response = await fetch("/arango_api/sunburst/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        graph_name: graphName,
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    return response.json();
  };

  // Handle right click on node
  const handleSunburstClick = (e, data) => {
    setClickedItem(data.data);

    // Get the mouse position and current scroll state
    const { clientX, clientY } = e;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Adjust the popup position by adding the scroll offsets
    setPopupPosition({
      x: clientX + 10 + scrollX,
      y: clientY + 10 + scrollY,
    });
    setPopupVisible(true);
  };

  function handleSelectItem() {
    addSelectedItem(clickedItem);
    handlePopupClose();
  }

  // Handle closing the node popup
  const handlePopupClose = () => {
    setPopupVisible(false);
  };

  return (
    <div>
      <div id="sunburst-container" />
      <div
        ref={popupRef}
        className="node-popup"
        style={
          popupVisible
            ? {
                display: "flex",
                left: `${popupPosition.x + 10}px`,
                top: `${popupPosition.y + 10}px`,
              }
            : { display: "none" }
        }
      >
        <a
          className="popup-button"
          href={`/#/browse/${clickedItem ? clickedItem["_id"] : ""}`}
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
    </div>
  );
};

export default Sunburst;
