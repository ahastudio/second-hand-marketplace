export default function ResultSummary({ searchedKeyword, total }: { searchedKeyword: string; total: number }) {
  return (
    <p className="text-sm text-slate-500">
      {searchedKeyword ? `‘${searchedKeyword}’ 검색 결과 ` : '전체 상품 '}
      <span className="font-semibold text-slate-700">{total.toLocaleString('ko-KR')}</span>개
    </p>
  )
}
