'use client'

import { useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/lib/auth-context'
import { useGuest } from '@/lib/guest-context'
import { DataContainer } from '@/components/DataContainer'
import { ClubCard } from '@/components/ClubCard'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { Dialog } from '@/components/Dialog'
import '@/routes/clubs.css'

interface ClubFormData {
  name: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
}

const defaultForm: ClubFormData = { name: '', primaryColor: '#2563eb', secondaryColor: '#1e40af', logoUrl: '' }

const SwapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(90deg)' }}>
    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
)

const ClubDialog = ({
  isOpen,
  onClose,
  form,
  onChange,
  onLogoClick,
  onLogoDrop,
  onLogoRemove,
  onSubmit,
  isPending,
  logoInputRef,
  title,
}: {
  isOpen: boolean
  onClose: () => void
  form: ClubFormData
  onChange: (field: keyof ClubFormData, value: string) => void
  onLogoClick: () => void
  onLogoDrop: (e: React.DragEvent) => void
  onLogoRemove: () => void
  onSubmit: () => void
  isPending: boolean
  logoInputRef: React.RefObject<HTMLInputElement | null>
  title: string
}) => {
  const [showValidation, setShowValidation] = useState(false)

  const handleSubmit = () => {
    if (!form.name.trim()) { setShowValidation(true); return }
    onSubmit()
  }

  const handleClose = () => { setShowValidation(false); onClose() }

  const handleSwap = () => {
    const tmp = form.primaryColor
    onChange('primaryColor', form.secondaryColor)
    onChange('secondaryColor', tmp)
  }

  const footer = (
    <>
      <button className="dialog-btn dialog-btn-secondary" onClick={handleClose}>Cancel</button>
      <button className="dialog-btn dialog-btn-primary" onClick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving…' : title}
      </button>
    </>
  )

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={title} size="sm" footer={footer}>
      <div className="dialog-form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="dialog-form-group">
          <label className={`dialog-label ${showValidation && !form.name.trim() ? 'error' : ''}`}>
            Club Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            className={`dialog-input ${showValidation && !form.name.trim() ? 'error' : ''}`}
            placeholder="Enter club name"
            autoFocus
          />
        </div>

        <div className="dialog-form-group">
          <label className="dialog-label">Colours</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dialog-color-row" style={{ flex: 1 }}>
              <input type="color" value={form.primaryColor} onChange={(e) => onChange('primaryColor', e.target.value)} className="dialog-color-swatch" />
              <input type="text" value={form.primaryColor} onChange={(e) => onChange('primaryColor', e.target.value)} className="dialog-input" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} placeholder="Primary" />
            </div>
            <button
              type="button"
              onClick={handleSwap}
              title="Swap colours"
              style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280', flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
            >
              <SwapIcon />
            </button>
            <div className="dialog-color-row" style={{ flex: 1 }}>
              <input type="color" value={form.secondaryColor} onChange={(e) => onChange('secondaryColor', e.target.value)} className="dialog-color-swatch" />
              <input type="text" value={form.secondaryColor} onChange={(e) => onChange('secondaryColor', e.target.value)} className="dialog-input" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} placeholder="Secondary" />
            </div>
          </div>
        </div>

        <div className="dialog-form-group">
          <label className="dialog-label">Club Logo (Optional)</label>
          <div className="dialog-logo-area" onDragOver={(e) => e.preventDefault()} onDrop={onLogoDrop} onClick={onLogoClick}>
            {form.logoUrl ? (
              <>
                <img src={form.logoUrl} alt="Club logo" className="dialog-logo-preview" />
                <button className="dialog-logo-remove" onClick={(e) => { e.stopPropagation(); onLogoRemove() }}>✕</button>
              </>
            ) : (
              <div className="dialog-logo-placeholder">
                <p>Click or drag image here</p>
                <span>Max 2MB</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default function ClubsPage() {
  const { user, setShowAuthModal } = useAuth()
  const { guestClubs, addGuestClub, updateGuestClub, removeGuestClub } = useGuest()
  const [dialogState, setDialogState] = useState<{ open: boolean; editingId: string | null; form: ClubFormData }>({
    open: false,
    editingId: null,
    form: defaultForm,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filteredClubs, setFilteredClubs] = useState<Array<any>>([])
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set())
  const logoInputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()
  const { data: serverClubs = [], isLoading } = trpc.club.getAll.useQuery(undefined, { enabled: !!user })

  const allClubs = [
    ...guestClubs.map((c) => ({ ...c, logoUrl: c.logoUrl ?? null })),
    ...serverClubs,
  ]

  const invalidate = () => { utils.club.getAll.invalidate(); utils.crew.getAll.invalidate() }

  const createMutation = trpc.club.create.useMutation({ onSuccess: () => { closeDialog(); invalidate() } })
  const updateMutation = trpc.club.update.useMutation({ onSuccess: () => { closeDialog(); invalidate() } })
  const deleteMutation = trpc.club.delete.useMutation({ onSuccess: () => { setShowDeleteConfirm(null); invalidate() } })
  const bulkDeleteMutation = trpc.club.bulkDelete.useMutation({ onSuccess: () => { setSelectedClubs(new Set()); setShowBatchDeleteConfirm(false); invalidate() } })

  const openCreate = () => setDialogState({ open: true, editingId: null, form: defaultForm })
  const openEdit = (club: any) => setDialogState({
    open: true,
    editingId: club.id,
    form: { name: club.name, primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, logoUrl: club.logoUrl || '' },
  })
  const closeDialog = () => setDialogState({ open: false, editingId: null, form: defaultForm })
  const handleFormChange = (field: keyof ClubFormData, value: string) => setDialogState((prev) => ({ ...prev, form: { ...prev.form, [field]: value } }))

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('logo', file)
    const res = await fetch('/api/upload/club-logo', { method: 'POST', body: formData })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Upload failed')
    handleFormChange('logoUrl', result.logoUrl)
  }

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { alert('File size must be less than 2MB'); return }
    await handleLogoUpload(file)
  }

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const imageFile = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (!imageFile) { alert('Please drop an image file'); return }
    if (imageFile.size > 2 * 1024 * 1024) { alert('File size must be less than 2MB'); return }
    await handleLogoUpload(imageFile)
  }

  const handleSubmit = () => {
    const { form, editingId } = dialogState
    if (editingId) {
      const isGuest = guestClubs.some((c) => c.id === editingId)
      if (isGuest) {
        updateGuestClub(editingId, { name: form.name, primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, ...(form.logoUrl ? { logoUrl: form.logoUrl } : {}) })
        closeDialog()
      } else {
        updateMutation.mutate({ id: editingId, name: form.name, primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, logoUrl: form.logoUrl || '' })
      }
    } else {
      if (!user) {
        addGuestClub({ name: form.name, primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, ...(form.logoUrl ? { logoUrl: form.logoUrl } : {}) })
        closeDialog()
      } else {
        createMutation.mutate({ name: form.name, primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, logoUrl: form.logoUrl || '', userId: user.id })
      }
    }
  }

  const handleDeleteClub = (id: string) => {
    if (guestClubs.some((c) => c.id === id)) {
      removeGuestClub(id)
      setShowDeleteConfirm(null)
    } else {
      deleteMutation.mutate({ id })
    }
  }

  const handleBulkDelete = () => {
    const guestIds = Array.from(selectedClubs).filter((id) => guestClubs.some((c) => c.id === id))
    const serverIds = Array.from(selectedClubs).filter((id) => !guestClubs.some((c) => c.id === id))
    guestIds.forEach((id) => removeGuestClub(id))
    if (serverIds.length > 0) {
      bulkDeleteMutation.mutate({ ids: serverIds })
    } else {
      setSelectedClubs(new Set())
      setShowBatchDeleteConfirm(false)
    }
  }

  const filterFunction = (club: any, query: string) => club.name.toLowerCase().includes(query)

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      {!user && guestClubs.length > 0 && (
        <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe', padding: '10px 24px', fontSize: '0.875rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Your clubs are saved on this device only.</span>
          <button
            onClick={() => setShowAuthModal(true)}
            style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}
          >
            Sign in to save them permanently
          </button>
        </div>
      )}
      <DataContainer
        items={allClubs}
        loading={isLoading}
        skeletonVariant="club"
        error=""
        emptyState={{ title: 'No Clubs Yet', message: 'Create your first club preset to get started', actionLabel: 'Create First Club', actionOnClick: openCreate }}
        searchConfig={{
          placeholder: 'Search clubs...',
          filterFunction,
          sortOptions: [
            { value: 'name', label: 'Name A-Z', sortFn: (a, b) => a.name.localeCompare(b.name) },
            { value: 'recent', label: 'Recently Created', sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() },
          ],
        }}
        renderCard={(club, isSelected, onSelect) => (
          <ClubCard
            club={club}
            isSelected={isSelected}
            onSelect={onSelect}
            isEditing={false}
            onEdit={openEdit}
            onSave={() => {}}
            onCancel={() => {}}
            onDelete={(c) => setShowDeleteConfirm(c.id)}
            onEditFormChange={() => {}}
            onLogoClick={() => {}}
            onLogoRemove={() => {}}
          />
        )}
        className="club-presets-container"
        gridClassName="gallery-grid"
        selectedItems={selectedClubs}
        onItemSelect={(clubId, checked) => { const n = new Set(selectedClubs); if (checked) n.add(clubId); else n.delete(clubId); setSelectedClubs(n) }}
        onSelectAll={() => setSelectedClubs(selectedClubs.size === filteredClubs.length ? new Set() : new Set(filteredClubs.map((c) => c.id)))}
        actionButtons={[
          ...(selectedClubs.size > 0 ? [{ label: 'Delete Selected', onClick: () => setShowBatchDeleteConfirm(true), variant: 'crew-danger' as const }] : []),
          { label: 'Create New Club', onClick: openCreate, variant: 'primary' as const },
        ]}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        filteredItems={filteredClubs}
        onItemsFiltered={setFilteredClubs}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <ClubDialog
        isOpen={dialogState.open}
        onClose={closeDialog}
        form={dialogState.form}
        onChange={handleFormChange}
        onLogoClick={() => logoInputRef.current?.click()}
        onLogoDrop={handleLogoDrop}
        onLogoRemove={() => handleFormChange('logoUrl', '')}
        onSubmit={handleSubmit}
        isPending={user ? isPending : false}
        logoInputRef={logoInputRef}
        title={dialogState.editingId ? 'Edit Club' : 'Create New Club'}
      />

      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFileSelect} style={{ display: 'none' }} />

      <ConfirmDeleteModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => handleDeleteClub(showDeleteConfirm!)} title="Delete Club" message={`Are you sure you want to delete "${allClubs.find((c) => c.id === showDeleteConfirm)?.name}"?`} confirmButtonText="Delete Club" />
      <ConfirmDeleteModal isOpen={showBatchDeleteConfirm} onClose={() => setShowBatchDeleteConfirm(false)} onConfirm={handleBulkDelete} title={selectedClubs.size === 1 ? 'Delete Club' : 'Delete Clubs'} message={selectedClubs.size === 1 ? `Are you sure you want to delete "${filteredClubs.find((c) => selectedClubs.has(c.id))?.name}"?` : `Are you sure you want to delete ${selectedClubs.size} clubs?`} confirmButtonText={selectedClubs.size === 1 ? 'Delete Club' : 'Delete Clubs'} />
    </>
  )
}
