import { getResearchers, normalizeResearcher, type ResearcherRecord } from '@/lib/researchers'
import { getPublications, type PublicationRecord } from '@/lib/publications'

export type NetworkNodeKind = 'seed' | 'researcher' | 'collaborator'

export interface CollaborationNode {
  id: string
  label: string
  kind: NetworkNodeKind
  researcherId?: string | number
  publicationCount?: number
  degree?: number
  level?: number
  val?: number
}

export interface CollaborationLink {
  source: string
  target: string
  weight: number
  publications: string[]
}

export interface CollaborationGraphData {
  nodes: CollaborationNode[]
  links: CollaborationLink[]
  stats: {
    researchNodes: number
    collaboratorNodes: number
    linkCount: number
    publicationCount: number
    maxDepth: number
  }
}

const MAX_DEPTH = 2

function normalizeKey(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCollaborators(collaborators?: string | null) {
  return (collaborators ?? '')
    .split(/;|,/) 
    .map((value) => value.trim())
    .filter(Boolean)
}

function normalizeId(value: string | number) {
  return String(value).trim()
}

export async function getCollaborationGraphForResearcher(researcherId: string | number): Promise<CollaborationGraphData | null> {
  const researchers = (await getResearchers()).map(normalizeResearcher)
  const publications = await getPublications()

  const researcherById = new Map<string, ResearcherRecord>()
  const researcherByName = new Map<string, ResearcherRecord>()

  for (const researcher of researchers) {
    const idKey = normalizeId(researcher.id)
    if (idKey) {
      researcherById.set(idKey, researcher)
    }
    if (researcher.name) {
      researcherByName.set(normalizeKey(researcher.name), researcher)
    }
  }

  const rootResearcher = researcherById.get(normalizeId(researcherId))
  if (!rootResearcher) {
    return null
  }

  const publicationsByResearcherId = new Map<string, PublicationRecord[]>()
  for (const publication of publications) {
    if (publication.researcher_id === null || publication.researcher_id === undefined || publication.researcher_id === '') {
      continue
    }

    const key = normalizeId(publication.researcher_id)
    const list = publicationsByResearcherId.get(key) ?? []
    list.push(publication)
    publicationsByResearcherId.set(key, list)
  }

  const nodeMap = new Map<string, CollaborationNode>()
  const linkMap = new Map<string, CollaborationLink>()
  const degrees = new Map<string, number>()
  const visited = new Set<string>()
  const queue: Array<{ researcher: ResearcherRecord; depth: number }> = []

  const rootNodeId = `researcher:${normalizeId(rootResearcher.id)}`
  nodeMap.set(rootNodeId, {
    id: rootNodeId,
    label: rootResearcher.name,
    kind: 'seed',
    researcherId: rootResearcher.id,
    publicationCount: publicationsByResearcherId.get(normalizeId(rootResearcher.id))?.length ?? 0,
    level: 0,
  })
  queue.push({ researcher: rootResearcher, depth: 0 })

  function ensureNodeForResearcher(researcher: ResearcherRecord, level: number, kind: NetworkNodeKind = 'researcher') {
    const nodeId = `researcher:${normalizeId(researcher.id)}`
    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        id: nodeId,
        label: researcher.name,
        kind,
        researcherId: researcher.id,
        publicationCount: publicationsByResearcherId.get(normalizeId(researcher.id))?.length ?? 0,
        level,
      })
    }
    return nodeId
  }

  function ensureCollaboratorNode(name: string, level: number) {
    const nodeId = `collaborator:${normalizeKey(name)}`
    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        id: nodeId,
        label: name,
        kind: 'collaborator',
        level,
      })
    }
    return nodeId
  }

  function addLink(source: string, target: string, publicationTitle?: string) {
    const ordered = [source, target].sort()
    const linkId = `${ordered[0]}__${ordered[1]}`
    const current = linkMap.get(linkId)
    if (current) {
      current.weight += 1
      if (publicationTitle && !current.publications.includes(publicationTitle)) {
        current.publications.push(publicationTitle)
      }
      return
    }

    linkMap.set(linkId, {
      source,
      target,
      weight: 1,
      publications: publicationTitle ? [publicationTitle] : [],
    })
  }

  while (queue.length > 0) {
    const { researcher, depth } = queue.shift()!
    const researcherKey = normalizeId(researcher.id)

    if (visited.has(researcherKey)) {
      continue
    }
    visited.add(researcherKey)

    const currentNodeId = ensureNodeForResearcher(researcher, depth, depth === 0 ? 'seed' : 'researcher')
    const currentPublications = publicationsByResearcherId.get(researcherKey) ?? []

    for (const publication of currentPublications) {
      const collaborators = parseCollaborators(publication.collaborators)

      for (const collaboratorName of collaborators) {
        if (normalizeKey(collaboratorName) === normalizeKey(researcher.name)) {
          continue
        }

        const matchedResearcher = researcherByName.get(normalizeKey(collaboratorName))
        if (matchedResearcher) {
          const collaboratorNodeId = ensureNodeForResearcher(matchedResearcher, depth + 1)
          addLink(currentNodeId, collaboratorNodeId, publication.paper_title)

          const matchedKey = normalizeId(matchedResearcher.id)
          if (!visited.has(matchedKey) && depth < MAX_DEPTH) {
            queue.push({ researcher: matchedResearcher, depth: depth + 1 })
          }
        } else {
          const collaboratorNodeId = ensureCollaboratorNode(collaboratorName, depth + 1)
          addLink(currentNodeId, collaboratorNodeId, publication.paper_title)
        }
      }
    }
  }

  for (const link of linkMap.values()) {
    degrees.set(link.source, (degrees.get(link.source) ?? 0) + link.weight)
    degrees.set(link.target, (degrees.get(link.target) ?? 0) + link.weight)
  }

  const nodes = Array.from(nodeMap.values()).map((node) => ({
    ...node,
    degree: degrees.get(node.id) ?? 0,
    publicationCount: node.publicationCount ?? 0,
    val:
      node.kind === 'seed'
        ? 18
        : node.kind === 'researcher'
          ? Math.max(10, 6 + (degrees.get(node.id) ?? 0))
          : Math.max(6, 4 + Math.min(8, degrees.get(node.id) ?? 0)),
  }))

  const links = Array.from(linkMap.values()).sort((a, b) => b.weight - a.weight)

  return {
    nodes,
    links,
    stats: {
      researchNodes: nodes.filter((node) => node.kind !== 'collaborator').length,
      collaboratorNodes: nodes.filter((node) => node.kind === 'collaborator').length,
      linkCount: links.length,
      publicationCount: publicationsByResearcherId.get(normalizeId(rootResearcher.id))?.length ?? 0,
      maxDepth: MAX_DEPTH,
    },
  }
}
