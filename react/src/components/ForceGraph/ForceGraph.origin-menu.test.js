import { originMenuLabel } from "./ForceGraph";

describe("originMenuLabel", () => {
  test("shows Remove as origin for a current origin", () => {
    expect(originMenuLabel("cs/1", ["cs/1", "cs/2"])).toBe("Remove as origin");
  });
  test("shows Add as origin for a non-origin node", () => {
    expect(originMenuLabel("cs/9", ["cs/1", "cs/2"])).toBe("Add as origin");
  });
  test("handles an empty origin list", () => {
    expect(originMenuLabel("cs/1", [])).toBe("Add as origin");
  });
});
