import * as d3 from "d3";

function SunburstConstructor(
  data,
  size,
  handleSunburstClick,
  handleNodeClick,
  previousHierarchyRoot,
) {
  // Specify the chart’s dimensions.
  const width = size;
  const height = width;
  const radius = width / 8;

  // Create the color scale.
  const color = d3.scaleOrdinal(
    // Handle case where root has no children initially
    d3.quantize(d3.interpolateRainbow, (data.children || []).length + 1),
  );

  // Compute the layout.
  const hierarchy = d3
    .hierarchy(data)
    .sum((d) => d.value || 1) // Use value from data if available
    .sort((a, b) => (b.value || 1) - (a.value || 1)); // Sort by value

  const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(
    hierarchy,
  );
  root.each((d) => (d.current = d)); // Initialize current position

  // Create the arc generator.
  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  // Create the SVG container.
  const svg = d3
    .create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, width])
    .style("font", "12px sans-serif")
    .style("max-height", "100vh"); // Consider setting fixed height/width styles

  // Append the arcs.
  const path = svg
    .append("g")
    .selectAll("path")
    .data(root.descendants().slice(1)) // Exclude root circle area
    .join("path")
    .attr("fill", (d) => {
      // Traverse up to find the first ancestor with children for color consistency
      let colorNode = d;
      while (colorNode.depth > 1) colorNode = colorNode.parent;
      return color(colorNode.data.label);
    })
    // Indicate visually if children can be loaded
    .attr("fill-opacity", (d) =>
      arcVisible(d.current)
        ? d.data._hasChildren && !d.children
          ? 0.8
          : d.children
            ? 0.6
            : 0.4
        : 0,
    ) // Higher opacity if loadable
    .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
    .attr("d", (d) => arc(d.current))
    // Add cursor style based on potential actions
    .style("cursor", (d) => {
      if (d.data._hasChildren && !d.children) return "pointer"; // Loadable
      if (d.children) return "pointer"; // Zoomable
      return "default"; // Leaf node
    });

  // --- CLICK HANDLERS ---

  // RIGHT CLICK: Context Menu
  path.on("contextmenu", function (event, d) {
    event.preventDefault(); // Prevent default browser context menu
    handleSunburstClick(event, d); // Pass the D3 node `d`
  });

  // LEFT CLICK: Zoom or Load
  path.on("click", (event, d) => {
    // Call the React handler first to check if data needs loading
    const shouldZoom = handleNodeClick(event, d);

    if (shouldZoom) {
      clicked(event, d); // Zoom function
    }
  });

  // Tooltip
  const format = d3.format(",d");
  path.append("title").text(
    (d) =>
      `${d
        .ancestors()
        .map((a) => a.data.label)
        .reverse()
        .join(
          "/",
        )}\nValue: ${format(d.value || 1)} ${d.data._hasChildren && !d.children ? "(Click to load children)" : ""}`,
  );

  // Labels
  const label = svg
    .append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", (d) => +labelVisible(d.current))
    .attr("transform", (d) => labelTransform(d.current))
    .text((d) =>
      d.data.label.length > 10
        ? d.data.label.slice(0, 9) + "..."
        : d.data.label,
    ); // Truncate long labels

  // Center circle for zooming out / root info
  const parent = svg
    .append("circle")
    .datum(root)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", (event, d) => {
      // Clicking center always zooms out to parent or triggers zoom on root
      clicked(event, d);
    });

  // Center Text
  const centerText = svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("cursor", "default") // Default cursor for center
    .text(root.data.label) // Start with root label
    .on("click", (event) => {
      // Clicking text zooms out to parent
      clicked(event, parent.datum());
    });

  // --- Internal Zoom Function ---
  function clicked(event, p) {
    // Update parent circle datum for zoom-out clicks
    parent.datum(p.parent || root);

    // Transition calculations
    root.each(
      (d) =>
        (d.target = {
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        }),
    );

    const t = svg.transition().duration(750);

    // Transition paths
    path
      .transition(t)
      .tween("data", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (t) => (d.current = i(t));
      })
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.target)
          ? d.data._hasChildren && !d.children
            ? 0.8
            : d.children
              ? 0.6
              : 0.4
          : 0,
      )
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      .attrTween("d", (d) => () => arc(d.current));

    // Transition labels
    label
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      })
      .transition(t)
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));

    // Update center text and cursor for center circle/text
    centerText.text(p.data.label); // Update center text to focused node
    updateCursor(p); // Update cursor for center circle/text
  }

  // --- Helper Functions ---
  function arcVisible(d) {
    // Visibility depth
    let depth = 3;
    return d.y1 <= depth && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    // Label visibility
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  function updateCursor(p) {
    // Change cursor for the center elements based on current zoom level 'p'
    const cursorStyle = p.depth === 0 ? "default" : "pointer"; // Pointer if zoomed in
    parent.style("cursor", cursorStyle);
    centerText.style("cursor", cursorStyle);
  }

  // Return the SVG node *and* the calculated hierarchy root
  return { svgNode: svg.node(), hierarchyRoot: root };
}

export default SunburstConstructor;
