import fs from "fs";
import path from "path";

export interface PublicationRecord {
  faculty_name: string;
  faculty_title?: string;
  faculty_summary?: string;
  paper_title: string;
  link?: string | null;
  year?: number | null;
  citations?: number | null;
  source?: string;
}

const publicationsPath = path.join(process.cwd(), "data", "publications.json");
let publicationsCache: PublicationRecord[] | null = null;

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadPublications(): PublicationRecord[] {
  if (publicationsCache) {
    return publicationsCache;
  }

  try {
    const file = fs.readFileSync(publicationsPath, "utf-8");
    const parsed = JSON.parse(file) as PublicationRecord[];
    publicationsCache = Array.isArray(parsed) ? parsed : [];
    return publicationsCache;
  } catch {
    return [];
  }
}

export function findPublicationsByName(name: string): PublicationRecord[] {
  if (!name) {
    return [];
  }

  const normalizedTarget = normalizeName(name);
  if (!normalizedTarget) {
    return [];
  }

  return loadPublications().filter((publication) => {
    const facultyName = publication.faculty_name || "";
    const normalizedFaculty = normalizeName(facultyName);
    return (
      normalizedFaculty === normalizedTarget ||
      normalizedFaculty.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedFaculty)
    );
  });
}
