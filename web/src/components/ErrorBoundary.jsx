import { Component } from 'react'

// Keeps a crash in one screen from blanking the whole app.
export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('UI error:', error, info.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Something went wrong on this screen.</p>
          <p className="mt-1 text-sm text-slate-500">{String(this.state.error.message || this.state.error)}</p>
          <button onClick={() => location.reload()} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Reload</button>
        </div>
      </div>
    )
  }
}
