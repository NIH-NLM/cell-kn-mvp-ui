/**
 * UI-local sidebar section structure, keyed by collection abbreviation.
 *
 * This is a presentation-only config owned by the UI. It is intentionally
 * separate from `assets/nlm-ckn-collection-maps.json`, which is kept
 * byte-identical with the ETL repo by a sync workflow and must not carry
 * UI section tags.
 *
 * Each field descriptor:
 *   - key:     the document property to read.
 *   - label:   the display label shown in the sidebar (authoritative).
 *   - variant: optional; "description" renders as a lead paragraph, not a row.
 *
 * Values and URLs for keys that also appear in the collection map are resolved
 * through `getDisplayFields` (so URL templates stay in one place). Keys not in
 * the collection map resolve their plain value straight from the document; if a
 * key is absent in the data, that field simply does not render.
 */
export const fieldSections = {
  CSD: [
    {
      section: "Overview",
      fields: [
        { key: "dataset_name", label: "Description", variant: "description" },
        { key: "Citation", label: "Citation" },
        { key: "dataset_identifier", label: "Dataset ID" },
      ],
    },
    {
      section: "Metadata",
      fields: [
        { key: "species", label: "Species" },
        { key: "assay_summary", label: "Experiment type" },
        { key: "disease_status", label: "Disease Status" },
        { key: "anatomical_structure", label: "Anatomical Structures" },
        // "Cell set count" (Figma shows 61): exact key UNCONFIRMED — cell_count is
        // the TOTAL cell count (584,944), not this. Verify the real key live (QA).
        { key: "cell_set_count", label: "Cell set count" },
        { key: "cell_count", label: "Total Cell Count" },
        // Data has mean_silhouette (0.72) but no median silhouette; Figma labels it
        // "Median". Using mean_silhouette with the Figma label — confirm at QA.
        { key: "mean_silhouette", label: "Median silhouette score" },
        { key: "median_of_f_beta_scores", label: "Median F-score" },
        { key: "collection_id", label: "Collection ID" },
      ],
    },
    {
      section: "Provenance",
      fields: [
        { key: "cellxgene_collection", label: "CELLxGENE_collection" },
        { key: "cellxgene_dataset", label: "CELLxGENE_dataset" },
      ],
    },
  ],
};
