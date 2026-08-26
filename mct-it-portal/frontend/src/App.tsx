import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { ROUTES_BY_ROLE } from './constants/routes'
import Layout from './components/layout/Layout'

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NewRequestPage = lazy(() => import('./pages/NewRequestPage'))
const RequestDetailPage = lazy(() => import('./pages/RequestDetailPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const TreasuryDashboardPage = lazy(() => import('./pages/TreasuryDashboardPage'))
const MoyensGenerauxDashboardPage = lazy(() => import('./pages/MoyensGenerauxDashboardPage'))
const ReportingPage = lazy(() => import('./pages/ReportingPage'))
const DelegationsPage = lazy(() => import('./pages/DelegationsPage'))
const DocumentCenterPage = lazy(() => import('./pages/DocumentCenterPage'))
const ObligationsPage = lazy(() => import('./pages/ObligationsPage'))

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-spin" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route path="/verify/:token" element={<VerifyEmailPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="new-request" element={<NewRequestPage />} />
        <Route path="requests/:id/edit" element={<NewRequestPage />} />
        <Route path="requests/:id" element={<RequestDetailPage />} />
        <Route path="delegations" element={<DelegationsPage />} />
        <Route path="documents" element={<DocumentCenterPage />} />
        <Route path="obligations" element={<ObligationsPage />} />


        <Route
          path="reporting"
          element={
            <ProtectedRoute allowedRoles={ROUTES_BY_ROLE['/reporting']}>
              <ReportingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={ROUTES_BY_ROLE['/admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="treasury"
          element={
            <ProtectedRoute allowedRoles={ROUTES_BY_ROLE['/treasury']}>
              <TreasuryDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="moyens-generaux"
          element={
            <ProtectedRoute allowedRoles={ROUTES_BY_ROLE['/moyens-generaux']}>
              <MoyensGenerauxDashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
