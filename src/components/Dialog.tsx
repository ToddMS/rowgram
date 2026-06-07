import type { ReactNode } from 'react'
import './Dialog.css'

interface Step {
  label: string
}

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer: ReactNode
  size?: 'sm' | 'md'
  steps?: Array<Step>
  currentStep?: number
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  steps,
  currentStep = 0,
}: DialogProps) {
  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className={`dialog dialog--${size}`} onClick={(e) => e.stopPropagation()}>

        <div className="dialog-header">
          <h2 className="dialog-title">{title}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {steps && steps.length > 1 && (
          <div className="dialog-stepper">
            {steps.map((step, index) => (
              <div key={step.label} className="dialog-step-wrapper">
                <div className={`dialog-step ${index < currentStep ? 'completed' : index === currentStep ? 'active' : 'inactive'}`}>
                  <div className="dialog-step-circle">
                    {index < currentStep ? (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="2,6 5,9 10,3" />
                      </svg>
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className="dialog-step-label">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`dialog-step-connector ${index < currentStep ? 'completed' : ''}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="dialog-body">
          {children}
        </div>

        <div className="dialog-footer">
          {footer}
        </div>

      </div>
    </div>
  )
}
