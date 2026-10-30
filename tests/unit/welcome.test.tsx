import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Welcome } from '../../src/components/landing/welcome';

it('oferece uma entrada real para a mesa e informa o estágio das peças', () => {
  render(<Welcome />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Uma peça');
  expect(screen.getByRole('link', { name: 'Iniciar' })).toHaveAttribute('href', '/play');
  expect(screen.getByRole('link', { name: 'Iniciar' })).toHaveAccessibleDescription(/Peças e encaixes em desenvolvimento/);
});
