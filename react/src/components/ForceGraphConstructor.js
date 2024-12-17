import * as d3 from "d3";

function ForceGraphConstructor({
                        nodes: nodeData, // an iterable of node objects (typically [{id}, …])
                        links: linkData, // an iterable of link objects (typically [{source, target}, …])
                    }, {
                        nodeId = d => d._id, // given d in nodes, returns a unique identifier (string)
                        nodeGroup, // given d in nodes, returns an (ordinal) value for color
                        nodeGroups, // an array of ordinal values representing the node groups
                        collectionsMap, // A map from names of collections to names to be shown
                        originNodeIds, // Ids of nodes graph originated from
                        label, // given d in nodes, a label string
                        nodeHover, // given d in nodes, a title string
                        nodeFontSize,
                        linkFontSize,
                        onNodeClick,
                        interactionCallback,
                        nodeRadius = 16,
                        linkSource = ({_from}) => _from, // given d in links, returns a node identifier string
                        linkTarget = ({_to}) => _to, // given d in links, returns a node identifier string
                        linkStroke = "#999", // link stroke color
                        linkStrokeOpacity = 0.6, // link stroke opacity
                        linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
                        linkStrokeLinecap = "round", // link stroke linecap
                        initialScale = 2, // initial zoom level
                        colors = [...d3.schemePaired, ...d3.schemeDark2], // an array of color schemes, for the node groups
                        width = 640, // outer width, in pixels
                        height = 400, // outer height, in pixels
                        nodeForceStrength = -2500,
                        centerForceStrength = 1,
                        invalidation // when this promise resolves, stop the simulation
                    } = {}) {

    // Construct the scales.
    const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

    // Create containers for nodes and links
    let nodes = [] // All nodes
    let links = [] // All links

    // Construct forces and simulation
    const forceNode = d3.forceManyBody().strength(nodeForceStrength);
    const forceCenter = d3.forceCenter().strength(centerForceStrength);
    const forceLink = d3.forceLink(links);

    const simulation = d3.forceSimulation()
        .force("link", forceLink)
        .force("charge", forceNode)
        .force("center",  forceCenter)
        .on("tick", ticked);

    // Create main svg element
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
        .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Create main container
    const g = svg.append("g");

    // Create zoom handler
    const zoomHandler = d3.zoom().on("zoom", function (event) {
        g.attr("transform", event.transform);
    }).on('start', interactionCallback);
    svg.call(zoomHandler);

    // Update starting zoom state
    svg.call(zoomHandler.transform, d3.zoomIdentity.translate(100, 100).scale(initialScale));

    // Create a group for links
    const linkContainer = g.append("g")
        .attr("class", "link-container")

    // Create defs and marker
    const defs = g.append("defs");
    defs.selectAll("marker")
        .data(["arrow"])
        .join("marker")
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


    // Create a group for nodes
    const nodeContainer = g.append("g")
        .attr("class", "node-container");

    // Create legend
    const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${-((width/2)-20)}, ${-((height/2)-20)})`);

    const legendItem = legend.selectAll(".legend-item")
    .data([...new Set(nodeGroups)])
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItem.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legendItem.append("text")
        .attr("x", 25)
        .attr("y", 9)
        .attr("dy", ".5em")
        .text(collection => collectionsMap.has(collection)? collectionsMap.get(collection)["abbreviated_name"] : collection); // Text corresponds to the group names

    updateGraph({newNodes: nodeData, newLinks: linkData})

    function intern(value) {
        return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    // Handle movement
    function ticked() {

        // Update link position
        const link = linkContainer.selectAll("line");
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);


        let node = nodeContainer.selectAll("g")
        node
            .attr("transform",function(d) { return "translate("+[d.x,d.y]+")"; });

        // Update positions for link text
        const linkText = linkContainer.selectAll("text")
        linkText
                .attr("transform", d => {
                    const midX = (d.source.x + d.target.x) / 2;
                    const midY = (d.source.y + d.target.y) / 2;

                    const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * (180 / Math.PI);

                    return `translate(${midX}, ${midY}) rotate(${angle})`;
                }
            )
    }

    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(.2).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
            interactionCallback();
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0).restart();
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
                  // dy = parseFloat(text.attr("dy")),
                  tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", ".35em");

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

    // Update node font size
    function updateNodeFontSize(newFontSize) {

        // Update node font size
        nodeFontSize = newFontSize
        nodeContainer
            .selectAll("text")
            .style("font-size", newFontSize + "px")
    }

    // Update link font size
    function updateLinkFontSize(newFontSize) {

        // Update link font size
        linkFontSize = newFontSize
        linkContainer
            .selectAll("text")
            .style("font-size", newFontSize + "px")
    }

    function toggleSimulation(isSimActive) {
        if (isSimActive){
            simulation.alpha(.5).restart()
            forceNode.strength(nodeForceStrength)
            forceCenter.strength(centerForceStrength)
            forceLink.links(links);
        } else {
            simulation.stop()
            forceNode.strength(0)
            forceCenter.strength(0)
            forceLink.links([])
        }
    }

    function updateGraph({
                             newNodes = [],
                             newLinks = [],
                             removeNodes = [],
                             removeLinks = [],
    }) {

        // Add new nodes and links to the simulation
        if (newNodes.length > 0) {

            // Filter out nodes that already exist based on the id property
            const filteredNewNodes = newNodes.filter(newNode =>
                !nodes.some(existingNode => existingNode.id === newNode._id)
            );

            // Add properties node object
            filteredNewNodes.forEach(newNode => {
                newNode.id = newNode._id;
                newNode.nodeHover = nodeHover(newNode);
                newNode.nodeGroup = nodeGroup ? nodeGroup(newNode) : null;
                newNode.nodeLabel = label(newNode);
            });

            nodes.push(...filteredNewNodes);
            simulation.nodes(nodes);

            // Select the group for nodes
            const node = nodeContainer
                .selectAll("circle")
                .data(nodes, d => d.id)
                .enter().append("g")
                .call(drag(simulation));

            // Add nodes
            node.each(function(d) {
                // Check if the node's id is in the originNodeIds array
                if (originNodeIds.includes(d.id)) {
                    // Add two circles for nodes whose id is in originNodeIds
                    d3.select(this).append("circle") // Outer circle
                        .attr("r", nodeRadius * 1.2)
                        .attr("fill", d => color(d.nodeGroup)); // Fill color based on collection group
                    d3.select(this).append("circle") // Inner circle
                        .attr("r", nodeRadius / 2)
                        .attr("fill", "white") // Opaque center
                        .on("contextmenu", function(event, d) {
                            event.preventDefault();
                            onNodeClick(event, d);
                        });

                } else {
                    // Add a circle for other nodes
                    d3.select(this).append("circle")
                        .attr("r", nodeRadius)
                        .attr("fill", d => color(d.nodeGroup))  // Fill color based on collection group
                        .on("contextmenu", function(event, d) {
                            event.preventDefault();
                            onNodeClick(event, d);
                        });
                }
            });

            // Append text
            node.append("text")
                .text(d => d.nodeLabel)
                .style("font-size", nodeFontSize + "px")
                .style("fill", "black")
                .attr("text-anchor", "middle")
                .attr("y", nodeRadius + nodeFontSize)
                .call(wrap, 25);


            node.append("title").text(d => d.nodeHover)
        }

        // Add new links to the simulation
        if (newLinks.length > 0) {

            // Filter out links that already exist based on source and target
            const filteredNewLinks = newLinks.filter(newLink =>
                !links.some(existingLink =>
                    (existingLink.source.id === newLink._from && existingLink.target.id === newLink._to)
                )
            );

            // Map the filtered links to node objects as source and target
            filteredNewLinks.forEach(link => {
                // Find the source and target node objects based on the _from and _to ids
                link.source = simulation.nodes().find(node => node.id === link["_from"]);
                link.target = simulation.nodes().find(node => node.id === link["_to"]);
                link.label = label(link)
            });

            links.push(...filteredNewLinks);
            forceLink.links(links);

            // Select the group for links
            const link = linkContainer
                .selectAll("g")
                .data(links)
                .join("g")

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

            // Append text to each line
            link.append("text")
                .text(d => d.label)
                .style("font-size", linkFontSize + "px")
                .style("fill", "black")
                .attr("text-anchor", "middle")
                // .attr("y", 7.5)
                .call(wrap, 25);
        }

        // Remove nodes
        if (removeNodes.length > 0) {
            nodes = nodes.filter(node => !removeNodes.includes(node.id));
            simulation.nodes(nodes);

            nodeContainer
                .selectAll("g")
                .filter(d => removeNodes.includes(d.id))
                .remove();

            // Collect every edge connected to these nodes
            let nodeLinks = links
                .filter(edge => removeNodes.includes(edge.source.id) || removeNodes.includes(edge.target.id));
            removeLinks.push(...nodeLinks)
        }

        // Remove links
        if (removeLinks.length > 0) {
            // TODO: Handle finding nodes based on removeLinks input, in cases where only removeLinks are added
            links = links.filter(link => !removeLinks.includes(link));
            forceLink.links(links);

            linkContainer
                .selectAll("g")
                .filter(d => removeLinks.some(link => link.source.id + '-' + link.target.id === d.source.id + '-' + d.target.id))
                .remove();
        }

        // Restart the simulation to apply the changes
        simulation.alpha(1).restart();
    }

    // Return the SVG node and the updateGraph method to interact with the graph
    return Object.assign(svg.node(), {
        scales: { color },
        updateGraph,
        updateNodeFontSize,
        updateLinkFontSize,
        toggleSimulation,
    });
}

export default ForceGraphConstructor
