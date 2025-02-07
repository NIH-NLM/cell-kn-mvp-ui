import { render, screen, fireEvent } from '@testing-library/react';
import ForceGraph from './ForceGraph';

describe('ForceGraph Component', () => {
  it('renders the component correctly', () => {
    render(<ForceGraph />);
    // Example: Check if the toggle button is rendered
    const toggleButton = screen.getByRole('button', { name: /toggle options/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('changes button text when toggled', () => {
    render(<ForceGraph />);
    const toggleButton = screen.getByRole('button', { name: /toggle options/i });

    // Simulate a click to toggle options
    fireEvent.click(toggleButton);

    // Check if button text changes
    expect(toggleButton).toHaveTextContent('Toggle Options ▼');
  });

  // TODO: Finish testing
});
