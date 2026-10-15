import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../authContext'
import ErrorAlert from '../components/ErrorAlert'
import SellerControls from '../components/SellerControls'
import StatusBadge from '../components/StatusBadge'
import { useApiResource } from '../hooks/useApiResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatPrice, type Product, type ProductStatus } from '../products'
import { ui } from '../ui'

function LoadFailure({ message }: { message: string }) {
  return (
    <div className={`${ui.card} flex flex-col items-center gap-3 py-16 text-center`}>
      <p className="font-semibold text-slate-700">{message}</p>
      <Link to="/" className={ui.btnSecondary}>목록으로 돌아가기</Link>
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const { resource: product, setResource: setProduct, errorMessage } = useApiResource<Product>(`/api/products/${id}`)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)

  useDocumentTitle(product?.title ?? errorMessage ?? undefined)

  async function deleteProduct() {
    if (!window.confirm('이 상품을 삭제할까요?')) return
    try {
      await api(`/api/products/${id}`, { method: 'DELETE', token })
      navigate('/')
    } catch (error) {
      setActionErrorMessage((error as Error).message)
    }
  }

  async function changeStatus(status: ProductStatus) {
    setActionErrorMessage(null)
    try {
      setProduct(await api<Product>(`/api/products/${id}/status`, { method: 'PATCH', token, body: { status } }))
    } catch (error) {
      setActionErrorMessage((error as Error).message)
    }
  }

  if (errorMessage) return <LoadFailure message={errorMessage} />
  if (!product) return <p className="animate-pulse text-slate-400">불러오는 중…</p>

  const isSeller = user?.id === product.seller.id

  return (
    <div className="flex flex-col gap-4">
      <Link to="/" className="text-sm font-medium text-slate-500 hover:text-indigo-600">← 목록</Link>
      <article className={`${ui.card} flex flex-col gap-5 p-6 sm:p-8`}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight">{product.title}</h2>
          <StatusBadge status={product.status} testId="product-status" />
        </div>
        <p data-testid="product-price" className="text-3xl font-extrabold text-indigo-600">
          {formatPrice(product.price)}
        </p>
        <p className="min-h-16 whitespace-pre-wrap leading-relaxed text-slate-700">{product.description}</p>
        <p className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span>판매자</span>
          <span data-testid="product-seller" className="font-semibold text-slate-700">{product.seller.nickname}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={product.createdAt}>{new Date(product.createdAt).toLocaleDateString('ko-KR')}</time>
        </p>
        {isSeller && <SellerControls product={product} onStatusChange={changeStatus} onDelete={deleteProduct} />}
        <ErrorAlert message={actionErrorMessage} />
      </article>
    </div>
  )
}
