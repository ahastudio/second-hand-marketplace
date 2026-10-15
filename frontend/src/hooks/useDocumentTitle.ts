import { useEffect } from 'react'

export const SITE_NAME = '중고거래 마켓'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])
}
