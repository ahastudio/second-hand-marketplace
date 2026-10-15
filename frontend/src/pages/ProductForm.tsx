import { useState, type FormEvent } from 'react'
import ErrorAlert from '../components/ErrorAlert'
import FormField from '../components/FormField'
import { readText } from '../formData'
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await onSubmit({
        title: readText(form, 'title'),
        description: readText(form, 'description'),
        price: Number(form.get('price')),
      })
    } catch (error) {
      setErrorMessage((error as Error).message)
    }
  }

  return (
    <form onSubmit={submitForm} className={`${ui.card} mx-auto flex max-w-xl flex-col gap-5 p-6 sm:p-8`}>
      <h2 className="text-2xl font-extrabold tracking-tight">{heading}</h2>
      <FormField label="제목">
        <input name="title" required maxLength={100} defaultValue={initial?.title} className={ui.input} />
      </FormField>
      <FormField label="설명">
        <textarea
          name="description"
          maxLength={2000}
          rows={6}
          defaultValue={initial?.description}
          className={`${ui.input} resize-y`}
        />
      </FormField>
      <FormField label="가격">
        <input name="price" type="number" min={0} required defaultValue={initial?.price} className={ui.input} />
      </FormField>
      <ErrorAlert message={errorMessage} />
      <button type="submit" className={`${ui.btnPrimary} py-2.5`}>{submitLabel}</button>
    </form>
  )
}
