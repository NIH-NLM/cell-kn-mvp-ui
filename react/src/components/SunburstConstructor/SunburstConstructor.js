import * as d3 from "d3";

/**
 * Creates or updates a D3 Sunburst chart.
 * If zoomedNodeId is provided, initializes the view centered on that node.
 * Includes fade-in for new elements.
 *
 * @param {object} data The hierarchical data object.
 * @param {number} size The outer diameter.
 * @param {function} handleSunburstClick Callback for right-click.
 * @param {function} handleNodeClick Callback for left-click.
 * @param {object} [previousHierarchyRoot] Optional: Previous hierarchy root.
 * @param {string|null} [zoomedNodeId] Optional: The ID of the node to be centered initially.
 * @returns {object} { svgNode, hierarchyRoot }.
 */
function SunburstConstructor(
    data, size, handleSunburstClick, handleNodeClick,
    previousHierarchyRoot, zoomedNodeId // <<< Accept zoomedNodeId
) {
  // --- Configuration ---
  const width = size;
  const height = width;
  const radius = width / 6;
  const zoomDuration = 750;
  const fadeInDelay = 100;
  const fadeInDuration = 600;

  console.log("--- SunburstConstructor Executing (State: Attempting Stable Center Init) ---");
  console.log("Received zoomedNodeId:", zoomedNodeId);

  // --- D3 Setup ---
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, (data.children || []).length + 1));
  const hierarchy = d3.hierarchy(data).sum(d => d.value || 1).sort((a, b) => (b.value || 1) - (a.value || 1));
  // Calculate the canonical layout positions first
  const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);

  // --- Calculate Initial 'current' Positions ---
  // Find the node to center on, if specified
  const pNode = zoomedNodeId ? root.find(d => d.data._id === zoomedNodeId) : null;
  console.log(`Found node for zoomedNodeId (${zoomedNodeId}):`, pNode ? pNode.data.label : 'None');

  // Set initial d.current positions. If pNode found, calculate zoomed positions.
  root.each(d => {
    if (pNode) {
      // Calculate positions relative to pNode (same logic as 'clicked' target calculation)
      const targetX0 = Math.max(0, Math.min(1, (d.x0 - pNode.x0) / (pNode.x1 - pNode.x0))) * 2 * Math.PI;
      const targetX1 = Math.max(0, Math.min(1, (d.x1 - pNode.x0) / (pNode.x1 - pNode.x0))) * 2 * Math.PI;
      const targetY0 = Math.max(0, d.y0 - pNode.depth);
      const targetY1 = Math.max(0, d.y1 - pNode.depth);
      d.current = { x0: targetX0, x1: targetX1, y0: targetY0, y1: targetY1 };
       // console.log(`  Set Initial Current (Zoomed) for ${d.data._id}: x0=${targetX0.toFixed(2)}, x1=${targetX1.toFixed(2)}, y0=${targetY0.toFixed(2)}, y1=${targetY1.toFixed(2)}`);
    } else {
      // Default initial position matches the canonical layout
      d.current = { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };
    }
  });


  // Arc generator - Uses d.current which is now pre-calculated
  const arc = d3.arc()
    .startAngle(d => d.current.x0).endAngle(d => d.current.x1)
    .padAngle(d => Math.min((d.current.x1 - d.current.x0) / 2, 0.005)).padRadius(radius * 1.5)
    .innerRadius(d => d.current.y0 * radius).outerRadius(d => Math.max(d.current.y0 * radius, d.current.y1 * radius - 1));

  // --- SVG Setup ---
  const svg = d3.create("svg").attr("viewBox", [-width / 2, -height / 2, width, width]).style("font", "12px sans-serif").style("max-height", "100vh").style("display", "block").style("margin", "auto");
  const g = svg.append("g");

  // --- Path Elements (Enter/Update/Exit) ---
  const pathGroup = g.append("g").attr("fill-rule", "evenodd");
  const path = pathGroup.selectAll("path").data(root.descendants().slice(1), d => d.data._id);

  path.exit().remove(); // Simple remove

  const pathEnter = path.enter().append("path")
    .attr("fill", d => { let a = d; while (a.depth > 1) a = a.parent; return color(a.data.label || a.data._id); })
    .attr("fill-opacity", 0) // START INVISIBLE for fade-in
    .attr("pointer-events", "none")
    .style("cursor", d => (d.children || d.data._hasChildren) ? "pointer" : "default")
    .attr("d", arc); // Initial draw based on pre-calculated d.current

  const format = d3.format(",d");
  pathEnter.append("title").text(d => `${d.ancestors().map(a => a.data.label).reverse().join("/")}\nValue: ${format(d.value || 1)}`);

  const pathUpdate = path.merge(pathEnter);

  // Event Handlers
  pathUpdate.on("contextmenu", function (event, d) { event.preventDefault(); handleSunburstClick(event, d); })
            .on("click", (event, d) => { if (handleNodeClick(event, d)) { clicked(event, d); } });


  // --- Label Elements (Enter/Update/Exit) ---
  const labelGroup = g.append("g").attr("pointer-events", "none").attr("text-anchor", "middle").style("user-select", "none");
  const label = labelGroup.selectAll("text").data(root.descendants().slice(1), d => d.data._id);

  label.exit().remove();

  const labelEnter = label.enter().append("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", 0) // START INVISIBLE
      .attr("transform", d => labelTransform(d.current)) // Initial position based on pre-calculated d.current
      .text(d => { const lbl = d.data.label || ""; return lbl.length > 10 ? lbl.slice(0, 9) + '...' : lbl; });

  const labelUpdate = label.merge(labelEnter);


  // --- Center Elements ---
  // Initial state of center elements depends on whether we pre-zoomed
  const initialCenterNode = pNode || root; // Use pNode if found, else root
  const parentDatumNode = initialCenterNode.parent || initialCenterNode; // For zoom-out click

  const parent = svg.append("circle")
      .datum(parentDatumNode) // Set initial datum correctly for zoom-out
      .attr("r", radius).attr("fill", "none").attr("pointer-events", "all").style("cursor", "pointer")
      .on("click", (event, d) => { clicked(event, d); }); // Click datum (parent) to zoom to it

  const centerText = svg.append("text")
      .attr("text-anchor", "middle").attr("dy", "0.35em")
      .style("font-size", "14px").style("font-weight", "bold").style("cursor", "pointer")
      .text(initialCenterNode.data.label) // Initial text matches initial center
      .on("click", (event) => { clicked(event, parent.datum()); }); // Click zooms to parent datum


  // --- The `clicked` function (Handles zoom animation triggered AFTER initial render) ---
  function clicked(event, p) { // p = node to zoom into
    console.log(`'clicked' function called: Zooming into ${p.data._id}`);
    parent.datum(p.parent || p); // Update center circle's datum for next zoom-out

    // Calculate target positions for the zoom relative to 'p'
    root.each(d => { d.target = { /* target calculation based on p */ }; });

    const t = svg.transition().duration(zoomDuration);

    // Transition paths from their CURRENT state to the new TARGET state
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
  function arcVisible(d_pos) { return d_pos.y1 <= 3 && d_pos.y0 >= 1 && d_pos.x1 > d_pos.x0; }
  function labelVisible(d_pos) { return arcVisible(d_pos) && (d_pos.y1 - d_pos.y0) * (d_pos.x1 - d_pos.x0) > 0.03; }
  function labelTransform(d_pos) { const x = (((d_pos.x0 + d_pos.x1) / 2) * 180) / Math.PI; const y = ((d_pos.y0 + d_pos.y1) / 2) * radius; return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`; }
  function updateCursor(p) { const cursorStyle = p.depth === 0 ? "default" : "pointer"; parent.style("cursor", cursorStyle); centerText.style("cursor", cursorStyle); }


  // --- Apply Initial State & Fade-In for New Elements ---
  // This section now mainly handles the fade-in, as positions are pre-calculated.
  console.log("Applying final state and initiating fade-in...");

  // Update existing elements (instantly set final opacity/events)
  path
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none");
  label
      .attr("fill-opacity", d => +labelVisible(d.current));

  // Apply delayed fade-in ONLY to newly ENTERED elements
  pathEnter
      .transition("fadein")
      .delay(fadeInDelay)
      .duration(fadeInDuration)
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none");
  labelEnter
      .transition("fadein_label")
      .delay(fadeInDelay)
      .duration(fadeInDuration)
      .attr("fill-opacity", d => +labelVisible(d.current));

  // Update center cursor based on initial state
  updateCursor(initialCenterNode);


  // --- Return SVG Node and Hierarchy ---
  console.log("--- SunburstConstructor Finished (State: Attempting Stable Center Init) ---");
  return { svgNode: svg.node(), hierarchyRoot: root };
}

export default SunburstConstructor;