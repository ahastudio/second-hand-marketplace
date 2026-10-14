import { useEffect } from 'react'

export const SITE_NAME = '중고거래 마켓'

/** 페이지 제목을 "제목 · 서비스 이름"으로 설정한다. 제목이 없으면 서비스 이름만 쓴다. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])
}
