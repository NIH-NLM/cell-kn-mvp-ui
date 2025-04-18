import * as d3 from "d3";

/**
 * Creates or updates a D3 Sunburst chart.
 * Initializes view based on zoomedNodeId.
 * Handles arc click zoom animation. Center click triggers React callback.
 * Includes fade-in for new elements.
 * Adds extensive logging and basic error handling.
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
    data, size, handleSunburstClick, handleNodeClick,
    handleCenterClick, zoomedNodeId
) {
  // --- Configuration ---
  const width = size;
  const height = width;
  const radius = width / 6; // Adjusted radius
  const zoomDuration = 750;
  const fadeInDelay = 100;
  const fadeInDuration = 600;

  console.log("--- SunburstConstructor Executing (State: React Zoom State Mgmt + Logging + Fixed Color) ---");
  console.log("Constructor: Received zoomedNodeId:", zoomedNodeId);

  // --- Basic Data Check ---
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      console.error("Constructor Error: Invalid or missing data received!", data);
      return { svgNode: null, hierarchyRoot: null };
  }
  console.log(`Constructor: Data received (keys: ${Object.keys(data)}, children count: ${data.children ? data.children.length : 'N/A'})`);

  // --- D3 Setup (Hierarchy, Partition, Initial Positions) ---
  let hierarchy, root, pNode = null; // Declare variables
  // *** Declare color scale here, in the main function scope ***
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, (data.children || []).length + 1));
  console.log("Constructor: Color scale created.");

  try {
      console.log("Constructor: Creating hierarchy...");
      hierarchy = d3.hierarchy(data)
          .sum(d => d.value || 1)
          .sort((a, b) => (b.value || 1) - (a.value || 1));
      console.log(`Constructor: Hierarchy created (root label: ${hierarchy.data.label}, descendants: ${hierarchy.descendants().length})`);

      if (hierarchy.value === 0 && hierarchy.children && hierarchy.children.length === 0) {
          console.warn("Constructor Warning: Hierarchy created, but root has no value and no children. May result in empty partition.");
      }

      console.log("Constructor: Creating partition layout...");
      root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);
      console.log(`Constructor: Partition layout created (root x0,x1: ${root.x0},${root.x1} | y0,y1: ${root.y0},${root.y1})`);

      // --- Calculate Initial 'current' Positions based on zoomedNodeId ---
      console.log("Constructor: Calculating initial positions...");
      pNode = zoomedNodeId ? root.find(d => d.data._id === zoomedNodeId) : null;
      if (zoomedNodeId && !pNode) {
          console.warn(`Constructor Warning: Could not find node with zoomedNodeId "${zoomedNodeId}" in the hierarchy.`);
      }
      root.each(d => {
        if (pNode) { // Calculate zoomed position
          const targetX0 = Math.max(0, Math.min(1, (d.x0 - pNode.x0) / (pNode.x1 - pNode.x0))) * 2 * Math.PI;
          const targetX1 = Math.max(0, Math.min(1, (d.x1 - pNode.x0) / (pNode.x1 - pNode.x0))) * 2 * Math.PI;
          const targetY0 = Math.max(0, d.y0 - pNode.depth);
          const targetY1 = Math.max(0, d.y1 - pNode.depth);
          d.current = { x0: isNaN(targetX0) ? 0 : targetX0, x1: isNaN(targetX1) ? 0 : targetX1, y0: isNaN(targetY0) ? 0 : targetY0, y1: isNaN(targetY1) ? 0 : targetY1 };
        } else { // Default (root) position
          d.current = { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };
        }
      });
      console.log("Constructor: Initial positions calculated. Centered on:", pNode ? pNode.data.label : 'Root');

  } catch(error) {
      console.error("Constructor Error: Failed during D3 hierarchy/partition/position setup:", error);
      try { console.error("Constructor Error: Data causing issue:", JSON.stringify(data).substring(0, 1000)); } catch { console.error("Constructor Error: Could not stringify problematic data."); }
      return { svgNode: null, hierarchyRoot: null };
  }

  // --- Arc Generator ---
  const arc = d3.arc()
    .startAngle(d => d.current ? d.current.x0 : 0).endAngle(d => d.current ? d.current.x1 : 0)
    .padAngle(d => d.current ? Math.min((d.current.x1 - d.current.x0) / 2, 0.005) : 0).padRadius(radius * 1.5)
    .innerRadius(d => d.current ? d.current.y0 * radius : 0).outerRadius(d => d.current ? Math.max(d.current.y0 * radius, d.current.y1 * radius - 1) : 0);

  // --- SVG Setup ---
  let svg;
  try {
      console.log("Constructor: Creating SVG element...");
      svg = d3.create("svg").attr("viewBox", [-width / 2, -height / 2, width, width]).style("font", "12px sans-serif").style("max-height", "100vh").style("display", "block").style("margin", "auto").style("background-color", "#f9f9f9");
      console.log("Constructor: SVG element created.");
  } catch (error) {
       console.error("Constructor Error: Failed creating SVG:", error);
       return { svgNode: null, hierarchyRoot: root };
  }

  const g = svg.append("g");

  // --- Path Elements ---
  let pathUpdate, pathEnter;
  try {
      console.log("Constructor: Processing Path elements...");
      const pathGroup = g.append("g").attr("fill-rule", "evenodd");
      const pathData = root.descendants().slice(1);
      console.log(`Constructor: Data length for paths: ${pathData.length}`);
      if (pathData.length === 0) { console.warn("Constructor Warning: No descendant data found for paths."); }
      const path = pathGroup.selectAll("path").data(pathData, d => d.data._id);

      path.exit().remove();

      pathEnter = path.enter().append("path")
          // *** Use the 'color' function defined in the outer scope ***
          .attr("fill", d => { let a = d; while (a.depth > 1) a = a.parent; return color(a.data.label || a.data._id); })
          .attr("fill-opacity", 0)
          .attr("pointer-events", "none")
          .style("cursor", d => (d.children || d.data._hasChildren) ? "pointer" : "default")
          .attr("d", arc);

      const format = d3.format(",d");
      pathEnter.append("title").text(d => `${d.ancestors().map(a => a.data.label).reverse().join("/")}\nValue: ${format(d.value || 1)}`);

      pathUpdate = path.merge(pathEnter);

      pathUpdate.on("contextmenu", function (event, d) { event.preventDefault(); handleSunburstClick(event, d); })
                .on("click", (event, d) => { if (handleNodeClick(event, d)) { clicked(event, d); } });
      console.log(`Constructor: Paths processed. Update selection size: ${pathUpdate.size()}, Enter selection size: ${pathEnter.size()}`);
  } catch(error) {
      console.error("Constructor Error: Failed processing Paths:", error);
      return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
  }

  // --- Label Elements ---
  let labelUpdate, labelEnter;
   try {
      console.log("Constructor: Processing Label elements...");
      const labelGroup = g.append("g").attr("pointer-events", "none").attr("text-anchor", "middle").style("user-select", "none");
      const labelData = root.descendants().slice(1);
      console.log(`Constructor: Data length for labels: ${labelData.length}`);
      if (labelData.length === 0) { console.warn("Constructor Warning: No descendant data found for labels."); }
      const label = labelGroup.selectAll("text").data(labelData, d => d.data._id);

      label.exit().remove();

      labelEnter = label.enter().append("text")
          .attr("dy", "0.35em").attr("fill-opacity", 0)
          .attr("transform", d => labelTransform(d.current))
          .text(d => { const lbl = d.data.label || ""; return lbl.length > 10 ? lbl.slice(0, 9) + '...' : lbl; });

      labelUpdate = label.merge(labelEnter);
      console.log(`Constructor: Labels processed. Update selection size: ${labelUpdate.size()}, Enter selection size: ${labelEnter.size()}`);
   } catch (error) {
        console.error("Constructor Error: Failed processing Labels:", error);
        return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
   }

  // --- Center Elements ---
  const initialCenterNode = pNode || root;
  let parentCircle, centerText;
  try {
      console.log("Constructor: Creating Center elements...");
      parentCircle = svg.append("circle").attr("r", radius).attr("fill", "none").attr("pointer-events", "all").style("cursor", "pointer")
          .on("click", (event) => { handleCenterClick(); });
      centerText = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").style("font-size", "14px").style("font-weight", "bold").style("cursor", "pointer")
          .text(initialCenterNode.data.label || "Root")
          .on("click", (event) => { handleCenterClick(); });
      console.log("Constructor: Center elements created.");
  } catch (error) {
        console.error("Constructor Error: Failed creating Center elements:", error);
        return { svgNode: svg ? svg.node() : null, hierarchyRoot: root };
  }

  // --- The `clicked` function (Handles ONLY zoom-IN animation on arcs) ---
  function clicked(event, p) {
    console.log(`'clicked' (D3 Zoom Anim) called: Zooming into ${p.data._id}`);
    root.each(d => { d.target = { /* target calculation based on p */ }; }); // Calculate zoom targets
    const t = svg.transition().duration(zoomDuration);
    // Transition paths
    pathUpdate.transition(t)
        .tween("data", d => { const i = d3.interpolate(d.current, d.target); return time => { d.current = i(time); }; })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
        .attrTween("d", d => () => arc(d));
    // Transition labels
    labelUpdate.transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
    // Transition Center Text & Cursor
    centerText.transition(t).text(p.data.label);
    updateCursor(p);
  }

  // --- Helper Functions ---
  function arcVisible(d_pos) { if (!d_pos || typeof d_pos.y1 === 'undefined' || typeof d_pos.y0 === 'undefined' || typeof d_pos.x1 === 'undefined' || typeof d_pos.x0 === 'undefined') return false; return d_pos.y1 > 0 && d_pos.y1 <= 3 && d_pos.x1 > d_pos.x0; }
  function labelVisible(d_pos) { if (!d_pos || typeof d_pos.y1 === 'undefined' || typeof d_pos.y0 === 'undefined' || typeof d_pos.x1 === 'undefined' || typeof d_pos.x0 === 'undefined') return false; return arcVisible(d_pos) && (d_pos.y1 - d_pos.y0) * (d_pos.x1 - d_pos.x0) > 0.03; }
  function labelTransform(d_pos) { if (!d_pos || typeof d_pos.x0 === 'undefined' || typeof d_pos.x1 === 'undefined' || typeof d_pos.y0 === 'undefined' || typeof d_pos.y1 === 'undefined') return `translate(0,0)`; const x = (((d_pos.x0 + d_pos.x1) / 2) * 180) / Math.PI; const y = ((d_pos.y0 + d_pos.y1) / 2) * radius; if (isNaN(x) || isNaN(y)) return `translate(0,0)`; return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`; }
  function updateCursor(p) { const cursorStyle = (!p || typeof p.depth === 'undefined' || p.depth === 0) ? "default" : "pointer"; if (parentCircle) parentCircle.style("cursor", cursorStyle); if (centerText) centerText.style("cursor", cursorStyle); }

  // --- Apply Initial State & Fade-In ---
  try {
      console.log("Constructor: Applying final state and initiating fade-in...");
      // Re-select existing elements if needed (safer after potential errors)
      const pathExisting = pathUpdate.filter(function(d) { return pathEnter.nodes().indexOf(this) === -1; });
      const labelExisting = labelUpdate.filter(function(d) { return labelEnter.nodes().indexOf(this) === -1; });

      // Update existing elements instantly
      pathExisting
          .attr("d", arc)
          .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
          .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none");
      labelExisting
          .attr("transform", d => labelTransform(d.current))
          .attr("fill-opacity", d => +labelVisible(d.current));

      // Apply delayed fade-in ONLY to newly ENTERED elements
      if (pathEnter && !pathEnter.empty()) {
          pathEnter.transition("fadein").delay(fadeInDelay).duration(fadeInDuration)
              .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
              .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none");
      } else { console.log("Constructor: No entering paths found for fade-in."); }

      if (labelEnter && !labelEnter.empty()) {
          labelEnter.transition("fadein_label").delay(fadeInDelay).duration(fadeInDuration)
              .attr("fill-opacity", d => +labelVisible(d.current));
      } else { console.log("Constructor: No entering labels found for fade-in."); }

      updateCursor(initialCenterNode);
      console.log("Constructor: Final state and fade-in applied/initiated.");
  } catch (error) {
       console.error("Constructor Error: Failed applying final state/fade-in:", error);
  }

  // --- Return ---
  console.log("--- SunburstConstructor Finished ---");
  const finalSvgNode = svg ? svg.node() : null;
  if (!finalSvgNode) { console.error("Constructor Error: Returning null SVG node!"); }
  else { console.log("Constructor: Returning valid SVGElement."); }
  return { svgNode: finalSvgNode, hierarchyRoot: root };
}

export default SunburstConstructor;