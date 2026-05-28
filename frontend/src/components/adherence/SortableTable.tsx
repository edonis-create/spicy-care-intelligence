'use client'

import { useState, useMemo } from 'react'
import clsx from 'clsx'
import type { SortDir } from '@/lib/adherence-types'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  width?: string
}

interface SortableTableProps<T extends object> {
  columns: Column<T>[]
  rows: T[]
  getKey: (row: T) => string
  onRowClick?: (row: T) => void
  selectedKey?: string
  maxHeight?: string
  emptyMessage?: string
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  return (
    <span className="ml-1 opacity-50">
      {dir === 'asc'  ? '↑' : dir === 'desc' ? '↓' : '↕'}
    </span>
  )
}

export default function SortableTable<T extends object>({
  columns,
  rows,
  getKey,
  onRowClick,
  selectedKey,
  maxHeight,
  emptyMessage = 'No data',
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av), bs = String(bv)
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [rows, sortKey, sortDir])

  return (
    <div className="s2 overflow-hidden">
      <div className={clsx('overflow-auto scrollbar-thin', maxHeight && `max-h-[${maxHeight}]`)}>
        <table className="w-full border-collapse" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable !== false && toggleSort(String(col.key))}
                  className={clsx(
                    'px-4 py-3 text-eyebrow text-left select-none whitespace-nowrap',
                    col.sortable !== false && 'cursor-pointer hover:text-secondary transition-colors',
                    col.align === 'right'  && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                  {col.sortable !== false && (
                    <SortIcon dir={sortKey === String(col.key) ? sortDir : null} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-muted py-10"
                  style={{ fontSize: 13 }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => {
                const key = getKey(row)
                const selected = key === selectedKey
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={clsx(
                      'table-row-stripe transition-colors duration-100',
                      onRowClick && 'cursor-pointer hover:bg-white/[0.03]',
                      selected && 'ring-1 ring-inset',
                    )}
                    style={selected ? { background: 'rgba(255,42,42,0.07)', outline: '1px solid rgba(255,42,42,0.4)' } : undefined}
                  >
                    {columns.map(col => (
                      <td
                        key={String(col.key)}
                        className={clsx(
                          'px-4 py-3 text-secondary',
                          col.align === 'right'  && 'text-right tabular',
                          col.align === 'center' && 'text-center',
                        )}
                        style={{ fontSize: 13, borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      >
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
