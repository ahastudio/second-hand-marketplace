import { Link, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductEditPage from './pages/ProductEditPage'
import ProductFormPage from './pages/ProductFormPage'
import SignupPage from './pages/SignupPage'
import RequireAuth from './RequireAuth'
import { ui } from './ui'

function Header() {
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <h1 className="text-xl font-extrabold tracking-tight text-indigo-600">
          <Link to="/">중고거래 마켓</Link>
        </h1>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/products/new" className={ui.btnPrimary}>상품 등록</Link>
              <span
                data-testid="header-nickname"
                className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700"
              >
                {user.nickname}
              </span>
              <button type="button" onClick={logout} className={ui.btnGhost}>로그아웃</button>
            </>
          ) : (
            <>
              <Link to="/login" className={ui.btnGhost}>로그인</Link>
              <Link to="/signup" className={ui.btnPrimary}>회원가입</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

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
