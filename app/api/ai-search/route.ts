import { NextResponse } from "next/server";
import researchers from "@/data/researchers.json";

// Simple synonym expansion (customize this!)
const synonyms: Record<string, string[]> = {
  ai: ["artificial intelligence", "machine learning", "deep learning"],
  cancer: ["oncology", "tumor", "medical imaging"],
  social: ["media", "communication", "networks"],
  data: ["analytics", "big data", "statistics"],
  health: ["medical", "clinical", "biomedical"],
};

function expandQuery(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  let expanded = [...words];

  words.forEach((word) => {
    if (synonyms[word]) {
      expanded.push(...synonyms[word]);
    }
  });

  return expanded;
}

function scoreResearcher(r: any, terms: string[]) {
  let score = 0;

  const text = `${r.name} ${r.department} ${r.researchArea} ${r.shortBio} ${r.detailedBio}`.toLowerCase();

  terms.forEach((term) => {
    if (text.includes(term)) {
      score += 5;
    }

    // Boost if in research area
    if (r.researchArea?.toLowerCase().includes(term)) {
      score += 10;
    }

    // Boost if in title/name
    if (r.name?.toLowerCase().includes(term)) {
      score += 8;
    }
  });

  return score;
}

export async function POST(req: Request) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json([]);
  }

  const expandedTerms = expandQuery(query);

  const scored = researchers.map((r: any) => ({
    ...r,
    score: scoreResearcher(r, expandedTerms),
  }));

  const results = scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json(results);
}
