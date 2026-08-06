'use client';

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
import { Input } from '@/components/ui/input';
import { ArrowUpDown, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface DataTableProps<TData, TValue = any> {
  columns: any[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
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
  height = '600px',
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 bg-stone-50/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 rounded-xl text-sm"
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
            <div className="rounded-2xl border border-stone-200/50 bg-white px-4 py-10 text-center text-sm font-medium text-stone-400 dark:border-[#2C2C2E]/60 dark:bg-[#1C1C1E]/40">
              {emptyMessage}
            </div>
          ) : (
            rows.map((row, i) => (
              <div
                key={getRowId ? getRowId(row.original as TData) : i}
                className="rounded-2xl border border-stone-200/50 bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:border-[#2C2C2E]/60 dark:bg-[#1C1C1E]/60 dark:shadow-none"
              >
                {renderMobileCard!(row.original as TData)}
              </div>
            ))
          )}
        </div>
      ) : (
      <div
        ref={parentRef}
        className="w-full overflow-auto rounded-3xl border border-stone-200/50 dark:border-[#2C2C2E]/60 bg-white dark:bg-[#1C1C1E]/40 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.01)] dark:shadow-none"
        style={{ height: typeof height === 'number' ? `${height}px` : height, maxHeight: 'calc(100vh - 220px)' }}
      >
        <Table className="w-full text-left border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-[#FAFAF9]/90 dark:bg-[#1C1C1E]/95 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-stone-200/40 dark:border-[#2C2C2E]/40 hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 select-none',
                        canSort && 'cursor-pointer hover:text-amber-600 dark:hover:text-amber-500 transition-colors'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-stone-400">
                            {isSorted === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
                            ) : isSorted === 'desc' ? (
                              <ChevronDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
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
                <TableCell colSpan={columns.length} className="h-32 text-center text-stone-400 dark:text-stone-500 font-medium">
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
                      className="border-b border-stone-100/60 dark:border-[#2C2C2E]/40 hover:bg-stone-100/30 dark:hover:bg-[#2C2C2E]/35 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3.5 px-4 text-xs font-semibold text-stone-700 dark:text-stone-300">
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
                  className="border-b border-stone-100/60 dark:border-[#2C2C2E]/40 hover:bg-stone-100/30 dark:hover:bg-[#2C2C2E]/35 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3.5 px-4 text-xs font-semibold text-stone-700 dark:text-stone-300">
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

      <div className="flex items-center justify-between px-1 text-xs font-medium text-stone-500">
        <span>
          Showing {rows.length} of {data.length} records
        </span>
        {enableVirtualization && !asCards && <span className="hidden sm:inline">Virtual scrolling enabled</span>}
      </div>
    </div>
  );
}
