import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import ResearcherProfileEditor from '@/components/researcher-profile-editor'
import CollaborationNetwork from '@/components/collaboration-network'
import { findPublicationsByName, findPublicationsByResearcherId } from '@/lib/publications'
import { getCollaborationGraphForResearcher } from '@/lib/collaboration-network'
import { getResearcherById } from '@/lib/researchers'
import EmailButtonWrapper from '@/components/email-button-wrapper'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function ResearcherPage({ params }: PageProps) {
  const { id } = await params
  const researcher = await getResearcherById(id)

  if (!researcher) {
    notFound()
  }

  const [publicationsById, publicationsByName, graph] = await Promise.all([
    findPublicationsByResearcherId(researcher.id),
    findPublicationsByName(researcher.name),
    getCollaborationGraphForResearcher(researcher.id),
  ])

  const publications = publicationsById.length > 0 ? publicationsById : publicationsByName

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Button>
          </Link>
          <EmailButtonWrapper email={researcher.email || ''} name={researcher.name} />
        </div>

        <div className="space-y-6">
          <ResearcherProfileEditor researcher={researcher} publications={publications} />

          {graph && (
            <CollaborationNetwork graph={graph} researcherName={researcher.name} />
          )}
        </div>
      </div>
    </main>
  )
}
