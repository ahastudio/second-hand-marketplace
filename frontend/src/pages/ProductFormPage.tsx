import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../authContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Product } from '../products'
import ProductForm, { type ProductInput } from './ProductForm'

export default function ProductFormPage() {
  useDocumentTitle('상품 등록')
  const { token } = useAuth()
  const navigate = useNavigate()

  async function registerProduct(input: ProductInput) {
    const created = await api<Product>('/api/products', { method: 'POST', token, body: input })
    navigate(`/products/${created.id}`)
  }

  return <ProductForm heading="상품 등록" submitLabel="등록" onSubmit={registerProduct} />
}
