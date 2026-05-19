import type { ReactNode } from 'react'

interface ClubData {
  id: string
  name: string
  primaryColor: string
  secondaryColor: string
  logoUrl?: string | null
}

interface ClubCardProps {
  club: ClubData
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  isEditing?: boolean
  editData?: ClubData
  onEdit: (club: ClubData) => void
  onSave: (club: ClubData) => void
  onCancel: (clubId: string) => void
  onDelete: (club: ClubData) => void
  onEditFormChange: (clubId: string, field: string, value: string) => void
  onLogoClick: (clubId?: string) => void
  onLogoRemove: (clubId?: string) => void
}

export function ClubCard({
  club,
  isSelected,
  onSelect,
  isEditing = false,
  editData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditFormChange,
  onLogoClick,
  onLogoRemove,
}: ClubCardProps) {
  const displayData = isEditing && editData ? editData : club

  return (
    <div
      className={`preset-card ${isEditing ? 'editing' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(club.id, !isSelected)}
    >
      {/* Logo and Name Header */}
      <div className="preset-header">
        <div
          className={`logo-section ${isEditing ? 'editable' : ''} ${displayData.logoUrl ? 'has-logo' : 'empty'}`}
          onClick={
            isEditing
              ? (e) => {
                  e.stopPropagation()
                  displayData.logoUrl
                    ? onLogoRemove(club.id)
                    : onLogoClick(club.id)
                }
              : undefined
          }
        >
          {displayData.logoUrl ? (
            <img src={displayData.logoUrl} alt={`${club.name} logo`} />
          ) : isEditing ? (
            '+'
          ) : (
            ''
          )}
        </div>
        <div className="name-section">
          {isEditing ? (
            <input
              type="text"
              className="preset-name-input"
              value={displayData.name}
              onChange={(e) => onEditFormChange(club.id, 'name', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', paddingLeft: '0.5rem' }}
            />
          ) : (
            <h3 className="preset-name">{club.name}</h3>
          )}
        </div>
      </div>

      {/* Color Swatches */}
      <div className="preset-colors">
        <div className="preset-color-group">
          <div className="preset-color-label">Primary</div>
          {isEditing ? (
            <>
              <input
                type="color"
                className="preset-color-picker"
                value={displayData.primaryColor}
                onChange={(e) => onEditFormChange(club.id, 'primaryColor', e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                className="preset-color-hex-input"
                value={displayData.primaryColor}
                onChange={(e) => onEditFormChange(club.id, 'primaryColor', e.target.value)}
              />
            </>
          ) : (
            <>
              <div
                className="preset-color-swatch"
                style={{ background: club.primaryColor }}
              ></div>
              <div className="preset-color-hex">{club.primaryColor}</div>
            </>
          )}
        </div>
        <div className="preset-color-group">
          <div className="preset-color-label">Secondary</div>
          {isEditing ? (
            <>
              <input
                type="color"
                className="preset-color-picker"
                value={displayData.secondaryColor}
                onChange={(e) => onEditFormChange(club.id, 'secondaryColor', e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                className="preset-color-hex-input"
                value={displayData.secondaryColor}
                onChange={(e) => onEditFormChange(club.id, 'secondaryColor', e.target.value)}
              />
            </>
          ) : (
            <>
              <div
                className="preset-color-swatch"
                style={{ background: club.secondaryColor }}
              ></div>
              <div className="preset-color-hex">{club.secondaryColor}</div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="preset-actions">
        {isEditing ? (
          <>
            <button
              className="crew-action-btn secondary"
              onClick={(e) => {
                e.stopPropagation()
                onCancel(club.id)
              }}
            >
              Cancel
            </button>
            <button
              className="crew-action-btn primary"
              onClick={(e) => {
                e.stopPropagation()
                onSave(club)
              }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <button
              className="crew-action-btn primary"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(club)
              }}
            >
              Edit
            </button>
            <button
              className="crew-action-btn danger"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(club)
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}