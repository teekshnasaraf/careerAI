import {
  SKILL_PREREQUISITES,
  PREREQUISITE_MAP,
  canonicalizeSkillName,
  type SkillPrerequisiteDefinition,
} from "../data/skills/skillDependencyGraph";
import { SKILL_TAXONOMY, type SkillCategory } from "../data/skills/skillTaxonomy";
import type { RequirementPriority } from "./jobDescription.service";

export interface SkillGraphNode {
  name: string; // Canonical skill name
  category: SkillCategory | string;
  isDemonstrated: boolean; // Present on user's resume
  isJobRequirement: boolean; // Explicitly in target job description
  jobPriority?: RequirementPriority | "prerequisite";
  priorityWeight: number; // 1.0 (req), 0.75 (unspec), 0.5 (pref), 0.9 (urgent prereq unlocking required)
  prerequisites: string[]; // Immediate prerequisite skills
  dependents: string[]; // Immediate skills unlocked by this skill
  unlockedTargetSkills: string[]; // Target job requirements enabled downstream by this skill
  status: "not_started" | "in_progress" | "completed";
}

export interface SkillGraphEdge {
  from: string; // Prerequisite skill
  to: string; // Dependent skill
  type: "prerequisite";
}

export interface SkillDependencyGraph {
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
  totalTargetSkills: number;
  totalPrerequisites: number;
  demonstratedCount: number;
  unmetCount: number;
}

export interface DAGValidationResult {
  isValid: boolean;
  cycle?: string[];
  error?: string;
}

export interface DependencyExpansionResult {
  allSkillsToLearn: string[]; // Canonical names in optimal topological order
  targetSkills: string[]; // Directly missing from JD
  unmetPrerequisites: string[]; // Prerequisite skills discovered via graph expansion
  demonstratedPrerequisites: string[]; // Prerequisites satisfied by resume
  graph: SkillDependencyGraph;
}

/**
 * Validates that an adjacency map of dependencies forms a Directed Acyclic Graph (DAG).
 *
 * Algorithm: Depth-First Search with 3-Color Marking.
 * - WHITE (0): Unvisited
 * - GRAY (1): Currently in the recursion call stack (visiting)
 * - BLACK (2): Completely explored and backtrack verified (visited)
 *
 * If a neighbor in state GRAY is encountered, a back-edge exists, indicating a cycle.
 *
 * Time Complexity: O(V + E) where V is the number of skills and E is prerequisite edges.
 * Space Complexity: O(V) for the recursion stack and visited state tracking.
 */
export const validateDAG = (adjacency: Map<string, string[]>): DAGValidationResult => {
  const state = new Map<string, 0 | 1 | 2>();
  const parent = new Map<string, string | null>();

  for (const node of adjacency.keys()) {
    state.set(node, 0);
  }

  const cyclePath: string[] = [];

  const dfs = (node: string): boolean => {
    state.set(node, 1); // GRAY: visiting

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      const neighborState = state.get(neighbor) ?? 0;

      if (neighborState === 1) {
        // Cycle detected: backtrack from current node to neighbor to reconstruct cycle
        cyclePath.push(neighbor);
        let curr: string | null = node;
        while (curr && curr !== neighbor) {
          cyclePath.push(curr);
          curr = parent.get(curr) || null;
        }
        cyclePath.push(neighbor);
        cyclePath.reverse();
        return false;
      }

      if (neighborState === 0) {
        parent.set(neighbor, node);
        if (!dfs(neighbor)) return false;
      }
    }

    state.set(node, 2); // BLACK: visited
    return true;
  };

  for (const node of adjacency.keys()) {
    if (state.get(node) === 0) {
      if (!dfs(node)) {
        return {
          isValid: false,
          cycle: cyclePath,
          error: `Cycle detected in skill dependency graph: ${cyclePath.join(" -> ")}`,
        };
      }
    }
  }

  return { isValid: true };
};

/**
 * Pre-validation check: Verifies that the repository's curated prerequisite graph is a valid DAG.
 */
export const validateCuratedSkillGraph = (): DAGValidationResult => {
  const adjacency = new Map<string, string[]>();
  for (const item of SKILL_PREREQUISITES) {
    if (!adjacency.has(item.skill)) adjacency.set(item.skill, []);
    for (const prereq of item.prerequisites) {
      if (!adjacency.has(prereq)) adjacency.set(prereq, []);
      // Edge: prereq -> skill (prerequisite points to dependent)
      adjacency.get(prereq)!.push(item.skill);
    }
  }
  return validateDAG(adjacency);
};

/**
 * Canonical taxonomy category lookup.
 */
const getCategoryForSkill = (skillName: string): string => {
  const match = SKILL_TAXONOMY.find(
    (t) => t.name.toLowerCase() === skillName.toLowerCase()
  );
  return match?.category || "Technical Skill";
};

/**
 * Expands missing job skills through the dependency graph, discovers unmet prerequisites,
 * excludes skills the candidate already possesses, and performs topological sorting.
 *
 * Algorithm & Workflow:
 * 1. Normalize all inputs to canonical skill taxonomy names.
 * 2. Starting from missing skills, traverse the prerequisite graph backwards (upstream)
 *    to find all transitive prerequisites.
 * 3. Filter out prerequisites that the candidate has already demonstrated on their resume.
 * 4. Deduplicate shared prerequisites across multiple target requirements.
 * 5. Construct a subgraph of (unmet target skills + unmet prerequisites).
 * 6. Topologically sort the subgraph using Kahn's algorithm with priority-weighted tie-breaking:
 *    - In-degree 0 nodes (no remaining unmet prerequisites) are queued first.
 *    - Ties are broken deterministically by:
 *      (a) Highest effective priority weight (Required > Prerequisite for Required > Unspecified > Preferred).
 *      (b) Highest number of downstream target skills unlocked.
 *      (c) Alphabetical name for deterministic stability.
 *
 * Guarantees:
 * - Every prerequisite strictly precedes the skills that depend on it.
 * - Deduplication prevents repeat steps.
 * - Deterministic ordering for identical inputs.
 *
 * Complexity:
 * - Time: O(V_sub log V_sub + E_sub)
 * - Space: O(V_sub + E_sub)
 */
export const buildPersonalizedSkillRoadmap = ({
  missingSkills,
  demonstratedSkills = [],
  completedSkills = [],
  customGraphDefinitions,
}: {
  missingSkills: Array<{ name: string; priority: RequirementPriority }>;
  demonstratedSkills?: string[];
  completedSkills?: string[];
  customGraphDefinitions?: SkillPrerequisiteDefinition[];
}): DependencyExpansionResult => {
  // Normalize candidate's demonstrated and already completed skills into Sets of canonical names
  const demonstratedSet = new Set(
    demonstratedSkills.map((s) => canonicalizeSkillName(s).toLowerCase()).filter(Boolean)
  );
  const completedSet = new Set(
    completedSkills.map((s) => canonicalizeSkillName(s).toLowerCase()).filter(Boolean)
  );

  // Active prerequisite map (curated or custom extended)
  const activePrereqMap = new Map<string, string[]>();
  const definitions = customGraphDefinitions || SKILL_PREREQUISITES;
  for (const def of definitions) {
    const canonicalTarget = canonicalizeSkillName(def.skill);
    const canonicalPrereqs = def.prerequisites.map((p) => canonicalizeSkillName(p));
    activePrereqMap.set(canonicalTarget, canonicalPrereqs);
  }

  // Pre-validate that active graph definitions form a valid DAG (prereq -> target)
  const definitionAdjacency = new Map<string, string[]>();
  for (const [target, prereqs] of activePrereqMap.entries()) {
    if (!definitionAdjacency.has(target)) definitionAdjacency.set(target, []);
    for (const prereq of prereqs) {
      if (!definitionAdjacency.has(prereq)) definitionAdjacency.set(prereq, []);
      definitionAdjacency.get(prereq)!.push(target);
    }
  }
  const preValidation = validateDAG(definitionAdjacency);
  if (!preValidation.isValid) {
    throw new Error(preValidation.error || "Cycle detected in skill dependency definitions");
  }

  // Normalize target missing skills from job description
  const targetPriorityMap = new Map<string, RequirementPriority>();
  for (const item of missingSkills) {
    const canonical = canonicalizeSkillName(item.name);
    if (!canonical) continue;
    // Elevate priority if repeated: required > unspecified > preferred
    const existing = targetPriorityMap.get(canonical);
    if (!existing) {
      targetPriorityMap.set(canonical, item.priority);
    } else {
      const priorityOrder: Record<RequirementPriority, number> = {
        required: 3,
        unspecified: 2,
        preferred: 1,
      };
      if (priorityOrder[item.priority] > priorityOrder[existing]) {
        targetPriorityMap.set(canonical, item.priority);
      }
    }
  }

  // Transitive dependency expansion: upstream DFS/BFS from target missing skills
  const allNeededSkills = new Set<string>();
  const unmetPrerequisites = new Set<string>();
  const demonstratedPrerequisites = new Set<string>();
  const downstreamDependentsMap = new Map<string, Set<string>>(); // prereq -> target skills that need it

  const visitUpstream = (
    skillName: string,
    rootTargetSkill: string,
    chain = new Set<string>()
  ) => {
    if (chain.has(skillName)) {
      throw new Error(`Cycle detected in skill dependency graph: ${Array.from(chain).join(" -> ")} -> ${skillName}`);
    }
    const nextChain = new Set(chain);
    nextChain.add(skillName);

    const prereqs = activePrereqMap.get(skillName) || [];
    for (const prereq of prereqs) {
      // Record downstream mapping
      if (!downstreamDependentsMap.has(prereq)) {
        downstreamDependentsMap.set(prereq, new Set());
      }
      downstreamDependentsMap.get(prereq)!.add(rootTargetSkill);

      const prereqLower = prereq.toLowerCase();
      const isDemonstrated = demonstratedSet.has(prereqLower);

      if (isDemonstrated) {
        demonstratedPrerequisites.add(prereq);
        // Candidate already has this prerequisite; no need to traverse further upstream
        continue;
      }

      // Candidate does NOT possess this prerequisite
      allNeededSkills.add(prereq);
      if (!targetPriorityMap.has(prereq)) {
        unmetPrerequisites.add(prereq);
      }

      visitUpstream(prereq, rootTargetSkill, nextChain);
    }
  };

  for (const target of targetPriorityMap.keys()) {
    allNeededSkills.add(target);
    visitUpstream(target, target);
  }

  // Filter out any skills that the candidate has already demonstrated (unless explicitly missing)
  const skillsToOrder = Array.from(allNeededSkills).filter(
    (skill) => !demonstratedSet.has(skill.toLowerCase()) || targetPriorityMap.has(skill)
  );

  // Build subgraph adjacency: prereq -> dependent (forward direction for topological order)
  const forwardAdjacency = new Map<string, string[]>();
  const backwardAdjacency = new Map<string, string[]>(); // dependent -> prerequisites
  const inDegree = new Map<string, number>();

  for (const skill of skillsToOrder) {
    forwardAdjacency.set(skill, []);
    backwardAdjacency.set(skill, []);
    inDegree.set(skill, 0);
  }

  for (const skill of skillsToOrder) {
    const immediatePrereqs = activePrereqMap.get(skill) || [];
    for (const prereq of immediatePrereqs) {
      if (skillsToOrder.includes(prereq)) {
        forwardAdjacency.get(prereq)!.push(skill);
        backwardAdjacency.get(skill)!.push(prereq);
        inDegree.set(skill, (inDegree.get(skill) || 0) + 1);
      }
    }
  }

  // Verify that the personalized subgraph is a DAG
  const validation = validateDAG(forwardAdjacency);
  if (!validation.isValid) {
    throw new Error(validation.error || "Cycle detected in personalized learning graph");
  }

  // Effective Priority Weights for sorting ready nodes:
  // - Required: 1.0
  // - Prerequisite unlocking a Required target: 0.95
  // - Unspecified: 0.75
  // - Prerequisite unlocking an Unspecified target: 0.70
  // - Preferred: 0.50
  // - Prerequisite unlocking a Preferred target: 0.45
  const getEffectivePriorityWeight = (skill: string): number => {
    const directPriority = targetPriorityMap.get(skill);
    if (directPriority === "required") return 1.0;
    if (directPriority === "unspecified") return 0.75;
    if (directPriority === "preferred") return 0.5;

    // Prerequisite: evaluate highest priority target skill it unlocks
    const unlockedTargets = downstreamDependentsMap.get(skill) || new Set();
    let maxWeight = 0.4;
    for (const target of unlockedTargets) {
      const p = targetPriorityMap.get(target);
      if (p === "required") maxWeight = Math.max(maxWeight, 0.95);
      else if (p === "unspecified") maxWeight = Math.max(maxWeight, 0.70);
      else if (p === "preferred") maxWeight = Math.max(maxWeight, 0.45);
    }
    return maxWeight;
  };

  // Kahn's Algorithm for Topological Sorting with deterministic Priority Tie-Breaking
  const readyQueue: string[] = [];
  for (const [skill, deg] of inDegree.entries()) {
    if (deg === 0) {
      readyQueue.push(skill);
    }
  }

  const sortReadyQueue = (queue: string[]) => {
    queue.sort((a, b) => {
      // 1. Higher effective priority weight first
      const weightDiff = getEffectivePriorityWeight(b) - getEffectivePriorityWeight(a);
      if (Math.abs(weightDiff) > 0.001) return weightDiff;

      // 2. More downstream skills unlocked first
      const aDependents = forwardAdjacency.get(a)?.length || 0;
      const bDependents = forwardAdjacency.get(b)?.length || 0;
      if (aDependents !== bDependents) return bDependents - aDependents;

      // 3. Alphabetical tie-breaking for guaranteed repeatability
      return a.localeCompare(b);
    });
  };

  sortReadyQueue(readyQueue);

  const orderedSequence: string[] = [];

  while (readyQueue.length > 0) {
    const current = readyQueue.shift()!;
    orderedSequence.push(current);

    const dependents = forwardAdjacency.get(current) || [];
    for (const dep of dependents) {
      const newDeg = (inDegree.get(dep) || 1) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) {
        readyQueue.push(dep);
      }
    }
    sortReadyQueue(readyQueue);
  }

  // Build rich Graph Nodes and Edges for UI and Graph Visualization
  const graphNodes: SkillGraphNode[] = orderedSequence.map((skill) => {
    const isDirect = targetPriorityMap.has(skill);
    const directPriority = targetPriorityMap.get(skill);
    const effectivePriority = isDirect ? directPriority! : "prerequisite";
    const weight = getEffectivePriorityWeight(skill);
    const prereqs = backwardAdjacency.get(skill) || [];
    const dependents = forwardAdjacency.get(skill) || [];
    const unlockedTargets = Array.from(downstreamDependentsMap.get(skill) || []);

    const isCompleted = completedSet.has(skill.toLowerCase());
    const status = isCompleted ? "completed" : "not_started";

    return {
      name: skill,
      category: getCategoryForSkill(skill),
      isDemonstrated: false,
      isJobRequirement: isDirect,
      jobPriority: effectivePriority,
      priorityWeight: weight,
      prerequisites: prereqs,
      dependents,
      unlockedTargetSkills: unlockedTargets,
      status,
    };
  });

  const graphEdges: SkillGraphEdge[] = [];
  for (const skill of orderedSequence) {
    const dependents = forwardAdjacency.get(skill) || [];
    for (const dep of dependents) {
      graphEdges.push({
        from: skill,
        to: dep,
        type: "prerequisite",
      });
    }
  }

  const graph: SkillDependencyGraph = {
    nodes: graphNodes,
    edges: graphEdges,
    totalTargetSkills: targetPriorityMap.size,
    totalPrerequisites: unmetPrerequisites.size,
    demonstratedCount: demonstratedPrerequisites.size,
    unmetCount: orderedSequence.length,
  };

  return {
    allSkillsToLearn: orderedSequence,
    targetSkills: Array.from(targetPriorityMap.keys()),
    unmetPrerequisites: Array.from(unmetPrerequisites),
    demonstratedPrerequisites: Array.from(demonstratedPrerequisites),
    graph,
  };
};
