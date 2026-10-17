import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CodeVitals: error de interfaz', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="rounded-xl border border-risk-high-bar bg-risk-high-bg p-6 text-sm text-risk-high-fg">
        <h2 className="mb-1 font-semibold">Esta pantalla no se pudo mostrar</h2>
        <p className="mb-4 text-[13px]">Los demás datos siguen disponibles. Vuelve a intentarlo o cambia de sección.</p>
        <button onClick={() => this.setState({ error: null })} className="cv-btn">Reintentar</button>
      </div>
    )
  }
}
