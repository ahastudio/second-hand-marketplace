import { ui } from '../ui'

export default function EmptyResult() {
  return (
    <div className={`${ui.card} flex flex-col items-center gap-1 border-dashed py-16 text-center`}>
      <p className="text-4xl" aria-hidden="true">🔍</p>
      <p className="font-semibold text-slate-700">검색 결과가 없습니다</p>
      <p className="text-sm text-slate-500">다른 검색어로 다시 찾아보세요.</p>
    </div>
  )
}
