import { useEffect } from 'react'

// useBlocker requires createBrowserRouter (data router), not BrowserRouter.
// We only use beforeunload to warn on tab close / refresh.
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
