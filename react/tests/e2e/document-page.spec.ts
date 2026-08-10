import { expect, test } from "@playwright/test";
import {
  filterErrorsContaining,
  getCollectedErrors,
  installErrorInstrumentation,
} from "./utils/errorInstrumentation";
import { smallGraphWithEdges } from "./utils/testSeeds";

const TEST_COLL = "TEST_DOCUMENT_COLLECTION";

// Raw graph shape: keyed by origin id (non-shortest paths)
function buildRawGraph(originId: string) {
  const { root, edges } = smallGraphWithEdges();
  const nodes = [
    root,
    ...(root.children || []),
    ...(root.children?.[0]?.children || []),
    ...(root.children?.[1]?.children || []),
  ];
  const links = edges.map((e, i) => ({
    ...e,
    _key: `${e._from.split("/")[1]}-${e._to.split("/")[1]}-${i}`,
  }));
  return {
    [originId]: {
      nodes,
      links,
    },
  };
}

test("DocumentPage shows details, renders graph, and opens/closes options", async ({ page }) => {
  await installErrorInstrumentation(page);

  const originKey = "ROOT";
  const originId = `${TEST_COLL}/${originKey}`;
  const { root } = smallGraphWithEdges();

  // Mock document fetch
  await page.route(`**/arango_api/collection/${TEST_COLL}/${originKey}/`, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(root),
    });
  });

  // Mock collections
  await page.route("**/arango_api/collections/", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([TEST_COLL]),
      });
    }
    return route.continue();
  });

  // Mock edge filter options
  await page.route("**/arango_api/edge_filter_options/", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Label: { type: "categorical", values: ["has_child"] } }),
      });
    }
    return route.continue();
  });

  // Mock graph fetch
  await page.route("**/arango_api/graph/", async (route) => {
    if (route.request().method() === "POST") {
      const raw = buildRawGraph(originId);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(raw),
      });
    }
    return route.continue();
  });

  // Navigate direct route
  await page.goto(`/#/collections/${TEST_COLL}/${originKey}`);

  // Details visible
  await expect(page.locator(".graph-title-bar .graph-title")).toHaveText(
    /Test document collection: Root/i,
  );
  await expect(page.locator(".graph-workspace-inspector .document-info-fieldset")).toBeVisible();

  // Graph visible
  const graphWrapper = page.locator(".graph-workspace-canvas #chart-container-wrapper svg");
  await expect(graphWrapper).toBeVisible();

  // Nodes/links rendered
  const nodeGroups = page.locator("g.node");
  await expect(nodeGroups)
    .toHaveCount(3, { timeout: 5000 })
    .catch(async () => {
      const count = await nodeGroups.count();
      expect(count).toBeGreaterThan(2);
    });
  const linkGroups = page.locator("g.link");
  await expect(linkGroups)
    .toHaveCount(2, { timeout: 5000 })
    .catch(async () => {
      const count = await linkGroups.count();
      expect(count).toBeGreaterThan(1);
    });

  // Options open/close
  const toggleOptions = page.locator(".graph-workspace-canvas .toggle-options-button");
  await toggleOptions.click();
  await expect(page.locator("#graph-options-panel")).toBeVisible();
  // When open, the collapse control is the arrow on the panel's left edge.
  await page.locator(".graph-workspace-canvas .options-collapse-arrow").click();
  await expect(page.locator("#graph-options-panel")).toBeHidden();

  // Verify no "split of undefined" errors occurred
  expect(filterErrorsContaining(await getCollectedErrors(page), "split").length).toBe(0);
});

test("DocumentPage: inspector swaps on node click and saved-graph shelf gains a card", async ({
  page,
}) => {
  await installErrorInstrumentation(page);

  const originKey = "ROOT";
  const originId = `${TEST_COLL}/${originKey}`;
  const { root } = smallGraphWithEdges();

  // Mock the origin document fetch specifically (more specific than the
  // wildcard route below; Playwright matches the most recently registered
  // route first, so register this after the wildcard and early-return from
  // the wildcard handler when the key is ROOT).
  await page.route("**/arango_api/collections/", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([TEST_COLL]),
      });
    }
    return route.continue();
  });

  await page.route("**/arango_api/edge_filter_options/", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ Label: { type: "categorical", values: ["has_child"] } }),
      });
    }
    return route.continue();
  });

  await page.route("**/arango_api/graph/", async (route) => {
    if (route.request().method() === "POST") {
      const raw = buildRawGraph(originId);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(raw),
      });
    }
    return route.continue();
  });

  // Wildcard document mock: resolves any clicked node's document by key
  // parsed out of the URL.
  await page.route(`**/arango_api/collection/${TEST_COLL}/*/`, async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split("/").filter(Boolean);
    const key = parts[parts.length - 1];
    if (key === originKey) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(root),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ _id: `${TEST_COLL}/${key}`, label: key }),
    });
  });

  await page.goto(`/#/collections/${TEST_COLL}/${originKey}`);

  // Inspector initially shows the origin document.
  const inspectorLegend = page.locator(".node-inspector .document-info-legend");
  await expect(inspectorLegend).toContainText(`${TEST_COLL}_${originKey}`);

  // Wait for the graph to render, then click a non-origin node.
  const nodeGroups = page.locator("g.node");
  await expect(nodeGroups)
    .toHaveCount(3, { timeout: 5000 })
    .catch(async () => {
      const count = await nodeGroups.count();
      expect(count).toBeGreaterThan(2);
    });

  // The origin node carries id TEST_COLL/ROOT; find a node that isn't it by
  // checking each candidate's bound datum via evaluate (stable regardless of
  // simulation layout/position).
  const nonOriginIndex = await page.evaluate(
    ({ coll, key }) => {
      const groups = Array.from(document.querySelectorAll("g.node"));
      // biome-ignore lint/suspicious/noExplicitAny: d3 datum access in browser context
      const idx = groups.findIndex((el) => (el as any).__data__?._id !== `${coll}/${key}`);
      return idx;
    },
    { coll: TEST_COLL, key: originKey },
  );
  expect(nonOriginIndex).toBeGreaterThanOrEqual(0);

  // Node selection is wired to a left-click interaction (see
  // ForceGraphConstructor/graphRendering.js: onNodeLeftClick fires on
  // "click"); right-click stays reserved for the context menu.
  await nodeGroups.nth(nonOriginIndex).click();

  // Inspector swaps to the clicked node's document.
  await expect(inspectorLegend).not.toContainText(`${TEST_COLL}_${originKey}`, { timeout: 5000 });

  // Saved-graph shelf auto-gains a card for the origin (History strip).
  await page.waitForFunction(
    () => (window as unknown as { __STORE__?: unknown }).__STORE__ != null,
  );

  const shelfCard = page.locator(".saved-graph-card");
  await expect(shelfCard).toBeVisible();
  // The auto-captured History card carries a graph thumbnail (a serialized SVG
  // data URL). The label resolves to the origin's display name, so assert the
  // thumbnail rather than a specific, resolution-dependent label string.
  await expect(shelfCard.locator("img")).toHaveAttribute("src", /^data:image\/svg\+xml/);

  expect(filterErrorsContaining(await getCollectedErrors(page), "split").length).toBe(0);
});

// A long graph title used to squeeze the "Show Options" button until its label
// wrapped across two lines inside the fixed 40px box. The title bar is a
// space-between flex row, so without `nowrap` + `flex-shrink: 0` the button is
// the thing that gives. Measured via the text node's client rects: one rect per
// rendered line, so a wrap shows up as 2.
test("DocumentPage: Show Options stays on one line beside a long graph title", async ({ page }) => {
  await installErrorInstrumentation(page);

  const originKey = "ROOT";
  const { root } = smallGraphWithEdges();
  const longTitle =
    "Cell Set Dataset: Sikkema (2023) Nat Med - An Integrated Cell Atlas Of The Human Lung In Health And Disease (core)";

  await page.route(`**/arango_api/collection/${TEST_COLL}/${originKey}/`, async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      // getTitle() reads `label` for a collection with no config entry — setting
      // `Name` here would leave the title short and the test would prove nothing.
      body: JSON.stringify({ ...root, label: longTitle }),
    }),
  );
  await page.route("**/arango_api/collections/", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([TEST_COLL]),
    }),
  );
  await page.route("**/arango_api/edge_filter_options/", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) }),
  );
  await page.route("**/arango_api/graph/", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildRawGraph(`${TEST_COLL}/${originKey}`)),
    }),
  );
  await page.route("**/arango_api/document/details", async (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) }),
  );

  await page.setViewportSize({ width: 1440, height: 1060 });
  await page.goto(`/#/collections/${TEST_COLL}/${originKey}`);

  const button = page.locator(".graph-workspace-canvas .toggle-options-button");
  await expect(button).toBeVisible();

  const lines = await button.evaluate((el) => {
    const textNode = [...el.childNodes].find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
    );
    if (!textNode) return -1;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    return range.getClientRects().length;
  });
  expect(lines).toBe(1);
});
