import { createContext } from "react";

/* TODO: review if other variables should be context based */
export const GraphNameContext = createContext("KN-v2.0");
export const DbNameContext = createContext("Cell-KN");
export const PrunedCollections = createContext(["NCBITaxon"])
