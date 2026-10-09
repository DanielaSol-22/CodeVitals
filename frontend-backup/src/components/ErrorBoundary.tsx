import { Component, type ErrorInfo, type ReactNode } from "react";

interface State { error: Error | null }

/** Evita que un fallo de render deje toda la app en blanco. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="m-8 max-w-xl rounded border border-[#C2533F] bg-[#FBEDE9] p-5 text-[#211B14]">
        <h2 className="font-serif text-lg font-bold">Esta pantalla tuvo un problema</h2>
        <p className="mt-1 text-sm text-[#6B5E44]">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 rounded bg-[#A6621F] px-4 py-2 text-sm font-semibold text-[#F3ECE0] hover:bg-[#8F5319]"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
