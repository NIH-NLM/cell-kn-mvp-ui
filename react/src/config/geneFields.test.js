import { isGeneField, parseGeneTokens } from "./geneFields";

describe("isGeneField", () => {
  it("recognises the marker fields of gene-set collections", () => {
    expect(isGeneField("BMC", "markers")).toBe(true);
    expect(isGeneField("BGS", "markers")).toBe(true);
    expect(isGeneField("CS", "expressed_genes")).toBe(true);
    expect(isGeneField("PR", "gene_symbol")).toBe(true);
  });

  it("leaves other fields and collections alone", () => {
    expect(isGeneField("CS", "species")).toBe(false);
    expect(isGeneField("CSD", "markers")).toBe(false);
    expect(isGeneField("", "markers")).toBe(false);
    expect(isGeneField("BMC", undefined)).toBe(false);
  });

  it("ignores inherited object properties rather than throwing", () => {
    expect(isGeneField("__proto__", "markers")).toBe(false);
    expect(isGeneField("constructor", "markers")).toBe(false);
    expect(isGeneField("toString", "markers")).toBe(false);
  });
});

describe("parseGeneTokens", () => {
  it("splits a comma-separated list into linkable symbols", () => {
    expect(parseGeneTokens("XCL1,XCL2,GNLY")).toEqual([
      { symbol: "XCL1", key: "XCL1", linkable: true },
      { symbol: "XCL2", key: "XCL2", linkable: true },
      { symbol: "GNLY", key: "GNLY", linkable: true },
    ]);
  });

  it("trims whitespace and drops empty tokens", () => {
    expect(parseGeneTokens(" SLPI , SERPINA1 ,")).toEqual([
      { symbol: "SLPI", key: "SLPI", linkable: true },
      { symbol: "SERPINA1", key: "SERPINA1", linkable: true },
    ]);
  });

  it("marks Ensembl identifiers as not linkable", () => {
    expect(parseGeneTokens("ENSG00000277734,CD3D")).toEqual([
      { symbol: "ENSG00000277734", key: "ENSG00000277734", linkable: false },
      { symbol: "CD3D", key: "CD3D", linkable: true },
    ]);
  });

  it("marks version-suffixed Ensembl identifiers as not linkable", () => {
    expect(parseGeneTokens("ENSG00000277734.1,ENST00000456328.2")).toEqual([
      { symbol: "ENSG00000277734.1", key: "ENSG00000277734.1", linkable: false },
      { symbol: "ENST00000456328.2", key: "ENST00000456328.2", linkable: false },
    ]);
  });

  it("gives a repeated symbol a distinct render key", () => {
    expect(parseGeneTokens("CD3D,IL7R,CD3D")).toEqual([
      { symbol: "CD3D", key: "CD3D", linkable: true },
      { symbol: "IL7R", key: "IL7R", linkable: true },
      { symbol: "CD3D", key: "CD3D#2", linkable: true },
    ]);
  });

  it("joins array values before splitting", () => {
    expect(parseGeneTokens(["CD3D", "IL7R"])).toEqual([
      { symbol: "CD3D", key: "CD3D", linkable: true },
      { symbol: "IL7R", key: "IL7R", linkable: true },
    ]);
  });

  it("returns nothing for absent or non-string values", () => {
    expect(parseGeneTokens(null)).toEqual([]);
    expect(parseGeneTokens(undefined)).toEqual([]);
    expect(parseGeneTokens(42)).toEqual([]);
    expect(parseGeneTokens("")).toEqual([]);
  });
});
