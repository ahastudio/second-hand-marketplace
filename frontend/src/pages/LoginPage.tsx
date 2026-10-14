import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { ui } from '../ui'
import { useDocumentTitle } from '../useDocumentTitle'

export default function LoginPage() {
  useDocumentTitle('로그인')
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      await login(String(form.get('email')), String(form.get('password')))
      navigate('/')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${ui.card} mx-auto flex max-w-sm flex-col gap-5 p-6 sm:p-8`}>
      <h2 className="text-2xl font-extrabold tracking-tight">로그인</h2>
      <label className={ui.label}>
        이메일
        <input name="email" type="email" required className={ui.input} />
      </label>
      <label className={ui.label}>
        비밀번호
        <input name="password" type="password" required className={ui.input} />
      </label>
      {error && <p role="alert" className={ui.alert}>{error}</p>}
      <button type="submit" className={`${ui.btnPrimary} py-2.5`}>로그인</button>
      <Link to="/signup" className="text-center text-sm text-slate-500 hover:text-indigo-600">아직 계정이 없나요? 회원가입</Link>
    </form>
  )
}
