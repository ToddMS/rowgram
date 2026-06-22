import type { ReactNode } from 'react'

interface CrewMember {
  seat: string
  name: string
}

interface CrewData {
  id: string
  boatName: string
  boatClub: string
  boatClass: string
  clubLogoUrl?: string | null
  raceName?: string
  raceCategory?: string
  coachName?: string
  crewMembers: Array<CrewMember>
  createdAt?: Date | string
}

interface CrewCardProps {
  crew: CrewData
  isSelected: boolean
  onSelect: (id: string, selected: boolean) => void
  onEdit: (crew: CrewData) => void
  onDelete: (crew: CrewData) => void
  onDuplicate: (crew: CrewData) => void
  onGenerate: (crew: CrewData) => void
  expandedCrewMembers: Set<string>
  onToggleExpansion: (crewId: string) => void
}

export function CrewCard({
  crew,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onGenerate,
  expandedCrewMembers,
  onToggleExpansion,
}: CrewCardProps) {
  return (
    <div
      className={`crew-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(crew.id, !isSelected)}
    >
      <div className="crew-card-header">
        <div className="crew-card-title">
          <h3>{crew.boatName}</h3>
          <div className="crew-card-subtitle">
            <span className="club-name-full">{crew.boatClub}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span className="boat-type-badge">{crew.boatClass}</span>
          {crew.clubLogoUrl && (
            <img
              src={crew.clubLogoUrl}
              alt={crew.boatClub}
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
          )}
        </div>
      </div>

      <div className="crew-compact-info">
        <div className="crew-compact-row">
          <span className="crew-compact-label">Race:</span>
          <span className="crew-compact-value">
            {crew.raceName || 'No race'}
          </span>
        </div>
        {crew.raceCategory && (
          <div className="crew-compact-row">
            <span className="crew-compact-label">Category:</span>
            <span className="crew-compact-value">
              {crew.raceCategory}
            </span>
          </div>
        )}
      </div>

      <div className="crew-members">
        <div
          className="crew-members-header"
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpansion(crew.id)
          }}
        >
          <span className="crew-members-title">
            {crew.crewMembers.length} Crew Members
          </span>
          <span
            className={`crew-members-toggle ${expandedCrewMembers.has(crew.id) ? 'expanded' : ''}`}
          >
            ▼
          </span>
        </div>

        {expandedCrewMembers.has(crew.id) && (
          <div
            className="crew-boat-layout"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpansion(crew.id)
            }}
          >
            {crew.coachName && (
              <div className="coach-position">
                <div className="crew-member-seat coach">Coach</div>
                <div className="crew-member-name">{crew.coachName}</div>
              </div>
            )}

            {crew.crewMembers.some((member) => member.seat === 'C') && (
              <div className="cox-position">
                {crew.crewMembers
                  .filter((member) => member.seat === 'C')
                  .map((member, idx) => (
                    <div key={idx} className="crew-member-boat">
                      <div className="crew-member-seat">{member.seat}</div>
                      <div className="crew-member-name">{member.name}</div>
                    </div>
                  ))}
              </div>
            )}

            <div className="rowers-layout">
              {crew.crewMembers
                .filter((member) => member.seat !== 'C')
                .map((member, idx) => (
                  <div key={idx} className="rower-position">
                    <div className="crew-member-boat">
                      <div className="crew-member-seat">{member.seat}</div>
                      <div className="crew-member-name">{member.name}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="crew-actions">
        <div className="crew-actions-left">
          <button
            className="crew-action-btn primary"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(crew)
            }}
          >
            Edit
          </button>
          <button
            className="crew-action-btn primary"
            title="Duplicate crew"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate(crew)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
        <div className="crew-actions-right">
          <button
            className="crew-action-btn secondary"
            onClick={(e) => {
              e.stopPropagation()
              onGenerate(crew)
            }}
          >
            Generate
          </button>
          <button
            className="crew-action-btn danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(crew)
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}