import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataTable } from './data-table';

describe('DataTable accessibility and scrolling', () => {
  const renderTable = () => renderToStaticMarkup(createElement(DataTable, {
    columns: [
      { accessorKey: 'name', header: 'Dish' },
      { id: 'actions', header: 'Actions', enableSorting: false },
    ],
    data: [{ name: 'Bagara Rice' }],
    searchKey: 'name',
    searchPlaceholder: 'Search dishes',
    enableVirtualization: false,
  }));

  it('exposes sortable headers as buttons and does not make action headings interactive', () => {
    const html = renderTable();
    expect(html).toMatch(/<th[^>]*aria-sort="none"[^>]*><button[^>]*type="button"[^>]*>Dish/);
    expect(html).toMatch(/<th[^>]*>Actions<\/th>/);
    expect(html).toContain('aria-label="Search dishes"');
    expect(html).toContain('Bagara Rice');
  });

  it('leaves scrolling to the outer region so sticky headers can track it', () => {
    const html = renderTable();
    expect(html).toContain('overflow-auto');
    expect(html).not.toContain('data-slot="table-container"');
    expect(html).not.toContain('scrollContainer');
  });
});
