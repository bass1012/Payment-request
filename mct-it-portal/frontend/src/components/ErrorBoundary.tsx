import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="max-w-md w-full text-center">
            <div className="text-4xl mb-4">💥</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {this.props.fallbackTitle || 'Une erreur est survenue'}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              L'application a rencontré un problème inattendu. Vous pouvez essayer de recharger
              cette page ou revenir à l'accueil.
            </p>
            {this.state.error && (
              <details className="text-left mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 font-mono overflow-auto max-h-32">
                <summary className="cursor-pointer text-gray-700 font-medium mb-1">
                  Détails de l'erreur
                </summary>
                <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
              </details>
            )}
            <div className="flex justify-center gap-3">
              <button onClick={this.handleReset} className="btn-secondary text-sm">
                Réessayer
              </button>
              <button onClick={this.handleGoHome} className="btn-primary text-sm">
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
