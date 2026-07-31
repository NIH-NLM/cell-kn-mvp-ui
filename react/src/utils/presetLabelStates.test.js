import { DEFAULT_LABEL_STATES } from "constants/graph";
import { resolvePresetLabelStates } from "./graph";

describe("resolvePresetLabelStates", () => {
  it("returns null for a preset that does not declare label states", () => {
    expect(resolvePresetLabelStates({ id: "some-preset" })).toBeNull();
  });

  it("merges a partial declaration over the defaults", () => {
    const resolved = resolvePresetLabelStates({
      id: "dipper-explorer",
      labelStates: { "link-label": false },
    });

    expect(resolved).toEqual({ ...DEFAULT_LABEL_STATES, "link-label": false });
  });

  it("leaves the shared defaults untouched", () => {
    const before = { ...DEFAULT_LABEL_STATES };
    resolvePresetLabelStates({ labelStates: { "node-label": false } });

    expect(DEFAULT_LABEL_STATES).toEqual(before);
  });

  it("ignores keys that are not real label classes", () => {
    const resolved = resolvePresetLabelStates({
      labelStates: { "link-label": false, "not-a-label": true },
    });

    expect(resolved).not.toHaveProperty("not-a-label");
  });

  // A declaration that overrides nothing must not resolve, or loading the
  // preset would dispatch a no-op that resets whatever labels the user had
  // turned on.
  it("returns null for an empty declaration", () => {
    expect(resolvePresetLabelStates({ labelStates: {} })).toBeNull();
  });

  it("returns null when the declaration has only unknown keys", () => {
    expect(resolvePresetLabelStates({ labelStates: { "not-a-label": true } })).toBeNull();
  });

  it("returns null when labelStates is not an object", () => {
    expect(resolvePresetLabelStates({ labelStates: "link-label" })).toBeNull();
  });

  // Boolean("false") is true, so coercing a string-valued override would apply
  // the opposite of what the preset author wrote AND reset the user's other
  // labels — the exact outcome this resolver exists to prevent.
  it("rejects a non-boolean value rather than coercing it", () => {
    expect(resolvePresetLabelStates({ labelStates: { "link-label": "false" } })).toBeNull();
  });

  it("keeps valid overrides when another key has a non-boolean value", () => {
    const resolved = resolvePresetLabelStates({
      labelStates: { "link-label": false, "node-label": "nope" },
    });

    expect(resolved).toEqual({ ...DEFAULT_LABEL_STATES, "link-label": false });
  });
});
