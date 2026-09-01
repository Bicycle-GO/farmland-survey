import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RiskBadge, StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders Korean survey labels', () => {
    render(<StatusBadge value="needs_review" />);
    expect(screen.getByText('검수 필요')).toBeInTheDocument();
  });

  it('maps risk scores to a risk level', () => {
    render(<RiskBadge score={91} />);
    expect(screen.getByText('고위험')).toBeInTheDocument();
  });
});
