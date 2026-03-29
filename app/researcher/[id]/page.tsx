import Link from "next/link";
import { notFound } from "next/navigation";
import researchers from "@/data/researchers.json";
import { normalizeResearcher } from "@/lib/researchers";
import { findPublicationsByName } from "@/lib/publications";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ResearcherProfileEditor from "@/components/researcher-profile-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function ResearcherPage({ params }: PageProps) {
  const { id } = await params;
  const rawResearcher = researchers.find((r: any) => r.id === parseInt(id, 10));
  const researcher = rawResearcher ? normalizeResearcher(rawResearcher) : null;

  if (!researcher) {
    notFound();
  }

  const publications = findPublicationsByName(researcher.name);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </Link>

        <ResearcherProfileEditor researcher={researcher} publications={publications} />
      </div>
    </main>
  );
}
