import { createContext, useContext } from 'react'

const ParentPortalContext = createContext(null)

export function ParentPortalProvider({ value, children }) {
  return <ParentPortalContext.Provider value={value}>{children}</ParentPortalContext.Provider>
}

export function useParentPortal() {
  const ctx = useContext(ParentPortalContext)
  if (!ctx) throw new Error('useParentPortal must be used within ParentPortalProvider')
  return ctx
}

/** Optional hook for panels that may render outside provider during tests */
export function useParentPortalOptional() {
  return useContext(ParentPortalContext)
}
