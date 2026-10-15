import { renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { SITE_NAME, useDocumentTitle } from './useDocumentTitle'

test('제목이 없으면 서비스 이름만 설정한다', () => {
  renderHook(() => useDocumentTitle())
  expect(document.title).toBe(SITE_NAME)
})

test('제목이 있으면 "제목 · 서비스 이름" 형식으로 설정한다', () => {
  renderHook(() => useDocumentTitle('로그인'))
  expect(document.title).toBe(`로그인 · ${SITE_NAME}`)
})

test('제목이 바뀌면 갱신된다', () => {
  const { rerender } = renderHook(({ t }: { t?: string }) => useDocumentTitle(t), { initialProps: { t: '가' as string | undefined } })
  expect(document.title).toBe(`가 · ${SITE_NAME}`)
  rerender({ t: undefined })
  expect(document.title).toBe(SITE_NAME)
})
