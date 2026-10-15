import { Link } from 'react-router-dom'
import { STATUS_LABEL, type Product, type ProductStatus } from '../products'
import { ui } from '../ui'

interface Props {
  product: Product
  onStatusChange: (status: ProductStatus) => void
  onDelete: () => void
}

const ALL_STATUSES = Object.keys(STATUS_LABEL) as ProductStatus[]

export default function SellerControls({ product, onStatusChange, onDelete }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
      <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
        판매 상태
        <select
          value={product.status}
          onChange={(event) => onStatusChange(event.target.value as ProductStatus)}
          className={`${ui.input} w-auto py-1.5`}
        >
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>{STATUS_LABEL[status]}</option>
          ))}
        </select>
      </label>
      <div className="ml-auto flex gap-2">
        <Link to={`/products/${product.id}/edit`} className={ui.btnSecondary}>수정</Link>
        <button type="button" onClick={onDelete} className={ui.btnDanger}>삭제</button>
      </div>
    </div>
  )
}
