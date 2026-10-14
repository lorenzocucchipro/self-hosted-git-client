import React, { type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode | ((error: Error) => ReactNode)
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render(): ReactNode {
    const { error } = this.state
    const { children, fallback } = this.props
    if (!error) return children
    const content = typeof fallback === 'function' ? fallback(error) : fallback
    return (
      <div className="flex-1 flex items-center justify-center bg-app-bg text-app-muted text-[13px] p-4 min-h-0 overflow-hidden">
        {content}
      </div>
    )
  }
}
