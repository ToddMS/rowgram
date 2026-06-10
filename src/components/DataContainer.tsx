
import { SearchBar } from './SearchBar'
import { ErrorBoundary } from './ErrorBoundary'
import { SkeletonGrid } from './SkeletonGrid'
import './DataContainer.css'
import type { ReactNode } from 'react'

export interface DataItem {
  id: string
  [key: string]: any
}

export interface EmptyStateConfig {
  title: string
  message: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
}

export interface SearchConfig<T> {
  placeholder: string
  filterFunction: (item: T, query: string) => boolean
  sortOptions: Array<{
    value: string
    label: string
    sortFn: (a: T, b: T) => number
  }>
  advancedFilters?: Array<{
    name: string
    label: string
    options: Array<{ value: string; label: string }>
    selectedValue: string
    onValueChange: (value: string) => void
    filterFn: (item: T, value: string) => boolean
  }>
}

export interface ActionButton {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'crew-danger' | 'crew-secondary'
  disabled?: boolean
}

export interface DataContainerProps<T extends DataItem> {
  items: Array<T>
  loading?: boolean
  skeletonVariant?: 'crew' | 'club' | 'gallery' | 'generate'
  error?: string | null
  emptyState: EmptyStateConfig
  searchConfig: SearchConfig<T>
  renderCard: (item: T, isSelected: boolean, onSelect: (id: string, selected: boolean) => void) => ReactNode
  className?: string
  gridClassName?: string

  // Selection and batch operations
  selectedItems?: Set<string>
  onItemSelect?: (id: string, selected: boolean) => void
  onSelectAll?: () => void
  actionButtons?: Array<ActionButton>

  // Search state
  searchQuery: string
  onSearchChange: (query: string) => void
  filteredItems: Array<T>
  onItemsFiltered: (items: Array<T>) => void
  sortBy: string
  onSortChange: (sort: string) => void
  showAdvancedFilters?: boolean
  onToggleAdvancedFilters?: () => void

  // Optional retry functionality
  onRetry?: () => void
}

export function DataContainer<T extends DataItem>({
  items,
  loading = false,
  skeletonVariant,
  error = null,
  emptyState,
  searchConfig,
  renderCard,
  className = '',
  gridClassName = '',
  selectedItems = new Set(),
  onItemSelect,
  onSelectAll,
  actionButtons = [],
  searchQuery,
  onSearchChange,
  filteredItems,
  onItemsFiltered,
  sortBy,
  onSortChange,
  showAdvancedFilters = false,
  onToggleAdvancedFilters,
  onRetry,
}: DataContainerProps<T>) {

  if (loading) {
    return (
      <div className={`data-container ${className}`}>
        <div className="container">
          <SearchBar
            items={[]}
            searchQuery=""
            onSearchChange={() => {}}
            onItemsFiltered={() => {}}
            placeholder={searchConfig.placeholder}
            filterFunction={searchConfig.filterFunction}
            sortOptions={searchConfig.sortOptions}
            selectedSort={sortBy}
            onSortChange={onSortChange}
            advancedFilters={searchConfig.advancedFilters}
            showAdvancedFilters={false}
            resultsCount={0}
            actionButtons={actionButtons}
          />
          <SkeletonGrid variant={skeletonVariant ?? 'crew'} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`data-container ${className}`}>
        <div className="container">
          <div className="alert error">
            ⚠️ {error}
            {onRetry && (
              <button className="alert-close" onClick={onRetry}>
                ×
              </button>
            )}
          </div>
          {onRetry && (
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn--primary btn--medium" onClick={onRetry}>
                Retry Loading {emptyState.title}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={`data-container ${className}`}>
        <div className="container">
          <div className="empty-state">
            <h2>{emptyState.title}</h2>
            <p>{emptyState.message}</p>
            {emptyState.actionLabel && (
              emptyState.actionHref ? (
                <a href={emptyState.actionHref} className="btn btn--primary btn--medium">
                  {emptyState.actionLabel}
                </a>
              ) : emptyState.actionOnClick ? (
                <button className="btn btn--primary btn--medium" onClick={emptyState.actionOnClick}>
                  {emptyState.actionLabel}
                </button>
              ) : null
            )}
          </div>
        </div>
      </div>
    )
  }

  // Enhanced action buttons with selection support
  const enhancedActionButtons = [
    ...(selectedItems.size > 0 && onSelectAll ? [
      {
        label: selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All',
        onClick: onSelectAll,
        variant: 'secondary' as const
      }
    ] : []),
    ...actionButtons
  ]

  return (
    <ErrorBoundary>
      <div className={`data-container ${className}`}>
        <div className="container">
          <SearchBar
            items={items}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onItemsFiltered={onItemsFiltered}
            placeholder={searchConfig.placeholder}
            filterFunction={searchConfig.filterFunction}
            sortOptions={searchConfig.sortOptions}
            selectedSort={sortBy}
            onSortChange={onSortChange}
            advancedFilters={searchConfig.advancedFilters}
            showAdvancedFilters={showAdvancedFilters}
            onToggleAdvancedFilters={onToggleAdvancedFilters}
            resultsCount={filteredItems.length}
            actionButtons={enhancedActionButtons}
          />

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <>
                  <h3>No {emptyState.title.toLowerCase()} found</h3>
                  <p>No {emptyState.title.toLowerCase()} match "{searchQuery}"</p>
                  <button
                    className="btn btn--secondary btn--medium"
                    onClick={() => onSearchChange('')}
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <h3>{emptyState.title}</h3>
                  <p>{emptyState.message}</p>
                  {emptyState.actionLabel && (
                    emptyState.actionHref ? (
                      <a href={emptyState.actionHref} className="btn btn--primary btn--medium">
                        {emptyState.actionLabel}
                      </a>
                    ) : emptyState.actionOnClick ? (
                      <button className="btn btn--primary btn--medium" onClick={emptyState.actionOnClick}>
                        {emptyState.actionLabel}
                      </button>
                    ) : null
                  )}
                </>
              )}
            </div>
          ) : (
            <div className={`data-grid ${gridClassName}`}>
              {filteredItems.map((item) => (
                <div key={item.id}>
                  {renderCard(
                    item,
                    selectedItems.has(item.id),
                    onItemSelect || (() => {})
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}