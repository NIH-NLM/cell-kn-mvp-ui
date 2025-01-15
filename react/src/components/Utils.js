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
