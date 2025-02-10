import { render, screen, fireEvent } from '@testing-library/react';
import ForceGraph from './ForceGraph';

describe('ForceGraph Component', () => {
  it("Should toggle options when toggle options button is clicked", () => {
    render(<ForceGraph />);

    // Get the button that toggles the options visibility
    const toggleButton = screen.getByRole('button', { name: 'Toggle Options ▲' });
    // Get the graph-options div
    const optionsPanel = screen.getByTestId("graph-options");

    // Ensure options begins hidden
    expect(optionsPanel).toHaveStyle("display: none");

    // Click button
    fireEvent.click(toggleButton);
    // After clicking, the options should be visible
    expect(optionsPanel).toHaveStyle("display: flex");

    // Click the toggle button again
    fireEvent.click(toggleButton);
    // After clicking again, the options should be hidden
    expect(optionsPanel).toHaveStyle("display: none");
  });;

  // TODO: Finish testing
});
