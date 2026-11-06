import { lazy, Suspense } from 'react'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import { GuestOnly, RequireRole } from './components/RouteGuards'
import PublicHome from './pages/PublicHome'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import SavedJobsPage from './pages/SavedJobsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import MessagesPage from './pages/MessagesPage'
import NotificationsPage from './pages/NotificationsPage'
import NotFoundPage from './pages/NotFoundPage'
import { AuthProvider } from './context/AuthContext'
import { SeekerProvider } from './context/SeekerContext'
import { ToastProvider } from './context/ToastContext'
import I18nBoundary from './i18n/I18nBoundary'
import ErrorBoundary from './components/ErrorBoundary'
import { titleFor } from './utils/titles'

// Role-specific areas load on demand so seekers never download admin code.
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const EmployerDashboardPage = lazy(() => import('./pages/EmployerDashboardPage'))
const EmployerCoveragePage = lazy(() => import('./pages/EmployerCoveragePage'))
const EmployerJobsPage = lazy(() => import('./pages/EmployerJobsPage'))
const EmployerApplicationsPage = lazy(() => import('./pages/EmployerApplicationsPage'))
const CompanyPage = lazy(() => import('./pages/CompanyPage'))
const JobWizardPage = lazy(() => import('./pages/JobWizardPage'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const AdminModerationPage = lazy(() => import('./pages/admin/AdminModerationPage'))
const AdminReviewPage = lazy(() => import('./pages/admin/AdminReviewPage'))
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'))
const AdminJobsPage = lazy(() => import('./pages/admin/AdminJobsPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const Fallback = () => <div className="mx-auto max-w-5xl p-5"><div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /></div>

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { document.title = titleFor(pathname) }, [pathname])
  return (
    <ToastProvider><AuthProvider><SeekerProvider><ErrorBoundary resetKey={pathname}>
      <I18nBoundary><Suspense fallback={<Fallback />}><Routes>
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<RequireRole roles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminPage />} /><Route path="/admin/moderation" element={<AdminModerationPage />} /><Route path="/admin/moderation/:id" element={<AdminReviewPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} /><Route path="/admin/jobs" element={<AdminJobsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} /><Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          </Route>
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PublicHome />} />
          <Route element={<RequireRole roles={['seeker']} allowIncomplete />}><Route path="/onboarding" element={<OnboardingPage />} /></Route>
          <Route element={<RequireRole roles={['seeker']} />}>
            <Route path="/dashboard" element={<DashboardPage />} /><Route path="/jobs" element={<JobsPage />} /><Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/saved" element={<SavedJobsPage />} /><Route path="/applications" element={<ApplicationsPage />} /><Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="/messages" element={<MessagesPage />} /><Route path="/notifications" element={<NotificationsPage />} /><Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route element={<RequireRole roles={['employer']} />}>
            <Route path="/employer" element={<EmployerDashboardPage />} />
            <Route path="/employer/jobs" element={<EmployerJobsPage />} /><Route path="/employer/jobs/new" element={<JobWizardPage />} /><Route path="/employer/jobs/:id/edit" element={<JobWizardPage />} /><Route path="/employer/jobs/:id" element={<EmployerCoveragePage />} />
            <Route path="/employer/candidates" element={<EmployerCoveragePage />} /><Route path="/employer/applications" element={<EmployerApplicationsPage />} />
            <Route path="/employer/messages" element={<MessagesPage />} /><Route path="/employer/notifications" element={<NotificationsPage />} /><Route path="/employer/company" element={<CompanyPage />} />
          </Route>
          <Route element={<RequireRole roles={['seeker', 'employer']} />}><Route path="/settings" element={<SettingsPage />} /></Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes></Suspense></I18nBoundary>
    </ErrorBoundary></SeekerProvider></AuthProvider></ToastProvider>
  )
}
