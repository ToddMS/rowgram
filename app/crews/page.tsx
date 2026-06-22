'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/lib/auth-context'
import { useGuest } from '@/lib/guest-context'
import { DataContainer } from '@/components/DataContainer'
import { CrewCard } from '@/components/CrewCard'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { CreateCrewModal } from '@/components/CreateCrewModal'
import '@/routes/crews.css'
import { getBoatType } from '@/lib/boat-types'

export default function CrewsPage() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<string>('recent')
  const [selectedCrews, setSelectedCrews] = useState<Set<string>>(new Set())
  const [expandedCrewMembers, setExpandedCrewMembers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredCrews, setFilteredCrews] = useState<Array<any>>([])
  const [selectedClub, setSelectedClub] = useState<string>('')
  const [selectedBoatClass, setSelectedBoatClass] = useState<string>('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCrew, setEditingCrew] = useState<any | null>(null)

  const { user, setShowAuthModal } = useAuth()
  const { guestCrews, removeGuestCrew } = useGuest()
  const utils = trpc.useUtils()
  const { data: crewsRaw = [], isLoading: loading, error, refetch: loadCrews } = trpc.crew.getAll.useQuery(undefined, { enabled: !!user })
  const crews = crewsRaw as Array<{ id: string; name: string; clubName?: string | null; raceName?: string | null; raceDate?: string | null; boatName?: string | null; coachName?: string | null; raceCategory?: string | null; crewNames: Array<string>; boatCode: string; userId: string; clubId?: string | null; createdAt: Date | string; updatedAt: Date | string; club?: { id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null } | null }>
  const deleteCrew = trpc.crew.delete.useMutation({
    onSuccess: () => {
      utils.crew.getAll.invalidate()
      utils.savedImage.getAll.invalidate()
    },
  })

  const getSeatLabel = (idx: number, totalRowers: number, hasCox: boolean) => {
    if (hasCox && idx === 0) return 'C'
    const rowerIdx = hasCox ? idx - 1 : idx
    if (totalRowers === 8) return ['S', '7', '6', '5', '4', '3', '2', 'B'][rowerIdx]
    if (totalRowers === 4) return ['S', '3', '2', 'B'][rowerIdx]
    if (totalRowers === 2) return ['S', 'B'][rowerIdx]
    if (totalRowers === 1) return 'S'
    return `${rowerIdx + 1}`
  }

  const mapCrew = (crew: { id: string; name: string; clubName?: string | null; raceName?: string | null; raceDate?: string | null; coachName?: string | null; raceCategory?: string | null; crewNames: Array<string>; boatCode: string; createdAt: Date | string; club?: { id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null } | null; isGuest?: boolean }) => {
    const boatType = getBoatType(crew.boatCode)
    const totalRowers = boatType?.seats ?? 0
    const hasCox = boatType?.hasCox ?? false
    return {
      ...crew,
      boatClub: crew.club?.name || crew.clubName || 'No Club',
      clubLogoUrl: crew.club?.logoUrl ?? null,
      boatName: crew.name,
      boatClass: crew.boatCode,
      crewMembers: crew.crewNames.map((name, idx) => ({ seat: getSeatLabel(idx, totalRowers, hasCox), name })),
    }
  }

  const savedCrews = crews.map(mapCrew)
  const mappedGuestCrews = guestCrews.map((crew) => mapCrew({
    id: crew.id,
    name: crew.name,
    clubName: crew.clubName,
    raceName: crew.raceName,
    raceDate: crew.raceDate,
    coachName: crew.coachName,
    raceCategory: crew.raceCategory,
    crewNames: crew.crewNames,
    boatCode: crew.boatCode,
    createdAt: crew.createdAt,
    club: null,
    isGuest: true,
  }))

  const allCrews = [...mappedGuestCrews, ...savedCrews]

  const filterFunction = (crew: any, query: string) => {
    const crewName = crew.boatName?.toLowerCase() || ''
    const clubName = crew.boatClub?.toLowerCase() || ''
    const raceName = crew.raceName?.toLowerCase() || ''
    const rowerNames = crew.crewMembers?.map((m: any) => m.name).join(' ').toLowerCase() || ''
    const coachName = crew.coachName?.toLowerCase() || ''
    return crewName.includes(query) || clubName.includes(query) || raceName.includes(query) || rowerNames.includes(query) || coachName.includes(query)
  }

  const uniqueClubs = Array.from(new Set(allCrews.map((c) => c.boatClub).filter(Boolean))).map((club) => ({ value: club, label: club }))
  const uniqueBoatClasses = Array.from(new Set(allCrews.map((c) => c.boatClass).filter(Boolean))).map((bc) => ({ value: bc, label: bc }))

  const confirmDeleteCrew = async (crew: any) => {
    if (crew.isGuest) {
      removeGuestCrew(crew.id)
      setShowDeleteConfirm(null)
      return
    }
    try {
      await deleteCrew.mutateAsync({ id: crew.id })
      setShowDeleteConfirm(null)
    } catch (deleteErr) {
      console.error('Error deleting crew:', deleteErr)
    }
  }

  const handleCrewSelection = (crewId: string, checked: boolean) => {
    const next = new Set(selectedCrews)
    if (checked) next.add(crewId); else next.delete(crewId)
    setSelectedCrews(next)
  }

  const handleSelectAll = () => {
    setSelectedCrews(selectedCrews.size === filteredCrews.length ? new Set() : new Set(filteredCrews.map((c) => c.id)))
  }

  const confirmBulkDelete = async () => {
    try {
      for (const crewId of selectedCrews) {
        const crew = allCrews.find((c) => c.id === crewId)
        if (crew?.isGuest) {
          removeGuestCrew(crewId)
        } else {
          await deleteCrew.mutateAsync({ id: crewId })
        }
      }
      setSelectedCrews(new Set())
      setShowBatchDeleteConfirm(false)
    } catch (deleteErr) {
      console.error('Error in bulk delete:', deleteErr)
    }
  }

  const toggleCrewMembersExpansion = (crewId: string) => {
    const next = new Set(expandedCrewMembers)
    if (next.has(crewId)) next.delete(crewId); else next.add(crewId)
    setExpandedCrewMembers(next)
  }

  const handleEditCrew = (crew: any) => {
    setEditingCrew({
      id: crew.id,
      boatClass: crew.boatClass,
      clubName: crew.boatClub !== 'No Club' ? crew.boatClub : '',
      clubId: crew.club?.id || crew.clubId || '',
      raceName: crew.raceName,
      boatName: crew.boatName,
      raceDate: crew.raceDate,
      coachName: crew.coachName,
      raceCategory: crew.raceCategory,
      crewNames: crew.crewMembers.filter((m: any) => m.seat !== 'C').map((m: any) => m.name),
      coxName: crew.crewMembers.find((m: any) => m.seat === 'C')?.name || '',
      isGuest: crew.isGuest,
    })
    setShowCreateModal(true)
  }

  const handleDuplicateCrew = (crew: any) => {
    setEditingCrew({
      // no id — modal treats this as a new crew creation
      boatClass: crew.boatClass,
      clubName: crew.boatClub !== 'No Club' ? crew.boatClub : '',
      clubId: crew.club?.id || crew.clubId || '',
      raceName: crew.raceName,
      boatName: `${crew.boatName} (Copy)`,
      raceDate: crew.raceDate,
      coachName: crew.coachName,
      raceCategory: crew.raceCategory,
      crewNames: crew.crewMembers.filter((m: any) => m.seat !== 'C').map((m: any) => m.name),
      coxName: crew.crewMembers.find((m: any) => m.seat === 'C')?.name || '',
      isGuest: crew.isGuest,
    })
    setShowCreateModal(true)
  }

  const navigateToGenerate = (crewIds: Array<string>) => {
    router.push(`/generate?crews=${crewIds.join(',')}`)
  }

  return (
    <>
      {!user && guestCrews.length > 0 && (
        <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '10px 24px', fontSize: '0.875rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Your crews are saved on this device only.</span>
          <button
            onClick={() => setShowAuthModal(true)}
            style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}
          >
            Sign in to save them permanently
          </button>
        </div>
      )}
      <DataContainer
        items={allCrews}
        loading={loading}
        skeletonVariant="crew"
        error={error?.message}
        emptyState={{ title: 'No Crews Yet', message: 'Create your first crew lineup to get started', actionLabel: 'Create Your First Crew', actionOnClick: () => { setEditingCrew(null); setShowCreateModal(true) } }}
        searchConfig={{
          placeholder: 'Search crews...',
          filterFunction,
          sortOptions: [
            { value: 'recent', label: 'Recently Created', sortFn: (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() },
            { value: 'club', label: 'Club Name', sortFn: (a, b) => a.boatClub.localeCompare(b.boatClub) },
            { value: 'race', label: 'Race Name', sortFn: (a, b) => (a.raceName || '').localeCompare(b.raceName || '') },
            { value: 'boat_class', label: 'Boat Class', sortFn: (a, b) => a.boatClass.localeCompare(b.boatClass) },
          ],
          advancedFilters: [
            { name: 'club', label: 'Club', options: [{ value: '', label: 'All Clubs' }, ...uniqueClubs], selectedValue: selectedClub, onValueChange: setSelectedClub, filterFn: (crew, value) => !value || crew.boatClub === value },
            { name: 'boatClass', label: 'Boat Class', options: [{ value: '', label: 'All Boat Classes' }, ...uniqueBoatClasses], selectedValue: selectedBoatClass, onValueChange: setSelectedBoatClass, filterFn: (crew, value) => !value || crew.boatClass === value },
          ],
        }}
        renderCard={(crew, isSelected, onSelect) => (
          <CrewCard
            crew={crew}
            isSelected={isSelected}
            onSelect={onSelect}
            onEdit={handleEditCrew}
            onDelete={(c) => setShowDeleteConfirm(c)}
            onDuplicate={handleDuplicateCrew}
            onGenerate={(c) => navigateToGenerate([c.id])}
            expandedCrewMembers={expandedCrewMembers}
            onToggleExpansion={toggleCrewMembersExpansion}
          />
        )}
        className="my-crews-container"
        gridClassName="crews-grid"
        selectedItems={selectedCrews}
        onItemSelect={handleCrewSelection}
        onSelectAll={handleSelectAll}
        actionButtons={[
          ...(selectedCrews.size > 0 ? [
            { label: 'Delete Selected', onClick: () => setShowBatchDeleteConfirm(true), variant: 'crew-danger' as const },
            { label: 'Generate Selected', onClick: () => navigateToGenerate(Array.from(selectedCrews)), variant: 'crew-secondary' as const },
          ] : []),
          { label: 'Create New Crew', onClick: () => { setEditingCrew(null); setShowCreateModal(true) }, variant: 'primary' as const },
        ]}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredItems={filteredCrews}
        onItemsFiltered={setFilteredCrews}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        onRetry={() => loadCrews()}
      />

      <ConfirmDeleteModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => confirmDeleteCrew(showDeleteConfirm)} title="Delete Crew" message={`Are you sure you want to delete "${showDeleteConfirm?.boatName}"?`} confirmButtonText="Delete Crew" />
      <ConfirmDeleteModal isOpen={showBatchDeleteConfirm} onClose={() => setShowBatchDeleteConfirm(false)} onConfirm={confirmBulkDelete} title={selectedCrews.size === 1 ? 'Delete Crew' : 'Delete Crews'} message={selectedCrews.size === 1 ? `Are you sure you want to delete "${filteredCrews.find((c) => selectedCrews.has(c.id))?.boatName}"?` : `Are you sure you want to delete ${selectedCrews.size} crews?`} confirmButtonText={selectedCrews.size === 1 ? 'Delete Crew' : 'Delete Crews'} />
      <CreateCrewModal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setEditingCrew(null) }} onSuccess={() => loadCrews()} editingCrew={editingCrew} />
    </>
  )
}
