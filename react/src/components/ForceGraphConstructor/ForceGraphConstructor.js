import * as d3 from "d3";
import { getColorForCollection } from "../../services/ColorServices/ColorServices";

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
      ...newLink, // Spread original properties
      source: sourceNode, // Resolve to node object
      target: targetNode, // Resolve to node object
      label: labelFn(newLink),
      isParallelPair: false, // Initialize parallel flag
    };

    // Check for its reverse partner among existing links
    const keyParts = processedNewLink._key.split('-');
    if (keyParts.length === 2) {
      const reverseKey = `${keyParts[1]}-${keyParts[0]}`;
      const reversePartner = updatedExistingLinks.find(
        (existingLink) => existingLink._key === reverseKey &&
                           existingLink.source.id === targetNodeId && // Double check direction
                           existingLink.target.id === sourceNodeId
      );

      if (reversePartner) {
        // Found a parallel pair!
        processedNewLink.isParallelPair = true;

        reversePartner.isParallelPair = true;
      }
    }
    updatedExistingLinks.push(processedNewLink);
  });

  console.log(updatedExistingLinks)
  return updatedExistingLinks
}

/* Rendering Functions */

function renderGraph(simulation, nodes, links, d3, containers, options) {
  simulation.nodes(nodes);
  options.forceLink.links(links);

  const nodeSelection = containers.nodeContainer
    .selectAll("g.node")
    .data(nodes, (d) => d.id);

  nodeSelection.exit().remove();

  const nodeEnter = nodeSelection
    .enter()
    .append("g")
    .attr("class", "node")
    .call(options.drag);

  nodeEnter.each(function (d) {
    const nodeG = d3.select(this);
    if (options.originNodeIds && options.originNodeIds.includes(d.id)) {
      nodeG
        .append("circle")
        .attr("r", options.nodeRadius)
        .attr("fill", d.color)
        .on("contextmenu", function (event, d) {
          event.preventDefault();
          options.onNodeClick(event, d);
        });
      nodeG
        .append("circle")
        .attr("r", options.nodeRadius * 0.7)
        .attr("fill", "white")
        .on("contextmenu", function (event, d) {
          event.preventDefault();
          options.onNodeClick(event, d);
        });
    } else {
      nodeG
        .append("circle")
        .attr("r", options.nodeRadius)
        .attr("fill", d.color)
        .on("contextmenu", function (event, d) {
          event.preventDefault();
          options.onNodeClick(event, d);
        });
    }
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

  const linkSelection = containers.linkContainer
    .selectAll("g.link")
    .data(links, (d) => d._id);

  linkSelection.exit().remove();

  const linkEnter = linkSelection.enter().append("g").attr("class", "link");

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

  linkEnter
    .filter((d) => d.source.id === d.target.id)
    .append("text")
    .text((d) => (d.name ? d.name : d.label))
    .style("font-size", options.linkFontSize + "px")
    .style("fill", "black")
    .style("display", "none")
    .attr("text-anchor", "middle")
    .attr("class", "link-label")
    .call(wrap, 25);

  linkSelection.merge(linkEnter);

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

function wrap(text, maxChars) {
  text.each(function () {
    let textEl = d3.select(this),
      words = textEl.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1,
      y = textEl.attr("y") || 0,
      tspan = textEl
        .text(null)
        .append("tspan")
        .attr("x", 0)
        .attr("y", y)
        .attr("dy", ".35em");

    let i = 0;
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > maxChars && line.length > 1) {
        lineNumber++;
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = textEl
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
    nodeForceStrength: -2500,
    centerForceStrength: 1,
    labelStates: {},
    color: null,
    parallelLinkCurvature: 0.25, // Controls how much parallel links curve
  };

  const mergedOptions = { ...defaultOptions, ...options };

  mergedOptions.drag = options.drag || d3
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
    mergedOptions.color = d3.scaleOrdinal(mergedOptions.nodeGroups, uniqueColors);
  } else {
    mergedOptions.color = () => mergedOptions.nodeColor || "#999";
  }

  const forceNode = d3.forceManyBody().strength(mergedOptions.nodeForceStrength);
  const forceCenter = d3.forceCenter().strength(mergedOptions.centerForceStrength);
  const forceLink = d3.forceLink().id((d) => d.id); // d.id is set in processGraphData
  const linkForceStrength = forceLink.strength(); // Store default or allow override via options

  const simulation = d3
    .forceSimulation()
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", forceCenter)
    .on("tick", ticked);

  let height = mergedOptions.width * mergedOptions.heightRatio;

  const svg = d3
    .create("svg")
    .attr("width", mergedOptions.width)
    .attr("height", height)
    .attr("viewBox", [-mergedOptions.width / 2, -height / 2, mergedOptions.width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const g = svg.append("g");

  const zoomHandler = d3
    .zoom()
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    })
    .on("start", mergedOptions.interactionCallback);
  svg.call(zoomHandler);
  svg.call(
    zoomHandler.transform,
    d3.zoomIdentity.translate(0,0).scale(mergedOptions.initialScale), // Centered initial translate
  );

  const linkContainer = g.append("g").attr("class", "link-container");
  const nodeContainer = g.append("g").attr("class", "node-container");

  const defs = g.append("defs");
  defs
    .append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", mergedOptions.nodeRadius / mergedOptions.linkStrokeWidth + 7)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .style("fill", typeof mergedOptions.linkStroke === "function" ? mergedOptions.linkStroke({source:{}, target:{}}) : mergedOptions.linkStroke)
    .style("stroke", "none");


  defs
    .append("marker")
    .attr("id", "self-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 5) // Adjust for self-loop marker position
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .style("fill", typeof mergedOptions.linkStroke === "function" ? mergedOptions.linkStroke({source:{}, target:{}}) : mergedOptions.linkStroke)
    .style("stroke", "none");


  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${-(mergedOptions.width / 2) + 20}, ${-(height / 2) + 20})`)
    .style("font-family", "sans-serif")
    .style("font-size", "10px");

  const legendSize = 12;
  const legendSpacing = 4;

  function updateLegend(currentNodes) {
    const presentCollectionIds = [
      ...new Set(currentNodes.map((n) => n.id?.split("/")[0])),
    ].filter((id) => id && id !== "edges" && mergedOptions.collectionsMap.has(id));
    presentCollectionIds.sort();

    const legendItems = legend
      .selectAll(".legend-item")
      .data(presentCollectionIds, (d) => d);

    legendItems.exit().remove();

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

    legendEnter
      .append("text")
      .attr("x", legendSize + 5)
      .attr("y", legendSize / 2)
      .attr("dy", "0.35em");

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

  let processedNodes = [];
  let processedLinks = [];

  updateGraph({ newNodes: initialNodes, newLinks: initialLinks });

  // --- MODIFICATION START: ticked function with simplified parallel link drawing ---
  function ticked() {
    const linkElements = linkContainer.selectAll("g.link"); // Group containing path and text

    // Update path.self-link for self-loops
    linkElements.selectAll("path.self-link")
      .attr("d", d => {
        if (!d.source) return ""; // Should have source
        const x = d.source.x;
        const y = d.source.y;
        const nodeR = mergedOptions.nodeRadius;
        const loopRadius = nodeR * 1.5; // Simple self-loop radius

        // A common self-loop path (adjust as needed)
        // Starts slightly to the right of the node, loops down and back.
        const dr = loopRadius * 2;
        return `M${x},${y + nodeR} A${dr/2},${dr/2} 0 1,0 ${x + 0.1},${y + nodeR - 0.1}`; // Arc path
      });

    // Update path for non-self-links
    linkElements.selectAll("path:not(.self-link)") // Select paths that are not self-links
      .attr("d", d => {
        if (!d.source || !d.target) return ""; // Should have source and target
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;

        if (d.isParallelPair) {
          const dx = tx - sx;
          const dy = ty - sy;
          const dr = Math.sqrt(dx * dx + dy * dy) * (1 / mergedOptions.parallelLinkCurvature); // Increase dr for less curve

          // Using an arc path. "large-arc-flag" (0) for less than 180 degrees.
          return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
        } else {
          // Straight line for non-parallel links
          return `M${sx},${sy}L${tx},${ty}`;
        }
      });

    nodeContainer.selectAll("g.node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    // Update positions for link text
    linkElements.selectAll("text.link-label")
      .attr("transform", d => {
        if (!d.source || !d.target) return "";

        if (d.source.id === d.target.id) { // Self-link text
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

            const dist = Math.sqrt(dx*dx + dy*dy);
            const curvatureOffset = dist * mergedOptions.parallelLinkCurvature * 0.3; // How far to offset text from center
            const textOffsetSign = -1; // Offset one way or the other

            const normX = dy / dist;
            const normY = -dx / dist;

            midX = mx + textOffsetSign * curvatureOffset * normX;
            midY = my + textOffsetSign * curvatureOffset * normY;

        } else { // Straight line
          midX = (sx + tx) / 2;
          midY = (sy + ty) / 2;
          angle = Math.atan2(ty - sy, tx - sx) * (180 / Math.PI);
        }

        // Keep text upright
        if (Math.abs(angle) > 90) angle += 180;

        // Small vertical offset from the line/arc for text
        const textVerticalOffset = 0; // Keep for later
        const offsetX = textVerticalOffset * Math.sin(angle * Math.PI / 180);
        const offsetY = textVerticalOffset * -Math.cos(angle * Math.PI / 180);


        return `translate(${midX + offsetX}, ${midY + offsetY}) rotate(${angle})`;
      });
  }


  function centerOnNode(nodeId, transitionDuration = 1000) {
    let node = simulation.nodes().find((node) => node._id === nodeId);
    if (!node) {
        console.warn("Node not found for centering:", nodeId);
        return;
    }
    const currentTransform = d3.zoomTransform(svg.node());
    const k = currentTransform.k;
    const newTransform = d3.zoomIdentity
      .translate(-node.x * k, -node.y * k)
      .scale(k);
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
    container.selectAll(`${labelClass}`).style("display", show ? "block" : "none");
    if (!frozenState) {
      mergedOptions.labelStates[labelClass] = show;
    }
  }

  function updateNodeFontSize(newFontSize) {
    mergedOptions.nodeFontSize = newFontSize;
    nodeContainer.selectAll("text.node-label, text.collection-label").style("font-size", newFontSize + "px");
  }

  function updateLinkFontSize(newFontSize) {
    mergedOptions.linkFontSize = newFontSize;
    linkContainer.selectAll("text.link-label").style("font-size", newFontSize + "px");
  }

  function updateGraph({
    newNodes = [],
    newLinks = [],
    collapseNodes = [],
    removeNode = false,
    centerNodeId = null,
    simulate = false,
  } = {}) {
    const hasNewData = newNodes.length > 0 || newLinks.length > 0;

    if (hasNewData || simulate) {
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
        linkForceStrength, // Use the stored/default link force strength
      );
    }

    if (collapseNodes.length) {
      const nodesToRemove = [];
      processedNodes.forEach((node) => {
        if (
          collapseNodes.includes(node.id) ||
          mergedOptions.originNodeIds.includes(node.id)
        ) {
          return;
        }
        const nodeLinks = processedLinks.filter(
          (link) => (link.source.id || link.source) === node.id || (link.target.id || link.target) === node.id,
        );
        if (nodeLinks.length > 0) {
          const allLinksToCollapseNodes = nodeLinks.every((link) => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            const otherId = sourceId === node.id ? targetId : sourceId;
            return collapseNodes.includes(otherId);
          });
          if (allLinksToCollapseNodes) {
            nodesToRemove.push(node.id);
          }
        }
      });

      processedNodes = processedNodes.filter(
        (node) => !nodesToRemove.includes(node.id),
      );
      processedLinks = processedLinks.filter(
        (link) => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            return !nodesToRemove.includes(sourceId) && !nodesToRemove.includes(targetId);
        }
      );

      if (removeNode) {
        processedNodes = processedNodes.filter(
          (node) => !collapseNodes.includes(node.id),
        );
        processedLinks = processedLinks.filter(
          (link) => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            return !collapseNodes.includes(sourceId) && !collapseNodes.includes(targetId);
          }
        );
      }
    }

    processedNodes = processGraphData(
      processedNodes,
      newNodes,
      mergedOptions.nodeId,
      mergedOptions.label,
      mergedOptions.nodeHover, // Pass nodeHover explicitly
    );
    processedLinks = processGraphLinks(
      processedLinks,
      newLinks,
      processedNodes, // Pass nodes with resolved 'id' property
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
      { // Pass relevant options from mergedOptions
        forceLink,
        nodeRadius: mergedOptions.nodeRadius,
        nodeFontSize: mergedOptions.nodeFontSize,
        linkStroke: mergedOptions.linkStroke,
        linkStrokeOpacity: mergedOptions.linkStrokeOpacity,
        linkStrokeWidth: mergedOptions.linkStrokeWidth,
        linkStrokeLinecap: mergedOptions.linkStrokeLinecap,
        linkFontSize: mergedOptions.linkFontSize,
        // color function is not directly passed to renderGraph, but used by nodeEnter
        onNodeClick: mergedOptions.onNodeClick,
        drag: mergedOptions.drag,
        originNodeIds: mergedOptions.originNodeIds,
        collectionsMap: mergedOptions.collectionsMap,
      },
    );
    updateLegend(processedNodes);

    const newThreshold = Math.max(1 / (processedNodes.length || 1), 0.002); // Avoid division by zero
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
        // No linkForceStrength when turning off
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