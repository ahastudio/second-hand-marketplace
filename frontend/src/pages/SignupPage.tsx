import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ui } from '../ui'
import { useDocumentTitle } from '../useDocumentTitle'

export default function SignupPage() {
  useDocumentTitle('회원가입')
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      await api('/api/auth/signup', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password'), nickname: form.get('nickname') },
      })
      navigate('/login')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${ui.card} mx-auto flex max-w-sm flex-col gap-5 p-6 sm:p-8`}>
      <h2 className="text-2xl font-extrabold tracking-tight">회원가입</h2>
      <label className={ui.label}>
        이메일
        <input name="email" type="email" required className={ui.input} />
      </label>
      <label className={ui.label}>
        비밀번호
        <input name="password" type="password" required minLength={8} className={ui.input} />
      </label>
      <label className={ui.label}>
        닉네임
        <input name="nickname" required maxLength={20} className={ui.input} />
      </label>
      {error && <p role="alert" className={ui.alert}>{error}</p>}
      <button type="submit" className={`${ui.btnPrimary} py-2.5`}>가입</button>
      <Link to="/login" className="text-center text-sm text-slate-500 hover:text-indigo-600">이미 계정이 있나요? 로그인</Link>
    </form>
  )
}
