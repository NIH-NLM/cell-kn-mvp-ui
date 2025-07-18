import * as d3 from "d3";
import { getColorForCollection } from "../../services/ColorServices/ColorServices";
import { truncateString } from "../Utils/Utils";

/* Pure Functions */

export function processGraphData(
  existingNodes,
  newNodes,
  nodeId = (d) => d._id,
  labelFn = (d) => d.label,
  nodeHover,
) {
  const filteredNewNodes = newNodes.filter(
    (newNode) =>
      !existingNodes.some((existing) => existing._id === nodeId(newNode)),
  );
  const processedNewNodes = filteredNewNodes.map((newNode) => {
    const collection = nodeId(newNode).split("/")[0];

    return {
      ...newNode,
      id: nodeId(newNode),
      nodeHover: labelFn(newNode),
      color: getColorForCollection(collection),
      nodeLabel: labelFn(newNode),
    };
  });

  return existingNodes.concat(processedNewNodes);
}

export function processGraphLinks(
  existingLinks,
  newLinks,
  nodes,
  linkSource = ({ _from }) => _from,
  linkTarget = ({ _to }) => _to,
  labelFn = (d) => d.label,
) {
  const updatedExistingLinks = [...existingLinks]; // Work on a mutable copy

  newLinks.forEach((newLink) => {
    const sourceNodeId = linkSource(newLink);
    const targetNodeId = linkTarget(newLink);

    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    const targetNode = nodes.find((node) => node.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      return;
    }

    // Check if this exact link (by _id) already exists
    if (updatedExistingLinks.some((existing) => existing._id === newLink._id)) {
      return;
    }

    // Prepare the new link object
    const processedNewLink = {
      ...newLink,
      sourceText: newLink.source,
      source: sourceNode,
      target: targetNode,
      label: labelFn(newLink),
      isParallelPair: false,
    };

    // Check for its reverse partner among existing links
    const keyParts = processedNewLink._key.split("-");
    if (keyParts.length === 2) {
      const reverseKey = `${keyParts[1]}-${keyParts[0]}`;
      const reversePartner = updatedExistingLinks.find(
        (existingLink) =>
          existingLink._key === reverseKey &&
          existingLink.source.id === targetNodeId && // Double check direction
          existingLink.target.id === sourceNodeId,
      );

      if (reversePartner) {
        // Found a parallel pair
        processedNewLink.isParallelPair = true;
        reversePartner.isParallelPair = true;
      }
    }
    updatedExistingLinks.push(processedNewLink);
  });

  console.log(updatedExistingLinks);
  return updatedExistingLinks;
}

/* Rendering Functions */

function renderGraph(simulation, nodes, links, d3, containers, options) {
  // Render nodes
  const nodeSelection = containers.nodeContainer
    .selectAll("g.node")
    .data(nodes, (d) => d.id);

  // Remove nodes not in the new data
  nodeSelection.exit().remove();

  // For each new node, decide whether to render it as a donut
  const nodeEnter = nodeSelection
    .enter()
    .append("g")
    .attr("class", "node")
    .call(options.drag);

  nodeEnter.each(function (d) {
    const nodeG = d3.select(this);
    if (options.originNodeIds && options.originNodeIds.includes(d.id)) {
      // Outer circle
      nodeG
        .append("circle")
        .attr("r", options.nodeRadius)
        .attr("fill", d.color)
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
        .attr("fill", d.color)
        .on("contextmenu", function (event, d) {
          event.preventDefault();
          options.onNodeClick(event, d);
        });
    }
    // Append title for hover and hidden text for the label
    nodeG.append("title").text((d) => d.nodeHover);
    // Append collection text
    nodeG
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("y", options.nodeRadius + options.nodeFontSize)
      .style("font-size", options.nodeFontSize + "px")
      .style("display", "none")
      .text((d) => truncateString(d.nodeLabel, 15));
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
      );
  });

  // Render links
  const linkSelection = containers.linkContainer
    .selectAll("g.link")
    .data(links, (d) => d._id);

  // Remove links that are no longer in the data
  linkSelection.exit().remove();

  // Create new link elements (a <g> for each link)
  const linkEnter = linkSelection.enter().append("g").attr("class", "link");

  // --- Handle Non-Self-Links ---
  const nonSelfLinkEnter = linkEnter.filter((d) => d.source.id !== d.target.id);

  // Add invisible wide click area
  nonSelfLinkEnter
    .append("path")
    .attr("class", "link-hit-area")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 25)
    .attr("stroke-linecap", options.linkStrokeLinecap)
    .on("contextmenu", function (event, d) {
      event.preventDefault();
      options.onNodeClick(event, d);
    });

  // Add the visible path
  nonSelfLinkEnter
    .append("path")
    .attr("class", "link-visible")
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
    .attr("marker-end", "url(#arrow)")
    .style("pointer-events", "none");

  // Append the primary label text for non-self-links
  nonSelfLinkEnter
    .append("text")
    .attr("class", "link-label")
    .text((d) => (d.name ? d.name : d.label))
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .style("pointer-events", "none");

  // Append the source label text for non-self-links
  nonSelfLinkEnter
    .append("text")
    .attr("class", "link-source")
    .text((d) => `${d.sourceText}` || "Source Unknown")
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .attr("dy", "1.2em")
    .style("pointer-events", "none");

  // --- Handle Self-Links ---
  const selfLinkEnter = linkEnter.filter((d) => d.source.id === d.target.id);

  // Add invisible click handler
  selfLinkEnter
    .append("path")
    .attr("class", "self-link-hit-area")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 15)
    .on("contextmenu", function (event, d) {
      event.preventDefault();
      options.onNodeClick(event, d);
    });

  // Add the visible path for self-links
  selfLinkEnter
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
    .attr("marker-mid", "url(#self-arrow)")
    .style("pointer-events", "none");

  // Append the primary label text for self-links
  selfLinkEnter
    .append("text")
    .attr("class", "link-label")
    .text((d) => (d.name ? d.name : d.label))
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .style("pointer-events", "none");

  // Append the source label text for self-links
  selfLinkEnter
    .append("text")
    .attr("class", "link-source")
    .text((d) => `${d.sourceText}` || "Source Unknown")
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .attr("dy", "1.2em")
    .style("pointer-events", "none");

  // Merge enter selection with the update selection
  linkSelection.merge(linkEnter);
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
  linkForceStrength,
) {
  if (on) {
    simulation.alpha(1).restart();
    forceNode.strength(nodeForceStrength);
    forceCenter.strength(centerForceStrength);
    forceLink.strength(linkForceStrength);
    forceLink.links(links);
  } else {
    simulation.stop();
    forceNode.strength(0);
    forceCenter.strength(0);
    forceLink.strength(0);
    forceLink.links([]);
  }
}

/* ForceGraphConstructor */

function ForceGraphConstructor(
  svgElement,
  { nodes: initialNodes, links: initialLinks },
  options = {},
) {
  const combinedColors = [...d3.schemePaired, ...d3.schemeDark2];
  const uniqueColors = Array.from(new Set(combinedColors));

  const defaultOptions = {
    nodeId: (d) => d._id,
    label: (d) => d.label || d._id, // Fallback label
    nodeGroup: undefined,
    nodeGroups: [],
    collectionsMap: new Map(),
    originNodeIds: [],
    nodeHover: (d) => d.label || d._id, // Fallback hover
    nodeFontSize: 10,
    linkFontSize: 10,
    onNodeClick: () => {},
    interactionCallback: () => {},
    nodeRadius: 16,
    linkSource: ({ _from }) => _from,
    linkTarget: ({ _to }) => _to,
    linkStroke: "#999",
    linkStrokeOpacity: 0.6,
    linkStrokeWidth: 1.5,
    linkStrokeLinecap: "round",
    initialScale: 1,
    width: 640,
    height: 640,
    nodeForceStrength: -1000,
    targetLinkDistance: 175,
    centerForceStrength: 1,
    labelStates: {},
    color: null,
    parallelLinkCurvature: 0.25,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  mergedOptions.drag =
    options.drag ||
    d3
      .drag()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        mergedOptions.interactionCallback();
      })
      .on("drag", function (event, d) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });

  if (mergedOptions.nodeGroup && mergedOptions.nodeGroups.length > 0) {
    mergedOptions.color = d3.scaleOrdinal(
      mergedOptions.nodeGroups,
      uniqueColors,
    );
  } else {
    mergedOptions.color = () => mergedOptions.nodeColor || "#999";
  }

  const forceNode = d3
    .forceManyBody()
    .strength(mergedOptions.nodeForceStrength);
  const forceCenter = d3
    .forceCenter()
    .strength(mergedOptions.centerForceStrength);
  const forceLink = d3.forceLink().id((d) => d.id);
  forceLink.distance(mergedOptions.targetLinkDistance);
  const linkForceStrength = forceLink.strength();

  const simulation = d3
    .forceSimulation()
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", forceCenter)
    .on("tick", ticked);

  const svg = d3
    .select(svgElement)
    .attr("width", mergedOptions.width)
    .attr("height", mergedOptions.height)
    .attr("viewBox", [
      -mergedOptions.width / 2,
      -mergedOptions.height / 2,
      mergedOptions.width,
      mergedOptions.height,
    ])
    .attr("style", "width: 100%; height: 100%;");

  const g = svg.append("g");

  // Setup zoom behavior
  const zoomHandler = d3
    .zoom()
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    })
    .on("start", mergedOptions.interactionCallback);
  svg.call(zoomHandler);
  svg.call(
    zoomHandler.transform,
    d3.zoomIdentity.translate(0, 0).scale(mergedOptions.initialScale), // Centered initial translate
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
    .style(
      "fill",
      typeof mergedOptions.linkStroke !== "function"
        ? mergedOptions.linkStroke
        : null,
    );

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
    .style(
      "fill",
      typeof mergedOptions.linkStroke !== "function"
        ? mergedOptions.linkStroke
        : null,
    );

  const legend = svg
    .append("g")
    .attr("class", "legend")
    .style("font-family", "sans-serif")
    .style("font-size", "10px");

  placeLegend(mergedOptions.width, mergedOptions.height);

  const legendSize = 12;
  const legendSpacing = 4;

  function placeLegend(svgWidth, svgHeight) {
    legend.attr(
      "transform",
      `translate(${-(svgWidth / 2) + 20}, ${-(svgHeight / 2) + 20})`,
    );
  }

  function resize(newWidth, newHeight) {
    // Save old state
    const oldWidth = mergedOptions.width;
    const oldHeight = mergedOptions.height;

    // Get the current zoom transform
    const currentTransform = d3.zoomTransform(svg.node());

    // Find the new center point
    const centerPoint = currentTransform.invert([oldWidth / 2, oldHeight / 2]);

    // Update the stored options
    mergedOptions.width = newWidth;
    mergedOptions.height = newHeight;

    // Update the SVG element's dimensions and viewBox
    svg
      .attr("width", newWidth)
      .attr("height", newHeight)
      .attr("viewBox", [-newWidth / 2, -newHeight / 2, newWidth, newHeight]);

    // Update the zoom handler's extent
    zoomHandler.extent([
      [0, 0],
      [newWidth, newHeight],
    ]);

    // Update legend position
    placeLegend(newWidth, newHeight);

    // Apply new transform
    const newTranslateX = newWidth / 2 - centerPoint[0] * currentTransform.k;
    const newTranslateY = newHeight / 2 - centerPoint[1] * currentTransform.k;

    // Create the new transform, preserving the user's zoom level
    const newTransform = d3.zoomIdentity
      .translate(newTranslateX, newTranslateY)
      .scale(currentTransform.k);

    // Apply the new transform to the zoom behavior.
    svg.call(zoomHandler.transform, newTransform);

    // Start simulation
    simulation.alpha(1).restart();
  }

  function updateLegend(currentNodes) {
    const presentCollectionIds = [
      ...new Set(currentNodes.map((n) => n.id?.split("/")[0])),
      // Sort alphabetically for consistent order
    ].filter(
      (id) => id && id !== "edges" && mergedOptions.collectionsMap.has(id),
    );
    presentCollectionIds.sort();

    // Data join for legend items
    const legendItems = legend
      .selectAll(".legend-item")
      .data(presentCollectionIds, (d) => d);

    legendItems.exit().remove();

    // Append rectangle
    const legendEnter = legendItems
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr(
        "transform",
        (d, i) => `translate(0, ${i * (legendSize + legendSpacing)})`,
      );

    legendEnter
      .append("rect")
      .attr("x", 0)
      .attr("width", legendSize)
      .attr("height", legendSize);

    // Append text
    legendEnter
      .append("text")
      .attr("x", legendSize + 5)
      .attr("y", legendSize / 2)
      .attr("dy", "0.35em");

    // Adjust position for all items
    const legendUpdate = legendEnter.merge(legendItems);
    legendUpdate
      .transition()
      .duration(200)
      .attr(
        "transform",
        (d, i) => `translate(0, ${i * (legendSize + legendSpacing)})`,
      );

    legendUpdate.select("rect").style("fill", (d) => getColorForCollection(d));
    legendUpdate
      .select("text")
      .text(
        (d) =>
          `${mergedOptions.collectionsMap.get(d)?.["display_name"]} (${mergedOptions.collectionsMap.get(d)?.["abbreviated_name"]})` ||
          d,
      );
  }

  // Internal Data Storage
  let processedNodes = [];
  let processedLinks = [];

  // Call update graph for initial render
  updateGraph({
    newNodes: initialNodes,
    newLinks: initialLinks,
    runOnSimulationEnd: mergedOptions.runInitialOnSimulationEnd,
  });

  // Handle movement
  function ticked() {
    const linkElements = linkContainer.selectAll("g.link");

    // Update path.self-link for self-loops
    linkElements.selectAll("path.self-link").attr("d", (d) => {
      if (!d.source) return "";
      const x = d.source.x;
      const y = d.source.y;
      const nodeR = mergedOptions.nodeRadius;
      const loopRadius = nodeR * 1.5;

      const dr = loopRadius * 2;
      return `M${x},${y + nodeR} A${dr / 2},${dr / 2} 0 1,0 ${x + 0.1},${y + nodeR - 0.1}`; // Arc path
    });

    // Update path for non-self-links
    linkElements
      .selectAll("path:not(.self-link)") // Select paths that are not self-links
      .attr("d", (d) => {
        if (!d.source || !d.target) return ""; // Should have source and target
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;

        if (d.isParallelPair) {
          const dx = tx - sx;
          const dy = ty - sy;
          const dr =
            Math.sqrt(dx * dx + dy * dy) *
            (1 / mergedOptions.parallelLinkCurvature);

          // Using an arc path.
          return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
        } else {
          // Straight line for non-parallel links
          return `M${sx},${sy}L${tx},${ty}`;
        }
      });

    nodeContainer
      .selectAll("g.node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Update positions for all link text elements
    linkElements.each(function (d) {
      if (!d.source || !d.target) return;

      let transformString = "";

      if (d.source.id === d.target.id) {
        // --- Self-link text positioning ---
        const x = d.source.x;
        const y = d.source.y;
        const nodeR = mergedOptions.nodeRadius;
        const loopRadius = nodeR * 1.5;

        // Position text below the apex of the self-loop.
        transformString = `translate(${x}, ${y + nodeR + loopRadius + mergedOptions.linkFontSize * 0.5 + 5})`;
      } else {
        // --- Non-self-link text positioning ---
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;

        let midX, midY, angle;

        if (d.isParallelPair) {
          // For curved parallel links
          const mx = (sx + tx) / 2;
          const my = (sy + ty) / 2;
          const dx = tx - sx;
          const dy = ty - sy;
          angle = Math.atan2(dy, dx) * (180 / Math.PI);

          const dist = Math.sqrt(dx * dx + dy * dy);
          // How far to offset text from the straight center line to follow the curve
          const curvatureOffset =
            dist * mergedOptions.parallelLinkCurvature * 0.3;

          const normX = dy / dist;
          const normY = -dx / dist;

          midX = mx + curvatureOffset * normX;
          midY = my + curvatureOffset * normY;
        } else {
          // For straight links
          midX = (sx + tx) / 2;
          midY = (sy + ty) / 2;
          angle = Math.atan2(ty - sy, tx - sx) * (180 / Math.PI);
        }

        // Keep text upright by flipping it if it's upside down
        if (Math.abs(angle) > 90) {
          angle += 180;
        }

        // vertical offset from the line/arc for text
        const textVerticalOffset = 0;
        const offsetX = textVerticalOffset * Math.sin((angle * Math.PI) / 180);
        const offsetY = textVerticalOffset * -Math.cos((angle * Math.PI) / 180);

        transformString = `translate(${midX + offsetX}, ${midY + offsetY}) rotate(${angle})`;
      }

      d3.select(this).selectAll("text").attr("transform", transformString);
    });
  }

  // Function to center on a given node id, with adjustable pan transition
  function centerOnNode(nodeId, transitionDuration = 1000) {
    let node = simulation.nodes().find((node) => node._id === nodeId);
    if (!node) {
      console.warn("Node not found for centering:", nodeId);
      return;
    }
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

  function toggleLabels(show, labelClass) {
    const containerMap = {
      "link-label": linkContainer,
      "link-source": linkContainer,
      "node-label": nodeContainer,
      "collection-label": nodeContainer,
    };

    const container = containerMap[labelClass];
    if (!container) {
      console.warn(
        `toggleLabels: No container configured for class "${labelClass}"`,
      );
      return;
    }

    container
      .selectAll(`.${labelClass}`)
      .style("display", show ? "block" : "none");
  }

  // Update node font size
  function updateNodeFontSize(newFontSize) {
    mergedOptions.nodeFontSize = newFontSize;
    nodeContainer
      .selectAll("text.node-label, text.collection-label")
      .style("font-size", newFontSize + "px");
  }

  // Update link font size
  function updateLinkFontSize(newFontSize) {
    mergedOptions.linkFontSize = newFontSize;
    linkContainer
      .selectAll("text.link-label", "text.link-source")
      .style("font-size", newFontSize + "px");
  }

  function resetGraph() {
    simulation.stop();

    processedNodes = [];
    processedLinks = [];

    simulation.nodes([]);
    simulation.force("link").links([]);

    nodeContainer.selectAll("*").remove();
    linkContainer.selectAll("*").remove();

    svg.call(zoomHandler.transform, d3.zoomIdentity);
  }

  // Restore graph based on previous state
  function restoreGraph({ nodes, links }) {
    resetGraph();

    // Set object vars
    processedNodes = structuredClone(nodes);
    processedLinks = structuredClone(links);

    // Place nodes in old locations
    processedNodes.forEach((node) => {
      node.fx = node.x;
      node.fy = node.y;
    });

    // Add to simluation
    // TODO: These are not correctly added to simulation. Can see when pressing 'undo' and then 'restart simulation'
    simulation.nodes(processedNodes);
    simulation.force("link").links(processedLinks);
    renderGraph(
      simulation,
      processedNodes,
      processedLinks,
      d3,
      { nodeContainer, linkContainer },
      {
        forceLink,
        nodeRadius: mergedOptions.nodeRadius,
        nodeFontSize: mergedOptions.nodeFontSize,
        linkStroke: mergedOptions.linkStroke,
        linkStrokeOpacity: mergedOptions.linkStrokeOpacity,
        linkStrokeWidth: mergedOptions.linkStrokeWidth,
        linkStrokeLinecap: mergedOptions.linkStrokeLinecap,
        linkFontSize: mergedOptions.linkFontSize,
        onNodeClick: mergedOptions.onNodeClick,
        drag: mergedOptions.drag,
        originNodeIds: mergedOptions.originNodeIds,
        collectionsMap: mergedOptions.collectionsMap,
      },
    );
    updateLegend(processedNodes);

    // Single animation tick to put everything in place
    ticked();
    // Show labels
    Object.keys(mergedOptions.labelStates).forEach((key) => {
      toggleLabels(mergedOptions.labelStates[key], key);
    });
  }

  function findLeafNodes(collapseNodes) {
    const leafNodes = [];
    processedNodes.forEach((node) => {
      if (mergedOptions.originNodeIds.includes(node.id)) return;
      const nodeLinks = processedLinks.filter(
        (l) =>
          (l.source.id || l.source) === node.id ||
          (l.target.id || l.target) === node.id,
      );
      if (nodeLinks.length > 0) {
        const firstNeighborId =
          (nodeLinks[0].source.id || nodeLinks[0].source) === node.id
            ? nodeLinks[0].target.id || nodeLinks[0].target
            : nodeLinks[0].source.id || nodeLinks[0].source;
        const allLinksToSameNeighbor = nodeLinks.every(
          (l) =>
            ((l.source.id || l.source) === node.id &&
              (l.target.id || l.target) === firstNeighborId) ||
            ((l.target.id || l.target) === node.id &&
              (l.source.id || l.source) === firstNeighborId),
        );
        if (allLinksToSameNeighbor && collapseNodes.includes(firstNeighborId)) {
          leafNodes.push(node.id);
        }
      }
    });
    return leafNodes;
  }

  // Process new data and re-render.
  function updateGraph({
    newNodes = [],
    newLinks = [],
    collapseNodes = [],
    removeNode = false,
    centerNodeId = null,
    resetData = false,
    runOnSimulationEnd = true,
  } = {}) {
    // Check for reset
    if (resetData) {
      resetGraph();
    }

    processedNodes = processGraphData(
      processedNodes,
      newNodes,
      mergedOptions.nodeId,
      mergedOptions.label,
      mergedOptions.nodeHover,
    );
    processedLinks = processGraphLinks(
      processedLinks,
      newLinks,
      processedNodes,
      mergedOptions.linkSource,
      mergedOptions.linkTarget,
      mergedOptions.label,
    );

    if (collapseNodes.length > 0) {
      const nodesToRemove = findLeafNodes(collapseNodes);
      processedNodes = processedNodes.filter(
        (n) => !nodesToRemove.includes(n.id),
      );
      processedLinks = processedLinks.filter(
        (l) =>
          !nodesToRemove.includes(l.source.id) &&
          !nodesToRemove.includes(l.target.id),
      );
      if (removeNode) {
        processedNodes = processedNodes.filter(
          (n) => !collapseNodes.includes(n.id),
        );
        processedLinks = processedLinks.filter(
          (l) =>
            !collapseNodes.includes(l.source.id) &&
            !collapseNodes.includes(l.target.id),
        );
      }
    }

    // Update simulation state
    simulation.nodes(processedNodes);
    forceLink.links(processedLinks);

    // Update the DOM
    renderGraph(
      simulation,
      processedNodes,
      processedLinks,
      d3,
      { nodeContainer, linkContainer },
      {
        forceLink,
        nodeRadius: mergedOptions.nodeRadius,
        nodeFontSize: mergedOptions.nodeFontSize,
        linkStroke: mergedOptions.linkStroke,
        linkStrokeOpacity: mergedOptions.linkStrokeOpacity,
        linkStrokeWidth: mergedOptions.linkStrokeWidth,
        linkStrokeLinecap: mergedOptions.linkStrokeLinecap,
        linkFontSize: mergedOptions.linkFontSize,
        onNodeClick: mergedOptions.onNodeClick,
        drag: mergedOptions.drag,
        originNodeIds: mergedOptions.originNodeIds,
        collectionsMap: mergedOptions.collectionsMap,
      },
    );
    updateLegend(processedNodes);

    toggleSimulation(
      true,
      simulation,
      forceNode,
      forceCenter,
      forceLink,
      processedLinks, // Pass current links for forceLink to operate on
      mergedOptions.nodeForceStrength,
      mergedOptions.centerForceStrength,
      linkForceStrength,
    );

    // Wait for graph to settle
    const newThreshold = Math.max(1 / (processedNodes.length || 1), 0.002);
    waitForAlpha(simulation, newThreshold).then(() => {
      // Once settled, stop the simulation
      toggleSimulation(false, simulation, forceNode, forceCenter, forceLink);

      if (centerNodeId) {
        centerOnNode(centerNodeId);
      }

      // Restore label visibility after nodes have stopped moving
      Object.keys(mergedOptions.labelStates).forEach((key) => {
        toggleLabels(mergedOptions.labelStates[key], key);
      });

      // Callback to Redux to save the final state with positions for undo/redo
      if (
        runOnSimulationEnd === true &&
        typeof mergedOptions.onSimulationEnd === "function"
      ) {
        const finalNodes = processedNodes.map(
          ({ x, y, index, vx, vy, ...rest }) => ({ x, y, ...rest }),
        );
        const finalLinks = processedLinks.map(
          ({ source, target, ...rest }) => ({
            ...rest,
            source: source.id || source,
            target: target.id || target,
          }),
        );
        mergedOptions.onSimulationEnd(finalNodes, finalLinks);
      }
    });
  }

  return {
    updateGraph,
    restoreGraph,
    updateNodeFontSize,
    updateLinkFontSize,
    toggleLabels,
    centerOnNode,
    resize,
  };
}

export default ForceGraphConstructor;
