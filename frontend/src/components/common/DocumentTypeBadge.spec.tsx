import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentTypeBadge, type DocumentType } from './DocumentTypeBadge';

describe('DocumentTypeBadge', () => {
  it.each<DocumentType>(['COT', 'OP', 'OT', 'OG'])(
    'renderiza la etiqueta para el tipo %s',
    (type) => {
      render(<DocumentTypeBadge type={type} />);
      expect(screen.getByText(type)).toBeInTheDocument();
    },
  );
});
