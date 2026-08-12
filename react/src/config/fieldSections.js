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
  // Cell sets carry three unrelated kinds of attribute — what the set *is*, how
  // well NS-Forest classifies it, and how tightly it clusters. Flat, they read
  // as one undifferentiated list of numbers.
  CS: [
    {
      section: "Overview",
      fields: [
        { key: "author_cell_term", label: "Author cell term" },
        // Only ~27% of cell sets carry an ontology_purl; the rest omit the row.
        { key: "ontology_purl", label: "Cell Ontology term" },
        { key: "species", label: "Species" },
        { key: "anatomical_structure", label: "Anatomical structure" },
        { key: "cell_count", label: "Cell count" },
        { key: "cluster_cell_count", label: "Cluster cell count" },
        { key: "dataset_name", label: "Dataset name" },
        { key: "publication", label: "Publication (DOI)" },
        { key: "cellxgene_collection", label: "CELLxGENE collection" },
        // Not a page: every cell set's dataset URL is a raw .h5ad, so the label
        // has to warn before the click does.
        { key: "cellxgene_dataset", label: "CELLxGENE data file (.h5ad download)" },
      ],
    },
    {
      // The marker genes, then the NS-Forest metrics that score them. Kept
      // adjacent because the scores are meaningless without the combination
      // they grade. true_negative belongs here too but is absent from the data.
      section: "Biomarker & classification metrics",
      fields: [
        { key: "biomarker_combination", label: "Biomarker combination" },
        { key: "binary_gene_set", label: "Binary gene set" },
        { key: "expressed_genes", label: "Expressed genes" },
        { key: "f_beta_score", label: "F-beta score" },
        { key: "precision", label: "Precision" },
        { key: "recall", label: "Recall" },
        { key: "on_target", label: "On target" },
        { key: "true_positive", label: "True positives" },
        { key: "false_positive", label: "False positives" },
        { key: "false_negative", label: "False negatives" },
      ],
    },
    {
      // Silhouette summary statistics over the cells in the set. ~6% of cell
      // sets have none, in which case the whole section drops out.
      section: "Quality metrics",
      fields: [
        { key: "silhouette_score", label: "Silhouette score" },
        { key: "mean_silhouette", label: "Mean silhouette" },
        { key: "median_silhouette", label: "Median silhouette" },
        { key: "first_quartile_silhouette", label: "First quartile silhouette" },
        { key: "third_quartile_silhouette", label: "Third quartile silhouette" },
        { key: "standard_deviation_of_silhouette", label: "Silhouette standard deviation" },
      ],
    },
  ],
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
