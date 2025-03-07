import { render, waitFor, screen } from "@testing-library/react";
import Sunburst from "./Sunburst";
import { GraphNameContext } from "../Contexts/Contexts";

describe("Sunburst Component", () => {
  let originalFetch;

  beforeEach(() => {
      originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: () => Promise.resolve({
              "label": "NLM Cell Knowledge Network",
              "children": [
                  {
                      "label": "cell",
                      "children": []
                  },
                  {
                      "label": "biological_process",
                      "children": []
                  }]
          })
        })
      );
  });

  afterEach(() => {
      global.fetch = originalFetch;
  });

  test("Fetches data correctly from /arango_api/sunburst/", async () => {
    render(
      <GraphNameContext.Provider value="testGraph">
        <Sunburst addSelectedItem={jest.fn()} />
      </GraphNameContext.Provider>
    );

    // Ensure fetch was called
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/arango_api/sunburst/",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph_name: "testGraph" }),
      })
    );
  });
  test("Popup button is hidden on load", () => {
      // Render the component
      render(
        <GraphNameContext.Provider value="testGraph">
          <Sunburst addSelectedItem={jest.fn()} />
        </GraphNameContext.Provider>
      );

      // Find the popup button by its testid
      const popupButton = screen.getByTestId("popup-button");

      // Assert that the popup button is not visible on load
      expect(popupButton).not.toBeVisible(); // Expect the button to be hidden
    });
});