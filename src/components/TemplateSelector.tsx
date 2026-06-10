import React from 'react'
import { trpc } from '../lib/trpc-client'
import { SkeletonGrid } from './SkeletonGrid'
import '../routes/generate.css'

interface TemplateSelectorProps {
  selectedTemplateId?: string
  onTemplateSelect: (templateId: string) => void
  className?: string
  hideTitle?: boolean
}

export function TemplateSelector({
  selectedTemplateId,
  onTemplateSelect,
  className = '',
  hideTitle = false,
}: TemplateSelectorProps) {
  const { data: templates, isLoading, error } = trpc.template.getAll.useQuery()

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <SkeletonGrid variant="generate-template" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-red-600 p-4 bg-red-50 rounded-lg">
          Error loading templates: {error.message}
        </div>
      </div>
    )
  }

  if (!templates || templates.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="text-gray-500 p-8 text-center bg-gray-50 rounded-lg">
          No templates available
        </div>
      </div>
    )
  }

  type Template = { id: string; name: string; templateType: string; previewUrl: string; isActive: boolean; metadata: any }
  const filteredTemplates = (templates ?? []) as Array<Template>

  return (
    <div className={`${className}`}>
      {!hideTitle && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Choose a Template</h3>
        </div>
      )}

      {/* Template grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`generate-template-card ${
              selectedTemplateId === template.id ? 'selected' : ''
            }`}
            onClick={() => {
              if (selectedTemplateId === template.id) {
                onTemplateSelect('')
              } else {
                onTemplateSelect(template.id)
              }
            }}
          >
            {/* Template preview */}
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              {template.previewUrl ? (
                <img
                  src={template.previewUrl}
                  alt={`${template.name} preview`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement!.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <div class="text-center">
                          <div class="text-gray-400 text-4xl mb-2">🎨</div>
                          <div class="text-gray-600 font-medium">${template.name}</div>
                        </div>
                      </div>
                    `
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <div className="text-center">
                    <div className="text-gray-400 text-4xl mb-2">🎨</div>
                    <div className="text-gray-600 font-medium">
                      {template.name}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-gray-500 p-8 text-center bg-gray-50 rounded-lg">
          No templates found
        </div>
      )}
    </div>
  )
}
