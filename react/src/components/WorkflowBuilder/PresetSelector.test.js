import { render, screen, waitFor } from "@testing-library/react";
import { fetchWorkflowPresets } from "services";
import PresetSelector from "./PresetSelector";

jest.mock("services", () => ({ fetchWorkflowPresets: jest.fn() }));

const makePreset = (overrides = {}) => ({
  id: "uc4",
  name: "Lung spatial panel",
  description: "A preset",
  category: "Use Cases",
  phases: [{ id: "p1" }],
  unknown_labels: [],
  ...overrides,
});

const renderWith = (presets) => {
  fetchWorkflowPresets.mockResolvedValue({ presets, categories: [], sections: [] });
  return render(<PresetSelector onSelectPreset={jest.fn()} onStartFromScratch={jest.fn()} />);
};

describe("PresetSelector schema-drift badge", () => {
  beforeEach(() => jest.clearAllMocks());

  it("badges a preset whose labels are missing from the dataset", async () => {
    renderWith([makePreset({ unknown_labels: ["MEMBER_OF"] })]);
    expect(await screen.findByTestId("preset-drift-badge")).toBeInTheDocument();
  });

  it("names the missing labels in the badge title", async () => {
    renderWith([makePreset({ unknown_labels: ["MEMBER_OF", "SUBCLUSTER_OF"] })]);
    const badge = await screen.findByTestId("preset-drift-badge");
    expect(badge).toHaveAttribute("title", expect.stringContaining("MEMBER_OF"));
    expect(badge).toHaveAttribute("title", expect.stringContaining("SUBCLUSTER_OF"));
  });

  it("does not badge a valid preset", async () => {
    renderWith([makePreset()]);
    await screen.findByText("Lung spatial panel");
    expect(screen.queryByTestId("preset-drift-badge")).not.toBeInTheDocument();
  });

  it("does not badge when the field is absent entirely", async () => {
    const preset = makePreset();
    delete preset.unknown_labels;
    renderWith([preset]);
    await screen.findByText("Lung spatial panel");
    expect(screen.queryByTestId("preset-drift-badge")).not.toBeInTheDocument();
  });

  it("keeps a flagged preset clickable", async () => {
    renderWith([makePreset({ unknown_labels: ["MEMBER_OF"] })]);
    const card = await screen.findByRole("button", { name: /Lung spatial panel/ });
    await waitFor(() => expect(card).not.toBeDisabled());
  });
});
