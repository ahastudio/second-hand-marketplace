import { ui } from '../ui'

export default function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null
  return <p role="alert" className={ui.alert}>{message}</p>
}
