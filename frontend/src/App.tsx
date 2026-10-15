import { Route, Routes } from 'react-router-dom'
import AuthProvider from './AuthProvider'
import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductEditPage from './pages/ProductEditPage'
import ProductFormPage from './pages/ProductFormPage'
import SignupPage from './pages/SignupPage'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/products/new" element={<RequireAuth><ProductFormPage /></RequireAuth>} />
            <Route path="/products/:id/edit" element={<RequireAuth><ProductEditPage /></RequireAuth>} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
