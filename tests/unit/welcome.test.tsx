import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Welcome } from '../../src/components/landing/welcome';

it('oferece uma entrada real para a mesa e informa a continuidade local', () => {
  render(<Welcome />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Uma peça');
  expect(screen.getByRole('link', { name: 'Iniciar' })).toHaveAttribute('href', '/play');
  expect(screen.getByRole('link', { name: 'Iniciar' })).toHaveAccessibleDescription(/Seu progresso continua salvo neste navegador/);
});

it('permite escolher 48 peças antes de iniciar', async () => {
  const { default: userEvent } = await import('@testing-library/user-event');
  const user = userEvent.setup();
  render(<Welcome />);
  await user.selectOptions(screen.getByLabelText('Número de peças'), '48');
  expect(screen.getByRole('link', { name: 'Iniciar' })).toHaveAttribute('href', '/play?pieces=48');
});
