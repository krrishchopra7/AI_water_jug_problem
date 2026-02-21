import { JugState, Move, SolverResult, Hint, SearchAlgorithm, SearchAnalytics, SearchTreeNode } from '../types';

export function getPossibleMoves(state: JugState, capacities: number[]): { nextState: JugState; move: Move }[] {
  const moves: { nextState: JugState; move: Move }[] = [];
  const n = state.length;

  for (let i = 0; i < n; i++) {
    // Fill
    if (state[i] < capacities[i]) {
      const next = [...state];
      next[i] = capacities[i];
      moves.push({
        nextState: next,
        move: { type: 'FILL', jugIndex: i, description: `Fill Jug ${i + 1}` }
      });
    }

    // Empty
    if (state[i] > 0) {
      const next = [...state];
      next[i] = 0;
      moves.push({
        nextState: next,
        move: { type: 'EMPTY', jugIndex: i, description: `Empty Jug ${i + 1}` }
      });
    }

    // Pour
    for (let j = 0; j < n; j++) {
      if (i !== j && state[i] > 0 && state[j] < capacities[j]) {
        const amount = Math.min(state[i], capacities[j] - state[j]);
        const next = [...state];
        next[i] -= amount;
        next[j] += amount;
        moves.push({
          nextState: next,
          move: { type: 'POUR', jugIndex: i, targetJugIndex: j, description: `Pour Jug ${i + 1} into Jug ${j + 1}` }
        });
      }
    }
  }

  return moves;
}

export function isGoalReached(state: JugState, goalState: JugState): boolean {
  return state.every((val, idx) => val === goalState[idx]);
}

// Heuristic for A*: Sum of absolute differences from goal
function heuristic(state: JugState, goalState: JugState): number {
  return state.reduce((sum, val, idx) => sum + Math.abs(val - goalState[idx]), 0);
}

class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];
  push(item: T, priority: number) {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  pop(): T | undefined {
    return this.items.shift()?.item;
  }
  get size() { return this.items.length; }
}

export function solve(
  initialState: JugState,
  goalState: JugState,
  capacities: number[],
  algorithm: SearchAlgorithm
): SolverResult | null {
  const startTime = performance.now();
  let nodesExpanded = 0;
  let maxDepth = 0;
  const tree: SearchTreeNode[] = [];
  const MAX_TREE_NODES = 200; // Limit for visualization performance

  const addNodeToTree = (state: JugState, parentId: string | null, depth: number) => {
    if (tree.length < MAX_TREE_NODES) {
      const h = heuristic(state, goalState);
      const g = depth;
      tree.push({ 
        id: JSON.stringify(state), 
        state, 
        parentId, 
        depth,
        heuristic: h,
        gCost: g,
        fCost: g + h
      });
    }
  };

  addNodeToTree(initialState, null, 0);

  if (algorithm === 'BFS') {
    const queue: { state: JugState; path: JugState[]; moves: Move[] }[] = [
      { state: initialState, path: [initialState], moves: [] }
    ];
    const visited = new Set<string>();
    visited.add(JSON.stringify(initialState));

    while (queue.length > 0) {
      const { state, path, moves } = queue.shift()!;
      nodesExpanded++;
      maxDepth = Math.max(maxDepth, path.length - 1);

      if (isGoalReached(state, goalState)) {
        const pathStrings = new Set(path.map(s => JSON.stringify(s)));
        return {
          path, moves,
          tree: tree.map(n => ({ ...n, isPath: pathStrings.has(n.id) })),
          analytics: { 
            algorithm, 
            nodesExpanded, 
            frontierSize: queue.length, 
            timeTakenMs: performance.now() - startTime, 
            maxDepth, 
            solutionDepth: moves.length,
            currentHeuristic: heuristic(initialState, goalState)
          }
        };
      }

      for (const { nextState, move } of getPossibleMoves(state, capacities)) {
        const stateStr = JSON.stringify(nextState);
        if (!visited.has(stateStr)) {
          visited.add(stateStr);
          addNodeToTree(nextState, JSON.stringify(state), path.length);
          queue.push({ state: nextState, path: [...path, nextState], moves: [...moves, move] });
        }
      }
    }
  }

  if (algorithm === 'DFS') {
    const stack: { state: JugState; path: JugState[]; moves: Move[] }[] = [
      { state: initialState, path: [initialState], moves: [] }
    ];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const { state, path, moves } = stack.pop()!;
      const stateStr = JSON.stringify(state);
      if (visited.has(stateStr)) continue;
      visited.add(stateStr);
      
      nodesExpanded++;
      maxDepth = Math.max(maxDepth, path.length - 1);

      if (isGoalReached(state, goalState)) {
        const pathStrings = new Set(path.map(s => JSON.stringify(s)));
        return {
          path, moves,
          tree: tree.map(n => ({ ...n, isPath: pathStrings.has(n.id) })),
          analytics: { 
            algorithm, 
            nodesExpanded, 
            frontierSize: stack.length, 
            timeTakenMs: performance.now() - startTime, 
            maxDepth, 
            solutionDepth: moves.length,
            currentHeuristic: heuristic(initialState, goalState)
          }
        };
      }

      for (const { nextState, move } of getPossibleMoves(state, capacities).reverse()) {
        const nextStr = JSON.stringify(nextState);
        if (!visited.has(nextStr)) {
          addNodeToTree(nextState, JSON.stringify(state), path.length);
          stack.push({ state: nextState, path: [...path, nextState], moves: [...moves, move] });
        }
      }
    }
  }

  if (algorithm === 'IDDFS') {
    // Tree capture for IDDFS is more complex due to multiple passes, 
    // we'll just capture the final successful pass for simplicity
    for (let limit = 0; limit < 1000; limit++) {
      const result = depthLimitedSearch(initialState, goalState, capacities, limit);
      if (result) {
        const pathStrings = new Set(result.path.map(s => JSON.stringify(s)));
        return {
          ...result,
          tree: result.path.map((s, i) => ({
            id: JSON.stringify(s),
            state: s,
            parentId: i > 0 ? JSON.stringify(result.path[i-1]) : null,
            depth: i,
            isPath: true,
            heuristic: heuristic(s, goalState),
            gCost: i,
            fCost: i + heuristic(s, goalState)
          })),
          analytics: { 
            algorithm, 
            nodesExpanded: result.nodesExpanded, 
            frontierSize: 0, 
            timeTakenMs: performance.now() - startTime, 
            maxDepth: limit, 
            solutionDepth: result.moves.length,
            currentHeuristic: heuristic(initialState, goalState)
          }
        };
      }
    }
  }

  if (algorithm === 'UCS' || algorithm === 'A*') {
    const pq = new PriorityQueue<{ state: JugState; path: JugState[]; moves: Move[]; cost: number }>();
    pq.push({ state: initialState, path: [initialState], moves: [], cost: 0 }, 0);
    const visited = new Map<string, number>();
    const inTree = new Set<string>();
    // Mark the initial state as present in the tree to avoid duplicate IDs
    inTree.add(JSON.stringify(initialState));

    while (pq.size > 0) {
      const current = pq.pop()!;
      const stateStr = JSON.stringify(current.state);
      
      if (visited.has(stateStr) && visited.get(stateStr)! <= current.cost) continue;
      visited.set(stateStr, current.cost);
      
      // Add node to tree only when first visited
      if (!inTree.has(stateStr)) {
        const parentId = current.path.length > 1 ? JSON.stringify(current.path[current.path.length - 2]) : null;
        addNodeToTree(current.state, parentId, current.path.length - 1);
        inTree.add(stateStr);
      }

      nodesExpanded++;
      maxDepth = Math.max(maxDepth, current.path.length - 1);

      if (isGoalReached(current.state, goalState)) {
        const pathStrings = new Set(current.path.map(s => JSON.stringify(s)));
        return {
          path: current.path, moves: current.moves,
          tree: tree.map(n => ({ ...n, isPath: pathStrings.has(n.id) })),
          analytics: { 
            algorithm, 
            nodesExpanded, 
            frontierSize: pq.size, 
            timeTakenMs: performance.now() - startTime, 
            maxDepth, 
            solutionDepth: current.moves.length,
            currentHeuristic: heuristic(initialState, goalState)
          }
        };
      }

      for (const { nextState, move } of getPossibleMoves(current.state, capacities)) {
        const nextCost = current.cost + 1;
        const priority = algorithm === 'A*' ? nextCost + heuristic(nextState, goalState) : nextCost;
        const nextStr = JSON.stringify(nextState);
        // Add child to tree when first discovered (consistent with BFS/DFS)
        if (!inTree.has(nextStr) && tree.length < MAX_TREE_NODES) {
          addNodeToTree(nextState, JSON.stringify(current.state), current.path.length);
          inTree.add(nextStr);
        }
        pq.push({ state: nextState, path: [...current.path, nextState], moves: [...current.moves, move], cost: nextCost }, priority);
      }
    }
  }

  return null;
}

function depthLimitedSearch(
  state: JugState,
  goal: JugState,
  capacities: number[],
  limit: number,
  path: JugState[] = [],
  moves: Move[] = [],
  visited: Set<string> = new Set()
): { path: JugState[]; moves: Move[]; nodesExpanded: number } | null {
  if (isGoalReached(state, goal)) return { path: [...path, state], moves, nodesExpanded: 1 };
  if (limit <= 0) return null;

  const stateStr = JSON.stringify(state);
  visited.add(stateStr);
  let totalNodes = 1;

  for (const { nextState, move } of getPossibleMoves(state, capacities)) {
    if (!visited.has(JSON.stringify(nextState))) {
      const result = depthLimitedSearch(nextState, goal, capacities, limit - 1, [...path, state], [...moves, move], new Set(visited));
      if (result) return { ...result, nodesExpanded: totalNodes + result.nodesExpanded };
      totalNodes++;
    }
  }
  return null;
}

export function getHint(
  currentState: JugState,
  goalState: JugState,
  capacities: number[],
  algorithm: SearchAlgorithm = 'BFS'
): Hint | null {
  if (isGoalReached(currentState, goalState)) {
    return {
      nextMove: { type: 'EMPTY', jugIndex: 0, description: 'Goal reached' },
      stepsToGoal: 0,
      message: "You've already reached the goal! Great job."
    };
  }

  const solution = solve(currentState, goalState, capacities, algorithm);
  
  if (!solution) {
    return {
      nextMove: { type: 'EMPTY', jugIndex: 0, description: 'No solution' },
      stepsToGoal: -1,
      message: `The AI (${algorithm}) couldn't find a solution from this state. Try a different strategy or reset.`
    };
  }

  const nextMove = solution.moves[0];
  const stepsToGoal = solution.moves.length;

  let message = '';
  if (nextMove.type === 'FILL') {
    message = `Try filling Jug ${nextMove.jugIndex + 1}.`;
  } else if (nextMove.type === 'EMPTY') {
    message = `Try emptying Jug ${nextMove.jugIndex + 1}.`;
  } else if (nextMove.type === 'POUR') {
    message = `Try pouring Jug ${nextMove.jugIndex + 1} into Jug ${nextMove.targetJugIndex! + 1}.`;
  }

  return {
    nextMove,
    stepsToGoal,
    message: `${message} You are ${stepsToGoal} step${stepsToGoal === 1 ? '' : 's'} away from the goal using ${algorithm}.`
  };
}
