'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- this table version's
   ColumnDef/table types are parameterised over an internal `TableFeatures`
   type that isn't nameable from caller code (see the `columns` prop below),
   so the generic surface here is deliberately loose rather than fought. */
import React, { useRef, useState } from 'react';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useLegacyTable,
} from '@tanstack/react-table/legacy';
import { flexRender } from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface DataTableProps<TData, TValue = any> {
  columns: any[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  /** Max height of the scroll region. The container grows naturally to fit
   *  small result sets instead of reserving a fixed box, so a 3-row table
   *  never leaves a large empty void underneath. */
  height?: string | number;
  rowHeight?: number;
  enableVirtualization?: boolean;
  emptyMessage?: string;
  headerExtra?: React.ReactNode;
  /**
   * How one record should look on a phone.
   *
   * A six-column table on a 390px screen is a horizontal scrollbar: the
   * manager sees the dish name, then has to drag sideways to reach the price
   * and again to reach the delete button, with the header scrolled out of
   * view so the columns are unlabelled by the time they arrive. Supplying
   * this swaps the table for a stack of cards below `sm`, which is what every
   * admin app of this shape does. Pages that don't supply it keep the table
   * and its scroll, so this is additive.
   */
  renderMobileCard?: (row: TData) => React.ReactNode;
  /** Stable key for the card list. Falls back to the array index. */
  getRowId?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search records...',
  height = '560px',
  rowHeight = 52,
  enableVirtualization = true,
  emptyMessage = 'No results found.',
  headerExtra,
  renderMobileCard,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const isNarrow = useMediaQuery('(max-width: 639.95px)');
  const asCards = isNarrow && !!renderMobileCard;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useLegacyTable({
    data: data as any[],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    enabled: enableVirtualization,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div className="w-full space-y-4">
      {(searchKey !== undefined || headerExtra) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {searchKey !== undefined && (
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ad-muted" />
              <input
                className="ad-input pl-9"
                placeholder={searchPlaceholder}
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          )}
          {headerExtra && <div className="flex items-center gap-2 w-full sm:w-auto justify-end">{headerExtra}</div>}
        </div>
      )}

      {asCards ? (
        /* Phone layout. Not virtualized: a card's height depends on what the
           page chose to put in it, and feeding the virtualizer a guessed
           `rowHeight` for variable content is what produces the blank gaps
           and jumping scroll position that make a list feel broken. Admin
           collections here are in the hundreds, which the DOM handles fine. */
        <div className="space-y-2.5">
          {rows.length === 0 ? (
            <div className="border-2 border-ad-line px-4 py-10 text-center text-sm ad-muted">
              {emptyMessage}
            </div>
          ) : (
            rows.map((row, i) => (
              <div
                key={getRowId ? getRowId(row.original as TData) : i}
                className="border border-ad-hairline bg-ad-surface p-3.5"
              >
                {renderMobileCard!(row.original as TData)}
              </div>
            ))
          )}
        </div>
      ) : (
      <div
        ref={parentRef}
        className="w-full overflow-auto border-2 border-ad-line"
        style={{ maxHeight: typeof height === 'number' ? `${height}px` : height }}
      >
        <Table className="w-full text-left border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-ad-bg">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-2 border-ad-line hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ad-muted select-none',
                        canSort && 'cursor-pointer hover:text-ad-accent transition-colors'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-ad-muted">
                            {isSorted === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5 text-ad-accent" />
                            ) : isSorted === 'desc' ? (
                              <ChevronDown className="h-3.5 w-3.5 text-ad-accent" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center ad-muted">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : enableVirtualization ? (
              <>
                {virtualRows.length > 0 && virtualRows[0].start > 0 && (
                  <tr>
                    <td colSpan={columns.length} style={{ height: `${virtualRows[0].start}px` }} />
                  </tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <TableRow
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="border-b border-ad-hairline ad-hover"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 px-4 text-[13px] text-ad-ink">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {virtualRows.length > 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        height: `${virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end}px`,
                      }}
                    />
                  </tr>
                )}
              </>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-ad-hairline ad-hover"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4 text-[13px] text-ad-ink">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}

      <div className="ad-kicker">
        Showing {rows.length} of {data.length} records
      </div>
    </div>
  );
}
