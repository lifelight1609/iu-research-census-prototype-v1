import { NextResponse } from "next/server";
import data from "@/data/researchers.json";
import { normalizeResearcher } from "@/lib/researchers";

export async function GET() {
  const normalized = data.map(normalizeResearcher);

  // Extract unique departments
  const departments = [...new Set(normalized.map((r: any) => r.department?.trim()).filter(Boolean))].sort();

  // Extract unique research areas (split by semicolon and flatten)
  const areasSet = new Set<string>();
  normalized.forEach((r: any) => {
    if (r.researchArea) {
      r.researchArea.split(";").forEach((area: string) => {
        const trimmed = area.trim();
        if (trimmed) areasSet.add(trimmed);
      });
    }
  });
  const areas = [...areasSet].sort();

  return NextResponse.json({ departments, areas });
}
