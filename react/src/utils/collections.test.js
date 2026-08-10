import { getDisplayFields, getSectionedFields, getUrl } from "./collections";

describe("getSectionedFields", () => {
  const csd = (overrides = {}) => ({
    _id: "CSD/abc123",
    Citation: "Sikkema (2023) Nat Med",
    dataset_identifier: "4cb45d80-499a-48ae-a056-c71ac352c94",
    dataset_name: "An integrated cell atlas of the human lung.",
    species: "Homo sapiens",
    disease_status: "Normal",
    anatomical_structure: "lung parenchyma",
    collection_id: "6f6d381a-7701-4781-935c-db10d30de293",
    assay_summary: "scRNA-seq",
    cell_count: 584944,
    cellxgene_collection: "6f6d381a-7701-4781-935c-db10d30de293",
    cellxgene_dataset: "b351804c-293e-4aeb-9c4c-043db67f4540",
    ...overrides,
  });

  it("groups fields into declared sections in order", () => {
    const result = getSectionedFields(csd());
    expect(result.map((s) => s.section)).toEqual(["Overview", "Metadata", "Provenance"]);
    const metadata = result.find((s) => s.section === "Metadata");
    expect(metadata.fields.map((f) => f.label)).toEqual(
      expect.arrayContaining(["Species", "Experiment type", "Total Cell Count", "Collection ID"]),
    );
  });

  it("resolves additive (non-config) keys from the raw document", () => {
    const result = getSectionedFields(csd({ assay_summary: "spatial transcriptomics" }));
    const metadata = result.find((s) => s.section === "Metadata");
    const experimentType = metadata.fields.find((f) => f.label === "Experiment type");
    expect(experimentType.value).toBe("spatial transcriptomics");
    expect(experimentType.url).toBeNull();
  });

  it("drops fields with empty values", () => {
    const result = getSectionedFields(csd({ assay_summary: undefined, disease_status: "" }));
    const metadata = result.find((s) => s.section === "Metadata");
    const labels = metadata.fields.map((f) => f.label);
    expect(labels).not.toContain("Experiment type");
    expect(labels).not.toContain("Disease Status");
  });

  it("omits a section when all its fields are empty", () => {
    const result = getSectionedFields(
      csd({ cellxgene_collection: undefined, cellxgene_dataset: undefined }),
    );
    expect(result.map((s) => s.section)).not.toContain("Provenance");
  });

  it("collects configured attributes outside the curated sections into an Additional section", () => {
    // tissue_annotation is in the CSD collection map but not in any curated
    // fieldSections section, so it must surface under "Additional" (show-all).
    const result = getSectionedFields(csd({ tissue_annotation: "lung parenchyma" }));
    const additional = result.find((s) => s.section === "Additional");
    expect(additional).toBeDefined();
    expect(additional.fields.map((f) => f.value)).toContain("lung parenchyma");
  });

  it("returns null for a collection without a section config", () => {
    expect(getSectionedFields({ _id: "PUB/xyz", label: "Some paper" })).toBeNull();
  });
});

// Exercises the shipped collection maps rather than a fixture, because these
// URLs are only correct if the config names the field that actually holds a
// resolvable identifier. Both cases below shipped broken.
describe("outbound links from the shipped collection maps", () => {
  it("points a cell set dataset at the bare CELLxGENE dataset UUID", () => {
    // dataset_identifier carries a "__<tissue>" suffix that CELLxGENE 404s on;
    // the unsuffixed UUID lives in version.
    const csd = {
      _id: "CSD/ad9529a3-0937-4177-9732-31dee15188c1__bone_marrow",
      dataset_identifier: "ad9529a3-0937-4177-9732-31dee15188c1__bone_marrow",
      version: "ad9529a3-0937-4177-9732-31dee15188c1",
    };
    expect(getUrl(csd)).toBe(
      "https://cellxgene.cziscience.com/e/ad9529a3-0937-4177-9732-31dee15188c1.cxg/",
    );
  });

  it("resolves a publication DOI through doi.org", () => {
    // publication_doi is a bare DOI, so it needs the resolver prefix to be a URL.
    const pub = {
      _id: "PUB/10.7554-elife.62522",
      publication_doi: "10.7554/elife.62522",
    };
    expect(getUrl(pub)).toBe("https://doi.org/10.7554/elife.62522");

    const doi = getDisplayFields(pub).find((field) => field.key === "publication_doi");
    expect(doi.url).toBe("https://doi.org/10.7554/elife.62522");
  });
});
