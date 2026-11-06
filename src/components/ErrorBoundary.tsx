import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n'
interface Props { children: ReactNode; resetKey?: string }
/** Last line of defence: a crash shows a friendly screen, never a blank page or a raw stack trace. */
export default class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Unhandled UI error', error, info.componentStack) }
  componentDidUpdate(prev: Props) { if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false }) }
  render() {
    if (!this.state.failed) return this.props.children
    const home = import.meta.env.VITE_ROUTER === 'hash' ? '#/' : '/'
    return (
      <div role="alert" className="mx-auto mt-20 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#131839]">
        <h1 className="text-2xl font-extrabold">{t('Something went wrong.')}</h1>
        <p className="mt-2 text-muted">{t("We couldn't show this page. Your data is safe. Please try again.")}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={() => window.location.reload()} className="rounded-xl bg-brand py-3 font-bold text-white">{t('Reload page')}</button>
          <a href={home} className="rounded-xl border border-slate-300 py-3 font-bold dark:border-slate-600">{t('Go to home')}</a></div>
      </div>
    )
  }
}
