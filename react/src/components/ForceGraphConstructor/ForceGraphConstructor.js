import * as d3 from "d3";

/* Pure Functions */

export function processGraphData(
  existingNodes,
  newNodes,
  nodeId = (d) => d._id,
  labelFn = (d) => d.label,
  color,
  nodeHover,
) {
  const filteredNewNodes = newNodes.filter(
    (newNode) =>
      !existingNodes.some((existing) => existing._id === nodeId(newNode)),
  );
  filteredNewNodes.forEach((newNode) => {
    newNode.id = nodeId(newNode);
    let collection = newNode.id.split("/")[0];
    newNode.nodeHover = nodeHover(newNode);
    newNode.color = color ? color(collection) : null;
    newNode.nodeLabel = labelFn(newNode);
  });
  return existingNodes.concat(filteredNewNodes);
}

export function processGraphLinks(
  existingLinks,
  newLinks,
  nodes,
  linkSource = ({ _from }) => _from,
  linkTarget = ({ _to }) => _to,
  labelFn = (d) => d.label,
) {
  const filteredNewLinks = newLinks.filter((newLink) => {
    // Find corresponding source and target nodes
    const sourceNode = nodes.find((node) => node.id === linkSource(newLink));
    const targetNode = nodes.find((node) => node.id === linkTarget(newLink));

    // Only keep the link if both nodes exist
    if (!sourceNode || !targetNode) return false;

    // Also ensure the link doesn't already exist
    return !existingLinks.some(
      (existing) =>
        existing.source.id === linkSource(newLink) &&
        existing.target.id === linkTarget(newLink),
    );
  });

  filteredNewLinks.forEach((link) => {
    link.source = nodes.find((node) => node.id === linkSource(link));
    link.target = nodes.find((node) => node.id === linkTarget(link));
    link.label = labelFn(link);
  });

  return existingLinks.concat(filteredNewLinks);
}

/* Rendering Functions */

function renderGraph(simulation, nodes, links, d3, containers, options) {
  // Update simulation nodes and links
  simulation.nodes(nodes);
  options.forceLink.links(links);

  // Render nodes
  const nodeSelection = containers.nodeContainer
    .selectAll("g.node")
    .data(nodes, (d) => d.id);

  const nodeEnter = nodeSelection
    .enter()
    .append("g")
    .attr("class", "node")
    .call(options.drag);

  // For each new node, decide whether to render it as a donut
  nodeEnter.each(function (d) {
    const nodeG = d3.select(this);
    if (options.originNodeIds && options.originNodeIds.includes(d.id)) {
      // Outer circle
      nodeG
        .append("circle")
        .attr("r", options.nodeRadius)
        .attr("fill", d.color ? d.color : "#ccc")
        .on("contextmenu", function (event, d) {
          event.preventDefault();
          options.onNodeClick(event, d);
        });
      // Inner circle for donut effect
      nodeG
        .append("circle")
        .attr("r", options.nodeRadius * 0.7)
        .attr("fill", "white")
        .on("contextmenu", function (event, d) {
          event.preventDefault();
          options.onNodeClick(event, d);
        });
    } else {
      // Regular single circle
      nodeG
        .append("circle")
        .attr("r", options.nodeRadius)
        .attr("fill", d.color ? d.color : "#ccc")
        .on("contextmenu", function (event, d) {
          event.preventDefault();
          options.onNodeClick(event, d);
        });
    }
    // Append title for hover and hidden text for the label
    nodeG.append("title").text((d) => d.nodeHover);
    nodeG
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("y", options.nodeRadius + options.nodeFontSize)
      .style("font-size", options.nodeFontSize + "px")
      .style("display", "none")
      .text((d) => d.nodeLabel)
      .call(wrap, 25);

    // Append collection text
    nodeG
      .append("text")
      .attr("class", "collection-label")
      .attr("text-anchor", "middle")
      .attr("y", -(options.nodeRadius + options.nodeFontSize))
      .style("font-size", options.nodeFontSize + "px")
      .style("display", "none")
      .text((d) =>
        options.collectionsMap.has(d._id.split("/")[0])
          ? options.collectionsMap.get(d._id.split("/")[0])["abbreviated_name"]
          : d._id.split("/")[0],
      )
      .call(wrap, 25);
  });

  // Render links
  const linkSelection = containers.linkContainer
    .selectAll("g.link")
    .data(links);

  const linkEnter = linkSelection.enter().append("g").attr("class", "link");

  // For non self-links, add a line element
  linkEnter
    .filter((d) => d.source.id !== d.target.id)
    .append("line")
    .attr(
      "stroke",
      typeof options.linkStroke !== "function" ? options.linkStroke : null,
    )
    .attr("stroke-opacity", options.linkStrokeOpacity)
    .attr(
      "stroke-width",
      typeof options.linkStrokeWidth !== "function"
        ? options.linkStrokeWidth
        : null,
    )
    .attr("stroke-linecap", options.linkStrokeLinecap)
    .attr("marker-end", "url(#arrow)");

  // Append text to each line for non self-links
  linkEnter
    .filter((d) => d.source.id !== d.target.id)
    .append("text")
    .text((d) => (d.name ? d.name : d.label))
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .attr("class", "link-label")
    .call(wrap, 25);

  // For self-links, add a path element
  linkEnter
    .filter((d) => d.source.id === d.target.id)
    .append("path")
    .attr("class", "self-link")
    .attr("fill", "none")
    .attr(
      "stroke",
      typeof options.linkStroke !== "function" ? options.linkStroke : null,
    )
    .attr("stroke-opacity", options.linkStrokeOpacity)
    .attr(
      "stroke-width",
      typeof options.linkStrokeWidth !== "function"
        ? options.linkStrokeWidth
        : null,
    )
    .attr("stroke-linecap", options.linkStrokeLinecap)
    .attr("marker-mid", "url(#self-arrow)");

  // Append text to each line for self-links
  linkEnter
    .filter((d) => d.source.id === d.target.id)
    .append("text")
    .text((d) => (d.name ? d.name : d.label))
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .attr("class", "link-label")
    .attr("y", options.nodeRadius * 1.5 * 2) // Offset label by self-link path size
    .call(wrap, 25);

  simulation.alpha(1).restart();
}

/* Utility Functions */

function waitForAlpha(simulation, threshold) {
  return new Promise((resolve) => {
    if (simulation.alpha() < threshold) {
      resolve();
    } else {
      simulation.on("tick.alphaCheck", () => {
        if (simulation.alpha() < threshold) {
          simulation.on("tick.alphaCheck", null);
          resolve();
        }
      });
    }
  });
}

function toggleSimulation(
  on,
  simulation,
  forceNode,
  forceCenter,
  forceLink,
  links,
  nodeForceStrength,
  centerForceStrength,
) {
  if (on) {
    simulation.alpha(1).restart();
    forceNode.strength(nodeForceStrength);
    forceCenter.strength(centerForceStrength);
    forceLink.links(links);
  } else {
    simulation.stop();
    forceNode.strength(0);
    forceCenter.strength(0);
    forceLink.links([]);
  }
}

function wrap(text, maxChars) {
  text.each(function () {
    let text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      y = text.attr("y"),
      // dy = parseFloat(text.attr("dy")),
      tspan = text
        .text(null)
        .append("tspan")
        .attr("x", 0)
        .attr("y", y)
        .attr("dy", ".35em");

    let i = 0;
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.text().length > maxChars && i > 0) {
        lineNumber++;
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", lineHeight * lineNumber + "em")
          .text(word);
      }
      i++;
    }
  });
}

/* ForceGraphConstructor */

function ForceGraphConstructor(
  { nodes: initialNodes, links: initialLinks },
  options = {},
) {
  // Create a unique colors array from the combined schemes to avoid duplicate colors.
  const combinedColors = [...d3.schemePaired, ...d3.schemeDark2];
  const uniqueColors = Array.from(new Set(combinedColors));

  // Set up options with defaults
  const {
    nodeId = (d) => d._id,
    label = (d) => d.label,
    nodeGroup,
    nodeGroups = [],
    collectionsMap = new Map(), // Map of collection key to object with property abbreviated_name
    originNodeIds = [],
    nodeHover = (d) => `hover-${d._id}`,
    nodeFontSize = 10,
    linkFontSize = 10,
    onNodeClick = () => {},
    interactionCallback = () => {},
    nodeRadius = 16,
    linkSource = ({ _from }) => _from,
    linkTarget = ({ _to }) => _to,
    linkStroke = "#999",
    linkStrokeOpacity = 0.6,
    linkStrokeWidth = 1.5,
    linkStrokeLinecap = "round",
    initialScale = 2,
    width = 640,
    heightRatio = 0.5,
    nodeForceStrength = -2500,
    centerForceStrength = 1,
    labelStates = {},
    drag = d3
      .drag()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        interactionCallback();
      })
      .on("drag", function (event, d) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }),
    color = nodeGroup ? d3.scaleOrdinal(nodeGroups, uniqueColors) : null,
  } = options;

  // Create D3 simulation and forces
  const forceNode = d3.forceManyBody().strength(nodeForceStrength);
  const forceCenter = d3.forceCenter().strength(centerForceStrength);
  const forceLink = d3.forceLink().id((d) => d.id);

  const simulation = d3
    .forceSimulation()
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", forceCenter)
    .on("tick", ticked);

  // Create main SVG element
  let height = width * heightRatio;

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const g = svg.append("g");

  // Setup zoom behavior
  const zoomHandler = d3
    .zoom()
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    })
    .on("start", interactionCallback);
  svg.call(zoomHandler);
  svg.call(
    zoomHandler.transform,
    d3.zoomIdentity.translate(100, 100).scale(initialScale),
  );

  // Create containers for links and nodes
  const linkContainer = g.append("g").attr("class", "link-container");
  const nodeContainer = g.append("g").attr("class", "node-container");

  // Create defs for arrow markers
  const defs = g.append("defs");
  defs
    .append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 11)
    .attr("refY", 5)
    .attr("markerWidth", 20)
    .attr("markerHeight", 20)
    .attr("orient", "auto")
    .append("polygon")
    .attr("points", "0,3.5 6,5 0,6.5 1,5")
    .style("fill", typeof linkStroke !== "function" ? linkStroke : null);

  defs
    .append("marker")
    .attr("id", "self-arrow")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 3)
    .attr("refY", 5)
    .attr("markerWidth", 20)
    .attr("markerHeight", 20)
    .attr("orient", "auto")
    .append("polygon")
    .attr("points", "0,3.5 6,5 0,6.5 1,5")
    .style("fill", typeof linkStroke !== "function" ? linkStroke : null);

  // Create Legend
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${-(width / 2 - 20)}, ${-(height / 2 - 20)})`)
    .style("display", "block");

  const legendSize = 45 * heightRatio;
  legend
    .selectAll(".legend-item")
    .data([...new Set(nodeGroups)])
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * legendSize})`)
    .each(function (d) {
      const groupKey = d;
      const gLegend = d3.select(this);
      gLegend
        .append("rect")
        .attr("x", 0)
        .attr("width", legendSize)
        .attr("height", legendSize)
        .style("fill", color ? color(groupKey) : "#ccc");
      gLegend
        .append("text")
        .attr("x", legendSize * 1.5)
        .attr("y", legendSize / 2)
        .attr("dy", legendSize / 2 + "px")
        .style("font-size", legendSize + "px")
        .text((collection) =>
          collectionsMap.has(collection)
            ? collectionsMap.get(collection)["abbreviated_name"]
            : collection,
        );
    });

  // Internal Data Storage
  let processedNodes = [];
  let processedLinks = [];

  // Call update graph for initial render
  updateGraph({ newNodes: initialNodes, newLinks: initialLinks });

  // Handle movement
  function ticked() {
    // Update link position
    const link = linkContainer.selectAll("line");
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    // Update positions for self-links
    const selfLink = linkContainer.selectAll("path.self-link");
    selfLink.attr("d", (d) => {
      const radius = nodeRadius * 1.5; // Adjust this to control the size of the loop
      const x = d.source.x;
      const y = d.source.y + nodeRadius * 1.5;

      // Create a circular path for self-links
      return `M${x + radius},${y} A${radius},${radius} 0 1,1 ${x - radius},${y} A${radius},${radius} 0 1,1 ${x + radius},${y}`;
    });

    let node = nodeContainer.selectAll("g");
    node.attr("transform", function (d) {
      return "translate(" + [d.x, d.y] + ")";
    });

    // Update positions for link text
    const linkText = linkContainer.selectAll("text");
    linkText.attr("transform", (d) => {
      const midX = (d.source.x + d.target.x) / 2;
      const midY = (d.source.y + d.target.y) / 2;

      const angle =
        Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) *
        (180 / Math.PI);

      // Rotate text if the angle is more than 90 degrees or less than -90 degrees
      const adjustedAngle = angle + (Math.abs(angle) > 90 ? 180 : 0);

      return `translate(${midX}, ${midY}) rotate(${adjustedAngle})`;
    });
  }

  // Function to center on a given node id, with adjustable pan transition
  function centerOnNode(nodeId, transitionDuration = 1000) {
    let node = simulation.nodes().find((node) => node._id === nodeId);
    // Get the current zoom transform
    const currentTransform = d3.zoomTransform(svg.node());
    const k = currentTransform.k;
    // Calculate a new transform so that centerNode.x, centerNode.y are moved to (0,0), center of viewbox
    const newTransform = d3.zoomIdentity
      .translate(-node.x * k, -node.y * k)
      .scale(k);
    // Update the zoom transform on the svg element
    svg
      .transition()
      .duration(transitionDuration)
      .call(zoomHandler.transform, newTransform);
  }

  function toggleLabels(show, labelClass, frozenState = false) {
    let container;

    if (labelClass.includes("link")) {
      container = linkContainer;
    } else {
      container = nodeContainer;
    }
    if (show) {
      // Display Labels
      container.selectAll(labelClass).style("display", "block");
      if (!frozenState) {
        options.labelStates[labelClass] = true;
      }
    } else {
      // Hide Labels
      container.selectAll(labelClass).style("display", "none");
      if (!frozenState) {
        options.labelStates[labelClass] = false;
      }
    }
  }

  // Update node font size
  function updateNodeFontSize(newFontSize) {
    // Update node font size
    options.nodeFontSize = newFontSize;
    nodeContainer.selectAll("text").style("font-size", newFontSize + "px");
  }

  // Update link font size
  function updateLinkFontSize(newFontSize) {
    // Update link font size
    options.linkFontSize = newFontSize;
    linkContainer.selectAll("text").style("font-size", newFontSize + "px");
  }

  // Public update: process new data and re-render.
  function updateGraph({
    newNodes = [],
    newLinks = [],
    centerNodeId = null,
  } = {}) {
    // Toggle off labels
    Object.keys(labelStates).forEach((key) => {
      toggleLabels(false, key, true);
    });

    // Toggle on simulation
    toggleSimulation(
      true,
      simulation,
      forceNode,
      forceCenter,
      forceLink,
      processedLinks,
      nodeForceStrength,
      centerForceStrength,
    );

    // Add nodes and links
    processedNodes = processGraphData(
      processedNodes,
      newNodes,
      nodeId,
      label,
      color,
      nodeHover,
    );
    processedLinks = processGraphLinks(
      processedLinks,
      newLinks,
      processedNodes,
      linkSource,
      linkTarget,
      label,
    );
    renderGraph(
      simulation,
      processedNodes,
      processedLinks,
      d3,
      { nodeContainer, linkContainer },
      {
        forceLink,
        nodeRadius,
        nodeFontSize,
        linkStroke,
        linkStrokeOpacity,
        linkStrokeWidth,
        linkStrokeLinecap,
        linkFontSize,
        color,
        onNodeClick,
        drag,
        originNodeIds,
        collectionsMap,
      },
    );
    const newThreshold = Math.max(1 / processedNodes.length, 0.002);
    waitForAlpha(simulation, newThreshold).then(() => {
      if (centerNodeId) {
        centerOnNode(centerNodeId);
      }
      toggleSimulation(
        false,
        simulation,
        forceNode,
        forceCenter,
        forceLink,
        processedLinks,
        nodeForceStrength,
        centerForceStrength,
      );
      // Revert labels to correct state
      Object.keys(labelStates).forEach((key) => {
        const value = labelStates[key];
        toggleLabels(value, key);
      });
    });
  }

  return Object.assign(svg.node(), {
    updateGraph,
    updateNodeFontSize,
    updateLinkFontSize,
    toggleLabels,
  });
}

export default ForceGraphConstructor;
