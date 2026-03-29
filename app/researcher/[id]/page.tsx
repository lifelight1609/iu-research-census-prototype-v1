import Link from "next/link";
import { notFound } from "next/navigation";
import researchers from "@/data/researchers.json";
import { normalizeResearcher } from "@/lib/researchers";
import { findPublicationsByName, type PublicationRecord } from "@/lib/publications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Building2, BookOpen } from "lucide-react";

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

  const researchAreas = researcher.researchArea
    ?.split(";")
    .map((area: string) => area.trim())
    .filter(Boolean) || [];

  const publications = findPublicationsByName(researcher.name);
  const totalPublications =
    typeof researcher.publications_count === "number"
      ? researcher.publications_count
      : publications.length;
  const totalCitations =
    typeof researcher.citation_count === "number"
      ? researcher.citation_count
      : publications.reduce((sum, pub) => sum + (pub.citations ?? 0), 0);

  const sourceLabelMap: Record<string, string> = {
    S2: "Semantic Scholar",
    OA: "OpenAlex",
  };

  const topPublications = publications.slice(0, 5);
  const publicationHeading =
    topPublications.length >= 5
      ? "TOP 5 PUBLICATIONS"
      : `TOP ${topPublications.length} PUBLICATIONS`;

  const semanticScholarId = researcher.s2_author_id != null ? String(researcher.s2_author_id).trim() : "";
  const semanticScholarLink = semanticScholarId
    ? semanticScholarId.startsWith("http")
      ? semanticScholarId
      : `https://www.semanticscholar.org/author/${semanticScholarId}`
    : undefined;

  const openAlexId = researcher.oa_author_id != null ? String(researcher.oa_author_id).trim() : "";
  const openAlexLink = openAlexId
    ? openAlexId.startsWith("http")
      ? openAlexId
      : `https://openalex.org/${openAlexId}`
    : undefined;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </Link>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-foreground">
                  {researcher.name}
                </CardTitle>
                <p className="text-lg text-muted-foreground mt-2">
                  {researcher.title}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{researcher.department}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full border px-2 py-1">
                    Publications {totalPublications}
                  </span>
                  <span className="rounded-full border px-2 py-1">
                    Citations {totalCitations}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {(researcher.s2_author_id || researcher.oa_author_id) && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Author IDs
                </h3>
                <div className="space-y-2 text-sm text-foreground">
                  {researcher.s2_author_id && (
                    <p>
                      Semantic Scholar:{" "}
                      {semanticScholarLink ? (
                        <a
                          href={semanticScholarLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {researcher.s2_author_id}
                        </a>
                      ) : (
                        researcher.s2_author_id
                      )}
                    </p>
                  )}
                  {researcher.oa_author_id && (
                    <p>
                      OpenAlex:{" "}
                      <a
                        href={openAlexLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {researcher.oa_author_id}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {researchAreas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Research Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {researchAreas.map((area: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {researcher.shortBio && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Summary
                </h3>
                <p className="text-foreground leading-relaxed">
                  {researcher.shortBio}
                </p>
              </div>
            )}

            {researcher.detailedBio && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Biography
                </h3>
                <p className="text-foreground leading-relaxed whitespace-pre-line">
                  {researcher.detailedBio}
                </p>
              </div>
            )}

            {topPublications.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {publicationHeading}
                </h3>
                <div className="space-y-4">
                  {topPublications.map((publication: PublicationRecord, index: number) => (
                    <div key={`${publication.paper_title}-${index}`} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <a
                          href={
                            typeof publication.link === "string" &&
                            publication.link.trim()
                              ? publication.link
                              : "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-base font-semibold text-primary hover:underline"
                        >
                          {publication.paper_title}
                        </a>
                        <div className="text-sm text-muted-foreground">
                          {publication.year ? `${publication.year}` : "Year unknown"}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border px-2 py-1">
                          Citations: {publication.citations ?? 0}
                        </span>
                        {publication.source && (
                          <span className="rounded-full border px-2 py-1">
                            Source: {sourceLabelMap[publication.source] ?? publication.source}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {publications.length === 0 && (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                No matching publications were found for this researcher.
              </div>
            )}

            {researcher.url && (
              <div className="pt-4 border-t">
                <a
                  href={researcher.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View Official Profile
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
