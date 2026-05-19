interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <h3>{message}</h3>
    </div>
  )
}