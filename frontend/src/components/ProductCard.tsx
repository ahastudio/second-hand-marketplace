import { Link } from 'react-router-dom'
import { formatPrice, type Product } from '../products'
import { ui } from '../ui'
import StatusBadge from './StatusBadge'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      data-testid="product-card"
      className={`${ui.card} group flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="line-clamp-2 font-semibold text-slate-900 group-hover:text-indigo-600">{product.title}</span>
        <StatusBadge status={product.status} />
      </div>
      <div className="mt-auto flex items-end justify-between">
        <span className="text-lg font-extrabold text-slate-900">{formatPrice(product.price)}</span>
        <span className="text-xs text-slate-500">{product.seller.nickname}</span>
      </div>
    </Link>
  )
}
