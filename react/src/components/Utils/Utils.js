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
