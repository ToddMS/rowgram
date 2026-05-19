import { useEffect, useState } from 'react'
import { trpc } from '../lib/trpc-client'
import { useAuth } from '../lib/auth-context'
import { Modal } from './Modal'
import './CreateCrewModal.css'

interface CreateCrewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingCrew?: any
}

const boatClassToSeats: Record<string, number> = {
  '8+': 8,
  '4+': 4,
  '4-': 4,
  '4x': 4,
  '2-': 2,
  '2x': 2,
  '1x': 1,
}

const boatClassHasCox = (boatClass: string) =>
  boatClass === '8+' || boatClass === '4+'

const boatClassToBoatType = (boatClass: string) => {
  const mapping: Record<
    string,
    { id: number; value: string; seats: number; name: string }
  > = {
    '8+': { id: 1, value: '8+', seats: 8, name: 'Eight' },
    '4+': { id: 2, value: '4+', seats: 4, name: 'Coxed Four' },
    '4-': { id: 3, value: '4-', seats: 4, name: 'Coxless Four' },
    '4x': { id: 6, value: '4x', seats: 4, name: 'Quad Sculls' },
    '2-': { id: 7, value: '2-', seats: 2, name: 'Coxless Pair' },
    '2x': { id: 4, value: '2x', seats: 2, name: 'Double Sculls' },
    '1x': { id: 5, value: '1x', seats: 1, name: 'Single Sculls' },
  }
  return mapping[boatClass]
}

export function CreateCrewModal({ isOpen, onClose, onSuccess, editingCrew }: CreateCrewModalProps) {
  const { user } = useAuth()

  const [activeStep, setActiveStep] = useState(0)
  const [boatClass, setBoatClass] = useState('')
  const [clubName, setClubName] = useState('')
  const [selectedClubId, setSelectedClubId] = useState('')
  const [raceName, setRaceName] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [boatName, setBoatName] = useState('')
  const [coachName, setCoachName] = useState('')
  const [raceCategory, setRaceCategory] = useState('')
  const [crewNames, setCrewNames] = useState<Array<string>>([])
  const [coxName, setCoxName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showClubDropdown, setShowClubDropdown] = useState(false)
  const [filteredClubs, setFilteredClubs] = useState<Array<string>>([])
  const [highlightedClubIndex, setHighlightedClubIndex] = useState(-1)

  // Get boat types for the mutation
  const { data: boatTypesRaw = [] } = trpc.boatType.getAll.useQuery()
  const boatTypes = boatTypesRaw as Array<{ id: string; name: string; code: string; seats: number; category: string }>

  // Get existing clubs for the dropdown
  const { data: existingClubsRaw = [] } = trpc.club.getAll.useQuery()
  const existingClubs = existingClubsRaw as Array<{ id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null }>

  const isEditing = !!editingCrew?.id

  const createCrewMutation = trpc.crew.create.useMutation({
    onSuccess: () => {
      alert(`Crew "${boatName}" created successfully!`)
      onSuccess()
      handleClose()
    },
    onError: (error) => {
      alert(`Failed to create crew: ${error.message}`)
      setSaving(false)
    },
  })

  const updateCrewMutation = trpc.crew.update.useMutation({
    onSuccess: () => {
      alert(`Crew "${boatName}" updated successfully!`)
      onSuccess()
      handleClose()
    },
    onError: (error) => {
      alert(`Failed to update crew: ${error.message}`)
      setSaving(false)
    },
  })

  // Reset form when modal opens/closes
  const resetForm = () => {
    setActiveStep(0)
    setBoatClass('')
    setClubName('')
    setSelectedClubId('')
    setRaceName('')
    setRaceDate('')
    setBoatName('')
    setCoachName('')
    setRaceCategory('')
    setCrewNames([])
    setCoxName('')
    setSaving(false)
    setShowValidation(false)
    setShowClubDropdown(false)
    setFilteredClubs([])
    setHighlightedClubIndex(-1)
  }

  // Populate form when editing a crew
  useEffect(() => {
    if (editingCrew && isOpen) {
      setBoatClass(editingCrew.boatClass || '')
      setClubName(editingCrew.clubName || '')
      setRaceName(editingCrew.raceName || '')
      setBoatName(editingCrew.boatName || '')
      setCoxName(editingCrew.coxName || '')
      setCrewNames(editingCrew.crewNames || [])
      setRaceDate(editingCrew.raceDate || '')
      setCoachName(editingCrew.coachName || '')
      setRaceCategory(editingCrew.raceCategory || '')
    } else if (isOpen) {
      resetForm()
    }
  }, [editingCrew, isOpen])

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const steps = [
    { label: 'Crew Information' },
    { label: 'Add Crew' },
    { label: 'Review & Save' },
  ]

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(boatClass && clubName && raceName && boatName)
      case 1:
        return (
          crewNames.every((name) => name.trim().length > 0) &&
          (!boatClassHasCox(boatClass) || coxName.trim().length > 0)
        )
      default:
        return true
    }
  }

  const handleNext = () => {
    if (canProceedFromStep(activeStep)) {
      setActiveStep((prev) => prev + 1)
      setShowValidation(false)
    } else {
      setShowValidation(true)
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleNameChange = (idx: number, value: string) => {
    setCrewNames((names) => names.map((n, i) => (i === idx ? value : n)))
  }

  const handleClubNameChange = (value: string) => {
    setClubName(value)
    const exactMatch = existingClubs.find(club => club.name === value)
    setSelectedClubId(exactMatch?.id || '')

    const clubNames = existingClubs.map(club => club.name)
    const filtered = value.length === 0
      ? clubNames.slice(0, 5)
      : clubNames.filter(name =>
          name.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5)

    setFilteredClubs(filtered)
    setShowClubDropdown(true)
    setHighlightedClubIndex(-1)
  }

  const selectClub = (clubName: string) => {
    setClubName(clubName)
    const matchingClub = existingClubs.find(club => club.name === clubName)
    setSelectedClubId(matchingClub?.id || '')
    setShowClubDropdown(false)
    setHighlightedClubIndex(-1)
  }

  const handleSaveCrew = async () => {
    if (!user) {
      alert('Please sign in to save your crew')
      return
    }

    setSaving(true)
    try {
      const selectedBoatType = boatTypes.find((bt) => bt.code === boatClass)
      if (!selectedBoatType) {
        throw new Error('Invalid boat type selected')
      }

      const allCrewNames = [
        ...(boatClassHasCox(boatClass) ? [coxName] : []),
        ...crewNames,
      ]

      if (isEditing) {
        await updateCrewMutation.mutateAsync({
          id: editingCrew.id,
          name: boatName,
          clubName: clubName,
          raceName: raceName,
          raceDate: raceDate.trim() || undefined,
          boatName: boatName,
          crewNames: allCrewNames,
          coachName: coachName.trim() || undefined,
          raceCategory: raceCategory.trim() || undefined,
          boatTypeId: selectedBoatType.id,
        })
      } else {
        await createCrewMutation.mutateAsync({
          name: boatName,
          clubName: clubName,
          clubId: selectedClubId || undefined,
          raceName: raceName,
          raceDate: raceDate.trim() || undefined,
          boatTypeId: selectedBoatType.id,
          crewNames: allCrewNames,
          coachName: coachName.trim() || undefined,
          raceCategory: raceCategory.trim() || undefined,
          userId: user.id,
        })
      }
    } catch (error) {
      console.error('Error saving crew:', error)
    }
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="crew-form-container">
            <div className="crew-form-grid">
              <div className="crew-form-group">
                <label htmlFor="boatClass">
                  Boat Class <span className="required">*</span>
                </label>
                <select
                  id="boatClass"
                  value={boatClass}
                  onChange={(e) => {
                    const newBoatClass = e.target.value
                    setBoatClass(newBoatClass)
                    setCrewNames(Array(boatClassToSeats[newBoatClass] || 0).fill(''))
                    setCoxName('')
                  }}
                  className={showValidation && !boatClass ? 'error' : ''}
                  required
                >
                  <option value="">Select boat class</option>
                  <option value="8+">8+ (Eight)</option>
                  <option value="4+">4+ (Coxed Four)</option>
                  <option value="4-">4- (Coxless Four)</option>
                  <option value="4x">4x (Quad Sculls)</option>
                  <option value="2-">2- (Coxless Pair)</option>
                  <option value="2x">2x (Double Sculls)</option>
                  <option value="1x">1x (Single Sculls)</option>
                </select>
                {showValidation && !boatClass && (
                  <div className="error-message">Please select a boat class</div>
                )}
              </div>

              <div className="crew-form-group">
                <label htmlFor="clubName">
                  Club Name <span className="required">*</span>
                </label>
                <div className="combobox-container">
                  <input
                    type="text"
                    id="clubName"
                    value={clubName}
                    onChange={(e) => handleClubNameChange(e.target.value)}
                    onFocus={() => {
                      const clubNames = existingClubs.map(club => club.name)
                      const filtered = clubName.length === 0
                        ? clubNames.slice(0, 5)
                        : clubNames.filter(name =>
                            name.toLowerCase().includes(clubName.toLowerCase())
                          ).slice(0, 5)
                      setFilteredClubs(filtered)
                      setShowClubDropdown(filtered.length > 0)
                    }}
                    onBlur={(e) => {
                      setTimeout(() => setShowClubDropdown(false), 150)
                    }}
                    className={showValidation && !clubName ? 'error' : ''}
                    placeholder="Enter or search club name"
                    required
                    autoComplete="off"
                  />
                  {showClubDropdown && filteredClubs.length > 0 && (
                    <div className="combobox-dropdown">
                      {filteredClubs.map((club, index) => (
                        <div
                          key={club}
                          className={`combobox-option ${index === highlightedClubIndex ? 'highlighted' : ''}`}
                          onClick={() => selectClub(club)}
                          onMouseEnter={() => setHighlightedClubIndex(index)}
                        >
                          {club}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {showValidation && !clubName && (
                  <div className="error-message">Please enter club name</div>
                )}
              </div>

              <div className="crew-form-group">
                <label htmlFor="raceName">
                  Race/Event Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="raceName"
                  value={raceName}
                  onChange={(e) => setRaceName(e.target.value)}
                  className={showValidation && !raceName ? 'error' : ''}
                  placeholder="Enter race or event name"
                  required
                />
                {showValidation && !raceName && (
                  <div className="error-message">Please enter race name</div>
                )}
              </div>

              <div className="crew-form-group">
                <label htmlFor="raceDate">Race Date (Optional)</label>
                <input
                  type="date"
                  id="raceDate"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                  placeholder="Select race date"
                />
              </div>

              <div className="crew-form-group">
                <label htmlFor="boatName">
                  Boat Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="boatName"
                  value={boatName}
                  onChange={(e) => setBoatName(e.target.value)}
                  className={showValidation && !boatName ? 'error' : ''}
                  placeholder="Enter boat name"
                  required
                />
                {showValidation && !boatName && (
                  <div className="error-message">Please enter boat name</div>
                )}
              </div>

              <div className="crew-form-group">
                <label htmlFor="coachName">Coach Name (Optional)</label>
                <input
                  type="text"
                  id="coachName"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Enter coach name (optional)"
                />
              </div>

              <div className="crew-form-group">
                <label htmlFor="raceCategory">Race Category (Optional)</label>
                <input
                  type="text"
                  id="raceCategory"
                  value={raceCategory}
                  onChange={(e) => setRaceCategory(e.target.value)}
                  placeholder="e.g., Heat 2, Final H"
                />
              </div>
            </div>
          </div>
        )

      case 1:
        if (!canProceedFromStep(0)) {
          return (
            <div className="crew-form-container" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '1rem' }}>
                ⬅️ Please complete crew information first
              </p>
              <p style={{ color: '#9ca3af' }}>
                Go back to fill in boat class, club name, race name, and boat name
              </p>
            </div>
          )
        }

        return (
          <div className="crew-form-container">
            <div className="crew-names-section">
              {boatClassHasCox(boatClass) && (
                <div className="cox-input">
                  <div className="crew-name-input">
                    <div className="seat-label">
                      Coxswain <span className="required">*</span>
                    </div>
                    <input
                      type="text"
                      value={coxName}
                      onChange={(e) => setCoxName(e.target.value)}
                      className={showValidation && !coxName.trim() ? 'error' : ''}
                      placeholder="Enter coxswain's name"
                      required
                    />
                    {showValidation && !coxName.trim() && (
                      <div className="error-message">Please enter coxswain name</div>
                    )}
                  </div>
                </div>
              )}

              <div className={`crew-names-grid ${boatClass === '1x' ? 'single-sculler-grid' : boatClass === '2x' || boatClass === '2-' ? 'two-seat-grid' : ''}`}>
                {crewNames.map((name, index) => {
                  const seatNumber = boatClassToSeats[boatClass] - index
                  const seatName =
                    boatClass === '1x'
                      ? 'Single Sculler'
                      : seatNumber === 1
                        ? 'Bow Seat'
                        : seatNumber === boatClassToSeats[boatClass]
                          ? 'Stroke Seat'
                          : `${seatNumber} Seat`

                  const placeholderText =
                    boatClass === '1x'
                      ? "Enter sculler's name"
                      : seatNumber === 1
                        ? "Enter bow's name"
                        : seatNumber === boatClassToSeats[boatClass]
                          ? "Enter stroke's name"
                          : `Enter ${seatNumber}'s name`

                  return (
                    <div key={index} className="crew-name-input">
                      <div className="seat-label">
                        {seatName} <span className="required">*</span>
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        className={showValidation && !name.trim() ? 'error' : ''}
                        placeholder={placeholderText}
                        required
                      />
                      {showValidation && !name.trim() && (
                        <div className="error-message">Please enter rower name</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="crew-form-container">
            <div className="review-section-clean">
              <div className="crew-details-grid">
                <div className="review-item-compact">
                  <span className="review-label">Boat Class:</span>
                  <span className="review-value">
                    {boatClassToBoatType(boatClass).name} - {boatClass}
                  </span>
                </div>
                <div className="review-item-compact">
                  <span className="review-label">Club:</span>
                  <span className="review-value">{clubName}</span>
                </div>
                <div className="review-item-compact">
                  <span className="review-label">Race:</span>
                  <span className="review-value">{raceName}</span>
                </div>
                {raceDate && (
                  <div className="review-item-compact">
                    <span className="review-label">Race Date:</span>
                    <span className="review-value">{raceDate}</span>
                  </div>
                )}
                <div className="review-item-compact">
                  <span className="review-label">Boat Name:</span>
                  <span className="review-value">{boatName}</span>
                </div>
                {coachName && (
                  <div className="review-item-compact crew-detail-coach">
                    <span className="review-label">Coach:</span>
                    <span className="review-value">{coachName}</span>
                  </div>
                )}
                {raceCategory && (
                  <div className="review-item-compact">
                    <span className="review-label">Race Category:</span>
                    <span className="review-value">{raceCategory}</span>
                  </div>
                )}
              </div>

              <div className="crew-members-compact">
                {boatClassHasCox(boatClass) && (
                  <div className="review-item-compact">
                    <span className="review-label">Coxswain:</span>
                    <span className="review-value">{coxName}</span>
                  </div>
                )}

                <div className="crew-members-grid">
                  {crewNames.map((name, index) => {
                    const seatNumber = boatClassToSeats[boatClass] - index
                    const seatName = boatClass === '1x' ? 'Single sculler' :
                                    seatNumber === 1 ? 'Bow seat' :
                                    seatNumber === boatClassToSeats[boatClass] ? 'Stroke seat' :
                                    `${seatNumber} seat`

                    return (
                      <div key={seatNumber} className="review-item-compact">
                        <span className="review-label">{seatName}:</span>
                        <span className="review-value">{name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Crew' : 'Create New Crew'}
      maxWidth="900px"
      className="modal-large crew-modal"
    >
          {/* Stepper */}
          <div className="stepper">
            {steps.map((step, index) => (
              <div
                key={step.label}
                className={`step ${
                  activeStep > index
                    ? 'completed'
                    : activeStep === index
                      ? 'active'
                      : 'inactive'
                }`}
              >
                <div className="step-icon">
                  {activeStep > index ? '✓' : index + 1}
                </div>
                <div className="step-content">
                  <div className="step-label">{step.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Step Content */}
          {renderStepContent(activeStep)}

          <div className="crew-modal-footer">
            <div className="crew-modal-actions">
              {activeStep > 0 && (
                <button className="btn btn-secondary" onClick={handleBack}>
                  ← Back
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>

                {activeStep === steps.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveCrew}
                    disabled={saving || !canProceedFromStep(activeStep)}
                  >
                    {saving ? (
                      isEditing ? 'Updating...' : 'Saving...'
                    ) : (
                      isEditing ? 'Update Crew' : 'Save Crew'
                    )}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleNext}
                  >
                    Next Step →
                  </button>
                )}
              </div>
            </div>
          </div>
      </Modal>
  )
}