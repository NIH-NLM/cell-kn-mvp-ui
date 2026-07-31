/**
 * UI-local declaration of which document attributes hold gene symbols.
 *
 * Values in these fields are comma-separated lists of gene symbols (e.g.
 * "XCL1,XCL2,GNLY"). Each symbol is the `_key` of a document in the GS
 * ("Gene symbol") collection, so the sidebar can link every token to its own
 * gene page, which in turn links out to NCBI Gene.
 *
 * This config is presentation-only and intentionally lives in the UI: the
 * collection map at `assets/nlm-ckn-collection-maps.json` is kept byte-identical
 * with the ETL repo by a sync workflow, and its `field_url` mechanism can only
 * produce one URL for a whole field value, never one per token.
 *
 * Keyed by collection abbreviation; values are the attribute names to tokenize.
 */
export const geneFields = {
  BMC: ["markers"],
  BGS: ["markers"],
  CS: ["biomarker_combination", "binary_gene_set", "expressed_genes"],
  PR: ["gene_symbol"],
  GS: ["gene_symbol"],
};

/**
 * Lookup form of the config. Collection names arrive from document ids, so a Map
 * keeps names like "constructor" from resolving to inherited object properties.
 */
const geneFieldsByCollection = new Map(Object.entries(geneFields));

/**
 * Tokens that are not gene symbols and therefore have no GS document to link to.
 * A small share of marker lists carry Ensembl identifiers (e.g. "ENSG00000277734")
 * instead of a symbol; those render as plain text rather than as dead links.
 */
const NON_SYMBOL_TOKEN = /^ENS[A-Z]*\d+(\.\d+)?$/;

/**
 * Whether a document attribute should be rendered as a list of gene links.
 * @param {string} collection - Collection abbreviation, e.g. "BMC".
 * @param {string} fieldKey - Attribute name, e.g. "markers".
 * @returns {boolean} True when the field holds gene symbols.
 */
export const isGeneField = (collection, fieldKey) =>
  Boolean(fieldKey) && (geneFieldsByCollection.get(collection) || []).includes(fieldKey);

/**
 * Split a gene field value into tokens, flagging which ones can be linked.
 * Blank tokens are dropped so a trailing comma cannot produce an empty link.
 *
 * Each token also carries a render key. Nothing guarantees a marker list holds
 * distinct symbols, so a repeat is disambiguated by its occurrence number
 * rather than by its position in the array.
 *
 * @param {*} value - Raw attribute value (string, or array of strings).
 * @returns {Array<{symbol: string, key: string, linkable: boolean}>} Ordered tokens.
 */
export const parseGeneTokens = (value) => {
  const raw = Array.isArray(value) ? value.join(",") : value;
  if (typeof raw !== "string") return [];

  const occurrences = new Map();
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((symbol) => {
      const occurrence = (occurrences.get(symbol) || 0) + 1;
      occurrences.set(symbol, occurrence);
      return {
        symbol,
        key: occurrence === 1 ? symbol : `${symbol}#${occurrence}`,
        linkable: !NON_SYMBOL_TOKEN.test(symbol),
      };
    });
};
