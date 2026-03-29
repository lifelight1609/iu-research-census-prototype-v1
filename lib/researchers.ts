export function normalizeResearcher(raw: any) {
  return {
    ...raw,
    researchArea:
      raw.researchArea ??
      raw["research area"] ??
      raw["Research Area"] ??
      raw["research_area"] ??
      raw["research-area"] ??
      "",
    shortBio:
      raw.shortBio ??
      raw["short bio"] ??
      raw["Short Bio"] ??
      raw["short_bio"] ??
      raw["short-bio"] ??
      "",
    detailedBio:
      raw.detailedBio ??
      raw["long bio"] ??
      raw["Long Bio"] ??
      raw["long_bio"] ??
      raw["long-bio"] ??
      "",
    url:
      raw.url ??
      raw["profile url"] ??
      raw["Profile URL"] ??
      raw["profile_url"] ??
      raw["profile-url"] ??
      "",
    s2_author_id:
      raw.s2_author_id != null
        ? String(raw.s2_author_id).trim() || undefined
        : undefined,
    oa_author_id:
      raw.oa_author_id != null
        ? String(raw.oa_author_id).trim() || undefined
        : undefined,
    publications_count:
      raw.publications_count ??
      raw.publications ??
      raw.oa_publications ??
      raw.s2_publications ??
      raw["publications count"] ??
      undefined,
    citation_count:
      raw.citation_count ??
      raw.citations ??
      raw.oa_citations ??
      raw.s2_citations ??
      raw["citation count"] ??
      undefined,
  };
}
