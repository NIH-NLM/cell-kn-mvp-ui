import { render } from "@testing-library/react";
import Footer from "./Footer";

describe("Footer Component", () => {
  test("renders without crashing", () => {
    render(<Footer />);
  });
});
