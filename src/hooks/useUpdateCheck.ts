import { useState, useEffect } from 'react'
import * as bridge from '../ipc/bridge'
import type { UpdateInfo } from '../../shared/types'

const EMPTY: UpdateInfo = { available: false, version: '', url: '' }

export function useUpdateCheck() {
  const [update, setUpdate] = useState<UpdateInfo>(EMPTY)

  useEffect(() => {
    // Check after a short delay so it doesn't block startup
    const timer = setTimeout(() => {
      bridge.checkForUpdates().then(setUpdate).catch(() => {})
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return update
}
