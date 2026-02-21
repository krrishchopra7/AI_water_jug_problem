import { solve, getHint, isGoalReached, getPossibleMoves } from './services/solver';
import { JugConfig, SearchAlgorithm } from './types';

// Test utility to validate solver results
function testCase(
  name: string,
  config: JugConfig,
  algorithm: SearchAlgorithm,
  expectedFound: boolean
) {
  console.log(`\n📋 TEST: ${name}`);
  console.log(`   Algorithm: ${algorithm}`);
  console.log(`   Initial: [${config.initialState.join(', ')}]`);
  console.log(`   Goal: [${config.goalState.join(', ')}]`);

  const result = solve(config.initialState, config.goalState, config.capacities, algorithm);
  const passed = (result !== null) === expectedFound;

  if (result) {
    console.log(`   ✅ Solution found: ${result.moves.length} steps`);
    console.log(`   Nodes expanded: ${result.analytics.nodesExpanded}`);
    console.log(`   Time: ${result.analytics.timeTakenMs.toFixed(2)}ms`);
    if (result.analytics.currentHeuristic !== undefined) {
      console.log(`   Initial heuristic h(n): ${result.analytics.currentHeuristic}`);
    }
    if (result.tree && result.tree.length > 0) {
      const hasHeuristics = result.tree.some(n => n.heuristic !== undefined);
      console.log(`   Tree nodes: ${result.tree.length}, Has heuristics: ${hasHeuristics}`);
    }
  } else {
    console.log(`   ❌ No solution found`);
  }

  console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  return passed;
}

// Run test suite
export function runTestSuite() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 WATER JUG SOLVER - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));

  let passCount = 0;
  let totalCount = 0;

  // Test 1: Classic 5-3 problem with BFS
  totalCount++;
  if (testCase(
    'Test 1: Classic 5-3 with BFS',
    {
      capacities: [5, 3],
      initialState: [0, 0],
      goalState: [4, 0]
    },
    'BFS',
    true
  )) passCount++;

  // Test 2: Same problem with A*
  totalCount++;
  if (testCase(
    'Test 2: Classic 5-3 with A*',
    {
      capacities: [5, 3],
      initialState: [0, 0],
      goalState: [4, 0]
    },
    'A*',
    true
  )) passCount++;

  // Test 3: Already at goal
  totalCount++;
  if (testCase(
    'Test 3: Already at goal state',
    {
      capacities: [5, 3],
      initialState: [4, 0],
      goalState: [4, 0]
    },
    'BFS',
    true
  )) passCount++;

  // Test 4: Impossible goal
  totalCount++;
  if (testCase(
    'Test 4: Impossible goal state',
    {
      capacities: [5, 3],
      initialState: [0, 0],
      goalState: [2, 2]
    },
    'BFS',
    false
  )) passCount++;

  // Test 5: Three jugs with DFS
  totalCount++;
  if (testCase(
    'Test 5: Three jugs with DFS',
    {
      capacities: [7, 5, 3],
      initialState: [0, 0, 0],
      goalState: [2, 2, 3]
    },
    'DFS',
    true
  )) passCount++;

  // Test 6: IDDFS complex config
  totalCount++;
  if (testCase(
    'Test 6: Complex 7-4 with IDDFS',
    {
      capacities: [7, 4],
      initialState: [0, 0],
      goalState: [1, 0]
    },
    'IDDFS',
    true
  )) passCount++;

  // Test 7: Single jug edge case
  totalCount++;
  if (testCase(
    'Test 7: Single jug with A*',
    {
      capacities: [10],
      initialState: [0],
      goalState: [5]
    },
    'A*',
    true
  )) passCount++;

  // Test 8: UCS algorithm
  totalCount++;
  if (testCase(
    'Test 8: Two jugs 6-4 with UCS',
    {
      capacities: [6, 4],
      initialState: [0, 0],
      goalState: [2, 0]
    },
    'UCS',
    true
  )) passCount++;

  // Test 9: Four jugs with A*
  totalCount++;
  if (testCase(
    'Test 9: Four jugs with A*',
    {
      capacities: [8, 5, 3, 2],
      initialState: [0, 0, 0, 0],
      goalState: [1, 1, 1, 1]
    },
    'A*',
    true
  )) passCount++;

  // Test 10: Zero in goal with complex transitions
  totalCount++;
  if (testCase(
    'Test 10: Complex transitions (5,3,2) with A*',
    {
      capacities: [5, 3, 2],
      initialState: [5, 0, 0],
      goalState: [0, 3, 2]
    },
    'A*',
    true
  )) passCount++;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 TEST RESULTS: ${passCount}/${totalCount} PASSED ✅`);
  console.log(`${'='.repeat(60)}\n`);

  return passCount === totalCount;
}

// Run tests on module load
runTestSuite();
