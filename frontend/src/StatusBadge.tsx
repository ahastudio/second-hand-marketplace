import { STATUS_LABEL, type ProductStatus } from './products'

const STYLE: Record<ProductStatus, string> = {
  ON_SALE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  RESERVED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  SOLD: 'bg-slate-100 text-slate-500 ring-slate-500/20',
}

export default function StatusBadge({ status, testId }: { status: ProductStatus; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
