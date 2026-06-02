'use client'

import { useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/lib/auth-context'
import { DataContainer } from '@/components/DataContainer'
import { ClubCard } from '@/components/ClubCard'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { Modal } from '@/components/Modal'
import '@/routes/clubs.css'

interface ClubFormData {
  name: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
}

const defaultForm: ClubFormData = { name: '', primaryColor: '#2563eb', secondaryColor: '#1e40af', logoUrl: '' }

export default function ClubsPage() {
  const { user } = useAuth()
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [editingClubId, setEditingClubId] = useState<string | null>(null)
  const [newClubForm, setNewClubForm] = useState<ClubFormData>(defaultForm)
  const [editForm, setEditForm] = useState<Record<string, ClubFormData>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
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
        sortBy="name"
        onSortChange={() => {}}
      />

      <Modal isOpen={isCreatingNew} onClose={() => { setIsCreatingNew(false); setNewClubForm(defaultForm) }} title="Create New Club" maxWidth="600px" className="club-modal">
        <div className="club-form">
          <div className="form-group">
            <label htmlFor="club-name">Club Name *</label>
            <input id="club-name" type="text" value={newClubForm.name} onChange={(e) => setNewClubForm((p) => ({ ...p, name: e.target.value }))} placeholder="Enter club name" className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Primary Color *</label>
              <div className="color-input-group">
                <input type="color" value={newClubForm.primaryColor} onChange={(e) => setNewClubForm((p) => ({ ...p, primaryColor: e.target.value }))} className="color-input" />
                <input type="text" value={newClubForm.primaryColor} onChange={(e) => setNewClubForm((p) => ({ ...p, primaryColor: e.target.value }))} placeholder="#000000" className="color-text-input" />
              </div>
            </div>
            <div className="form-group">
              <label>Secondary Color *</label>
              <div className="color-input-group">
                <input type="color" value={newClubForm.secondaryColor} onChange={(e) => setNewClubForm((p) => ({ ...p, secondaryColor: e.target.value }))} className="color-input" />
                <input type="text" value={newClubForm.secondaryColor} onChange={(e) => setNewClubForm((p) => ({ ...p, secondaryColor: e.target.value }))} placeholder="#000000" className="color-text-input" />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>Club Logo (Optional)</label>
            <div className="logo-upload-area" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e)} onClick={() => newLogoInputRef.current?.click()}>
              {newClubForm.logoUrl ? (
                <div className="logo-preview">
                  <img src={newClubForm.logoUrl} alt="Club logo preview" />
                  <button className="logo-remove-btn" onClick={(e) => { e.stopPropagation(); setNewClubForm((p) => ({ ...p, logoUrl: '' })) }}>✕</button>
                </div>
              ) : (
                <div className="logo-upload-placeholder">
                  <p>Click or drag image here</p>
                  <span>Max 2MB</span>
                </div>
              )}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setIsCreatingNew(false); setNewClubForm(defaultForm) }}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => { if (!newClubForm.name.trim()) { alert('Club name is required'); return }; createMutation.mutate({ ...newClubForm, userId: user.id }) }} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Club'}</button>
          </div>
        </div>
      </Modal>

      {isCreatingNew && <input ref={newLogoInputRef} type="file" accept="image/*" onChange={(e) => handleLogoFileSelect(e)} style={{ display: 'none' }} />}
      {Object.keys(editForm).map((clubId) => <input key={clubId} ref={(el) => { editLogoInputRefs.current[clubId] = el }} type="file" accept="image/*" onChange={(e) => handleLogoFileSelect(e, clubId)} style={{ display: 'none' }} />)}

      <ConfirmDeleteModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => deleteMutation.mutate({ id: showDeleteConfirm! })} title="Delete Club" message={`Are you sure you want to delete "${filteredClubs.find((c) => c.id === showDeleteConfirm)?.name}"?`} confirmButtonText="Delete Club" />
      <ConfirmDeleteModal isOpen={showBatchDeleteConfirm} onClose={() => setShowBatchDeleteConfirm(false)} onConfirm={() => bulkDeleteMutation.mutate({ ids: Array.from(selectedClubs) })} title={selectedClubs.size === 1 ? 'Delete Club' : 'Delete Clubs'} message={selectedClubs.size === 1 ? `Are you sure you want to delete "${filteredClubs.find((c) => selectedClubs.has(c.id))?.name}"?` : `Are you sure you want to delete ${selectedClubs.size} clubs?`} confirmButtonText={selectedClubs.size === 1 ? 'Delete Club' : 'Delete Clubs'} />
    </>
  )
}
