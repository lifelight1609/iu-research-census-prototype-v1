"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Sparkles, X, Users, Loader2 } from "lucide-react";
import { AuthDialog, type AuthUser } from "@/components/auth-dialog";

interface Researcher {
  id: number;
  name: string;
  title: string;
  department: string;
  researchArea: string;
  shortBio: string;
  detailedBio: string;
  url: string;
  publications_count?: number;
  citation_count?: number;
  h_index?: number;
  i10_index?: number;
  oa_author_id?: string | number;
  oa_orcid?: string | number;
  affiliations?: { display_name: string; years: number[] }[];
}

interface Filters {
  departments: string[];
  areas: string[];
}

const DEFAULT_DEPARTMENT = "all";
const DEFAULT_AREA = "all";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const [query, setQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT);
  const [area, setArea] = useState(DEFAULT_AREA);
  const [currentPage, setCurrentPage] = useState(1);
  const [aiResults, setAiResults] = useState<Researcher[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const ITEMS_PER_PAGE = 20;

  const researchersUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (department !== DEFAULT_DEPARTMENT) {
      params.set("department", department);
    }

    if (area !== DEFAULT_AREA) {
      params.set("area", area);
    }

    const searchParams = params.toString();
    return searchParams ? `/api/researchers?${searchParams}` : "/api/researchers";
  }, [query, department, area]);

  const aiMode = aiResults !== null;

  useEffect(() => {
    const storedUser = window.localStorage.getItem("iu-research-portal-user");

    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        window.localStorage.removeItem("iu-research-portal-user");
      }
    }
  }, []);

  const handleAuthenticated = (user: AuthUser) => {
    setCurrentUser(user);
    window.localStorage.setItem("iu-research-portal-user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.localStorage.removeItem("iu-research-portal-user");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [query, department, area, aiMode]);

  const { data: filters } = useSWR<Filters>("/api/filters", fetcher);
  const { data: researchers, error, isLoading } = useSWR<Researcher[]>(
    aiResults === null ? researchersUrl : null,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const departments = filters?.departments || [];
  const areas = filters?.areas || [];

  const standardFiltersActive =
    query.trim().length > 0 ||
    department !== DEFAULT_DEPARTMENT ||
    area !== DEFAULT_AREA;

  const displayData = aiMode ? aiResults : researchers || [];
  const totalPages = Math.max(1, Math.ceil(displayData.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedResearchers = displayData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const pageStart = displayData.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min(displayData.length, currentPage * ITEMS_PER_PAGE);

  const clearStandardSearch = () => {
    if (aiMode) {
      setAiResults(null);
    }
    setQuery("");
    setDepartment(DEFAULT_DEPARTMENT);
    setArea(DEFAULT_AREA);
    setCurrentPage(1);
  };

  const handleQueryChange = (value: string) => {
    if (aiMode) {
      setAiResults(null);
    }
    setQuery(value);
  };

  const handleDepartmentChange = (value: string) => {
    if (aiMode) {
      setAiResults(null);
    }
    setDepartment(value);
  };

  const handleAreaChange = (value: string) => {
    if (aiMode) {
      setAiResults(null);
    }
    setArea(value);
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;

    setIsAiSearching(true);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery.trim() }),
      });
      const results = await res.json();
      setAiResults(results);
    } catch (error) {
      console.error("AI search failed:", error);
      setAiResults([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiResults(null);
    setAiQuery("");
    setIsAiSearching(false);
    setCurrentPage(1);
  };

  const resultHeading = aiMode
    ? `AI search for “${aiQuery.trim()}”`
    : standardFiltersActive
    ? "Filtered researchers"
    : "All researchers";

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              IU Researcher Portal
            </h1>
            <p className="text-muted-foreground">
              Discover researchers across Indiana University
            </p>
          </div>
          <AuthDialog
            currentUser={currentUser}
            onAuthenticated={handleAuthenticated}
            onLogout={handleLogout}
          />
        </div>

        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">
                  AI-Powered Search
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder='Try: "AI researchers working on cancer imaging" or "experts in social media misinformation"'
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={handleAiSearch}
                  disabled={isAiSearching || !aiQuery.trim()}
                >
                  {isAiSearching ? "Searching..." : "Search with AI"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {aiMode && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI Results
              </Badge>
              <span className="text-sm text-muted-foreground line-clamp-1">
                Showing the best matches for “{aiQuery.trim()}”
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAiSearch}>
              <X className="h-4 w-4 mr-1" />
              Clear AI
            </Button>
          </div>
        )}

        {!aiMode && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>
                  Search researchers by name, department, or research area.
                </span>
              </div>
              {standardFiltersActive && (
                <Button variant="outline" size="sm" onClick={clearStandardSearch}>
                  Clear filters
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-4 mb-6 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, keyword..."
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={department} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={area} onValueChange={handleAreaChange}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="All Research Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Research Areas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{resultHeading}</p>
            {!aiMode && standardFiltersActive && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                {query.trim() && (
                  <span className="rounded-full border px-2 py-1">
                    Query: “{query.trim()}”
                  </span>
                )}
                {department !== DEFAULT_DEPARTMENT && (
                  <span className="rounded-full border px-2 py-1">
                    Department: {department}
                  </span>
                )}
                {area !== DEFAULT_AREA && (
                  <span className="rounded-full border px-2 py-1">
                    Area: {area}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading researchers...
              </span>
            ) : (
              displayData.length > ITEMS_PER_PAGE ? (
                `Showing ${pageStart}-${pageEnd} of ${displayData.length} researchers`
              ) : (
                `Showing ${displayData.length} researcher${
                  displayData.length !== 1 ? "s" : ""
                }`
              )
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Unable to load researchers. Please refresh the page or try again later.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedResearchers.map((r) => {
                const researchAreas = r.researchArea
                  ?.split(";")
                  .map((a) => a.trim())
                  .filter(Boolean)
                  .slice(0, 3) || [];

              return (
                <Link key={r.id} href={`/researcher/${r.id}`} className="block">
                  <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{r.name}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {r.title}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {typeof r.publications_count === "number" && (
                          <span className="rounded-full border px-2 py-1">
                            Publications {r.publications_count}
                          </span>
                        )}
                        {typeof r.citation_count === "number" && (
                          <span className="rounded-full border px-2 py-1">
                            Citations {r.citation_count}
                          </span>
                        )}
                        {typeof r.h_index === "number" && (
                          <span className="rounded-full border px-2 py-1">
                            h-index {r.h_index}
                          </span>
                        )}
                        {typeof r.i10_index === "number" && (
                          <span className="rounded-full border px-2 py-1">
                            i10-index {r.i10_index}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {r.department}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {researchAreas.map((researchArea, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {researchArea}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {r.shortBio}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {displayData.length > ITEMS_PER_PAGE && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </>
        )}

        {!isLoading && displayData.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {aiMode ? (
              <>
                No AI results found. Try another prompt or clear the AI search.
              </>
            ) : (
              "No researchers found. Try adjusting your query or filters."
            )}
          </div>
        )}
      </div>
    </main>
  );
}
