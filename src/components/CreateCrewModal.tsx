import { useEffect, useState } from 'react'
import { trpc } from '../lib/trpc-client'
import { useAuth } from '../lib/auth-context'
import { Dialog } from './Dialog'
import { BOAT_TYPES, getBoatType } from '../lib/boat-types'

interface CreateCrewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingCrew?: any
}

const boatClassHasCox = (boatClass: string) => getBoatType(boatClass)?.hasCox ?? false

const STEPS = [
  { label: 'Crew Info' },
  { label: 'Add Crew' },
]

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

  const { data: existingClubsRaw = [] } = trpc.club.getAll.useQuery()
  const existingClubs = existingClubsRaw as Array<{ id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null }>

  const isEditing = !!editingCrew?.id

  const createCrewMutation = trpc.crew.create.useMutation({
    onSuccess: () => {
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
      onSuccess()
      handleClose()
    },
    onError: (error) => {
      alert(`Failed to update crew: ${error.message}`)
      setSaving(false)
    },
  })

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
    } else if (isOpen && process.env.NODE_ENV === 'development') {
      setBoatClass('8+')
      setClubName('Thames Rowing Club')
      setRaceName('Henley Royal Regatta')
      setRaceDate('2026-07-02')
      setBoatName('Tempest')
      setCoachName('John Smith')
      setRaceCategory('Final A')
      setCoxName('Sam Taylor')
      setCrewNames(['Alice Johnson', 'Bob Williams', 'Charlie Brown', 'Diana Prince', 'Eve Wilson', 'Frank Miller', 'Grace Lee', 'Henry Davis'])
    } else if (isOpen) {
      resetForm()
    }
  }, [editingCrew, isOpen])

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0: return !!(boatClass && clubName && raceName && boatName)
      case 1: return (
        crewNames.every((name) => name.trim().length > 0) &&
        (!boatClassHasCox(boatClass) || coxName.trim().length > 0)
      )
      default: return true
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
    setShowValidation(false)
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
      : clubNames.filter(name => name.toLowerCase().includes(value.toLowerCase())).slice(0, 5)

    setFilteredClubs(filtered)
    setShowClubDropdown(true)
    setHighlightedClubIndex(-1)
  }

  const selectClub = (name: string) => {
    setClubName(name)
    const match = existingClubs.find(club => club.name === name)
    setSelectedClubId(match?.id || '')
    setShowClubDropdown(false)
    setHighlightedClubIndex(-1)
  }

  const handleSaveCrew = async () => {
    if (!user) { alert('Please sign in to save your crew'); return }
    setSaving(true)
    try {
      if (!getBoatType(boatClass)) throw new Error(`Unknown boat class: ${boatClass}`)

      const allCrewNames = [
        ...(boatClassHasCox(boatClass) ? [coxName] : []),
        ...crewNames,
      ]

      if (isEditing) {
        await updateCrewMutation.mutateAsync({
          id: editingCrew.id,
          name: boatName,
          clubName,
          raceName,
          raceDate: raceDate.trim() || undefined,
          boatName,
          crewNames: allCrewNames,
          coachName: coachName.trim() || undefined,
          raceCategory: raceCategory.trim() || undefined,
          boatCode: boatClass,
        })
      } else {
        await createCrewMutation.mutateAsync({
          name: boatName,
          clubName,
          clubId: selectedClubId || undefined,
          raceName,
          raceDate: raceDate.trim() || undefined,
          boatCode: boatClass,
          crewNames: allCrewNames,
          coachName: coachName.trim() || undefined,
          raceCategory: raceCategory.trim() || undefined,
          userId: user.id,
        })
      }
    } catch (error) {
      console.error('Error saving crew:', error)
      setSaving(false)
    }
  }

  const err = (val: string | boolean) => showValidation && !val

  const renderStep0 = () => (
    <div className="dialog-form-grid">
      <div className="dialog-form-group">
        <label className={`dialog-label ${err(boatClass) ? 'error' : ''}`}>
          Boat Class *
        </label>
        <select
          value={boatClass}
          onChange={(e) => {
            const bc = e.target.value
            setBoatClass(bc)
            setCrewNames(Array(getBoatType(bc)?.seats ?? 0).fill(''))
            setCoxName('')
          }}
          className={`dialog-select ${err(boatClass) ? 'error' : ''}`}
        >
          <option value="">Select boat class</option>
          {BOAT_TYPES.map((bt) => (
            <option key={bt.code} value={bt.code}>{bt.code} ({bt.name})</option>
          ))}
        </select>
      </div>

      <div className="dialog-form-group">
        <label className={`dialog-label ${err(clubName) ? 'error' : ''}`}>
          Club Name *
        </label>
        <div className="dialog-combobox">
          <input
            type="text"
            value={clubName}
            onChange={(e) => handleClubNameChange(e.target.value)}
            onFocus={() => {
              const names = existingClubs.map(c => c.name)
              const filtered = clubName.length === 0
                ? names.slice(0, 5)
                : names.filter(n => n.toLowerCase().includes(clubName.toLowerCase())).slice(0, 5)
              setFilteredClubs(filtered)
              setShowClubDropdown(filtered.length > 0)
            }}
            onBlur={() => setTimeout(() => setShowClubDropdown(false), 150)}
            className={`dialog-input ${err(clubName) ? 'error' : ''}`}
            placeholder="Enter or search club name"
            autoComplete="off"
          />
          {showClubDropdown && filteredClubs.length > 0 && (
            <div className="dialog-combobox-dropdown">
              {filteredClubs.map((club, index) => (
                <div
                  key={club}
                  className={`dialog-combobox-option ${index === highlightedClubIndex ? 'highlighted' : ''}`}
                  onClick={() => selectClub(club)}
                  onMouseEnter={() => setHighlightedClubIndex(index)}
                >
                  {club}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dialog-form-group">
        <label className={`dialog-label ${err(raceName) ? 'error' : ''}`}>
          Race / Event Name *
        </label>
        <input
          type="text"
          value={raceName}
          onChange={(e) => setRaceName(e.target.value)}
          className={`dialog-input ${err(raceName) ? 'error' : ''}`}
          placeholder="Enter race or event name"
        />
      </div>

      <div className="dialog-form-group">
        <label className="dialog-label">Race Date (Optional)</label>
        <input
          type="date"
          value={raceDate}
          onChange={(e) => setRaceDate(e.target.value)}
          className="dialog-input"
        />
      </div>

      <div className="dialog-form-group">
        <label className={`dialog-label ${err(boatName) ? 'error' : ''}`}>
          Boat Name *
        </label>
        <input
          type="text"
          value={boatName}
          onChange={(e) => setBoatName(e.target.value)}
          className={`dialog-input ${err(boatName) ? 'error' : ''}`}
          placeholder="Enter boat name"
        />
      </div>

      <div className="dialog-form-group">
        <label className="dialog-label">Coach Name (Optional)</label>
        <input
          type="text"
          value={coachName}
          onChange={(e) => setCoachName(e.target.value)}
          className="dialog-input"
          placeholder="Enter coach name"
        />
      </div>

      <div className="dialog-form-group full-width">
        <label className="dialog-label">Race Category (Optional)</label>
        <input
          type="text"
          value={raceCategory}
          onChange={(e) => setRaceCategory(e.target.value)}
          className="dialog-input"
          placeholder="e.g. Heat 2, Final H"
        />
      </div>
    </div>
  )

  const renderStep1 = () => {
    if (!canProceedFromStep(0)) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9CA3AF' }}>
          <p style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Complete crew information first</p>
          <p style={{ fontSize: '0.8125rem' }}>Go back and fill in the required fields</p>
        </div>
      )
    }

    const totalSeats = getBoatType(boatClass)?.seats ?? 0
    const gridClass = boatClass === '1x' ? 'single' : (boatClass === '2x' || boatClass === '2-') ? 'double' : ''

    return (
      <div>
        {boatClassHasCox(boatClass) && (
          <div style={{ marginBottom: '12px' }}>
            <div className="dialog-form-group">
              <label className={`dialog-seat-label ${err(coxName.trim()) ? 'error' : ''}`}>
                Coxswain *
              </label>
              <input
                type="text"
                value={coxName}
                onChange={(e) => setCoxName(e.target.value)}
                className={`dialog-input ${err(coxName.trim()) ? 'error' : ''}`}
                placeholder="Enter coxswain's name"
              />
            </div>
          </div>
        )}

        <div className={`dialog-crew-grid ${gridClass}`}>
          {crewNames.map((name, index) => {
            const seatNumber = totalSeats - index
            const seatName =
              boatClass === '1x' ? 'Single Sculler' :
              seatNumber === 1 ? 'Bow Seat' :
              seatNumber === totalSeats ? 'Stroke Seat' :
              `${seatNumber} Seat`

            const placeholder =
              boatClass === '1x' ? "Enter sculler's name" :
              seatNumber === 1 ? "Enter bow's name" :
              seatNumber === totalSeats ? "Enter stroke's name" :
              `Enter ${seatNumber}'s name`

            const hasError = err(name.trim())

            return (
              <div key={index}>
                <div className={`dialog-seat-label ${hasError ? 'error' : ''}`}>{seatName} *</div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className={`dialog-input ${hasError ? 'error' : ''}`}
                  placeholder={placeholder}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeStep) {
      case 0: return renderStep0()
      case 1: return renderStep1()
      default: return null
    }
  }

  const footer = (
    <>
      {activeStep > 0 && (
        <div className="dialog-footer-back">
          <button className="dialog-btn dialog-btn-secondary" onClick={handleBack}>
            ← Back
          </button>
        </div>
      )}
      <button className="dialog-btn dialog-btn-secondary" onClick={handleClose}>
        Cancel
      </button>
      {activeStep === STEPS.length - 1 ? (
        <button
          className="dialog-btn dialog-btn-primary"
          onClick={handleSaveCrew}
          disabled={saving}
        >
          {saving ? (isEditing ? 'Updating…' : 'Saving…') : (isEditing ? 'Update Crew' : 'Save Crew')}
        </button>
      ) : (
        <button className="dialog-btn dialog-btn-primary" onClick={handleNext}>
          Next →
        </button>
      )}
    </>
  )

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Crew' : 'Create New Crew'}
      steps={STEPS}
      currentStep={activeStep}
      footer={footer}
    >
      {renderContent()}
    </Dialog>
  )
}
