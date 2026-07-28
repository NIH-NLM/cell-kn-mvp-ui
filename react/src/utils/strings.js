/**
 * String manipulation utilities.
 */

/**
 * Convert string or array of strings to capital case.
 * @param {string|Array<string>} input - Input to convert.
 * @returns {string} Capital cased string.
 */
export const capitalCase = (input) => {
  if (Array.isArray(input)) {
    return input
      .map((str) =>
        typeof str === "string"
          ? str
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
          : str,
      )
      .join("|");
  }
  if (typeof input === "string") {
    return input
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return input;
};

/**
 * Numeric values arrive from the graph as strings, often at full float precision
 * (e.g. "0.6556691514777705"). Matches plain integers and decimals only, so
 * identifiers, DOIs and CURIEs are left untouched.
 */
const PLAIN_NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/;

/**
 * Format a document attribute value for display.
 * Joins arrays, serialises objects, and renders numbers readably: large integers
 * get thousands separators, decimals are rounded to two places. Four digit
 * integers are left as-is so years are not rendered as "2,021".
 * Exception: magnitudes below 0.01 would round away to "0", so they keep two
 * significant digits instead and can exceed two decimals (0.004 stays "0.004").
 * @param {*} value - Raw attribute value.
 * @returns {string} Display-ready value.
 */
export const formatFieldValue = (value) => {
  if (typeof value === "boolean") return value.toString();
  if (Array.isArray(value)) return value.map(formatFieldValue).join(", ");
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  const asString = typeof value === "number" ? String(value) : value;
  if (typeof asString !== "string" || !PLAIN_NUMBER.test(asString)) {
    return value;
  }

  const asNumber = Number(asString);
  if (Number.isInteger(asNumber)) {
    return Math.abs(asNumber) >= 10000 ? asNumber.toLocaleString("en-US") : asString;
  }

  // Values below the rounding threshold would collapse to "0", so keep
  // significant digits instead.
  if (asNumber !== 0 && Math.abs(asNumber) < 0.01) {
    return String(Number(asNumber.toPrecision(2)));
  }
  return String(Number(asNumber.toFixed(2)));
};

/**
 * Truncate a string to a maximum length with ellipsis.
 * @param {string} text - Text to truncate.
 * @param {number} maxLength - Maximum length.
 * @returns {string} Truncated string.
 */
export function truncateString(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}
