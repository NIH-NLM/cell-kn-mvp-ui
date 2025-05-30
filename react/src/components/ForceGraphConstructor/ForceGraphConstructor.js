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
  filteredNewNodes.forEach((newNode) => {
    newNode.id = nodeId(newNode);
    let collection = newNode.id.split("/")[0];
    newNode.nodeHover = labelFn(newNode);
    newNode.color = getColorForCollection(collection);
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
  // Update simulation nodes and links
  simulation.nodes(nodes);
  options.forceLink.links(links);

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
      .text((d) => d.nodeLabel)
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
      )
      .text((d) => truncateString(d.nodeLabel, 15));
  });

  // Render links
  const linkSelection = containers.linkContainer
    .selectAll("g.link")
    .data(links, (d) => d._id);

  // Remove links that are no longer in the data
  linkSelection.exit().remove();

  // Create new link elements
  const linkEnter = linkSelection.enter().append("g").attr("class", "link");

  // For non self-links, add a line element
  linkEnter
    .filter((d) => d.source.id !== d.target.id)
    .append("path")
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
    .attr("marker-end", "url(#arrow)");

  // Append text for non self-links
  linkEnter
    .filter((d) => d.source.id !== d.target.id)
    .append("text")
    .text((d) => (d.name ? d.name : d.label))
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .attr("class", "link-label");

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

  // Append text for self-links
  linkEnter
    .filter((d) => d.source.id === d.target.id)
    .append("text")
    .text((d) => (d.name ? d.name : d.label))
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .attr("class", "link-label");

  // Merge enter selection with the update selection
  linkSelection.merge(linkEnter);

  simulation.alpha(1.5).restart();
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
    heightRatio: 0.5,
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

  // Create main SVG element
  let height = mergedOptions.width * mergedOptions.heightRatio;

  const svg = d3
    .create("svg")
    .attr("width", mergedOptions.width)
    .attr("height", height)
    .attr("viewBox", [
      -mergedOptions.width / 2,
      -height / 2,
      mergedOptions.width,
      height,
    ])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

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
    .attr(
      "transform",
      `translate(${-(mergedOptions.width / 2) + 20}, ${-(height / 2) + 20})`,
    )
    .style("font-family", "sans-serif")
    .style("font-size", "10px");

  const legendSize = 12;
  const legendSpacing = 4;

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
  updateGraph({ newNodes: initialNodes, newLinks: initialLinks });

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

    // Update positions for link text
    linkElements.selectAll("text.link-label").attr("transform", (d) => {
      if (!d.source || !d.target) return "";

      if (d.source.id === d.target.id) {
        // Self-link text
        const x = d.source.x;
        const y = d.source.y;
        const nodeR = mergedOptions.nodeRadius;
        const loopRadius = nodeR * 1.5;
        // Position text below the apex of the self-loop
        return `translate(${x}, ${y + nodeR + loopRadius + mergedOptions.linkFontSize * 0.5 + 5})`;
      }

      // Non-self-link text
      const sx = d.source.x;
      const sy = d.source.y;
      const tx = d.target.x;
      const ty = d.target.y;

      let midX, midY, angle;

      if (d.isParallelPair) {
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const dx = tx - sx;
        const dy = ty - sy;
        angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const dist = Math.sqrt(dx * dx + dy * dy);
        const curvatureOffset =
          dist * mergedOptions.parallelLinkCurvature * 0.3; // How far to offset text from center

        const normX = dy / dist;
        const normY = -dx / dist;

        midX = mx + curvatureOffset * normX;
        midY = my + curvatureOffset * normY;
      } else {
        // Straight line
        midX = (sx + tx) / 2;
        midY = (sy + ty) / 2;
        angle = Math.atan2(ty - sy, tx - sx) * (180 / Math.PI);
      }

      // Keep text upright
      if (Math.abs(angle) > 90) angle += 180;

      // Small vertical offset from the line/arc for text
      const textVerticalOffset = 0; // Keep for later
      const offsetX = textVerticalOffset * Math.sin((angle * Math.PI) / 180);
      const offsetY = textVerticalOffset * -Math.cos((angle * Math.PI) / 180);

      return `translate(${midX + offsetX}, ${midY + offsetY}) rotate(${angle})`;
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

  function toggleLabels(show, labelClass, frozenState = false) {
    let container;
    if (labelClass.includes("link")) {
      container = linkContainer;
    } else {
      container = nodeContainer;
    }
    container
      .selectAll(`${labelClass}`)
      .style("display", show ? "block" : "none");
    if (!frozenState) {
      mergedOptions.labelStates[labelClass] = show;
    }
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
      .selectAll("text.link-label")
      .style("font-size", newFontSize + "px");
  }

  // Process new data and re-render.
  function updateGraph({
    newNodes = [],
    newLinks = [],
    collapseNodes = [],
    removeNode = false,
    centerNodeId = null,
    simulate = false,
  } = {}) {
    // Determine whether new data is being added
    const hasNewData = newNodes.length > 0 || newLinks.length > 0;

    // If there is new data, toggle on simulation and turn off labels so nodes can reposition
    if (hasNewData || simulate) {
      // Toggle off labels
      Object.keys(mergedOptions.labelStates).forEach((key) => {
        toggleLabels(false, key, true);
      });
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
    }

    if (collapseNodes.length) {
      // Identify nodes that are connected only to a collapse node
      const nodesToRemove = [];
      processedNodes.forEach((node) => {
        // Skip nodes that are in collapseNodes or are origin nodes
        if (mergedOptions.originNodeIds.includes(node.id)) {
          return;
        }
        // Get all links associated with this node
        const nodeLinks = processedLinks.filter(
          (link) =>
            (link.source.id || link.source) === node.id ||
            (link.target.id || link.target) === node.id,
        );
        // Remove node if all links connect to the same collapse node
        if (nodeLinks.length > 0) {
          // Node must have at least one link to be considered
          let firstNeighborId = null;
          let allLinksToSameNeighbor = true;

          // Determine the ID of the neighbor connected by the first link
          const firstLink = nodeLinks[0];
          const sourceIdFirst = firstLink.source.id || firstLink.source;
          const targetIdFirst = firstLink.target.id || firstLink.target;
          firstNeighborId =
            sourceIdFirst === node.id || sourceIdFirst === node._id
              ? targetIdFirst
              : sourceIdFirst;

          // Check if all other links also go to this same firstNeighborId
          for (let i = 1; i < nodeLinks.length; i++) {
            const link = nodeLinks[i];
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            const currentNeighborId =
              sourceId === node.id || sourceId === node._id
                ? targetId
                : sourceId;

            if (currentNeighborId !== firstNeighborId) {
              allLinksToSameNeighbor = false;
              break; // Found a link to a different neighbor
            }
          }

          // If all links go to the same neighbor, check if that neighbor is in collapseNodes
          if (allLinksToSameNeighbor) {
            if (collapseNodes.includes(firstNeighborId)) {
              nodesToRemove.push(node.id);
            }
          }
        }
      });

      // Remove the nodes that were marked
      processedNodes = processedNodes.filter(
        (node) => !nodesToRemove.includes(node.id),
      );
      // Also remove any links associated with the nodes just removed
      processedLinks = processedLinks.filter((link) => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        return (
          !nodesToRemove.includes(sourceId) && !nodesToRemove.includes(targetId)
        );
      });

      // If removeNode is true, remove the collapseNodes themselves
      if (removeNode) {
        processedNodes = processedNodes.filter(
          (node) => !collapseNodes.includes(node.id),
        );
        processedLinks = processedLinks.filter((link) => {
          const sourceId = link.source.id || link.source;
          const targetId = link.target.id || link.target;
          return (
            !collapseNodes.includes(sourceId) &&
            !collapseNodes.includes(targetId)
          );
        });
      }
    }

    // Add nodes and links
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

    renderGraph(
      simulation,
      processedNodes,
      processedLinks,
      d3,
      { nodeContainer, linkContainer },
      {
        // Pass relevant options from mergedOptions
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

    const newThreshold = Math.max(1 / (processedNodes.length || 1), 0.002);
    // Wait for simulation to settle then disable it
    waitForAlpha(simulation, newThreshold).then(() => {
      if (centerNodeId) {
        centerOnNode(centerNodeId);
      }
      toggleSimulation(
        false, // Turn off simulation
        simulation,
        forceNode,
        forceCenter,
        forceLink,
        processedLinks, // Pass links so force can be disassociated if needed
        mergedOptions.nodeForceStrength,
        mergedOptions.centerForceStrength,
      );
      Object.keys(mergedOptions.labelStates).forEach((key) => {
        const value = mergedOptions.labelStates[key];
        toggleLabels(value, key, false); // Unfreeze and restore label state
      });
    });
  }

  return Object.assign(svg.node(), {
    updateGraph,
    updateNodeFontSize,
    updateLinkFontSize,
    toggleLabels,
    centerOnNode,
  });
}

export default ForceGraphConstructor;
