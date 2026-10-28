import React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  mobileLabel?: string;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  caption?: string;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  caption,
  emptyMessage = 'No records found.',
  className,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-card border border-sand-200 text-ink-600">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-card border border-sand-200 bg-white shadow-card">
        <table className="w-full text-left border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-sand-50 border-b border-sand-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3.5 text-xs font-bold text-ink-600 uppercase tracking-wider',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200 bg-white">
            {data.map((item, index) => {
              const key = keyExtractor(item, index);
              return (
                <tr key={key} className="hover:bg-sand-50/60 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3.5 text-sm text-ink-900 align-middle',
                        col.className
                      )}
                    >
                      {col.render ? col.render(item, index) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (< 768px) */}
      <div className="flex flex-col gap-3 md:hidden">
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          return (
            <div
              key={key}
              className="bg-white rounded-card border border-sand-200 p-4 shadow-card divide-y divide-sand-200/60 flex flex-col gap-2"
            >
              {columns.map((col) => {
                const content = col.render
                  ? col.render(item, index)
                  : ((item as Record<string, unknown>)[col.key] as React.ReactNode);

                return (
                  <div
                    key={col.key}
                    className="flex justify-between items-center py-2 first:pt-0 last:pb-0 gap-3"
                  >
                    <span className="text-xs font-semibold text-ink-600 uppercase shrink-0">
                      {col.mobileLabel || col.header}
                    </span>
                    <span className="text-sm text-ink-900 text-right break-words font-medium">
                      {content}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Table.displayName = 'Table';
