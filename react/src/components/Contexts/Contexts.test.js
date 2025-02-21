import { render, screen } from "@testing-library/react";
import { GraphNameContext, DbNameContext, PrunedCollections } from "./Contexts";

// Dummy component to consume contexts
const ConsumerComponent = () => {
  return (
    <>
      <GraphNameContext.Consumer>
        {(value) => <div>{`Graph: ${value}`}</div>}
      </GraphNameContext.Consumer>

      <DbNameContext.Consumer>
        {(value) => <div>{`DB: ${value}`}</div>}
      </DbNameContext.Consumer>

      <PrunedCollections.Consumer>
        {(value) => <div>{`Pruned: ${value.join(", ")}`}</div>}
      </PrunedCollections.Consumer>
    </>
  );
};

describe("Contexts", () => {
  it("should provide default values to consumers", () => {
    render(<ConsumerComponent />);

    // Test default values from contexts
    expect(screen.getByText("Graph: CL-Full")).toBeInTheDocument();
    expect(screen.getByText("DB: CL-Full")).toBeInTheDocument();
    expect(screen.getByText("Pruned: NCBITaxon")).toBeInTheDocument();
  });

  it("should provide updated values when context values change", () => {
    const Wrapper = ({ children }) => {
      return (
        <GraphNameContext.Provider value="Updated-Graph">
          <DbNameContext.Provider value="Updated-DB">
            <PrunedCollections.Provider value={["UpdatedTaxon"]}>
              {children}
            </PrunedCollections.Provider>
          </DbNameContext.Provider>
        </GraphNameContext.Provider>
      );
    };

    render(
      <Wrapper>
        <ConsumerComponent />
      </Wrapper>,
    );

    // Test updated values from contexts
    expect(screen.getByText("Graph: Updated-Graph")).toBeInTheDocument();
    expect(screen.getByText("DB: Updated-DB")).toBeInTheDocument();
    expect(screen.getByText("Pruned: UpdatedTaxon")).toBeInTheDocument();
  });
});
