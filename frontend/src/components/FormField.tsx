import type { ReactNode } from 'react'
import { ui } from '../ui'

export default function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={ui.label}>
      {label}
      {children}
    </label>
  )
}
