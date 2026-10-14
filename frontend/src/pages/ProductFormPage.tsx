import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Product } from '../products'
import { useDocumentTitle } from '../useDocumentTitle'
import ProductForm from './ProductForm'

export default function ProductFormPage() {
  useDocumentTitle('상품 등록')
  const { token } = useAuth()
  const navigate = useNavigate()

  return (
    <ProductForm
      heading="상품 등록"
      submitLabel="등록"
      onSubmit={async (body) => {
        const created = await api<Product>('/api/products', { method: 'POST', token, body })
        navigate(`/products/${created.id}`)
      }}
    />
  )
}
