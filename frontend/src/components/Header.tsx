import { Link } from 'react-router-dom'
import { useAuth } from '../authContext'
import { ui } from '../ui'

function MemberMenu({ nickname, onLogout }: { nickname: string; onLogout: () => void }) {
  return (
    <>
      <Link to="/products/new" className={ui.btnPrimary}>상품 등록</Link>
      <span
        data-testid="header-nickname"
        className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700"
      >
        {nickname}
      </span>
      <button type="button" onClick={onLogout} className={ui.btnGhost}>로그아웃</button>
    </>
  )
}

function VisitorMenu() {
  return (
    <>
      <Link to="/login" className={ui.btnGhost}>로그인</Link>
      <Link to="/signup" className={ui.btnPrimary}>회원가입</Link>
    </>
  )
}

export default function Header() {
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <h1 className="text-xl font-extrabold tracking-tight text-indigo-600">
          <Link to="/">중고거래 마켓</Link>
        </h1>
        <nav className="flex items-center gap-2">
          {user ? <MemberMenu nickname={user.nickname} onLogout={logout} /> : <VisitorMenu />}
        </nav>
      </div>
    </header>
  )
}
