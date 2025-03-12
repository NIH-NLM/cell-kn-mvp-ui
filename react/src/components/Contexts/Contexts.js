import { createContext } from "react";

/* TODO: review if other variables should be context based */
export const GraphNameContext = createContext("Combined");
export const DbNameContext = createContext("Cell-KN-v2.0");
export const PrunedCollections = createContext(["NCBITaxon"])
