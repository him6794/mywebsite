import { useEffect, useState } from 'react'
import { api } from './api'

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loadedPath, setLoadedPath] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        setData(value)
        setError('')
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setData(null)
          setError(err.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedPath(path)
      })
    return () => controller.abort()
  }, [path])

  return {
    data: loadedPath === path ? data : null,
    error: loadedPath === path ? error : '',
    loading: loadedPath !== path,
  }
}
