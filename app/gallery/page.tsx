'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { DataContainer } from '@/components/DataContainer'
import { ImageCard } from '@/components/ImageCard'
import { BatchDownloadModal } from '@/components/BatchDownloadModal'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import '@/routes/gallery.css'
import '@/routes/crews.css'

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
    boatCode: string
    userId: string
    clubId?: string | null
    createdAt: Date | string
    updatedAt: Date | string
    club?: { id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null; createdAt: Date | string; updatedAt: Date | string; userId: string } | null
  }
  template?: { id: string; name: string; templateType: string; previewUrl: string; isActive: boolean; metadata: any; createdAt: Date | string; updatedAt: Date | string }
}

export default function GalleryPage() {
  const [filteredImages, setFilteredImages] = useState<Array<SavedImage>>([])
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClub, setSelectedClub] = useState<string>('')
  const [selectedBoatType, setSelectedBoatType] = useState<string>('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [sortBy, setSortBy] = useState<'recent' | 'club' | 'boat' | 'name'>('recent')
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchAnalysisData, setBatchAnalysisData] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<SavedImage | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)

  const utils = trpc.useUtils()
  const { data: savedImagesRaw = [], isLoading: loading } = trpc.savedImage.getAll.useQuery()
  const savedImages = savedImagesRaw as unknown as Array<SavedImage>

  const deleteImageMutation = trpc.savedImage.delete.useMutation({ onSuccess: () => utils.savedImage.getAll.invalidate() })
  const downloadWithCoverMutation = trpc.savedImage.downloadWithCover.useMutation()
  const batchDownloadMutation = trpc.savedImage.batchDownload.useMutation()

  const downloadZip = async (zipData: string, filename: string) => {
    const bytes = new Uint8Array(atob(zipData).split('').map((c) => c.charCodeAt(0)))
    const blob = new Blob([bytes], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const handleDownload = async (image: SavedImage) => {
    try {
      const result = await downloadWithCoverMutation.mutateAsync({ savedImageId: image.id })
      await downloadZip(result.zipData, result.filename)
    } catch (err) {
      console.error('Error downloading image:', err)
    }
  }

  const handleBatchDownload = async () => {
    if (selectedImages.size === 0) return
    try {
      const result = await batchDownloadMutation.mutateAsync({ savedImageIds: Array.from(selectedImages), mode: 'auto' })
      if ('requiresUserChoice' in result && result.requiresUserChoice) { setBatchAnalysisData(result.analysisData); setShowBatchModal(true); return }
      if ('downloads' in result && result.downloads) {
        for (const dl of result.downloads) {
          await downloadZip(dl.zipData, dl.filename)
          if (result.downloads.length > 1) await new Promise((r) => setTimeout(r, 500))
        }
      }
      setSelectedImages(new Set())
    } catch (err) {
      console.error('Error in batch download:', err)
    }
  }

  const handleModalProceed = async (mode: 'all-together' | 'by-race' | 'by-club' | 'by-club-race' | 'covers-only' | 'images-only') => {
    try {
      const result = await batchDownloadMutation.mutateAsync({ savedImageIds: Array.from(selectedImages), mode })
      if ('downloads' in result && result.downloads) {
        for (const dl of result.downloads) {
          await downloadZip(dl.zipData, dl.filename)
          if (result.downloads.length > 1) await new Promise((r) => setTimeout(r, 500))
        }
      }
      setSelectedImages(new Set())
    } catch (err) {
      console.error('Error in modal download:', err)
    }
  }

  const confirmDeleteImage = async (image: SavedImage) => {
    await deleteImageMutation.mutateAsync({ id: image.id })
    setShowDeleteConfirm(null)
  }

  const confirmBatchDelete = async () => {
    for (const image of savedImages.filter((img) => selectedImages.has(img.id))) {
      await deleteImageMutation.mutateAsync({ id: image.id })
    }
    setSelectedImages(new Set()); setShowBatchDeleteConfirm(false)
  }

  const uniqueClubs = Array.from(new Set(savedImages.map((img) => img.crew?.club?.name || img.crew?.clubName).filter((n): n is string => Boolean(n)))).map((c) => ({ value: c, label: c }))
  const uniqueBoatTypes = Array.from(new Set(savedImages.map((img) => img.crew?.boatCode).filter((c): c is string => Boolean(c)))).map((c) => ({ value: c, label: c }))

  const filterFunction = (image: SavedImage, query: string) => {
    const crewName = image.crew?.name.toLowerCase() || ''
    const clubName = (image.crew?.club?.name || image.crew?.clubName)?.toLowerCase() || ''
    const raceName = image.crew?.raceName?.toLowerCase() || ''
    const boatType = image.crew?.boatCode?.toLowerCase() || ''
    const rowerNames = image.crew?.crewNames.join(' ').toLowerCase() || ''
    return crewName.includes(query) || clubName.includes(query) || raceName.includes(query) || boatType.includes(query) || rowerNames.includes(query)
  }

  const dateRangeValue = dateRange.start || dateRange.end ? `${dateRange.start}|${dateRange.end}` : ''
  const dateRangeOptions = [
    { value: '', label: 'Any Date' },
    { value: `${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}|`, label: 'Last 7 days' },
    { value: `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}|`, label: 'Last 30 days' },
    { value: `${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}|`, label: 'Last 3 months' },
  ]

  const crewName = (img: SavedImage) => {
    if (img.crew?.boatCode === '1x') return img.crew.crewNames[0] || img.crew.name || 'this image'
    return img.crew?.name || 'this image'
  }

  return (
    <>
      <DataContainer
        items={savedImages}
        loading={loading}
        skeletonVariant="gallery"
        error=""
        emptyState={{ title: 'No Images Yet', message: 'Start creating beautiful crew images by generating your first image', actionLabel: 'Generate Your First Image', actionHref: '/generate' }}
        searchConfig={{
          placeholder: 'Search images...',
          filterFunction,
          sortOptions: [
            { value: 'recent', label: 'Latest', sortFn: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() },
            { value: 'club', label: 'Club A→Z', sortFn: (a, b) => (a.crew?.club?.name || a.crew?.clubName || '').localeCompare(b.crew?.club?.name || b.crew?.clubName || '') },
            { value: 'boat', label: 'Boat Type', sortFn: (a, b) => (a.crew?.boatCode || '').localeCompare(b.crew?.boatCode || '') },
            { value: 'name', label: 'Crew Name', sortFn: (a, b) => (a.crew?.name || '').localeCompare(b.crew?.name || '') },
          ],
          advancedFilters: [
            { name: 'club', label: 'Club', options: [{ value: '', label: 'All Clubs' }, ...uniqueClubs], selectedValue: selectedClub, onValueChange: setSelectedClub, filterFn: (image, value) => !value || (image.crew?.club?.name || image.crew?.clubName) === value },
            { name: 'boatType', label: 'Boat', options: [{ value: '', label: 'All Boats' }, ...uniqueBoatTypes], selectedValue: selectedBoatType, onValueChange: setSelectedBoatType, filterFn: (image, value) => !value || image.crew?.boatCode === value },
            { name: 'dateRange', label: 'Date', options: dateRangeOptions, selectedValue: dateRangeValue, onValueChange: (v) => { if (!v) { setDateRange({ start: '', end: '' }) } else { const [s, e] = v.split('|'); setDateRange({ start: s || '', end: e || '' }) } }, filterFn: (image, value) => { if (!value) return true; const [s, e] = value.split('|'); const d = new Date(image.createdAt); if (s && d < new Date(s)) return false; if (e && d > new Date(e)) return false; return true } },
          ],
        }}
        renderCard={(image, isSelected, onSelect) => <ImageCard image={image} isSelected={isSelected} onSelect={onSelect} onDownload={handleDownload} onDelete={(img) => setShowDeleteConfirm(img)} />}
        className="gallery-container"
        gridClassName="gallery-grid"
        selectedItems={selectedImages}
        onItemSelect={(id) => { const n = new Set(selectedImages); if (n.has(id)) n.delete(id); else n.add(id); setSelectedImages(n) }}
        onSelectAll={() => setSelectedImages(selectedImages.size === filteredImages.length ? new Set() : new Set(filteredImages.map((img) => img.id)))}
        actionButtons={[
          ...(selectedImages.size > 0 ? [
            { label: 'Delete Selected', onClick: () => setShowBatchDeleteConfirm(true), variant: 'crew-danger' as const },
            { label: 'Download Selected', onClick: handleBatchDownload, variant: 'crew-secondary' as const },
          ] : []),
          { label: 'Generate New Image', onClick: () => { window.location.href = '/generate' }, variant: 'primary' as const },
        ]}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredItems={filteredImages}
        onItemsFiltered={setFilteredImages}
        sortBy={sortBy}
        onSortChange={(s) => setSortBy(s as 'recent' | 'club' | 'boat' | 'name')}
        showAdvancedFilters={showAdvancedSearch}
        onToggleAdvancedFilters={() => setShowAdvancedSearch(!showAdvancedSearch)}
      />

      {batchAnalysisData && <BatchDownloadModal isOpen={showBatchModal} onClose={() => { setShowBatchModal(false); setBatchAnalysisData(null) }} onProceed={handleModalProceed} analysisData={batchAnalysisData} />}
      <ConfirmDeleteModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => confirmDeleteImage(showDeleteConfirm!)} title="Delete Image" message={`Are you sure you want to delete "${showDeleteConfirm ? crewName(showDeleteConfirm) : ''}"?`} confirmButtonText="Delete Image" />
      <ConfirmDeleteModal isOpen={showBatchDeleteConfirm} onClose={() => setShowBatchDeleteConfirm(false)} onConfirm={confirmBatchDelete} title={selectedImages.size === 1 ? 'Delete Image' : 'Delete Images'} message={selectedImages.size === 1 ? `Are you sure you want to delete "${filteredImages.find((img) => selectedImages.has(img.id)) ? crewName(filteredImages.find((img) => selectedImages.has(img.id))!) : ''}"?` : `Are you sure you want to delete ${selectedImages.size} images?`} confirmButtonText={selectedImages.size === 1 ? 'Delete Image' : 'Delete Images'} />
    </>
  )
}
