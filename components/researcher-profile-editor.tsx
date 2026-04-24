"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Building2, BookOpen, Pencil, Save, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { AuthUser } from "@/components/auth-dialog";
import type { PublicationRecord } from "@/lib/publications";
import { formatAffiliationYears, type AffiliationRecord } from "@/lib/researcher-schema";

interface ResearcherData {
  id: string | number;
  name: string;
  title?: string;
  department?: string;
  email?: string;
  status?: string;
  researchArea?: string;
  shortBio?: string;
  detailedBio?: string;
  url?: string;
  oa_author_id?: string | number;
  oa_orcid?: string | number;
  affiliations?: AffiliationRecord[];
  publications_count?: number;
  citation_count?: number;
  h_index?: number;
  i10_index?: number;
}

interface ResearcherProfileEditorProps {
  researcher: ResearcherData;
  publications: PublicationRecord[];
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const storedUser = window.localStorage.getItem("iu-research-portal-user");
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    window.localStorage.removeItem("iu-research-portal-user");
    return null;
  }
}

const sourceLabelMap: Record<string, string> = {
  S2: "Semantic Scholar",
  OA: "OpenAlex",
};

export default function ResearcherProfileEditor({ researcher, publications }: ResearcherProfileEditorProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ResearcherData>({ ...researcher });
  const [claimLoading, setClaimLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft({ ...researcher });
  }, [researcher]);

  useEffect(() => {
    setCurrentUser(readStoredUser());
  }, []);

  useEffect(() => {
    const onStorage = () => setCurrentUser(readStoredUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const currentEmail = normalizeEmail(currentUser?.email);
  const researcherEmail = normalizeEmail(researcher.email);
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isOwner = Boolean(currentEmail && researcherEmail && currentEmail === researcherEmail);
  const canEdit = isAdmin || isOwner;
  const canClaim = isOwner;
  const canApprove = isAdmin || isOwner;

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

  const hIndex = typeof researcher.h_index === "number" ? researcher.h_index : undefined;
  const i10Index = typeof researcher.i10_index === "number" ? researcher.i10_index : undefined;
  const affiliations = useMemo(() => draft.affiliations ?? [], [draft.affiliations]);
  const researcherStatus = (draft.status || researcher.status|| "Not Approved").trim() || "Not Approved";

  function updateDraft(field: keyof ResearcherData, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function normalizeExternalId(rawId: string | number | undefined, baseUrl: string) {
    if (rawId === undefined || rawId === null || rawId === "") {
      return "";
    }

    const rawText =
      typeof rawId === "number"
        ? String(Number.isInteger(rawId) ? rawId : Math.trunc(rawId))
        : String(rawId).trim();
    const trimmed = rawText.trim();
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

  const displayOaAuthorId = normalizeExternalId(draft.oa_author_id, "https://openalex.org/");
  const displayOaOrcid = normalizeExternalId(draft.oa_orcid, "https://orcid.org/");

  async function handleSave() {
    if (!canEdit) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/researchers/${researcher.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actorEmail: currentUser?.email ?? "",
          actorRole: currentUser?.role ?? "",
          name: draft.name,
          title: draft.title ?? "",
          department: draft.department ?? "",

          researchArea: draft.researchArea ?? "",
          shortBio: draft.shortBio ?? "",
          detailedBio: draft.detailedBio ?? "",
          url: draft.url ?? "",
          oa_author_id: draft.oa_author_id ?? "",
          oa_orcid: draft.oa_orcid ?? "",
          i10_index: draft.i10_index ?? undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save profile changes.");
      }

      setDraft(payload);
      setIsEditing(false);
      setSaveMessage("Profile changes saved to MongoDB.");
      toast.success("Profile saved", { description: "Changes were written to MongoDB." });
      router.refresh();
      window.setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save profile changes.";
      setSaveError(message);
      toast.error("Save failed", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClaim() {
    if (!canClaim || claimLoading) return;

    setClaimLoading(true);
    try {
      const response = await fetch("/api/users/claim-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser?.email,
          researcherId: researcher.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to claim profile.");
      }

      if (payload?.user) {
        setCurrentUser(payload.user as AuthUser);
        window.localStorage.setItem("iu-research-portal-user", JSON.stringify(payload.user));
      }

      toast.success("Profile claimed", { description: "Your account is linked to this researcher." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to claim profile.";
      toast.error("Claim failed", { description: message });
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleApprove() {
    if (!canApprove || approveLoading) return;

    setApproveLoading(true);
    try {
      const response = await fetch(`/api/researchers/${researcher.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorEmail: currentUser?.email,
          actorRole: currentUser?.role,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to approve profile.");
      }

      setDraft((current) => ({ ...current, status: payload.status ?? "Approved" }));
      toast.success("Profile approved", { description: "The researcher status was updated to Approved." });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to approve profile.";
      toast.error("Approval failed", { description: message });
    } finally {
      setApproveLoading(false);
    }
  }

  const statusLabel = researcherStatus.toLowerCase() === "approved" ? "Approved" : "Not Approved";

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
            <div className="flex flex-col gap-2 text-muted-foreground">
              <div className="flex items-center gap-2">
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
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border px-2 py-1">
                  Email - <b> {researcher.email || "-"}</b>
                </span>
                <span className="rounded-full border px-2 py-1">
                  Status - <b> {statusLabel} </b>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border px-2 py-1">
                Publications {totalPublications}
              </span>
              <span className="rounded-full border px-2 py-1">
                Citations {totalCitations}
              </span>
              <span className="rounded-full border px-2 py-1">
                h-index {typeof hIndex === "number" ? hIndex : "-"}
              </span>
              <span className="rounded-full border px-2 py-1">
                i10-index {typeof i10Index === "number" ? i10Index : "-"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canEdit && (
              <Button
                variant={isEditing ? "secondary" : "outline"}
                className="gap-2"
                onClick={() => setIsEditing(true)}
                disabled={isEditing}
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
            {canClaim && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleClaim}
                disabled={claimLoading}
              >
                <UserCheck className="h-4 w-4" />
                {claimLoading ? "Claiming..." : "Claim Profile"}
              </Button>
            )}
            {canApprove && (
              <Button
                variant={statusLabel === "Approved" ? "secondary" : "outline"}
                className="gap-2"
                onClick={handleApprove}
                disabled={approveLoading || statusLabel === "Approved"}
              >
                <UserCheck className="h-4 w-4" />
                {approveLoading ? "Approving..." : statusLabel === "Approved" ? "Approved" : "Mark Approved"}
              </Button>
            )}
            {isEditing && canEdit && (
              <Button variant="default" className="gap-2" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>

          {saveMessage && <p className="text-sm text-success-foreground">{saveMessage}</p>}
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {(draft.oa_author_id || draft.oa_orcid) && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Identifiers
            </h3>
            <div className="space-y-2 text-sm text-foreground">
              <div className="grid gap-3 sm:grid-cols-2">
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
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground block">ORCID</span>
                  {isEditing ? (
                    <input
                      value={draft.oa_orcid ?? ""}
                      onChange={(event) => updateDraft("oa_orcid", event.target.value)}
                      placeholder="https://orcid.org/..."
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  ) : displayOaOrcid ? (
                    <a
                      href={`https://orcid.org/${displayOaOrcid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline block"
                    >
                      {displayOaOrcid}
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

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Institutions affiliated with
          </h3>
          {affiliations.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {affiliations.map((affiliation, index) => (
                <div key={`${affiliation.display_name}-${index}`} className="rounded-xl border p-4">
                  <div className="font-medium text-foreground">{affiliation.display_name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatAffiliationYears(affiliation.years) || "Years unavailable"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No affiliations available.</p>
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
                  {publication.collaborators && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Collaborators
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {publication.collaborators
                          .split(/;|,/) 
                          .map((collaborator) => collaborator.trim())
                          .filter(Boolean)
                          .map((collaborator, idx) => (
                            <span
                              key={`${publication.paper_title}-collab-${idx}`}
                              className="rounded-full border px-2 py-1 text-xs text-muted-foreground"
                            >
                              {collaborator}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
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
