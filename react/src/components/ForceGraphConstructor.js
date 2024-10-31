import * as d3 from "d3";

// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function ForceGraphConstructor({
                        nodes, // an iterable of node objects (typically [{id}, …])
                        links // an iterable of link objects (typically [{source, target}, …])
                    }, {
                        nodeId = d => d._id, // given d in nodes, returns a unique identifier (string)
                        nodeGroup, // given d in nodes, returns an (ordinal) value for color
                        nodeGroups, // an array of ordinal values representing the node groups
                        label, // given d in nodes, a label string
                        nodeTitle, // given d in nodes, a title string
                        fontSize = "2px",
                        nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
                        nodeStroke = "#fff", // node stroke color
                        nodeStrokeWidth = 1.5, // node stroke width, in pixels
                        nodeStrokeOpacity = 1, // node stroke opacity
                        nodeRadius = 5, // node radius, in pixels
                        nodeStrength,
                        linkSource = ({_from}) => _from, // given d in links, returns a node identifier string
                        linkTarget = ({_to}) => _to, // given d in links, returns a node identifier string
                        linkStroke = "#999", // link stroke color
                        linkStrokeOpacity = 0.6, // link stroke opacity
                        linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
                        linkStrokeLinecap = "round", // link stroke linecap
                        linkStrength,
                        initialScale = 3, // initial zoom level
                        colors = d3.schemeTableau10, // an array of color strings, for the node groups
                        width = 640, // outer width, in pixels
                        height = 400, // outer height, in pixels
                        invalidation // when this promise resolves, stop the simulation
                    } = {}) {
    // Compute values.
    const N = d3.map(nodes, nodeId).map(intern);
    const R = typeof nodeRadius !== "function" ? null : d3.map(nodes, nodeRadius);
    const LS = d3.map(links, linkSource).map(intern);
    const LT = d3.map(links, linkTarget).map(intern);
    if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
    const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
    const NL = label == null ? null : d3.map(nodes, label);
    const EL = label == null ? null : d3.map(links, label);
    const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
    const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);
    const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);


    // Replace the input nodes and links with mutable objects for the simulation.
    nodes = d3.map(nodes, (_, i) => ({id: N[i]}));
    links = d3.map(links, (_, i) => ({source: LS[i], target: LT[i]}));

    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

    // Construct the scales.
    const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

    // Construct the forces.
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(links).id(({index: i}) => N[i]);
    if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
    if (linkStrength !== undefined) forceLink.strength(linkStrength);

    const simulation = d3.forceSimulation(nodes)
        .force("link", forceLink)
        .force("charge", forceNode)
        .force("center",  d3.forceCenter())
        .on("tick", ticked);

    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    const g = svg.append("g");

    svg.attr("viewBox", [-width / 2, -height / 2, width, height])

    const zoomHandler = d3.zoom().on("zoom", function (event) {
        g.attr("transform", event.transform);
    });

    svg.call(zoomHandler);
    const initialTranslateX = 100;
    const initialTranslateY = 100;

    // Update starting zoom state
    svg.call(zoomHandler.transform, d3.zoomIdentity.translate(initialTranslateX, initialTranslateY).scale(initialScale));

    // Create a group for links
    const link = g.append("g")
        .selectAll("g")
        .data(links)
        .join("g")
        .attr("class", "link-container")

    // Append a defs section for marker arrows
    const defs = g.append("defs");

    defs.append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 12)
        .attr("refY", 5)
        .attr("markerWidth", 5)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("polygon")
        .attr("points", "0,3.5 6,5 0,6.5 1,5")
        .style("fill", typeof linkStroke !== "function" ? linkStroke : null);

    // Append line to each g
    link.append("line")
        .attr("class", "links")
        .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
        .attr("stroke-opacity", linkStrokeOpacity)
        .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
        .attr("stroke-linecap", linkStrokeLinecap)
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .attr("marker-end", "url(#arrow)");

    // Append text to each g
    link.append("text")
        .text(({ index: i }) => EL[i])
        .style("font-size", fontSize)
        .style("fill", "black")
        .attr("text-anchor", "middle")
        // .attr("y", 7.5)
        .call(wrap, 25);


    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("g")
        .call(drag(simulation));

    // Returns a selection of circles, newly append to each g in node
    node.append("circle")
        .attr("r", 5);

    // Append text
    node.append("text")
        .text(({ index: i }) => NL[i])
            .style("font-size", fontSize)
            .style("fill", "black")
            .attr("text-anchor", "middle")
            .attr("y", 7.5)
        .call(wrap, 25);


    node.append("title").text(({index: i}) => T[i])

    // Create legend
    const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${-((width/2)-20)}, ${-((height/2)-20)})`);

    const legendItem = legend.selectAll(".legend-item")
    .data([...new Set(nodeGroups)])
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`); // Space items vertically

    legendItem.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color); // Use the color scale for fill

    legendItem.append("text")
        .attr("x", 25)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(d => d); // Text corresponds to the group names


    if (W) link.attr("stroke-width", ({index: i}) => W[i]);
    if (L) link.attr("stroke", ({index: i}) => L[i]);
    if (G) node.attr("fill", ({index: i}) => color(G[i]));
    if (R) node.attr("r", ({index: i}) => R[i]);
    if (invalidation != null) invalidation.then(() => simulation.stop());

    function intern(value) {
        return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    // Handle movement
    function ticked() {

        // Update link position
        link.selectAll("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        // Update node positions
        node
            .attr("transform",function(d) { return "translate("+[d.x,d.y]+")"; });

        // Update positions for link text
        link.selectAll("text")
                .attr("transform", d => {
                    const midX = (d.source.x + d.target.x) / 2;
                    const midY = (d.source.y + d.target.y) / 2;

                    const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * (180 / Math.PI);

                    return `translate(${midX}, ${midY}) rotate(${angle})`;
                }
            );
    }

    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    function wrap(text, maxChars) {
          text.each(function() {
              let text = d3.select(this),
                  words = text.text().split(/\s+/).reverse(),
                  word,
                  line = [],
                  lineNumber = 0,
                  lineHeight = 1.1, // ems
                  y = text.attr("y"),
                  dy = parseFloat(text.attr("dy")),
                  tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

              let i = 0
              while (word = words.pop()) {
              line.push(word);
              tspan.text(line.join(" "));
              if (tspan.text().length > maxChars && i > 0) {
                  lineNumber++
                  line.pop();
                  tspan.text(line.join(" "));
                  line = [word];
                  tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", lineHeight * lineNumber + "em").text(word);
              }
              i++
            }
          });
        }

    return Object.assign(svg.node(), {scales: {color}});
}

export default ForceGraphConstructor
