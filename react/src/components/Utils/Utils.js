export const fetchCollections = async (graphType) => {
  // Accept graphType argument
  let response = await fetch("/arango_api/collections/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      graph: graphType,
    }),
  });
  if (!response.ok) {
    console.error(
      "Fetch collections failed:",
      response.status,
      await response.text(),
    );
    throw new Error(`Network response was not ok (${response.status})`);
  }
  return response.json();
};

export const hasAnyNodes = (data, nodeId) => {
  // Check if data, data.nodes exist and are objects.
  if (
    !data ||
    typeof data !== "object" ||
    !data.nodes ||
    typeof data.nodes !== "object" ||
    !data.nodes.hasOwnProperty(nodeId) // Check if the specific nodeId key exists
  ) {
    // Return false if basic structure or the specific key is missing
    return false;
  }

  // Get the array associated with the nodeId
  const nodeEntries = data.nodes[nodeId];

  // Validate that nodeEntries is actually an array
  if (!Array.isArray(nodeEntries)) {
    return false;
  }

  //    .some() returns true if the callback function returns true for at least one element.
  const result = nodeEntries.some((entry) => {
    // Check if the entry exists, is an object, has the 'node' property, AND that property is not null
    return (
      entry && // Check if entry is truthy
      typeof entry === "object" && // Check if entry is an object
      entry.hasOwnProperty("node") && // Check if entry has the 'node' property
      entry.node !== null
    ); // Check if the 'node' property's value is not null
  });

  // Return the result of the .some() check
  return result;
};

export const parseCollections = (collections, collectionsMap = null) => {
  if (collectionsMap) {
    return collections.sort((a, b) => {
      const aDisplay =
        collectionsMap.get(a) && collectionsMap.get(a)["display_name"]
          ? collectionsMap.get(a)["display_name"]
          : a;
      const bDisplay =
        collectionsMap.get(b) && collectionsMap.get(b)["display_name"]
          ? collectionsMap.get(b)["display_name"]
          : b;

      return aDisplay.toLowerCase().localeCompare(bDisplay.toLowerCase());
    });
  } else {
    return collections.sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }
};

export const getLabel = (item) => {
  return [
    item.label,
    item.Name,
    item.term,
    item.Symbol,
    item.Author_cell_term,
    item.Label,
    item._id,
  ]
    .find((value) => value !== undefined) // Find the first non-undefined value
    ?.toString()
    .split(",")
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .join(" + ");
};

export function findNodeById(node, id) {
  if (node._id === id) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// Function to immutably merge children into the graph data
export function mergeChildren(graphData, parentId, children) {
  // Deep copy
  const newData = JSON.parse(JSON.stringify(graphData));

  // Find the parent node in the copied data structure
  const parentNode = findNodeById(newData, parentId);

  if (parentNode) {
    // Assign the fetched children
    parentNode.children = children;
  } else {
    console.warn(`Parent node with ID ${parentId} not found in graph data.`);
  }

  return newData;
}
