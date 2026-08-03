import { captureGraphThumbnail } from "./graphThumbnail";

describe("captureGraphThumbnail", () => {
  it("returns null when no element is provided", async () => {
    await expect(captureGraphThumbnail(null)).resolves.toBeNull();
  });

  it("serializes an svg element to a data url", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    const url = await captureGraphThumbnail(svg);
    expect(typeof url).toBe("string");
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("returns null (does not throw) on serialization failure", async () => {
    await expect(captureGraphThumbnail({})).resolves.toBeNull();
  });

  it("returns null for a non-element", async () => {
    expect(await captureGraphThumbnail(null)).toBeNull();
  });

  it("serializes an SVG to a namespaced data URL", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    svg.appendChild(circle);
    const url = await captureGraphThumbnail(svg);
    expect(url).toMatch(/^data:image\/svg\+xml/);
    // The decoded markup must carry the SVG namespace, or browsers render a broken image.
    expect(decodeURIComponent(url)).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("frames the clone to a fixed size with preserveAspectRatio so content isn't cropped", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const url = await captureGraphThumbnail(svg);
    const markup = decodeURIComponent(url);
    expect(markup).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(markup).toMatch(/height="160"/);
  });

  it("tight-frames the viewBox to the content bounding box (with 8% padding) when getBBox is available", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // jsdom doesn't implement getBBox, so stub known bounds to exercise the
    // tight-frame path. padX = 100*0.08 = 8, padY = 50*0.08 = 4 →
    // viewBox = "(10-8) (20-4) (100+16) (50+8)" = "2 16 116 58".
    svg.getBBox = () => ({ x: 10, y: 20, width: 100, height: 50 });
    const url = await captureGraphThumbnail(svg);
    expect(decodeURIComponent(url)).toContain('viewBox="2 16 116 58"');
  });

  it("omits the graph legend from the serialized thumbnail", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const content = document.createElementNS("http://www.w3.org/2000/svg", "g");
    content.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "circle"));
    const legend = document.createElementNS("http://www.w3.org/2000/svg", "g");
    legend.setAttribute("class", "legend");
    const swatch = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    swatch.setAttribute("class", "legend-swatch");
    legend.appendChild(swatch);
    svg.appendChild(content);
    svg.appendChild(legend);

    const markup = decodeURIComponent(await captureGraphThumbnail(svg));
    expect(markup).toContain("<circle");
    expect(markup).not.toContain("legend");
    // Assert the swatch element itself is gone, not just its class name: the
    // swatch is the only rect in this fixture, so renaming the class must not
    // be able to leave the element behind unnoticed.
    expect(markup).not.toContain("<rect");
  });

  it("tight-frames on the graph content, not on the legend that is about to be dropped", async () => {
    // The legend sits in the bottom-left of the viewBox, far from the graph. If
    // the frame were measured on the whole SVG it would reserve empty space for
    // a legend the thumbnail no longer contains.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const content = document.createElementNS("http://www.w3.org/2000/svg", "g");
    content.getBBox = () => ({ x: 10, y: 20, width: 100, height: 50 });
    const legend = document.createElementNS("http://www.w3.org/2000/svg", "g");
    legend.setAttribute("class", "legend");
    legend.getBBox = () => ({ x: -400, y: 200, width: 120, height: 80 });
    svg.appendChild(content);
    svg.appendChild(legend);
    // Whole-SVG measurement would span both; it must not be used.
    svg.getBBox = () => ({ x: -400, y: 20, width: 510, height: 260 });

    const markup = decodeURIComponent(await captureGraphThumbnail(svg));
    // Content-only box: padX = 8, padY = 4 → "2 16 116 58".
    expect(markup).toContain('viewBox="2 16 116 58"');
  });

  it("maps the content bounding box through the zoom group's own transform", async () => {
    // The graph lives inside d3-zoom's <g transform="...">, so its getBBox is in
    // the group's local space; the viewBox is in the SVG's user space.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const content = document.createElementNS("http://www.w3.org/2000/svg", "g");
    content.getBBox = () => ({ x: 10, y: 20, width: 100, height: 50 });
    // translate(5, 7) scale(2)
    content.transform = {
      baseVal: { consolidate: () => ({ matrix: { a: 2, b: 0, c: 0, d: 2, e: 5, f: 7 } }) },
    };
    svg.appendChild(content);

    const markup = decodeURIComponent(await captureGraphThumbnail(svg));
    // Mapped box: x 25..225, y 47..147 → w 200, h 100; padX = 16, padY = 8.
    expect(markup).toContain('viewBox="9 39 232 116"');
  });

  it("returns null when measurement finds no graph content", async () => {
    // A freshly mounted (or just-cleared) workspace SVG holds only its
    // <title>: measurement is available and reports nothing measurable.
    // Serializing that would yield a truthy but blank data URL, which callers
    // would happily store over a card's good thumbnail.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = "Graph";
    svg.appendChild(title);
    svg.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });

    await expect(captureGraphThumbnail(svg)).resolves.toBeNull();
  });

  it("still serializes when bounding-box measurement is unavailable", async () => {
    // "Measured and found nothing" is not the same as "could not measure": an
    // environment where getBBox is unsupported or throws still has a graph, so
    // it keeps the existing viewBox fallback rather than losing the thumbnail.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    const content = document.createElementNS("http://www.w3.org/2000/svg", "g");
    content.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "circle"));
    svg.appendChild(content);
    svg.getBBox = () => {
      throw new Error("getBBox unsupported");
    };

    const url = await captureGraphThumbnail(svg);
    expect(url).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(url)).toContain('viewBox="0 0 100 100"');
  });

  it("returns null for a legend-only SVG instead of a blank thumbnail framed on the original element", async () => {
    // Content-only measurement runs (an empty zoom container group offers a
    // zero-size box, so measurement is available but finds nothing) and must
    // not fall back to measuring the whole live SVG's getBBox — that still
    // includes the legend (removed only from the clone, not the live
    // element), so it would yield a non-empty box and skip the "nothing to
    // serialize" guard, producing a blank-but-truthy thumbnail framed on a
    // legend that isn't even in the clone.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const content = document.createElementNS("http://www.w3.org/2000/svg", "g");
    content.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
    const legend = document.createElementNS("http://www.w3.org/2000/svg", "g");
    legend.setAttribute("class", "legend");
    legend.getBBox = () => ({ x: 0, y: 0, width: 50, height: 50 });
    svg.appendChild(content);
    svg.appendChild(legend);
    svg.getBBox = () => ({ x: 0, y: 0, width: 50, height: 50 });

    await expect(captureGraphThumbnail(svg)).resolves.toBeNull();
  });

  it("honors custom width/height options on the framed clone", async () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const url = await captureGraphThumbnail(svg, { width: 300, height: 200 });
    const markup = decodeURIComponent(url);
    expect(markup).toMatch(/width="300"/);
    expect(markup).toMatch(/height="200"/);
  });
});
