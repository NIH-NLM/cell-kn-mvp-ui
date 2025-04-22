import * as d3 from "d3";
import {getLabel} from "../Utils/Utils";

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
  const zoomDuration = 750;
  const fadeInDelay = 100;
  const fadeInDuration = 600;

  console.log(
    "--- SunburstConstructor Executing (State: React Zoom + Hide Center) ---",
  );
  console.log("Constructor: Rendering with target center ID:", zoomedNodeId);

  // --- Basic Data Check ---
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    console.error("Constructor Error: Invalid or missing data received!", data);
    return { svgNode: null, hierarchyRoot: null };
  }

  // --- D3 Setup (Hierarchy, Partition, Initial Positions) ---
  let hierarchy,
    root,
    pNode = null;
  const color = d3.scaleOrdinal(
    d3.quantize(d3.interpolateRainbow, (data.children || []).length + 1),
  );

  try {
    // Create hierarchy & partition
    hierarchy = d3
      .hierarchy(data)
      .sum((d) => d.value || 1)
      .sort((a, b) => (b.value || 1) - (a.value || 1));
    root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);

    // Calculate Initial 'current' Positions based on zoomedNodeId
    pNode = zoomedNodeId ? root.find((d) => d.data._id === zoomedNodeId) : null;
    if (zoomedNodeId && !pNode) {
      console.warn(
        `Constructor Warning: Could not find zoomedNodeId "${zoomedNodeId}".`,
      );
    }
    root.each((d) => {
      if (pNode) {
        // Calculate zoomed position
        const targetX0 =
          Math.max(0, Math.min(1, (d.x0 - pNode.x0) / (pNode.x1 - pNode.x0))) *
          2 *
          Math.PI;
        const targetX1 =
          Math.max(0, Math.min(1, (d.x1 - pNode.x0) / (pNode.x1 - pNode.x0))) *
          2 *
          Math.PI;
        const targetY0 = Math.max(0, d.y0 - pNode.depth);
        const targetY1 = Math.max(0, d.y1 - pNode.depth);
        d.current = {
          x0: isNaN(targetX0) ? 0 : targetX0,
          x1: isNaN(targetX1) ? 0 : targetX1,
          y0: isNaN(targetY0) ? 0 : targetY0,
          y1: isNaN(targetY1) ? 0 : targetY1,
        };
      } else {
        // Default (root) position
        d.current = { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };
      }
    });
    console.log(
      "Constructor: Initial positions calculated. Centered on:",
      pNode ? getLabel(pNode.data) : "Root",
    );
  } catch (error) {
    console.error(
      "Constructor Error: Failed during D3 hierarchy/partition/position setup:",
      error,
    );
    return { svgNode: null, hierarchyRoot: null };
  }

  // --- Arc Generator ---
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
  const g = svg.append("g");

  // --- Path Elements ---
  let pathUpdate, pathEnter;
  try {
    const pathGroup = g.append("g").attr("fill-rule", "evenodd");
    const pathData = root.descendants().slice(1); // Exclude the overall root node from paths
    const path = pathGroup.selectAll("path").data(pathData, (d) => d.data._id);
    path.exit().remove();
    pathEnter = path
      .enter()
      .append("path")
      .attr("fill", (d) => {
        let a = d;
        while (a.depth > 1) a = a.parent;
        return color(getLabel(a.data) || a.data._key);
      })
      .attr("fill-opacity", 0) // Start invisible
      .attr("pointer-events", "none")
      .style("cursor", (d) =>
        d.children || d.data._hasChildren ? "pointer" : "default",
      )
      .attr("d", arc);
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
    const labelData = root.descendants().slice(1); // Exclude root from labels too
    const label = labelGroup
      .selectAll("text")
      .data(labelData, (d) => d.data._id);
    label.exit().remove();
    labelEnter = label
      .enter()
      .append("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", 0) // Start invisible
      .attr("transform", (d) => labelTransform(d.current))
      .text((d) => {
        const lbl = getLabel(d.data) || "";
        return lbl.length > 10 ? lbl.slice(0, 9) + "..." : lbl;
      });
    labelUpdate = label.merge(labelEnter);
  } catch (error) {
    console.error("Constructor Error: Failed processing Labels:", error);
    return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
  }

  // --- Center Elements ---
  const initialCenterNode = pNode || root;
  let parentCircle, centerText;
  try {
    parentCircle = svg
      .append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .style("cursor", "pointer")
      .on("click", (event) => {
        handleCenterClick();
      });
    centerText = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("cursor", "pointer")
      .text(getLabel(initialCenterNode.data) || "Root")
      .on("click", (event) => {
        handleCenterClick();
      });
  } catch (error) {
    console.error("Constructor Error: Failed creating Center elements:", error);
    return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
  }

  // --- The `clicked` function (Handles ONLY zoom-IN animation on arcs) ---
  function clicked(event, p) {
    // p = node to zoom into
    console.log(`'clicked' (D3 Zoom Anim) called: Zooming into ${p.data._id}`);
    // Calculate target positions relative to 'p'
    root.each((d) => {
      d.target = {
        /* target calculation based on p */
      };
    });

    const t = svg.transition().duration(zoomDuration);

    // Transition paths
    pathUpdate
      .transition(t)
      .tween("data", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (time) => {
          d.current = i(time);
        };
      })
      // *** HIDE center node (p) during zoom animation ***
      .attr("fill-opacity", (d) =>
        d.data._id === p.data._id
          ? 0
          : arcVisible(d.target)
            ? d.children
              ? 0.6
              : 0.4
            : 0,
      )
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      .attrTween("d", (d) => () => arc(d));

    // Transition labels
    labelUpdate
      .transition(t)
      // *** HIDE center node's (p) label during zoom animation ***
      .attr("fill-opacity", (d) =>
        d.data._id === p.data._id ? 0 : +labelVisible(d.target),
      )
      .attrTween("transform", (d) => () => labelTransform(d.current));

    // Transition Center Text & Cursor
    centerText.transition(t).text(getLabel(p.data));
    updateCursor(p);
  }

  // --- Helper Functions ---
  function arcVisible(d_pos) {
    if (
      !d_pos ||
      typeof d_pos.y1 === "undefined" ||
      typeof d_pos.y0 === "undefined" ||
      typeof d_pos.x1 === "undefined" ||
      typeof d_pos.x0 === "undefined"
    )
      return false;
    return d_pos.y1 > 0 && d_pos.y1 <= 3 && d_pos.x1 > d_pos.x0;
  }
  function labelVisible(d_pos) {
    if (
      !d_pos ||
      typeof d_pos.y1 === "undefined" ||
      typeof d_pos.y0 === "undefined" ||
      typeof d_pos.x1 === "undefined" ||
      typeof d_pos.x0 === "undefined"
    )
      return false;
    return (
      arcVisible(d_pos) && (d_pos.y1 - d_pos.y0) * (d_pos.x1 - d_pos.x0) > 0.03
    );
  }
  function labelTransform(d_pos) {
    if (
      !d_pos ||
      typeof d_pos.x0 === "undefined" ||
      typeof d_pos.x1 === "undefined" ||
      typeof d_pos.y0 === "undefined" ||
      typeof d_pos.y1 === "undefined"
    )
      return `translate(0,0)`;
    const x = (((d_pos.x0 + d_pos.x1) / 2) * 180) / Math.PI;
    const y = ((d_pos.y0 + d_pos.y1) / 2) * radius;
    if (isNaN(x) || isNaN(y)) return `translate(0,0)`;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }
  function updateCursor(p) {
    const cursorStyle =
      !p || typeof p.depth === "undefined" || p.depth === 0
        ? "default"
        : "pointer";
    if (parentCircle) parentCircle.style("cursor", cursorStyle);
    if (centerText) centerText.style("cursor", cursorStyle);
  }

  // --- Apply Initial State & Fade-In ---
  // This section sets the final appearance based on calculated d.current positions.
  try {
    console.log("Constructor: Applying final state and initiating fade-in...");
    // Select existing elements (those NOT in pathEnter selection)
    const pathExisting = pathUpdate.filter(function () {
      return pathEnter.nodes().indexOf(this) === -1;
    });
    const labelExisting = labelUpdate.filter(function () {
      return labelEnter.nodes().indexOf(this) === -1;
    });

    // Update existing paths instantly, HIDING the center one
    pathExisting
      .attr("d", arc)
      // *** HIDE center node (zoomedNodeId) if it exists ***
      .attr("fill-opacity", (d) =>
        d.data._id === zoomedNodeId
          ? 0
          : arcVisible(d.current)
            ? d.children
              ? 0.6
              : 0.4
            : 0,
      )
      .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"));

    // Fade in new paths, HIDING the center one if it happens to be new (unlikely but safe)
    if (pathEnter && !pathEnter.empty()) {
      pathEnter
        .transition("fadein")
        .delay(fadeInDelay)
        .duration(fadeInDuration)
        // *** HIDE center node (zoomedNodeId) even during fade-in ***
        .attr("fill-opacity", (d) =>
          d.data._id === zoomedNodeId
            ? 0
            : arcVisible(d.current)
              ? d.children
                ? 0.6
                : 0.4
              : 0,
        )
        .attr("pointer-events", (d) =>
          arcVisible(d.current) ? "auto" : "none",
        );
    } else {
      console.log("Constructor: No entering paths found for fade-in.");
    }

    // Update existing labels instantly, HIDING the center one
    labelExisting
      .attr("transform", (d) => labelTransform(d.current))
      // *** HIDE center node's (zoomedNodeId) label if it exists ***
      .attr("fill-opacity", (d) =>
        d.data._id === zoomedNodeId ? 0 : +labelVisible(d.current),
      );

    // Fade in new labels, HIDING the center one
    if (labelEnter && !labelEnter.empty()) {
      labelEnter
        .transition("fadein_label")
        .delay(fadeInDelay)
        .duration(fadeInDuration)
        // *** HIDE center node's (zoomedNodeId) label even during fade-in ***
        .attr("fill-opacity", (d) =>
          d.data._id === zoomedNodeId ? 0 : +labelVisible(d.current),
        );
    } else {
      console.log("Constructor: No entering labels found for fade-in.");
    }

    updateCursor(initialCenterNode);
    console.log("Constructor: Final state and fade-in applied/initiated.");
  } catch (error) {
    console.error(
      "Constructor Error: Failed applying final state/fade-in:",
      error,
    );
  }

  // --- Return ---
  console.log("--- SunburstConstructor Finished ---");
  const finalSvgNode = svg ? svg.node() : null;
  if (!finalSvgNode) {
    console.error("Constructor Error: Returning null SVG node!");
  } else {
    console.log("Constructor: Returning valid SVGElement.");
  }
  return { svgNode: finalSvgNode, hierarchyRoot: root };
}

export default SunburstConstructor;
