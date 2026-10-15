import { useState } from 'react'
import EmptyResult from '../components/EmptyResult'
import ErrorAlert from '../components/ErrorAlert'
import ProductCard from '../components/ProductCard'
import ResultSummary from '../components/ResultSummary'
import SearchBar from '../components/SearchBar'
import { useApiResource } from '../hooks/useApiResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Product } from '../products'

interface ProductPage {
  items: Product[]
  total: number
}

export default function HomePage() {
  useDocumentTitle()
  const [typedKeyword, setTypedKeyword] = useState('')
  const [searchedKeyword, setSearchedKeyword] = useState('')
  const { resource: productPage, errorMessage } = useApiResource<ProductPage>(
    `/api/products?q=${encodeURIComponent(searchedKeyword)}`,
  )

  return (
    <section className="flex flex-col gap-6">
      <SearchBar
        keyword={typedKeyword}
        onKeywordChange={setTypedKeyword}
        onSearch={() => setSearchedKeyword(typedKeyword.trim())}
      />
      <ErrorAlert message={errorMessage} />
      {productPage && <ResultSummary searchedKeyword={searchedKeyword} total={productPage.total} />}
      {productPage?.items.length === 0 && <EmptyResult />}
      <ul className="grid gap-3 sm:grid-cols-2">
        {productPage?.items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}
