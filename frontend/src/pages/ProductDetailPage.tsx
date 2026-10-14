import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { formatPrice, STATUS_LABEL, type Product, type ProductStatus } from '../products'
import StatusBadge from '../StatusBadge'
import { ui } from '../ui'
import { useDocumentTitle } from '../useDocumentTitle'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<Product>(`/api/products/${id}`)
      .then((p) => !cancelled && setProduct(p))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [id])

  useDocumentTitle(product?.title ?? error ?? undefined)

  async function onDelete() {
    if (!window.confirm('이 상품을 삭제할까요?')) return
    try {
      await api(`/api/products/${id}`, { method: 'DELETE', token })
      navigate('/')
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  async function onStatusChange(status: ProductStatus) {
    setActionError(null)
    try {
      setProduct(await api<Product>(`/api/products/${id}/status`, { method: 'PATCH', token, body: { status } }))
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  if (error)
    return (
      <div className={`${ui.card} flex flex-col items-center gap-3 py-16 text-center`}>
        <p className="font-semibold text-slate-700">{error}</p>
        <Link to="/" className={ui.btnSecondary}>목록으로 돌아가기</Link>
      </div>
    )
  if (!product) return <p className="animate-pulse text-slate-400">불러오는 중…</p>

  const isOwner = user?.id === product.seller.id

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

        {isOwner && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
            <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
              판매 상태
              <select
                value={product.status}
                onChange={(e) => onStatusChange(e.target.value as ProductStatus)}
                className={`${ui.input} w-auto py-1.5`}
              >
                {(Object.keys(STATUS_LABEL) as ProductStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <div className="ml-auto flex gap-2">
              <Link to={`/products/${product.id}/edit`} className={ui.btnSecondary}>수정</Link>
              <button type="button" onClick={onDelete} className={ui.btnDanger}>삭제</button>
            </div>
          </div>
        )}
        {actionError && <p role="alert" className={ui.alert}>{actionError}</p>}
      </article>
    </div>
  )
}
