import React from 'react'
import './Button.css'
import './SearchBar.css'

interface SearchBarProps<T> {
  items: Array<T>
  searchQuery: string
  onSearchChange: (query: string) => void
  onItemsFiltered: (filtered: Array<T>) => void
  placeholder?: string
  filterFunction: (item: T, query: string) => boolean
  sortOptions?: Array<{
    value: string
    label: string
    sortFn: (a: T, b: T) => number
  }>
  selectedSort?: string
  onSortChange?: (sort: string) => void
  advancedFilters?: Array<{
    name: string
    label: string
    options: Array<{
      value: string
      label: string
      count?: number
    }>
    selectedValue: string
    onValueChange: (value: string) => void
    filterFn: (item: T, value: string) => boolean
  }>
  showAdvancedFilters?: boolean
  onToggleAdvancedFilters?: () => void
  resultsCount?: number
  className?: string
  actionButtons?: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger' | 'crew-secondary' | 'crew-danger'
    disabled?: boolean
  }>
  leftActions?: React.ReactNode
}

export function SearchBar<T>({
  items,
  searchQuery,
  onSearchChange,
  onItemsFiltered,
  placeholder = "Search...",
  filterFunction,
  sortOptions,
  selectedSort,
  onSortChange,
  advancedFilters,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  resultsCount,
  className = "",
  actionButtons = [],
  leftActions
}: SearchBarProps<T>) {
  // Stable string key representing which items are present (avoids re-renders on reference changes)
  const itemKeys = items.map((item: any) => item.id ?? JSON.stringify(item)).join(',')

  // Apply filters whenever inputs change
  React.useEffect(() => {
    let filtered = [...items]

    if (searchQuery.trim()) {
      filtered = filtered.filter(item => filterFunction(item, searchQuery.toLowerCase()))
    }

    if (advancedFilters) {
      advancedFilters.forEach(filter => {
        if (filter.selectedValue) {
          filtered = filtered.filter(item => filter.filterFn(item, filter.selectedValue))
        }
      })
    }

    if (selectedSort && sortOptions) {
      const sortOption = sortOptions.find(option => option.value === selectedSort)
      if (sortOption) {
        filtered = [...filtered].sort(sortOption.sortFn)
      }
    }

    onItemsFiltered(filtered)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedSort, advancedFilters?.map(f => f.selectedValue).join(','), itemKeys])

  const activeFiltersCount = advancedFilters?.filter(f => f.selectedValue).length || 0

  const clearAllFilters = () => {
    onSearchChange('')
    advancedFilters?.forEach(filter => filter.onValueChange(''))
    if (onSortChange) onSortChange('recent')
  }

  return (
    <div className={`search-bar-container ${className}`}>
      {/* Primary Controls */}
      <div className="search-bar-primary">
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input-modern"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => onSearchChange('')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="search-controls">
          <div className="search-controls-left">
            {/* Advanced Filters Toggle */}
            {onToggleAdvancedFilters && (
              <button
                className={`filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
                onClick={onToggleAdvancedFilters}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                </svg>
                Filter
                {activeFiltersCount > 0 && (
                  <span className="filter-count">{activeFiltersCount}</span>
                )}
              </button>
            )}

            {/* Sort Dropdown */}
            {sortOptions && onSortChange && (
              <div className="sort-dropdown">
                <select
                  value={selectedSort || ''}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="sort-select"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Left Actions */}
            {leftActions}
          </div>

          <div className="search-controls-right">
            {/* Action Buttons */}
            {actionButtons.map((button, index) => (
              <button
                key={index}
                className={`btn btn--${button.variant || 'primary'} btn--small`}
                onClick={(e) => {
                  button.onClick()
                  e.currentTarget.blur()
                }}
                disabled={button.disabled}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && advancedFilters && (
        <div className="advanced-filters-panel">
          <div className="filters-header">
            <h3>Advanced Filters</h3>
            <button className="clear-all-btn" onClick={clearAllFilters}>
              Clear All
            </button>
          </div>

          <div className="filters-content">
            {advancedFilters.map(filter => (
              <div key={filter.name} className="filter-group">
                <span className="filter-label">{filter.label}:</span>
                <div className="filter-options">
                  {filter.options.map(option => (
                    <button
                      key={option.value}
                      className={`option-pill ${filter.selectedValue === option.value ? 'selected' : ''}`}
                      onClick={() => filter.onValueChange(filter.selectedValue === option.value ? '' : option.value)}
                    >
                      {option.label}
                      {option.count !== undefined && ` (${option.count})`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Counter */}
      {resultsCount !== undefined && (
        <div className="search-results-info">
          <span className="results-count">{resultsCount} </span>
          <span className="results-label">
            {resultsCount === 1 ? 'result' : 'results'}
          </span>
        </div>
      )}
    </div>
  )
}