import * as d3 from "d3";

/**
 * Creates or updates a D3 Sunburst chart.
 * Handles zoom animation via 'clicked'.
 * Includes standard D3 update pattern with key function.
 * Adds a delayed fade-in transition for newly entered elements.
 * (Version before 'stable center' / 'interrupt' logic)
 *
 * @param {object} data The hierarchical data object for the sunburst.
 * @param {number} size The outer diameter of the chart.
 * @param {function} handleSunburstClick Callback for right-click events (event, d3Node).
 * @param {function} handleNodeClick Callback for left-click events, returns true if internal zoom should proceed (event, d3Node).
 * @param {object} [previousHierarchyRoot] Optional: The hierarchy root from the previous render (for advanced transitions).
 * @returns {object} An object containing the { svgNode, hierarchyRoot }.
 */
function SunburstConstructor(
    data, size, handleSunburstClick, handleNodeClick,
    previousHierarchyRoot
    // No zoomedNodeId parameter in this version
) {
  // --- Configuration ---
  const width = size;
  const height = width;
  const radius = width / 6; // Adjusted radius
  const zoomDuration = 750; // Duration for zoom animation (ms)
  const fadeInDelay = zoomDuration * 0.8; // Start fade-in near end of zoom
  const fadeInDuration = 500; // Duration for fade-in animation (ms)

  console.log("--- SunburstConstructor Executing (State: Post L2 Load, Pre Stable Center) ---");

  // --- D3 Setup ---
  const color = d3.scaleOrdinal(
    d3.quantize(d3.interpolateRainbow, (data.children || []).length + 1)
  );
  const hierarchy = d3.hierarchy(data)
    .sum(d => d.value || 1)
    .sort((a, b) => (b.value || 1) - (a.value || 1));
  const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);
  // Initialize 'current' position based on the current layout
  root.each(d => {
      d.current = { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };
  });
  // Arc generator uses 'current' data for drawing during transitions
  const arc = d3.arc()
    .startAngle(d => d.current.x0)
    .endAngle(d => d.current.x1)
    .padAngle(d => Math.min((d.current.x1 - d.current.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.current.y0 * radius)
    .outerRadius(d => Math.max(d.current.y0 * radius, d.current.y1 * radius - 1));

  // --- SVG Setup ---
  const svg = d3.create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, width])
    .style("font", "12px sans-serif")
    .style("max-height", "100vh")
    .style("display", "block")
    .style("margin", "auto");
  const g = svg.append("g");

  // --- Path Elements (Enter/Update/Exit with Key) ---
  const pathGroup = g.append("g").attr("fill-rule", "evenodd");
  const path = pathGroup
    .selectAll("path")
    .data(root.descendants().slice(1), d => d.data._id); // Key function

  // Exit Selection
  path.exit()
    .transition("exit") // Basic fade out exit
    .duration(zoomDuration / 2)
    .attr("fill-opacity", 0)
    .remove();

  // Enter Selection (New elements, often grandchildren 'G')
  const pathEnter = path.enter().append("path")
    .attr("fill", d => { let a = d; while (a.depth > 1) a = a.parent; return color(a.data.label || a.data._id); })
    .attr("fill-opacity", 0) // *** START INVISIBLE for fade-in ***
    .attr("pointer-events", "none")
    .style("cursor", d => (d.children || d.data._hasChildren) ? "pointer" : "default")
    .attr("d", arc); // Initial draw based on d.current

  const format = d3.format(",d");
  pathEnter.append("title").text(d => `${d.ancestors().map(a => a.data.label).reverse().join("/")}\nValue: ${format(d.value || 1)}`);

  // Merge Enter and Update
  const pathUpdate = path.merge(pathEnter);

  // Apply event handlers to the merged selection
  pathUpdate.on("contextmenu", function (event, d) { event.preventDefault(); handleSunburstClick(event, d); })
            .on("click", (event, d) => { if (handleNodeClick(event, d)) { clicked(event, d); } });

  // --- Label Elements (Enter/Update/Exit with Key) ---
  const labelGroup = g.append("g").attr("pointer-events", "none").attr("text-anchor", "middle").style("user-select", "none");
  const label = labelGroup
    .selectAll("text")
    .data(root.descendants().slice(1), d => d.data._id); // Key function

  // Exit Selection
  label.exit()
      .transition("exit_label")
      .duration(zoomDuration / 2)
      .attr("fill-opacity", 0)
      .remove();

  // Enter Selection
  const labelEnter = label.enter().append("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", 0) // *** START INVISIBLE for fade-in ***
      .attr("transform", d => labelTransform(d.current)) // Initial position
      .text(d => { const lbl = d.data.label || ""; return lbl.length > 10 ? lbl.slice(0, 9) + '...' : lbl; });

  // Merge Enter and Update
  const labelUpdate = label.merge(labelEnter);

  // --- Center Elements ---
  const parent = svg.append("circle").datum(root).attr("r", radius).attr("fill", "none").attr("pointer-events", "all").style("cursor", "pointer")
      .on("click", (event, d) => { clicked(event, d.parent || d); }); // Zoom to parent on click
  const centerText = svg.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").style("font-size", "14px").style("font-weight", "bold").style("cursor", "pointer")
      .text(root.data.label)
      .on("click", (event) => { clicked(event, parent.datum().parent || parent.datum()); }); // Zoom to parent

  // --- The `clicked` function (Handles IMMEDIATE zoom animation) ---
  // This function animates the view to center on node 'p'.
  // It also implicitly handles updates if data changed just before the click.
  function clicked(event, p) {
    console.log(`'clicked' function called: Zooming into ${p.data._id}`);
    parent.datum(p.parent || p); // Update center circle's datum for zoom-out reference

    // Calculate target coordinates for the zoom-in view relative to 'p'
    root.each(d => {
        d.target = { // Store target positions based on zooming to p
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        };
    });

    // --- Main Zoom Transition ---
    const t = svg.transition().duration(zoomDuration);

    // 1. Transition ALL paths (merged selection) towards their 'target' state
    pathUpdate.transition(t)
        .tween("data", d => { // Interpolate the 'current' data object
            const i = d3.interpolate(d.current, d.target);
            return time => { d.current = i(time); }; // Update d.current throughout tween
        })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0) // Target opacity
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none") // Target events
        .attrTween("d", d => () => arc(d)); // Redraw arc based on interpolated d.current

    // 2. Transition ALL labels (merged selection) towards their 'target' state
    labelUpdate.transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target)) // Target opacity
        .attrTween("transform", d => () => labelTransform(d.current)); // Update transform based on d.current

    // 3. Update Center Text & Cursor
    centerText.transition(t).text(p.data.label);
    updateCursor(p);
  }

  // --- Helper Functions ---
  function arcVisible(d_layout) { return d_layout.y1 <= 3 && d_layout.y0 >= 1 && d_layout.x1 > d_layout.x0; }
  function labelVisible(d_layout) { return arcVisible(d_layout) && (d_layout.y1 - d_layout.y0) * (d_layout.x1 - d_layout.x0) > 0.03; }
  function labelTransform(d_current) { const x = (((d_current.x0 + d_current.x1) / 2) * 180) / Math.PI; const y = ((d_current.y0 + d_current.y1) / 2) * radius; return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`; }
  function updateCursor(p) { const cursorStyle = p.depth === 0 ? "default" : "pointer"; parent.style("cursor", cursorStyle); centerText.style("cursor", cursorStyle); }

  // --- Apply Initial State & Delayed Fade-In for New Elements ---
  // This runs every time the constructor is called (initial & updates).
  // It sets the final state for existing elements and starts the fade for new ones.
  console.log("Applying final state and initiating fade-in for new elements...");

  // Set final attributes for EXISTING elements (update selection 'path') instantly.
  // These elements already exist from the previous render.
  path
      .attr("d", arc) // Update shape based on new layout (using d.current)
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none");

  // Apply delayed fade-in ONLY to newly ENTERED paths
  pathEnter
      .transition("fadein") // Named transition
      .delay(fadeInDelay)
      .duration(fadeInDuration)
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0) // Fade to final opacity
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none"); // Enable events after fade


  // Set final attributes for EXISTING labels instantly.
  label
      .attr("transform", d => labelTransform(d.current))
      .attr("fill-opacity", d => +labelVisible(d.current));

  // Apply delayed fade-in ONLY to newly ENTERED labels
  labelEnter
      .transition("fadein_label") // Named transition
      .delay(fadeInDelay)
      .duration(fadeInDuration)
      .attr("fill-opacity", d => +labelVisible(d.current)); // Fade to final opacity

  // Ensure Center Text and Cursor are correct for the current root
  centerText.text(root.data.label);
  updateCursor(root);

  // --- Return SVG Node and Hierarchy ---
  console.log("--- SunburstConstructor Finished (State: Post L2 Load, Pre Stable Center) ---");
  return { svgNode: svg.node(), hierarchyRoot: root };
}

export default SunburstConstructor;