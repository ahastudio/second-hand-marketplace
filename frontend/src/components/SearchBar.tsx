import type { FormEvent } from 'react'
import { ui } from '../ui'

interface Props {
  keyword: string
  onKeywordChange: (keyword: string) => void
  onSearch: () => void
}

export default function SearchBar({ keyword, onKeywordChange, onSearch }: Props) {
  function submitSearch(event: FormEvent) {
    event.preventDefault()
    onSearch()
  }

  return (
    <form onSubmit={submitSearch} role="search" className="flex gap-2">
      <input
        type="search"
        aria-label="검색"
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="상품명을 검색하세요"
        className={ui.input}
      />
      <button type="submit" className={`${ui.btnPrimary} shrink-0 px-5`}>검색</button>
    </form>
  )
}
