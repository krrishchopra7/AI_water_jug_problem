// Standalone A* runner to dump search tree for verification
function heuristic(state, goal) {
  return state.reduce((s, v, i) => s + Math.abs(v - goal[i]), 0);
}
function getPossibleMoves(state, capacities) {
  const moves = [];
  const n = state.length;
  for (let i=0;i<n;i++){
    if (state[i] < capacities[i]){
      const next = state.slice(); next[i]=capacities[i];
      moves.push({ nextState: next, desc: `FILL ${i+1}` });
    }
    if (state[i] > 0){
      const next = state.slice(); next[i]=0;
      moves.push({ nextState: next, desc: `EMPTY ${i+1}` });
    }
    for (let j=0;j<n;j++){
      if (i!==j && state[i]>0 && state[j]<capacities[j]){
        const amt = Math.min(state[i], capacities[j]-state[j]);
        const next = state.slice(); next[i]-=amt; next[j]+=amt;
        moves.push({ nextState: next, desc: `POUR ${i+1}->${j+1}` });
      }
    }
  }
  return moves;
}
class PQ{
  constructor(){ this.items = []; }
  push(item, priority){ this.items.push({item,priority}); this.items.sort((a,b)=>a.priority-b.priority); }
  pop(){ return this.items.shift()?.item; }
  get size(){ return this.items.length; }
}

function stringify(s){ return JSON.stringify(s); }

function solveAstar(initialState, goalState, capacities){
  const tree=[]; const MAX=1000;
  function addNode(state,parent,depth){ if (tree.length<MAX){ const h=heuristic(state,goalState); const g=depth; tree.push({id:stringify(state), state, parentId: parent, depth, heuristic: h, gCost: g, fCost: g+h}); }}
  addNode(initialState,null,0);

  const pq = new PQ();
  pq.push({ state: initialState, path:[initialState], cost:0, moves:[] }, heuristic(initialState,goalState));
  const visited = new Map();
  const inTree = new Set([stringify(initialState)]);

  while(pq.size>0){
    const cur = pq.pop();
    const stateStr = stringify(cur.state);
    if (visited.has(stateStr) && visited.get(stateStr) <= cur.cost) continue;
    visited.set(stateStr, cur.cost);

    // record node if not already in tree
    if (!inTree.has(stateStr)){
      addNode(cur.state, cur.path.length>1?stringify(cur.path[cur.path.length-2]):null, cur.path.length-1);
      inTree.add(stateStr);
    }

    if (stringify(cur.state) === stringify(goalState)){
      const pathStrings = new Set(cur.path.map(stringify));
      // mark isPath
      const annotated = tree.map(n=> ({...n, isPath: pathStrings.has(n.id)}));
      return { path: cur.path, moves: cur.moves, tree: annotated };
    }

    for (const mv of getPossibleMoves(cur.state, capacities)){
      const next = mv.nextState;
      const nextCost = cur.cost + 1;
      const pr = nextCost + heuristic(next, goalState);
      const nextStr = stringify(next);
      if (!inTree.has(nextStr) && tree.length < MAX){ addNode(next, stringify(cur.state), cur.path.length); inTree.add(nextStr); }
      pq.push({ state: next, path: [...cur.path, next], cost: nextCost, moves: [...cur.moves, mv.desc] }, pr);
    }
  }
  return null;
}

const capacities=[5,3];
const initial=[5,0];
const goal=[4,0];

const sol = solveAstar(initial, goal, capacities);
console.log(JSON.stringify(sol, null, 2));
