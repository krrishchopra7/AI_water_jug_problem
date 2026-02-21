export type JugState = number[];

export type SearchAlgorithm = 'BFS' | 'DFS' | 'IDDFS' | 'UCS' | 'A*';

export interface JugConfig {
  capacities: number[];
  initialState: JugState;
  goalState: JugState;
}

export interface Move {
  type: 'FILL' | 'EMPTY' | 'POUR';
  jugIndex: number;
  targetJugIndex?: number;
  description: string;
}

export interface SearchTreeNode {
  id: string;
  state: JugState;
  parentId: string | null;
  depth: number;
  isPath?: boolean;
  heuristic?: number;
  gCost?: number;
  fCost?: number;
}

export interface SolverResult {
  path: JugState[];
  moves: Move[];
  analytics: SearchAnalytics;
  tree?: SearchTreeNode[];
}

export interface SearchAnalytics {
  algorithm: SearchAlgorithm;
  nodesExpanded: number;
  frontierSize: number;
  timeTakenMs: number;
  maxDepth: number;
  solutionDepth: number;
  currentHeuristic?: number;
}

export interface Hint {
  nextMove: Move;
  stepsToGoal: number;
  message: string;
}
