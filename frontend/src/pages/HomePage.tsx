import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatPrice, type Product } from '../products'
import StatusBadge from '../StatusBadge'
import { ui } from '../ui'
import { useDocumentTitle } from '../useDocumentTitle'

interface ProductPage {
  items: Product[]
  total: number
}

export default function HomePage() {
  useDocumentTitle()
  const [query, setQuery] = useState('')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ProductPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<ProductPage>(`/api/products?q=${encodeURIComponent(query)}`)
      .then((r) => !cancelled && setResult(r))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [query])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setQuery(input.trim())
  }

  return (
    <section className="flex flex-col gap-6">
      <form onSubmit={onSubmit} role="search" className="flex gap-2">
        <input
          type="search"
          aria-label="검색"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="상품명을 검색하세요"
          className={ui.input}
        />
        <button type="submit" className={`${ui.btnPrimary} shrink-0 px-5`}>검색</button>
      </form>

      {error && <p role="alert" className={ui.alert}>{error}</p>}

      {result && (
        <p className="text-sm text-slate-500">
          {query ? `‘${query}’ 검색 결과 ` : '전체 상품 '}
          <span className="font-semibold text-slate-700">{result.total.toLocaleString('ko-KR')}</span>개
        </p>
      )}

      {result && result.items.length === 0 && (
        <div className={`${ui.card} flex flex-col items-center gap-1 border-dashed py-16 text-center`}>
          <p className="text-4xl" aria-hidden="true">🔍</p>
          <p className="font-semibold text-slate-700">검색 결과가 없습니다</p>
          <p className="text-sm text-slate-500">다른 검색어로 다시 찾아보세요.</p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {result?.items.map((p) => (
          <li key={p.id}>
            <Link
              to={`/products/${p.id}`}
              data-testid="product-card"
              className={`${ui.card} group flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="line-clamp-2 font-semibold text-slate-900 group-hover:text-indigo-600">{p.title}</span>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-auto flex items-end justify-between">
                <span className="text-lg font-extrabold text-slate-900">{formatPrice(p.price)}</span>
                <span className="text-xs text-slate-500">{p.seller.nickname}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
