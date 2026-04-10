'use client'

import { useEffect } from 'react'

import { identify } from '$/lib/analytics'

const AnalyticsIdentify = ({ username }: { username: string }) => {
  useEffect(() => {
    identify(username)
  }, [username])

  return null
}

export default AnalyticsIdentify
