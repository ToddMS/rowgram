'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc-client'
import { TemplateSelector } from '@/components/TemplateSelector'
import { SearchBar } from '@/components/SearchBar'
import '@/components/SearchBar.css'
import '@/components/Button.css'
import '@/routes/generate.css'

const scrollbarStyles = `
  .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; overflow-y: scroll !important; }
  .custom-scrollbar::-webkit-scrollbar { width: 12px; margin-left: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 6px; margin: 2px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; border: 2px solid #f1f5f9; min-height: 20px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`

function GenerateImagePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedCrewIds, setSelectedCrewIds] = useState<Array<string>>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  const [crewError, setCrewError] = useState(false)
  const [templateError, setTemplateError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredCrews, setFilteredCrews] = useState<Array<any>>([])
  const [selectedClub, setSelectedClub] = useState<string>('')
  const [selectedBoatClass, setSelectedBoatClass] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('recent')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const utils = trpc.useUtils()
  const { data: crewsRaw, isLoading: crewsLoading } = trpc.crew.getAll.useQuery()
  const { data: templatesRaw } = trpc.template.getAll.useQuery()
  const crews = crewsRaw as Array<{ id: string; name: string; clubName?: string | null; raceName?: string | null; raceDate?: string | null; boatName?: string | null; coachName?: string | null; raceCategory?: string | null; crewNames: string[]; boatCode: string; userId: string; clubId?: string | null; createdAt: Date | string; updatedAt: Date | string; club?: { id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null } | null }> | undefined

  useEffect(() => {
    const crewsParam = searchParams.get('crews')
    if (crewsParam) {
      const ids = crewsParam.split(',').filter(Boolean)
      if (ids.length > 0) setSelectedCrewIds(ids)
    }
  }, [searchParams])

  // Auto-select first crew and first template on load
  useEffect(() => {
    if (crews && crews.length > 0 && selectedCrewIds.length === 0 && !searchParams.get('crews')) {
      setSelectedCrewIds([crews[0].id])
    }
  }, [crews])

  useEffect(() => {
    if (templatesRaw && templatesRaw.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templatesRaw[0].id)
    }
  }, [templatesRaw])

  const generateImageMutation = trpc.savedImage.generate.useMutation({
    onSuccess: () => {
      setIsGenerating(false)
      utils.savedImage.getAll.invalidate()
      router.push('/gallery')
    },
    onError: (error) => {
      setIsGenerating(false)
      toast.error(`Failed to generate image: ${error.message}`)
    },
  })

  const generateBatchMutation = trpc.savedImage.generateBatch.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false)
      setGenerationProgress({ current: 0, total: 0 })
      utils.savedImage.getAll.invalidate()
      if (data.successful > 0) {
        toast.success(`Generated ${data.successful} image${data.successful === 1 ? '' : 's'}${data.failed > 0 ? `, ${data.failed} failed` : ''}`)
        router.push('/gallery')
      } else {
        toast.error(`Failed to generate any images. ${data.errors.length} error${data.errors.length === 1 ? '' : 's'} occurred.`)
      }
    },
    onError: (error) => {
      setIsGenerating(false)
      setGenerationProgress({ current: 0, total: 0 })
      toast.error(`Failed to generate batch images: ${error.message}`)
    },
  })

  const filterFunction = (crew: any, query: string) => {
    const crewName = crew.name?.toLowerCase() || ''
    const clubName = crew.club?.name.toLowerCase() || ''
    const raceName = crew.raceName?.toLowerCase() || ''
    const raceCategory = crew.raceCategory?.toLowerCase() || ''
    const crewNames = crew.crewNames?.join(' ').toLowerCase() || ''
    return crewName.includes(query) || clubName.includes(query) || raceName.includes(query) || raceCategory.includes(query) || crew.boatCode?.toLowerCase().includes(query) || crewNames.includes(query)
  }

  const uniqueClubs = Array.from(new Set(crews?.map((c) => c.club?.name).filter(Boolean))).map((club) => ({ value: club!, label: club! }))
  const uniqueBoatClasses = (() => {
    const order = ['8+', '4+', '4x', '4-', '2x', '2-', '1x']
    const available = Array.from(new Set(crews?.map((c) => c.boatCode).filter(Boolean)))
    return order.filter((bc) => available.includes(bc)).map((bc) => ({ value: bc, label: bc }))
  })()

  const handleGenerateClick = () => {
    if (!selectedCrewIds.length) {
      setCrewError(true)
      document.querySelector('[data-section="crew"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => setCrewError(false), 3000)
      return
    }
    if (!selectedTemplateId) {
      setTemplateError(true)
      document.querySelector('[data-section="template"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => setTemplateError(false), 3000)
      return
    }
    setCrewError(false)
    setTemplateError(false)
    setIsGenerating(true)
    if (selectedCrewIds.length === 1) {
      generateImageMutation.mutate({ crewId: selectedCrewIds[0], templateId: selectedTemplateId })
    } else {
      setGenerationProgress({ current: 0, total: selectedCrewIds.length })
      generateBatchMutation.mutate({ crewIds: selectedCrewIds, templateId: selectedTemplateId })
    }
  }

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="space-y-6">
            <SearchBar
              items={crews || []}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onItemsFiltered={setFilteredCrews}
              placeholder="Search crews by name, club, race, boat type..."
              filterFunction={filterFunction}
              sortOptions={[
                { value: 'recent', label: 'Recently Created', sortFn: (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() },
                { value: 'club', label: 'Club Name', sortFn: (a, b) => (a.club?.name || '').localeCompare(b.club?.name || '') },
                { value: 'race', label: 'Race Name', sortFn: (a, b) => (a.raceName || '').localeCompare(b.raceName || '') },
                { value: 'boat_class', label: 'Boat Class', sortFn: (a, b) => a.boatCode.localeCompare(b.boatCode) },
              ]}
              selectedSort={sortBy}
              onSortChange={setSortBy}
              advancedFilters={[
                { name: 'club', label: 'Club', options: [{ value: '', label: 'All Clubs' }, ...uniqueClubs], selectedValue: selectedClub, onValueChange: setSelectedClub, filterFn: (crew, value) => !value || crew.club?.name === value },
                { name: 'boatClass', label: 'Boat Class', options: [{ value: '', label: 'All Boat Classes' }, ...uniqueBoatClasses], selectedValue: selectedBoatClass, onValueChange: setSelectedBoatClass, filterFn: (crew, value) => !value || crew.boatCode === value },
              ]}
              showAdvancedFilters={showAdvancedFilters}
              onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
              resultsCount={filteredCrews.length}
              className="mb-6"
            />

            <section className="bg-white rounded-lg shadow p-6" data-section="crew">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">Select Crews</h2>
                  {selectedCrewIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{selectedCrewIds.length} crew{selectedCrewIds.length === 1 ? '' : 's'} selected</span>
                      <button onClick={() => setSelectedCrewIds([])} className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:border-red-300">Clear All</button>
                    </div>
                  )}
                </div>
                {crewError && <span className="text-red-600 text-sm font-medium animate-pulse">Please select at least one crew</span>}
              </div>

              {crewsLoading ? (
                <div className="animate-pulse"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-md" />)}</div></div>
              ) : crews && crews.length > 0 && filteredCrews.length > 0 ? (
                <div className="max-h-60 pr-4 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCrews.map((crew) => (
                      <div
                        key={crew.id}
                        className={`generate-crew-card ${selectedCrewIds.includes(crew.id) ? 'selected' : ''}`}
                        onClick={() => {
                          const isSelected = selectedCrewIds.includes(crew.id)
                          setSelectedCrewIds((prev) => isSelected ? prev.filter((id) => id !== crew.id) : [...prev, crew.id])
                          setCrewError(false)
                        }}
                      >
                        <span className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">{crew.boatCode}</span>
                        {crew.club && (
                          <div className="absolute bottom-2 right-2">
                            {crew.club.logoUrl ? <img src={crew.club.logoUrl} alt={`${crew.club.name} logo`} className="w-6 h-6 object-contain" /> : (
                              <div className="flex gap-1">
                                <div className="w-3 h-3 rounded border border-gray-300" style={{ backgroundColor: crew.club.primaryColor }} />
                                <div className="w-3 h-3 rounded border border-gray-300" style={{ backgroundColor: crew.club.secondaryColor }} />
                              </div>
                            )}
                          </div>
                        )}
                        <h3 className="font-medium text-gray-900 mb-2 text-base pr-12 -ml-1 -mt-1">{crew.boatCode === '1x' && crew.crewNames?.length > 0 ? crew.crewNames[0] : crew.name}</h3>
                        <div className="space-y-1 text-sm text-gray-600 -ml-1">
                          <p className="truncate">Race: {crew.raceName || 'No race specified'}</p>
                          {crew.raceCategory && <p className="truncate">Category: {crew.raceCategory}</p>}
                          {crew.club && <p className="truncate">Club: {crew.club.name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : crews && crews.length > 0 ? (
                <div className="text-center py-8 text-gray-500"><p>No crews match your search criteria.</p><p className="text-sm mt-2">Try adjusting your search or filters.</p></div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No crews found. Create a crew first to generate images.</p>
                  <a href="/crews" className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">Go to Crews →</a>
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg shadow p-6" data-section="template">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Choose a Template</h3>
                {templateError && <span className="text-red-600 text-sm font-medium animate-pulse">Please select a template</span>}
              </div>
              <TemplateSelector selectedTemplateId={selectedTemplateId} onTemplateSelect={(id) => { setSelectedTemplateId(id); setTemplateError(false) }} hideTitle={true} />
            </section>

            <div className="flex justify-center mt-6">
              <button onClick={handleGenerateClick} disabled={isGenerating} className={`px-8 py-3 rounded-lg font-medium transition-colors ${isGenerating ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {generationProgress.total > 1 ? `Generating ${generationProgress.current}/${generationProgress.total} images...` : selectedCrewIds.length > 1 ? `Generating ${selectedCrewIds.length} images...` : 'Generating...'}
                  </div>
                ) : selectedCrewIds.length > 1 ? `Generate ${selectedCrewIds.length} Images` : selectedCrewIds.length === 1 ? 'Generate Image' : 'Generate Images'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function GenerateImagePage() {
  return (
    <Suspense>
      <GenerateImagePageContent />
    </Suspense>
  )
}
