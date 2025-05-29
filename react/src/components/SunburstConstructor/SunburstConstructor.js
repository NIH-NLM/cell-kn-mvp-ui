import * as d3 from "d3";
import { getLabel } from "../Utils/Utils";
import { getColorForCollection } from "../../services/ColorServices/ColorServices";

/**
 * Creates or updates a D3 Sunburst chart.
 * Initializes view based on zoomedNodeId, hiding the center node's arc/label.
 * Handles arc click zoom animation. Center click triggers React callback.
 * Includes fade-in for new elements.
 *
 * @param {object} data The hierarchical data object.
 * @param {number} size The outer diameter.
 * @param {function} handleSunburstClick Callback for right-click.
 * @param {function} handleNodeClick Callback for left-click on arcs (event, d3Node) -> bool.
 * @param {function} handleCenterClick Callback for left-click on center circle/text.
 * @param {string|null} [zoomedNodeId] Optional: The ID of the node to be centered initially.
 * @returns {object} { svgNode, hierarchyRoot }.
 */
function SunburstConstructor(
  data,
  size,
  handleSunburstClick,
  handleNodeClick,
  handleCenterClick, // Callback for center click
  zoomedNodeId, // ID of node to center on
) {
  // --- Configuration ---
  const width = size;
  const height = width;
  const radius = width / 6;
  const zoomDuration = 750; // Duration for zoom animation
  const fadeInDelay = 0; // Delay for initial fade-in (if any)
  const fadeInDuration = 0; // Duration for initial fade-in (if any)

  // --- Basic Data Check ---
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    console.error("Constructor Error: Invalid or missing data received!", data);
    return { svgNode: null, hierarchyRoot: null };
  }

  // --- D3 Setup ---
  let hierarchy,
    root,
    pNode = null; // pNode is the node to be initially at the center

  try {
    // Create hierarchy & partition
    hierarchy = d3
      .hierarchy(data)
      .sum((d) => d.value || 1) // Ensure even nodes with no 'value' prop get some space
      .sort((a, b) => (b.value || 1) - (a.value || 1));
    root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);

    // Find the node to be initially centered, if zoomedNodeId is provided
    pNode = zoomedNodeId ? root.find((d) => d.data._id === zoomedNodeId) : null;
    if (zoomedNodeId && !pNode) {
      console.warn(
        `Constructor Warning: Could not find zoomedNodeId "${zoomedNodeId}". Falling back to root.`,
      );
    }
    const initialCenterReferenceNode = pNode || root;

    // Calculate Initial 'current' Positions based on the initialCenterReferenceNode
    root.each((d) => {
      const ref = initialCenterReferenceNode;
      const targetX0 =
        Math.max(0, Math.min(1, (d.x0 - ref.x0) / (ref.x1 - ref.x0))) *
        2 *
        Math.PI;
      const targetX1 =
        Math.max(0, Math.min(1, (d.x1 - ref.x0) / (ref.x1 - ref.x0))) *
        2 *
        Math.PI;
      const targetY0 = Math.max(0, d.y0 - ref.depth);
      const targetY1 = Math.max(0, d.y1 - ref.depth);

      d.current = {
        x0: isNaN(targetX0) ? 0 : targetX0,
        x1: isNaN(targetX1) ? 0 : targetX1,
        y0: isNaN(targetY0) ? 0 : targetY0,
        y1: isNaN(targetY1) ? 0 : targetY1,
      };
    });
  } catch (error) {
    console.error(
      "Constructor Error: Failed during D3 hierarchy/partition/position setup:",
      error,
    );
    return { svgNode: null, hierarchyRoot: null };
  }

  // --- Arc Generator ---
  // Uses d.current for dynamic updates during transitions
  const arc = d3
    .arc()
    .startAngle((d) => (d.current ? d.current.x0 : 0))
    .endAngle((d) => (d.current ? d.current.x1 : 0))
    .padAngle((d) =>
      d.current ? Math.min((d.current.x1 - d.current.x0) / 2, 0.005) : 0,
    )
    .padRadius(radius * 1.5)
    .innerRadius((d) => (d.current ? d.current.y0 * radius : 0))
    .outerRadius((d) =>
      d.current
        ? Math.max(d.current.y0 * radius, d.current.y1 * radius - 1)
        : 0,
    );

  // --- SVG Setup ---
  let svg;
  try {
    svg = d3
      .create("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, width])
      .style("font", "12px sans-serif")
      .style("max-height", "80vh")
      .style("display", "block")
      .style("margin", "auto");
  } catch (error) {
    console.error("Constructor Error: Failed creating SVG:", error);
    return { svgNode: null, hierarchyRoot: root };
  }
  const g = svg.append("g"); // Main group for chart elements

  // --- Path Elements ---
  let pathUpdate, pathEnter;
  try {
    const pathGroup = g.append("g").attr("fill-rule", "evenodd");
    const pathData = root.descendants();
    const path = pathGroup.selectAll("path").data(pathData, (d) => d.data._id);

    path.exit().remove();

    pathEnter = path
      .enter()
      .append("path")
      .attr("fill", (d) => {
        if (d.depth === 0 && !pNode) return "none";
        const collectionId =
          d.data?._id?.split("/")[0] || d.data?._key || "unknown";
        return getColorForCollection(collectionId);
      })
      .attr("fill-opacity", 0) // Start invisible for fade-in
      .attr("pointer-events", "none") // Start without pointer events
      .style("cursor", (d) => (d.children ? "pointer" : "default"))
      .attr("d", (d) => arc(d)); // Use arc with d.current for initial state

    pathEnter
      .append("title")
      .text((d) => getLabel(d.data) || d.data._key || "Unknown");

    pathUpdate = path.merge(pathEnter);

    pathUpdate
      .on("contextmenu", function (event, d) {
        event.preventDefault();
        handleSunburstClick(event, d);
      })
      .on("click", (event, d) => {
        // Do not allow zooming into the root node if it's already the center,
        if (d.depth === 0 && d === (pNode || root)) return;
        if (handleNodeClick(event, d)) {
          clicked(event, d);
        }
      });
  } catch (error) {
    console.error("Constructor Error: Failed processing Paths:", error);
    return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
  }

  // --- Label Elements ---
  let labelUpdate, labelEnter;
  try {
    const labelGroup = g
      .append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none");

    // Similar to paths, consider all descendants for labels.
    const labelData = root.descendants();
    const label = labelGroup
      .selectAll("text")
      .data(labelData, (d) => d.data._id);

    label.exit().remove();

    labelEnter = label
      .enter()
      .append("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", 0) // Start invisible for fade-in
      .attr("transform", (d) => labelTransform(d.current))
      .text((d) => {
        if (d.depth === 0 && !pNode) return ""; // No label for root if it is the initial center
        const lbl = getLabel(d.data) || "";
        return lbl.length > 10 ? lbl.slice(0, 9) + "..." : lbl;
      });

    labelUpdate = label.merge(labelEnter);
  } catch (error) {
    console.error("Constructor Error: Failed processing Labels:", error);
    return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
  }

  // --- Center Elements ---
  const currentVisualCenterNode = pNode || root;
  let parentCircle, centerText;
  try {
    parentCircle = svg
      .append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .style("cursor", "pointer") // Initial cursor based on currentVisualCenterNode
      .on("click", (event) => {
        handleCenterClick();
      });

    centerText = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("cursor", "pointer") // Initial cursor
      .text(getLabel(currentVisualCenterNode.data) || "Root")
      .on("click", (event) => {
        handleCenterClick();
      });
  } catch (error) {
    console.error("Constructor Error: Failed creating Center elements:", error);
    return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
  }

  // --- The `clicked` function ---
  function clicked(event, pClicked) {
    root.each((d_node) => {
      d_node.target = {
        x0:
          Math.max(
            0,
            Math.min(
              1,
              (d_node.x0 - pClicked.x0) / (pClicked.x1 - pClicked.x0),
            ),
          ) *
          2 *
          Math.PI,
        x1:
          Math.max(
            0,
            Math.min(
              1,
              (d_node.x1 - pClicked.x0) / (pClicked.x1 - pClicked.x0),
            ),
          ) *
          2 *
          Math.PI,
        y0: Math.max(0, d_node.y0 - pClicked.depth),
        y1: Math.max(0, d_node.y1 - pClicked.depth),
      };
      // Ensure no NaNs if pClicked.x1 - pClicked.x0 is zero
      if (isNaN(d_node.target.x0)) d_node.target.x0 = 0;
      if (isNaN(d_node.target.x1)) d_node.target.x1 = 0;
    });

    const t = svg
      .transition()
      .duration(event && event.altKey ? 7500 : zoomDuration);

    // Transition paths
    pathUpdate
      .transition(t)
      .tween("data", (d_node) => {
        // d_node is one of the nodes in pathUpdate
        const i = d3.interpolate(d_node.current, d_node.target);
        return (time) => {
          d_node.current = i(time); // This updates the .current property used by arc and labelTransform
        };
      })
      .attr("fill-opacity", (d_node) =>
        d_node.data._id === pClicked.data._id
          ? 0
          : arcVisible(d_node.target)
            ? d_node.children
              ? 0.6
              : 0.4
            : 0,
      )
      .attr("pointer-events", (d_node) =>
        d_node.data._id === pClicked.data._id || !arcVisible(d_node.target)
          ? "none"
          : "auto",
      )
      .attrTween("d", (d_node) => () => arc(d_node)); // arc(d_node) uses d_node.current

    // Transition labels
    labelUpdate
      .transition(t)
      // Set opacity for labels
      .attr("fill-opacity", (d_node) =>
        d_node.data._id === pClicked.data._id
          ? 0
          : +labelVisible(d_node.target),
      )
      .attrTween("transform", (d_node) => () => labelTransform(d_node.current));

    // Transition Center Text & Cursor
    centerText
      .transition(t)
      .text(getLabel(pClicked.data) || pClicked.data._key || "Unknown");
    updateCursor(pClicked); // pClicked is the new center node
  }

  // --- Helper Functions ---
  function arcVisible(pos) {
    if (
      !pos ||
      typeof pos.y1 === "undefined" ||
      typeof pos.y0 === "undefined" ||
      typeof pos.x1 === "undefined" ||
      typeof pos.x0 === "undefined"
    )
      return false;
    // Check if the arc is within the first few rings and has a positive sweep angle
    return pos.y1 <= 3 && pos.y0 >= 0 && pos.x1 > pos.x0;
  }

  function labelVisible(pos) {
    if (
      !pos ||
      typeof pos.y1 === "undefined" ||
      typeof pos.y0 === "undefined" ||
      typeof pos.x1 === "undefined" ||
      typeof pos.x0 === "undefined"
    )
      return false;
    // Check if arc is visible and large enough to hold text
    let cutoff = 0.01;
    return (
      arcVisible(pos) &&
      pos.y0 >= 0 &&
      (pos.y1 - pos.y0) * radius * (pos.x1 - pos.x0) >
        cutoff * 2 * Math.PI * radius
    );
  }

  function labelTransform(pos) {
    if (
      !pos ||
      typeof pos.x0 === "undefined" ||
      typeof pos.x1 === "undefined" ||
      typeof pos.y0 === "undefined" ||
      typeof pos.y1 === "undefined"
    )
      return `translate(0,0)`;

    const x = (((pos.x0 + pos.x1) / 2) * 180) / Math.PI; // Angle in degrees
    const y = ((pos.y0 + pos.y1) / 2) * radius; // Radial distance

    if (isNaN(x) || isNaN(y)) return `translate(0,0)`;
    // Rotate text
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 && x > 0 ? 0 : 180})`;
  }

  // Update cursor for the center circle based on the current center node 'pCenter'
  function updateCursor(pCenter) {
    const cursorStyle = pCenter && pCenter.parent ? "pointer" : "default";
    if (parentCircle) parentCircle.style("cursor", cursorStyle);
    if (centerText) centerText.style("cursor", cursorStyle);
  }

  // --- Apply Initial State & Fade-In ---
  try {
    pathUpdate
      .attr("d", (d) => arc(d))
      .attr("fill-opacity", (d) => {
        if (d.data._id === zoomedNodeId || (d === root && !zoomedNodeId))
          return 0;
        return arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0;
      })
      .attr("pointer-events", (d) =>
        d.data._id === zoomedNodeId ||
        (d === root && !zoomedNodeId) ||
        !arcVisible(d.current)
          ? "none"
          : "auto",
      );

    // Fade in new paths
    if (pathEnter && !pathEnter.empty() && fadeInDuration > 0) {
      pathEnter
        .transition("fadein_path")
        .delay(fadeInDelay)
        .duration(fadeInDuration)
        .attr("fill-opacity", (d) => {
          if (d.data._id === zoomedNodeId || (d === root && !zoomedNodeId))
            return 0;
          return arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0;
        })
        .attr("pointer-events", (d) =>
          d.data._id === zoomedNodeId ||
          (d === root && !zoomedNodeId) ||
          !arcVisible(d.current)
            ? "none"
            : "auto",
        );
    }

    // Update labels instantly, hiding the center one
    labelUpdate
      .attr("transform", (d) => labelTransform(d.current))
      .attr("fill-opacity", (d) => {
        if (d.data._id === zoomedNodeId || (d === root && !zoomedNodeId))
          return 0;
        return +labelVisible(d.current);
      });

    // Fade in new labels
    if (labelEnter && !labelEnter.empty() && fadeInDuration > 0) {
      labelEnter
        .transition("fadein_label")
        .delay(fadeInDelay)
        .duration(fadeInDuration)
        .attr("fill-opacity", (d) => {
          if (d.data._id === zoomedNodeId || (d === root && !zoomedNodeId))
            return 0;
          return +labelVisible(d.current);
        });
    }

    updateCursor(currentVisualCenterNode);
  } catch (error) {
    console.error(
      "Constructor Error: Failed applying final state/fade-in:",
      error,
    );
  }

  // --- Return ---
  const finalSvgNode = svg ? svg.node() : null;
  if (!finalSvgNode) {
    console.error("Constructor Error: Returning null SVG node!");
  }
  return {
    svgNode: finalSvgNode,
    hierarchyRoot: root,
    d3Clicked: clicked,
  };
}

export default SunburstConstructor;
