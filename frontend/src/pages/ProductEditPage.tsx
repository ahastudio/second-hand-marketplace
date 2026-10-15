import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../authContext'
import { useApiResource } from '../hooks/useApiResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Product } from '../products'
import ProductForm, { type ProductInput } from './ProductForm'

export default function ProductEditPage() {
  useDocumentTitle('상품 수정')
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const { resource: product, errorMessage } = useApiResource<Product>(`/api/products/${id}`)

  async function saveProduct(input: ProductInput) {
    await api<Product>(`/api/products/${id}`, { method: 'PUT', token, body: input })
    navigate(`/products/${id}`)
  }

  if (errorMessage) return <p>{errorMessage}</p>
  if (!product) return <p>불러오는 중…</p>

  return <ProductForm heading="상품 수정" submitLabel="저장" initial={product} onSubmit={saveProduct} />
}
