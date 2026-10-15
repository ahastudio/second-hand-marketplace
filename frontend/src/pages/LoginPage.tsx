import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ErrorAlert from '../components/ErrorAlert'
import FormField from '../components/FormField'
import { useAuth } from '../authContext'
import { readText } from '../formData'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ui } from '../ui'

export default function LoginPage() {
  useDocumentTitle('로그인')
  const { login } = useAuth()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await login(readText(form, 'email'), readText(form, 'password'))
      navigate('/')
    } catch (error) {
      setErrorMessage((error as Error).message)
    }
  }

  return (
    <form onSubmit={submitLogin} className={`${ui.card} mx-auto flex max-w-sm flex-col gap-5 p-6 sm:p-8`}>
      <h2 className="text-2xl font-extrabold tracking-tight">로그인</h2>
      <FormField label="이메일">
        <input name="email" type="email" required className={ui.input} />
      </FormField>
      <FormField label="비밀번호">
        <input name="password" type="password" required className={ui.input} />
      </FormField>
      <ErrorAlert message={errorMessage} />
      <button type="submit" className={`${ui.btnPrimary} py-2.5`}>로그인</button>
      <Link to="/signup" className="text-center text-sm text-slate-500 hover:text-indigo-600">
        아직 계정이 없나요? 회원가입
      </Link>
    </form>
  )
}
