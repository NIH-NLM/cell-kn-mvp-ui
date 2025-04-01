export const fetchCollections = async () => {
  let response = await fetch("/arango_api/collections/");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return response.json();
};

export const parseCollections = (collections) => {
  // Sort collections alphabetically
  return collections.sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
};

export const getLabel = (item) => {
  return item.label || item.Name || item.term || item.Symbol|| item.Label || item._id
}
