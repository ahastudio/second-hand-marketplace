import { useState, type FormEvent } from 'react'
import { ui } from '../ui'

export interface ProductInput {
  title: string
  description: string
  price: number
}

interface Props {
  heading: string
  submitLabel: string
  initial?: ProductInput
  onSubmit: (input: ProductInput) => Promise<void>
}

export default function ProductForm({ heading, submitLabel, initial, onSubmit }: Props) {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      await onSubmit({
        title: String(form.get('title')),
        description: String(form.get('description')),
        price: Number(form.get('price')),
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${ui.card} mx-auto flex max-w-xl flex-col gap-5 p-6 sm:p-8`}>
      <h2 className="text-2xl font-extrabold tracking-tight">{heading}</h2>
      <label className={ui.label}>
        제목
        <input name="title" required maxLength={100} defaultValue={initial?.title} className={ui.input} />
      </label>
      <label className={ui.label}>
        설명
        <textarea name="description" maxLength={2000} rows={6} defaultValue={initial?.description} className={`${ui.input} resize-y`} />
      </label>
      <label className={ui.label}>
        가격
        <input name="price" type="number" min={0} required defaultValue={initial?.price} className={ui.input} />
      </label>
      {error && <p role="alert" className={ui.alert}>{error}</p>}
      <button type="submit" className={`${ui.btnPrimary} py-2.5`}>{submitLabel}</button>
    </form>
  )
}
