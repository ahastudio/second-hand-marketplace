import { useEffect, useState } from 'react'
import { api } from '../api'

export function useApiResource<T>(path: string) {
  const [resource, setResource] = useState<T | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false
    api<T>(path)
      .then((loaded) => {
        if (!isCancelled) setResource(loaded)
      })
      .catch((error: Error) => {
        if (!isCancelled) setErrorMessage(error.message)
      })
    return () => {
      isCancelled = true
    }
  }, [path])

  return { resource, setResource, errorMessage }
}
