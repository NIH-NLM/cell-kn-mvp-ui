import { render, screen, waitFor } from "@testing-library/react";
import { fetchVersionInfo } from "services";
import Footer from "./Footer";

process.env.REACT_APP_VERSION = "test-bundle-version";

jest.mock("services", () => ({
  fetchVersionInfo: jest.fn(),
}));

describe("Footer Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchVersionInfo.mockResolvedValue(null);
  });

  test("renders without crashing", () => {
    render(<Footer />);
  });

  test("displays the UI and ETL versions when the fetch succeeds", async () => {
    fetchVersionInfo.mockResolvedValue({
      etl_version: "v1.4.6-alpha.28",
      pinned_etl_version: "v1.4.6-alpha.28",
    });

    render(<Footer />);

    expect(await screen.findByText(/UI test-bundle-version/)).toBeInTheDocument();
    expect(await screen.findByText(/v1\.4\.6-alpha\.28/)).toBeInTheDocument();
  });

  test("does not mention the pin when the loaded version matches it", async () => {
    fetchVersionInfo.mockResolvedValue({
      etl_version: "v1.5.0-rc.1",
      pinned_etl_version: "v1.5.0-rc.1",
    });

    render(<Footer />);

    expect(await screen.findByText(/v1\.5\.0-rc\.1/)).toBeInTheDocument();
    expect(screen.queryByText(/pinned/)).not.toBeInTheDocument();
  });

  test("flags the pinned version when the loaded dataset differs", async () => {
    fetchVersionInfo.mockResolvedValue({
      etl_version: "v1.4.6-rc.6",
      pinned_etl_version: "v1.5.0-rc.1",
    });

    render(<Footer />);

    expect(
      await screen.findByText(/ETL v1\.4\.6-rc\.6 \(pinned v1\.5\.0-rc\.1\)/),
    ).toBeInTheDocument();
  });

  test("flags the pinned version when the loaded dataset is unknown", async () => {
    fetchVersionInfo.mockResolvedValue({
      etl_version: "unknown",
      pinned_etl_version: "v1.5.0-rc.1",
    });

    render(<Footer />);

    expect(await screen.findByText(/ETL unknown \(pinned v1\.5\.0-rc\.1\)/)).toBeInTheDocument();
  });

  test("does not render an ETL label when pinned_etl_version is absent (old backend)", async () => {
    fetchVersionInfo.mockResolvedValue({
      etl_version: "v1.5.0-rc.1",
    });

    render(<Footer />);

    expect(await screen.findByText(/UI test-bundle-version/)).toBeInTheDocument();
    expect(screen.queryByText(/ETL/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pinned/)).not.toBeInTheDocument();
  });

  test("displays the UI version baked into the bundle", async () => {
    fetchVersionInfo.mockResolvedValue({
      etl_version: "v1.5.0-rc.1",
      pinned_etl_version: "v1.5.0-rc.1",
    });

    render(<Footer />);

    expect(await screen.findByText(/UI test-bundle-version/)).toBeInTheDocument();
  });

  test("shows the UI version even when the version fetch fails", async () => {
    fetchVersionInfo.mockResolvedValue(null);

    render(<Footer />);

    expect(await screen.findByText(/UI test-bundle-version/)).toBeInTheDocument();
  });

  test("still renders the footer when the version fetch fails", async () => {
    fetchVersionInfo.mockResolvedValue(null);

    render(<Footer />);

    expect(await screen.findByText(/National Library of Medicine/)).toBeInTheDocument();
  });

  test("does not render undefined when version keys are missing", async () => {
    fetchVersionInfo.mockResolvedValue({});

    render(<Footer />);

    await waitFor(() => expect(fetchVersionInfo).toHaveBeenCalled());
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });
});
