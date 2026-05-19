import type { ReactNode } from 'react'

interface SavedImage {
  id: string
  imageUrl: string
  filename: string
  fileSize: number | null
  dimensions: any
  metadata: any
  createdAt: Date | string
  updatedAt: Date | string
  crewId: string
  templateId: string
  userId: string
  crew?: {
    id: string
    name: string
    clubName?: string | null
    raceName?: string | null
    boatName?: string | null
    coachName?: string | null
    crewNames: Array<string>
    boatTypeId: string
    userId: string
    clubId?: string | null
    createdAt: Date | string
    updatedAt: Date | string
    boatType: {
      id: string
      name: string
      code: string
      seats: number
      category: string
      metadata: any
      createdAt: Date | string
      updatedAt: Date | string
    }
    club?: {
      id: string
      name: string
      primaryColor: string
      secondaryColor: string
      logoUrl: string | null
      createdAt: Date | string
      updatedAt: Date | string
      userId: string
    } | null
  }
  template?: {
    id: string
    name: string
    templateType: string
    previewUrl: string
    isActive: boolean
    metadata: any
    createdAt: Date | string
    updatedAt: Date | string
  }
}

interface ImageCardProps {
  image: SavedImage
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onDownload: (image: SavedImage) => void
  onDelete: (image: SavedImage) => void
}

export function ImageCard({
  image,
  isSelected,
  onSelect,
  onDownload,
  onDelete,
}: ImageCardProps) {
  return (
    <div
      className={`image-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(image.id, !isSelected)}
    >
      <div className="image-preview">
        <img
          src={image.imageUrl}
          alt={`${image.crew?.name || 'Crew Image'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = `https://via.placeholder.com/400x300/f3f4f6/6b7280?text=Image+Not+Found`
          }}
        />
      </div>

      <div className="image-info">
        <div className="image-header">
          <div className="image-title">
            {image.crew?.boatType.code === '1x' && image.crew.crewNames.length > 0
              ? image.crew.crewNames[0]
              : image.crew?.name || 'Unknown Crew'
            }
          </div>
          <span className="boat-type-badge">{image.crew?.boatType.code || 'Unknown'}</span>
        </div>
        <div className="image-subtitle">
          {(image.crew?.club?.name || image.crew?.clubName) || 'No Club'}
          {image.crew?.raceName && ` - ${image.crew.raceName}`}
        </div>

        {/* Created Date - Bottom Left */}
        <div className="image-created-date">
          {new Date(image.createdAt).toLocaleDateString('en-GB')}
        </div>

        {/* Image Actions */}
        <div className="crew-actions">
          <div className="crew-actions-left">
          </div>
          <div className="crew-actions-right">
            <button
              className="crew-action-btn secondary"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(image)
              }}
            >
              Download
            </button>
            <button
              className="crew-action-btn danger"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(image)
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}