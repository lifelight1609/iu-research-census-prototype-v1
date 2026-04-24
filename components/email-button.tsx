
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function EmailButton({ email, name, currentUser }: any) {
  const [open, setOpen] = useState(false)

  const [subject, setSubject] = useState(
    'IU Researcher Portal - Please review your information'
  )

  const [message, setMessage] = useState(
    `Dear ${name},

Please review your information by creating an account and logging into the website below. Once logged in, please approve if the information looks good or suggest any changes that are required.

https://iu-researchers-prototype-v1.vercel.app/`
  )

  if (!currentUser || currentUser.role !== 'admin') return null

  const handleSend = () => {
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    window.location.href = mailtoLink
    setOpen(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Email</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Researcher</DialogTitle>
            <DialogDescription>
              Send an email to the researcher with the pre-filled information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <Input value={email} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend}>
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
