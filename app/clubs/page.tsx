'use client'

import { useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/lib/auth-context'
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="dialog-form-group">
            <label className="dialog-label">Primary Color</label>
            <div className="dialog-color-row">
              <input type="color" value={form.primaryColor} onChange={(e) => onChange('primaryColor', e.target.value)} className="dialog-color-swatch" />
              <input type="text" value={form.primaryColor} onChange={(e) => onChange('primaryColor', e.target.value)} className="dialog-input" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
            </div>
          </div>
          <div className="dialog-form-group">
            <label className="dialog-label">Secondary Color</label>
            <div className="dialog-color-row">
              <input type="color" value={form.secondaryColor} onChange={(e) => onChange('secondaryColor', e.target.value)} className="dialog-color-swatch" />
              <input type="text" value={form.secondaryColor} onChange={(e) => onChange('secondaryColor', e.target.value)} className="dialog-input" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
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
  const { user } = useAuth()
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [editingClubId, setEditingClubId] = useState<string | null>(null)
  const [newClubForm, setNewClubForm] = useState<ClubFormData>(defaultForm)
  const [editForm, setEditForm] = useState<Record<string, ClubFormData>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filteredClubs, setFilteredClubs] = useState<Array<any>>([])
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set())
  const newLogoInputRef = useRef<HTMLInputElement>(null)
  const editLogoInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const utils = trpc.useUtils()
  const { data: clubs = [], isLoading } = trpc.club.getAll.useQuery()

  const invalidate = () => { utils.club.getAll.invalidate(); utils.crew.getAll.invalidate() }

  const createMutation = trpc.club.create.useMutation({ onSuccess: () => { setIsCreatingNew(false); setNewClubForm(defaultForm); invalidate() } })
  const updateMutation = trpc.club.update.useMutation({ onSuccess: () => { setEditingClubId(null); setEditForm({}); invalidate() } })
  const deleteMutation = trpc.club.delete.useMutation({ onSuccess: () => { setShowDeleteConfirm(null); invalidate() } })
  const bulkDeleteMutation = trpc.club.bulkDelete.useMutation({ onSuccess: () => { setSelectedClubs(new Set()); setShowBatchDeleteConfirm(false); invalidate() } })

  const handleLogoUpload = async (file: File, clubId?: string) => {
    const formData = new FormData()
    formData.append('logo', file)
    const res = await fetch('/api/upload/club-logo', { method: 'POST', body: formData })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Upload failed')
    if (clubId) {
      setEditForm((prev) => ({ ...prev, [clubId]: { ...prev[clubId], logoUrl: result.logoUrl } }))
    } else {
      setNewClubForm((prev) => ({ ...prev, logoUrl: result.logoUrl }))
    }
  }

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, clubId?: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { alert('File size must be less than 2MB'); return }
    await handleLogoUpload(file, clubId)
  }

  const handleDrop = async (e: React.DragEvent, clubId?: string) => {
    e.preventDefault()
    const imageFile = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (!imageFile) { alert('Please drop an image file'); return }
    if (imageFile.size > 2 * 1024 * 1024) { alert('File size must be less than 2MB'); return }
    await handleLogoUpload(imageFile, clubId)
  }

  const filterFunction = (club: any, query: string) => club.name.toLowerCase().includes(query)

  if (!user) {
    return (
      <div className="club-presets-container">
        <div className="container">
          <div className="empty-state">
            <h2>Clubs</h2>
            <p>Sign in to manage your club color presets</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <DataContainer
        items={clubs}
        loading={isLoading}
        skeletonVariant="club"
        error=""
        emptyState={{ title: 'No Clubs Yet', message: 'Create your first club preset to get started', actionLabel: 'Create First Club', actionOnClick: () => setIsCreatingNew(true) }}
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
            isEditing={editingClubId === club.id}
            editData={{ ...editForm[club.id], id: club.id }}
            onEdit={(c) => { setEditingClubId(c.id); setEditForm((prev) => ({ ...prev, [c.id]: { name: c.name, primaryColor: c.primaryColor, secondaryColor: c.secondaryColor, logoUrl: c.logoUrl || '' } })) }}
            onSave={(c) => { const d = editForm[c.id]; if (!d.name.trim()) { alert('Club name is required'); return }; updateMutation.mutate({ id: c.id, ...d, logoUrl: d.logoUrl || '' }) }}
            onCancel={(clubId) => { setEditingClubId(null); setEditForm((prev) => { const n = { ...prev }; delete n[clubId]; return n }) }}
            onDelete={(c) => setShowDeleteConfirm(c.id)}
            onEditFormChange={(clubId, field, value) => setEditForm((prev) => ({ ...prev, [clubId]: { ...prev[clubId], [field]: value } }))}
            onLogoClick={(clubId) => clubId ? editLogoInputRefs.current[clubId]?.click() : newLogoInputRef.current?.click()}
            onLogoRemove={(clubId) => clubId ? setEditForm((prev) => ({ ...prev, [clubId]: { ...prev[clubId], logoUrl: '' } })) : setNewClubForm((prev) => ({ ...prev, logoUrl: '' }))}
          />
        )}
        className="club-presets-container"
        gridClassName="gallery-grid"
        selectedItems={selectedClubs}
        onItemSelect={(clubId, checked) => { const n = new Set(selectedClubs); if (checked) n.add(clubId); else n.delete(clubId); setSelectedClubs(n) }}
        onSelectAll={() => setSelectedClubs(selectedClubs.size === filteredClubs.length ? new Set() : new Set(filteredClubs.map((c) => c.id)))}
        actionButtons={[
          ...(selectedClubs.size > 0 ? [{ label: 'Delete Selected', onClick: () => setShowBatchDeleteConfirm(true), variant: 'crew-danger' as const }] : []),
          { label: 'Create New Club', onClick: () => setIsCreatingNew(true), variant: 'primary' as const, disabled: isCreatingNew },
        ]}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        filteredItems={filteredClubs}
        onItemsFiltered={setFilteredClubs}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <ClubDialog
        isOpen={isCreatingNew}
        onClose={() => { setIsCreatingNew(false); setNewClubForm(defaultForm) }}
        form={newClubForm}
        onChange={(field, value) => setNewClubForm((p) => ({ ...p, [field]: value }))}
        onLogoClick={() => newLogoInputRef.current?.click()}
        onLogoDrop={(e) => handleDrop(e)}
        onLogoRemove={() => setNewClubForm((p) => ({ ...p, logoUrl: '' }))}
        onSubmit={() => createMutation.mutate({ ...newClubForm, userId: user.id })}
        isPending={createMutation.isPending}
        logoInputRef={newLogoInputRef}
        title="Create New Club"
      />

      {isCreatingNew && <input ref={newLogoInputRef} type="file" accept="image/*" onChange={(e) => handleLogoFileSelect(e)} style={{ display: 'none' }} />}
      {Object.keys(editForm).map((clubId) => <input key={clubId} ref={(el) => { editLogoInputRefs.current[clubId] = el }} type="file" accept="image/*" onChange={(e) => handleLogoFileSelect(e, clubId)} style={{ display: 'none' }} />)}

      <ConfirmDeleteModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => deleteMutation.mutate({ id: showDeleteConfirm! })} title="Delete Club" message={`Are you sure you want to delete "${filteredClubs.find((c) => c.id === showDeleteConfirm)?.name}"?`} confirmButtonText="Delete Club" />
      <ConfirmDeleteModal isOpen={showBatchDeleteConfirm} onClose={() => setShowBatchDeleteConfirm(false)} onConfirm={() => bulkDeleteMutation.mutate({ ids: Array.from(selectedClubs) })} title={selectedClubs.size === 1 ? 'Delete Club' : 'Delete Clubs'} message={selectedClubs.size === 1 ? `Are you sure you want to delete "${filteredClubs.find((c) => selectedClubs.has(c.id))?.name}"?` : `Are you sure you want to delete ${selectedClubs.size} clubs?`} confirmButtonText={selectedClubs.size === 1 ? 'Delete Club' : 'Delete Clubs'} />
    </>
  )
}
