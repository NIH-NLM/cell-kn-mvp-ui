import { createContext, useState, useEffect, useContext, useMemo } from "react";

// URL from HRC
const FTU_PARTS_URL =
  "https://grlc.io/api-git/hubmapconsortium/ccf-grlc/subdir/hra/ftu-parts.json";

// Define context
const FtuPartsContext = createContext({
  ftuParts: [],
  isLoading: true,
  error: null,
});

// Create Provider
export const FtuPartsProvider = ({ children }) => {
  const [ftuParts, setFtuParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data
  useEffect(() => {
    const fetchFtuParts = async () => {
      try {
        const response = await fetch(FTU_PARTS_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setFtuParts(data);
      } catch (e) {
        console.error("Failed to fetch FTU parts:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFtuParts();
  }, []);

  // Memoize
  const value = useMemo(
    () => ({
      ftuParts,
      isLoading,
      error,
    }),
    [ftuParts, isLoading, error],
  );

  return (
    <FtuPartsContext.Provider value={value}>
      {children}
    </FtuPartsContext.Provider>
  );
};

// Create hook
export const useFtuParts = () => {
  const context = useContext(FtuPartsContext);
  if (context === undefined) {
    throw new Error("useFtuParts must be used within a FtuPartsProvider");
  }
  return context;
};
