import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { JugConfig, SearchAlgorithm, Hint, JugState, SearchAnalytics, SearchTreeNode } from './types';

// --- SEARCH TREE VISUALIZER ---
interface SearchTreeVisualizerProps {
  nodes: SearchTreeNode[];
  algorithm?: SearchAlgorithm;
}

export const SearchTreeVisualizer: React.FC<SearchTreeVisualizerProps> = ({ nodes, algorithm = 'BFS' }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = 1000;
    const height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Add zoom capability
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setScale(event.transform.k);
      });
    
    svg.call(zoom);

    // Convert flat nodes to d3 hierarchy
    const stratify = d3.stratify<SearchTreeNode>()
      .id(d => d.id)
      .parentId(d => d.parentId);

    try {
      const root = stratify(nodes);
      const treeLayout = d3.tree<SearchTreeNode>().size([height - 100, width - 200]);
      treeLayout(root);

      g.attr('transform', 'translate(60, 40)');

      // Links with gradient
      const defs = g.append('defs');
      defs.append('marker')
        .attr('id', 'arrowGreen')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 9)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth')
        .append('path')
        .attr('d', 'M0,0 L0,6 L9,3 z')
        .attr('fill', '#10b981');

      defs.append('marker')
        .attr('id', 'arrowBlue')
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('refX', 9)
        .attr('refY', 3)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth')
        .append('path')
        .attr('d', 'M0,0 L0,6 L9,3 z')
        .attr('fill', '#4f46e5');

      // Links
      g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal<any, any>()
          .x(d => d.y)
          .y(d => d.x))
        .attr('fill', 'none')
        .attr('stroke', d => (d.target.data.isPath ? '#4f46e5' : '#cbd5e1'))
        .attr('stroke-width', d => (d.target.data.isPath ? 2.5 : 1.5))
        .attr('opacity', d => (d.target.data.isPath ? 0.8 : 0.4))
        .attr('marker-end', d => `url(#${d.target.data.isPath ? 'arrowBlue' : 'arrowGreen'})`);

      // Nodes
      const node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`);

      // Node circles with better styling
      node.append('circle')
        .attr('r', d => (d.data.isPath ? 7 : 5.5))
        .attr('fill', d => (d.data.isPath ? '#4f46e5' : '#ffffff'))
        .attr('stroke', d => (d.data.isPath ? '#2d1ee5' : '#94a3b8'))
        .attr('stroke-width', 2.5)
        .attr('filter', d => (d.data.isPath ? 'drop-shadow(0 0 3px rgba(79, 70, 229, 0.4))' : 'none'));

      // State text
      node.append('text')
        .attr('dy', '.3em')
        .attr('x', d => (d.children ? -12 : 12))
        .attr('text-anchor', d => (d.children ? 'end' : 'start'))
        .attr('font-size', '11px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text(d => `[${d.data.state.join(',')}]`)
        .attr('fill', d => (d.data.isPath ? '#1f2937' : '#64748b'))
        .style('pointer-events', 'none');

      // Depth indicator
      node.append('text')
        .attr('dy', '1.8em')
        .attr('x', d => (d.children ? -12 : 12))
        .attr('text-anchor', d => (d.children ? 'end' : 'start'))
        .attr('font-size', '8px')
        .attr('font-family', 'sans-serif')
        .attr('font-weight', '500')
        .text(d => `d=${d.data.depth}`)
        .attr('fill', '#94a3b8')
        .attr('opacity', 0.7)
        .style('pointer-events', 'none');

      // Heuristic labels - ONLY for A* algorithm
      if (algorithm === 'A*') {
        // removed background rect for A* heuristic box to avoid overlap and clutter

        node.append('text')
          .attr('dy', '3.2em')
          .attr('x', d => (d.children ? -37 : 53))
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .attr('font-weight', '700')
          .text(d => d.data.heuristic !== undefined ? `h=${d.data.heuristic}` : '')
          .attr('fill', '#c2410c')
          .style('pointer-events', 'none');

        node.append('text')
          .attr('dy', '4.9em')
          .attr('x', d => (d.children ? -37 : 53))
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', '700')
          .text(d => d.data.gCost !== undefined ? `g=${d.data.gCost}` : '')
          .attr('fill', '#047857')
          .style('pointer-events', 'none');

        node.append('text')
          .attr('dy', '6.6em')
          .attr('x', d => (d.children ? -37 : 53))
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', '700')
          .text(d => d.data.fCost !== undefined ? `f=${d.data.fCost}` : '')
          .attr('fill', '#0369a1')
          .style('pointer-events', 'none');
      }

    } catch (e) {
      console.error('Failed to render tree:', e);
    }
  }, [nodes, algorithm]);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Search Tree</p>
          <span className="text-xs font-bold text-slate-400">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''} explored
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold">Zoom:</span>
          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">{scale.toFixed(1)}x</span>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full overflow-auto bg-white rounded-2xl border border-slate-200 p-2 shadow-inner"
        style={{ height: '500px' }}
      >
        <svg 
          ref={svgRef} 
          width="1000" 
          height="600" 
          className="cursor-grab active:cursor-grabbing bg-gradient-to-br from-slate-50 to-white"
          style={{ minWidth: '1000px', minHeight: '600px' }}
        />
      </div>
      
      <div className="flex flex-wrap gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-400"></div>
          <span className="text-slate-600">Explored Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-indigo-800"></div>
          <span className="text-slate-600">Solution Path</span>
        </div>
        {algorithm === 'A*' && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-5 bg-yellow-100 border border-yellow-500 rounded"></div>
            <span className="text-slate-600">h,g,f values</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- JUG COMPONENT ---
interface JugProps {
  capacity: number;
  current: number;
  index: number;
  onFill: (index: number) => void;
  onEmpty: (index: number) => void;
  onSelect: (index: number) => void;
  isSelected: boolean;
  isTarget: boolean;
}

export const Jug: React.FC<JugProps> = ({ capacity, current, index, onFill, onEmpty, onSelect, isSelected, isTarget }) => {
  const fillPercentage = (current / capacity) * 100;
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="relative group">
        <div onClick={() => onSelect(index)} className={`relative w-32 h-48 border-4 border-slate-700 rounded-b-2xl overflow-hidden cursor-pointer transition-all duration-300 ${isSelected ? 'ring-4 ring-indigo-500 border-indigo-500 scale-105' : 'hover:border-slate-500'} ${isTarget ? 'ring-4 ring-emerald-500 border-emerald-500' : ''} bg-slate-50/50 backdrop-blur-sm`}>
          <motion.div initial={{ height: 0 }} animate={{ height: `${fillPercentage}%` }} transition={{ type: 'spring', stiffness: 50, damping: 15 }} className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 opacity-80">
            <div className="absolute top-0 left-0 w-full h-2 bg-white/20 animate-pulse" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-800 font-bold text-lg drop-shadow-sm">{current}L / {capacity}L</span>
          </div>
        </div>
        <div className="absolute -top-12 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onFill(index); }} className="p-2 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>
          <button onClick={(e) => { e.stopPropagation(); onEmpty(index); }} className="p-2 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
        </div>
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-slate-700">Jug {index + 1}</h3>
        <p className="text-xs text-slate-500 uppercase tracking-wider">Capacity: {capacity}L</p>
      </div>
    </div>
  );
};

// --- SETUP PANEL ---
interface SetupPanelProps {
  onStart: (config: JugConfig, algorithm: SearchAlgorithm) => void;
  isGameActive: boolean;
  isGameCompleted: boolean;
}

export const SetupPanel: React.FC<SetupPanelProps> = ({ onStart, isGameActive, isGameCompleted }) => {
  const [numJugs, setNumJugs] = React.useState(2);
  const [capacities, setCapacities] = React.useState<number[]>([5, 3]);
  const [initialState, setInitialState] = React.useState<number[]>([5, 0]);
  const [goalState, setGoalState] = React.useState<number[]>([4, 0]);
  const [algorithm, setAlgorithm] = React.useState<SearchAlgorithm>('BFS');

  const handleNumJugsChange = (n: number) => {
    const val = Math.max(2, Math.min(5, n));
    setNumJugs(val);
    setCapacities(Array(val).fill(5).map((v, i) => capacities[i] || v));
    setInitialState(Array(val).fill(0).map((v, i) => initialState[i] || v));
    setGoalState(Array(val).fill(0).map((v, i) => goalState[i] || v));
  };

  const handleRandomize = () => {
    const newCapacities = capacities.map(() => Math.floor(Math.random() * 10) + 2);
    setCapacities(newCapacities);
    setInitialState(newCapacities.map(() => 0));
    setGoalState(newCapacities.map((c) => Math.floor(Math.random() * (c + 1))));
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Problem Setup</h2>
        <button 
          onClick={handleRandomize}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
        >
          Randomize
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Number of Jugs: {numJugs}</label>
          <input 
            type="range" min="2" max="5" value={numJugs} 
            onChange={(e) => handleNumJugsChange(parseInt(e.target.value))} 
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">AI Strategy</label>
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as SearchAlgorithm)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 ring-indigo-500">
            <option value="BFS">BFS (Shortest Path)</option>
            <option value="DFS">DFS (Deep Search)</option>
            <option value="IDDFS">IDDFS (Optimal DFS)</option>
            <option value="UCS">UCS (Cost Based)</option>
            <option value="A*">A* (Heuristic Search)</option>
          </select>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Jugs</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-28 text-[10px] font-bold text-slate-400 uppercase">Capacity</div>
              {Array.from({ length: numJugs }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-xs font-semibold text-slate-500 mb-1 uppercase">Jug {i + 1}</div>
                  <input
                    type="number"
                    value={capacities[i]}
                    onChange={(e) => { const n = [...capacities]; n[i] = parseInt(e.target.value) || 0; setCapacities(n); }}
                    className="w-20 bg-white border border-slate-200 rounded px-2 py-2 text-sm font-semibold"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-28 text-[10px] font-bold text-slate-400 uppercase">Initial</div>
              {Array.from({ length: numJugs }).map((_, i) => (
                <input
                  key={i}
                  type="number"
                  value={initialState[i]}
                  onChange={(e) => { const n = [...initialState]; n[i] = parseInt(e.target.value) || 0; setInitialState(n); }}
                  className="w-20 bg-white border border-slate-200 rounded px-2 py-2 text-sm font-semibold"
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-28 text-[10px] font-bold text-slate-400 uppercase">Goal</div>
              {Array.from({ length: numJugs }).map((_, i) => (
                <input
                  key={i}
                  type="number"
                  value={goalState[i]}
                  onChange={(e) => { const n = [...goalState]; n[i] = parseInt(e.target.value) || 0; setGoalState(n); }}
                  className="w-20 bg-white border border-slate-200 rounded px-2 py-2 text-sm font-semibold"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <button 
        onClick={() => onStart({ capacities, initialState, goalState }, algorithm)} 
        disabled={isGameActive && !isGameCompleted}
        className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
          (isGameActive && !isGameCompleted)
            ? 'bg-slate-400 cursor-not-allowed opacity-75' 
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
        }`}
      >
        {isGameActive && !isGameCompleted ? '▶ Game in Progress' : isGameCompleted ? '🔄 Play Again' : '🎮 Start Puzzle'}
      </button>
    </div>
  );
};

// --- ASSISTANT PANEL ---
interface AssistantPanelProps {
  moveCount: number;
  currentState: JugState;
  goalState: JugState;
  hint: Hint | null;
  onGetHint: () => void;
  onAutoSolve: () => void;
  onViewSolution: () => void;
  onReset: () => void;
  isSolving: boolean;
  analytics: SearchAnalytics | null;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ moveCount, currentState, goalState, hint, onGetHint, onAutoSolve, onViewSolution, onReset, isSolving, analytics }) => {
  return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-6">
      <h2 className="text-xl font-bold text-slate-800">AI Assistant</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
          <p className="text-[10px] font-bold text-indigo-400 uppercase">Moves</p>
          <p className="text-2xl font-black text-indigo-600">{moveCount}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Current State</p>
          <p className="text-sm font-mono font-bold text-emerald-600">[{currentState.join(',')}]</p>
        </div>
      </div>
      <div className="space-y-2">
        <button onClick={onGetHint} disabled={isSolving} className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 active:scale-95">Get Hint</button>
        <button onClick={onAutoSolve} disabled={isSolving} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 active:scale-95">Auto Solve</button>
        <button onClick={onViewSolution} disabled={isSolving} className="w-full py-2 text-indigo-500 font-bold hover:text-indigo-700 transition-colors text-xs uppercase tracking-widest">View Full Solution</button>
        <button onClick={onReset} className="w-full py-2 text-slate-400 font-semibold hover:text-slate-600 text-sm">Reset Game</button>
      </div>
      <AnimatePresence mode="wait">
        {hint && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 shadow-sm">
            <p className="font-bold mb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              AI Suggestion
            </p>
            {hint.message}
          </motion.div>
        )}
      </AnimatePresence>
      {analytics && (
        <div className="p-4 bg-slate-900 rounded-2xl text-slate-300 text-[10px] font-mono space-y-1 shadow-inner">
          <p className="text-indigo-400 font-bold mb-2 uppercase tracking-tighter flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            AI Thinking ({analytics.algorithm})
          </p>
          <div className="flex justify-between"><span>Nodes Expanded:</span><span className="text-white">{analytics.nodesExpanded}</span></div>
          <div className="flex justify-between"><span>Frontier Size:</span><span className="text-white">{analytics.frontierSize}</span></div>
          <div className="flex justify-between"><span>Time Taken:</span><span className="text-white">{analytics.timeTakenMs.toFixed(2)}ms</span></div>
          {analytics.currentHeuristic !== undefined && (
            <div className="flex justify-between pt-1 border-t border-slate-800 mt-1">
              <span className="text-emerald-400">Heuristic h(n):</span>
              <span className="text-emerald-400 font-bold">{analytics.currentHeuristic}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-auto pt-6 border-t border-slate-100">
        <details className="group" open>
          <summary className="flex items-center justify-between cursor-pointer list-none text-[10px] font-black text-slate-400 uppercase tracking-widest">
            How AI is used
            <svg className="w-3 h-3 group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </summary>
          <div className="mt-3 text-[10px] text-slate-500 leading-relaxed space-y-3">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-bold text-slate-700 mb-1">State Space Search</p>
              <p>The AI models every possible water configuration as a <strong>Node</strong>. It then searches for a path from your <em>Current State</em> to the <em>Goal State</em>.</p>
            </div>
            {analytics?.algorithm === 'A*' && (
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="font-bold text-emerald-700 mb-1">A* Heuristic (Manhattan)</p>
                <p>A* uses <code>h(n) = Σ |current_i - goal_i|</code> to estimate the distance. It prioritizes nodes where this value is lowest.</p>
              </div>
            )}
            <p>When you click "Get Hint", the AI runs the <strong>{analytics?.algorithm || 'BFS'}</strong> algorithm to find the most efficient next step.</p>
          </div>
        </details>
      </div>
    </div>
  );
};

// --- EDUCATION PANEL ---
export const EducationPanel: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200 space-y-8">
      <h2 className="text-4xl font-black text-slate-800 text-center">How the AI Solves Water-Jug Puzzles</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700">Modeling the Problem</h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-600">The AI treats each possible distribution of water as a <strong>state</strong>. From any state, a small set of <strong>actions</strong> (fill, empty, pour) produce new states. The collection of states and actions forms a state graph that the search algorithms explore.</p>
          </div>

          <h3 className="text-lg font-bold text-slate-700">Search Concepts</h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-sm text-slate-600">
            <p><strong>Frontier:</strong> the set of candidate states the algorithm will expand next.</p>
            <p><strong>Visited:</strong> states already expanded (to avoid repeats).</p>
            <p><strong>Path / g(n):</strong> the cost from the start state to the current state (we count 1 per move).</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700">Algorithms in the App</h3>
          <div className="grid gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="font-bold text-emerald-800">BFS — Breadth-First Search</p>
              <p className="text-sm text-emerald-700">Explores states by increasing number of moves. Guarantees the shortest-move solution when all moves cost equally.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="font-bold text-slate-800">DFS / IDDFS — Depth-First / Iterative Deepening</p>
              <p className="text-sm text-slate-600">DFS dives deep along branches (may be faster but not optimal). IDDFS runs DFS with increasing depth limits to get DFS memory benefits while still finding short solutions.</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="font-bold text-indigo-800">UCS — Uniform Cost Search</p>
              <p className="text-sm text-indigo-700">Expands states by lowest path cost (g). Equivalent to Dijkstra for unit-cost moves — finds least-cost solutions when move costs vary.</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="font-bold text-amber-700">A* — Heuristic Search</p>
              <p className="text-sm text-amber-700">Uses both the cost so far <strong>g(n)</strong> and an estimate of remaining cost <strong>h(n)</strong> to prioritize nodes by <strong>f(n)=g+h</strong>. We use a simple admissible heuristic: Σ |current_i − goal_i|.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
        <h3 className="text-sm font-bold text-slate-700 mb-2">How the App Uses the AI</h3>
        <ul className="text-sm text-slate-600 list-inside space-y-2">
          <li><strong>Get Hint:</strong> runs the selected algorithm from the <em>current</em> state and returns the next move from the found solution (if any).</li>
          <li><strong>View Solution:</strong> solves from the current state and displays the full path and analytics (nodes expanded, time, frontier size).</li>
          <li><strong>Auto Solve:</strong> plays the moves from the computed solution one at a time so you can watch the AI reach the goal.</li>
        </ul>

        <p className="mt-3 text-xs text-slate-500">Notes: the visual search tree shows nodes discovered by the algorithm for debugging and learning. In A*, tie-breaking between equal f-values is implementation-dependent and may change the exact order of exploration without affecting correctness.</p>
      </div>
    </div>
  );
};
