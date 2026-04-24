
'use client'

import { useEffect, useState } from 'react'
import EmailButton from './email-button'

export default function EmailButtonWrapper({ email, name }: any) {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('iu-research-portal-user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
  }, [])

  return <EmailButton email={email} name={name} currentUser={user} />
}
