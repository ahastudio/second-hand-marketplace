import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import ErrorAlert from '../components/ErrorAlert'
import FormField from '../components/FormField'
import { readText } from '../formData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ui } from '../ui'

export default function SignupPage() {
  useDocumentTitle('회원가입')
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/auth/signup', {
        method: 'POST',
        body: {
          email: readText(form, 'email'),
          password: readText(form, 'password'),
          nickname: readText(form, 'nickname'),
        },
      })
      navigate('/login')
    } catch (error) {
      setErrorMessage((error as Error).message)
    }
  }

  return (
    <form onSubmit={submitSignup} className={`${ui.card} mx-auto flex max-w-sm flex-col gap-5 p-6 sm:p-8`}>
      <h2 className="text-2xl font-extrabold tracking-tight">회원가입</h2>
      <FormField label="이메일">
        <input name="email" type="email" required className={ui.input} />
      </FormField>
      <FormField label="비밀번호">
        <input name="password" type="password" required minLength={8} className={ui.input} />
      </FormField>
      <FormField label="닉네임">
        <input name="nickname" required maxLength={20} className={ui.input} />
      </FormField>
      <ErrorAlert message={errorMessage} />
      <button type="submit" className={`${ui.btnPrimary} py-2.5`}>가입</button>
      <Link to="/login" className="text-center text-sm text-slate-500 hover:text-indigo-600">
        이미 계정이 있나요? 로그인
      </Link>
    </form>
  )
}
