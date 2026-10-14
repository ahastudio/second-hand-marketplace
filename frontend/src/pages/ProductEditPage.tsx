import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Product } from '../products'
import { useDocumentTitle } from '../useDocumentTitle'
import ProductForm from './ProductForm'

export default function ProductEditPage() {
  useDocumentTitle('상품 수정')
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<Product>(`/api/products/${id}`)
      .then((p) => !cancelled && setProduct(p))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) return <p>{error}</p>
  if (!product) return <p>불러오는 중…</p>

  return (
    <ProductForm
      heading="상품 수정"
      submitLabel="저장"
      initial={product}
      onSubmit={async (body) => {
        await api<Product>(`/api/products/${id}`, { method: 'PUT', token, body })
        navigate(`/products/${id}`)
      }}
    />
  )
}
