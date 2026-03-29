"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Building2, BookOpen, Pencil, Save, UserCheck } from "lucide-react";
import type { PublicationRecord } from "@/lib/publications";

interface ResearcherData {
  id: string | number;
  name: string;
  title?: string;
  department?: string;
  researchArea?: string;
  shortBio?: string;
  detailedBio?: string;
  url?: string;
  s2_author_id?: string;
  oa_author_id?: string;
  publications_count?: number;
  citation_count?: number;
}

interface ResearcherProfileEditorProps {
  researcher: ResearcherData;
  publications: PublicationRecord[];
}

const sourceLabelMap: Record<string, string> = {
  S2: "Semantic Scholar",
  OA: "OpenAlex",
};

export default function ResearcherProfileEditor({ researcher, publications }: ResearcherProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ResearcherData>({ ...researcher });
  const [claimStatus, setClaimStatus] = useState<"idle" | "requested">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft({ ...researcher });
  }, [researcher]);

  const researchAreas = useMemo(
    () =>
      (draft.researchArea || "")
        .split(";")
        .map((area) => area.trim())
        .filter(Boolean),
    [draft.researchArea]
  );

  const totalPublications =
    typeof researcher.publications_count === "number"
      ? researcher.publications_count
      : publications.length;

  const totalCitations =
    typeof researcher.citation_count === "number"
      ? researcher.citation_count
      : publications.reduce((sum, pub) => sum + (pub.citations ?? 0), 0);

  function updateDraft(field: keyof ResearcherData, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function normalizeExternalId(rawId: string | undefined, baseUrl: string) {
    if (!rawId) {
      return "";
    }

    const trimmed = rawId.trim();
    if (trimmed.startsWith(baseUrl)) {
      return trimmed.slice(baseUrl.length).replace(/^\//, "");
    }

    try {
      const url = new URL(trimmed);
      const path = url.pathname.replace(/^\//, "");
      return path || trimmed;
    } catch {
      return trimmed;
    }
  }

  const displayS2AuthorId = normalizeExternalId(draft.s2_author_id, "https://www.semanticscholar.org/author/");
  const displayOaAuthorId = normalizeExternalId(draft.oa_author_id, "https://openalex.org/");

  function handleSave() {
    setIsEditing(false);
    setSaveMessage("Profile changes saved locally.");
    window.setTimeout(() => setSaveMessage(null), 3000);
  }

  function handleClaim() {
    if (claimStatus === "idle") {
      setClaimStatus("requested");
    }
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-3xl font-bold text-foreground">
              {isEditing ? (
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-3xl font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                draft.name
              )}
            </CardTitle>
            <p className="text-lg text-muted-foreground mt-2">
              {isEditing ? (
                <input
                  value={draft.title ?? ""}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder="Title"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                draft.title
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {isEditing ? (
                <input
                  value={draft.department ?? ""}
                  onChange={(event) => updateDraft("department", event.target.value)}
                  placeholder="Department"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <span>{draft.department}</span>
              )}
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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={isEditing ? "secondary" : "outline"}
              className="gap-2"
              onClick={() => setIsEditing(true)}
              disabled={isEditing}
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              variant={claimStatus === "requested" ? "secondary" : "outline"}
              className="gap-2"
              onClick={handleClaim}
              disabled={claimStatus === "requested"}
            >
              <UserCheck className="h-4 w-4" />
              {claimStatus === "requested" ? "Claim Requested" : "Claim Profile"}
            </Button>
            {isEditing && (
              <Button variant="default" className="gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            )}
          </div>

          {saveMessage && (
            <p className="text-sm text-success-foreground">{saveMessage}</p>
          )}
          {claimStatus === "requested" && (
            <p className="text-sm text-muted-foreground">
              Claim request submitted. A reviewer will confirm your ownership.
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {(draft.s2_author_id || draft.oa_author_id) && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Author IDs
            </h3>
            <div className="space-y-2 text-sm text-foreground">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground block">Semantic Scholar</span>
                  {isEditing ? (
                    <input
                      value={draft.s2_author_id ?? ""}
                      onChange={(event) => updateDraft("s2_author_id", event.target.value)}
                      placeholder="Semantic Scholar ID"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  ) : displayS2AuthorId ? (
                    <a
                      href={`https://www.semanticscholar.org/author/${displayS2AuthorId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline block"
                    >
                      {displayS2AuthorId}
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground block">OpenAlex</span>
                  {isEditing ? (
                    <input
                      value={draft.oa_author_id ?? ""}
                      onChange={(event) => updateDraft("oa_author_id", event.target.value)}
                      placeholder="OpenAlex ID"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  ) : displayOaAuthorId ? (
                    <a
                      href={`https://openalex.org/${displayOaAuthorId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline block"
                    >
                      {displayOaAuthorId}
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Research Areas
          </h3>
          {isEditing ? (
            <input
              value={draft.researchArea ?? ""}
              onChange={(event) => updateDraft("researchArea", event.target.value)}
              placeholder="Enter research areas separated by semicolons"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          ) : researchAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {researchAreas.map((area, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {area}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No research areas available.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Summary
          </h3>
          {isEditing ? (
            <textarea
              value={draft.shortBio ?? ""}
              onChange={(event) => updateDraft("shortBio", event.target.value)}
              placeholder="Add a short summary"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          ) : (
            <p className="text-foreground leading-relaxed">
              {draft.shortBio || "No summary available."}
            </p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Biography
          </h3>
          {isEditing ? (
            <textarea
              value={draft.detailedBio ?? ""}
              onChange={(event) => updateDraft("detailedBio", event.target.value)}
              placeholder="Add a longer biography"
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          ) : (
            <p className="text-foreground leading-relaxed whitespace-pre-line">
              {draft.detailedBio || "No biography available."}
            </p>
          )}
        </div>

        <div className="pt-4 border-t">
          {isEditing ? (
            <label className="space-y-2 w-full">
              <span className="text-sm text-muted-foreground">Official profile URL</span>
              <input
                value={draft.url ?? ""}
                onChange={(event) => updateDraft("url", event.target.value)}
                placeholder="https://"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          ) : draft.url ? (
            <a href={draft.url} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Official Profile
              </Button>
            </a>
          ) : null}
        </div>

        {publications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              TOP {Math.min(publications.length, 5)} PUBLICATIONS
            </h3>
            <div className="space-y-4">
              {publications.slice(0, 5).map((publication, index) => (
                <div key={`${publication.paper_title}-${index}`} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <a
                      href={publication.link?.trim() ? publication.link : "#"}
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
      </CardContent>
    </Card>
  );
}
