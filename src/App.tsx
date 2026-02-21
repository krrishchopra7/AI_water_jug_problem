/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Jug, SetupPanel, AssistantPanel, EducationPanel, SearchTreeVisualizer } from './components';
import { JugConfig, JugState, Hint, Move, SolverResult, SearchAlgorithm, SearchAnalytics, SearchTreeNode } from './types';
import { getHint, solve, isGoalReached } from './services/solver';

const STORAGE_KEY = 'water-jug-state';

export default function App() {
  const [activeTab, setActiveTab] = useState<'game' | 'learn'>('game');
  const [config, setConfig] = useState<JugConfig | null>(null);
  const [algorithm, setAlgorithm] = useState<SearchAlgorithm>('BFS');
  const [currentState, setCurrentState] = useState<JugState>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [history, setHistory] = useState<JugState[]>([]);
  const [redoStack, setRedoStack] = useState<JugState[]>([]);
  const [selectedJug, setSelectedJug] = useState<number | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [optimalSolution, setOptimalSolution] = useState<SolverResult | null>(null);
  const [comparisonAlgorithm, setComparisonAlgorithm] = useState<SearchAlgorithm>('BFS');
  const [comparisonSolution, setComparisonSolution] = useState<SolverResult | null>(null);
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [showTree, setShowTree] = useState(false);
  const [searchTree, setSearchTree] = useState<SearchTreeNode[]>([]);

  // Update comparison solution when algorithm changes in modal
  useEffect(() => {
    if (showGoalModal && config) {
      const sol = solve(config.initialState, config.goalState, config.capacities, comparisonAlgorithm);
      setComparisonSolution(sol);
      if (sol?.tree) setSearchTree(sol.tree);
    }
  }, [comparisonAlgorithm, showGoalModal, config]);

  // Persistence: Load from Local Storage (disabled - start fresh each session)
  useEffect(() => {
    // Uncomment below to enable session persistence
    // const saved = localStorage.getItem(STORAGE_KEY);
    // if (saved) {
    //   try {
    //     const parsed = JSON.parse(saved);
    //     setConfig(parsed.config);
    //     setAlgorithm(parsed.algorithm || 'BFS');
    //     setCurrentState(parsed.currentState);
    //     setMoveCount(parsed.moveCount);
    //     setHistory(parsed.history);
    //     setRedoStack(parsed.redoStack || []);
    //   } catch (e) {
    //     console.error("Failed to load state", e);
    //   }
    // }
  }, []);

  // Persistence: Save to Local Storage
  useEffect(() => {
    if (config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        config,
        algorithm,
        currentState,
        moveCount,
        history,
        redoStack
      }));
    }
  }, [config, algorithm, currentState, moveCount, history, redoStack]);

  const handleStart = (newConfig: JugConfig, newAlgorithm: SearchAlgorithm) => {
    setShowGoalModal(false);
    setGameCompleted(false);
    setConfig(newConfig);
    setAlgorithm(newAlgorithm);
    setComparisonAlgorithm(newAlgorithm);
    setCurrentState(newConfig.initialState);
    setMoveCount(0);
    setHistory([newConfig.initialState]);
    setRedoStack([]);
    setSelectedJug(null);
    setHint(null);
    setAnalytics(null);
    setSearchTree([]);
    
    const solution = solve(newConfig.initialState, newConfig.goalState, newConfig.capacities, 'BFS');
    setOptimalSolution(solution);
  };

  const performMove = useCallback((nextState: JugState) => {
    setCurrentState(nextState);
    setMoveCount(prev => prev + 1);
    setHistory(prev => [...prev, nextState]);
    setRedoStack([]); // Clear redo stack on new move
    setSelectedJug(null);
    setHint(null);

    if (config && isGoalReached(nextState, config.goalState)) {
      console.log('Goal reached! Setting showGoalModal to true');
      const sol = solve(config.initialState, config.goalState, config.capacities, algorithm);
      if (sol?.tree) setSearchTree(sol.tree);
      setShowGoalModal(true);
      setGameCompleted(true);
    }
  }, [config, algorithm]);

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      const current = newHistory.pop()!;
      const prev = newHistory[newHistory.length - 1];
      
      setRedoStack(prevRedo => [current, ...prevRedo]);
      setHistory(newHistory);
      setCurrentState(prev);
      setMoveCount(prevCount => prevCount - 1);
      setHint(null);
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const newRedo = [...redoStack];
      const next = newRedo.shift()!;
      
      setHistory(prevHistory => [...prevHistory, next]);
      setRedoStack(newRedo);
      setCurrentState(next);
      setMoveCount(prevCount => prevCount + 1);
      setHint(null);

      if (config && isGoalReached(next, config.goalState)) {
        setShowGoalModal(true);
        setGameCompleted(true);
      }
    }
  };

  const handleFill = (idx: number) => {
    if (!config) return;
    const next = [...currentState];
    next[idx] = config.capacities[idx];
    performMove(next);
  };

  const handleEmpty = (idx: number) => {
    const next = [...currentState];
    next[idx] = 0;
    performMove(next);
  };

  const handleSelect = (idx: number) => {
    if (selectedJug === null) {
      setSelectedJug(idx);
    } else if (selectedJug === idx) {
      setSelectedJug(null);
    } else {
      if (!config) return;
      const amount = Math.min(currentState[selectedJug], config.capacities[idx] - currentState[idx]);
      if (amount > 0) {
        const next = [...currentState];
        next[selectedJug] -= amount;
        next[idx] += amount;
        performMove(next);
      } else {
        setSelectedJug(idx);
      }
    }
  };

  const handleGetHint = () => {
    if (!config) return;
    const h = getHint(currentState, config.goalState, config.capacities, algorithm);
    setHint(h);
    const solution = solve(currentState, config.goalState, config.capacities, algorithm);
    if (solution) {
      setAnalytics(solution.analytics);
      if (solution.tree) setSearchTree(solution.tree);
    }
  };

  const handleAutoSolve = async () => {
    if (!config) return;
    setIsSolving(true);
    const solution = solve(currentState, config.goalState, config.capacities, algorithm);
    
    if (solution) {
      setAnalytics(solution.analytics);
      if (solution.tree) setSearchTree(solution.tree);
      for (const state of solution.path.slice(1)) {
        await new Promise(r => setTimeout(r, 600));
        setCurrentState(state);
        setMoveCount(prev => prev + 1);
        setHistory(prev => [...prev, state]);
      }
      setShowGoalModal(true);
      setGameCompleted(true);
    } else {
      // Solution not possible
      setHint({
        nextMove: { type: 'EMPTY', jugIndex: 0, description: 'No solution possible' },
        stepsToGoal: -1,
        message: `❌ No solution exists from this state using ${algorithm}. This goal state may be unreachable from the current state. Try resetting or changing the goal.`
      });
    }
    setIsSolving(false);
  };

  const handleReset = () => {
    if (!config) return;
    setCurrentState(config.initialState);
    setMoveCount(0);
    setHistory([config.initialState]);
    setRedoStack([]);
    setSelectedJug(null);
    setHint(null);
    setShowGoalModal(false);
    setAnalytics(null);
    setSearchTree([]);
    setConfig(null);
    setGameCompleted(false);
    // localStorage.removeItem(STORAGE_KEY);
  };

  const handleViewSolution = () => {
    if (!config) return;
    const solution = solve(currentState, config.goalState, config.capacities, algorithm);
    if (solution) {
      setAnalytics(solution.analytics);
      if (solution.tree) setSearchTree(solution.tree);
      setComparisonAlgorithm(algorithm);
      setShowGoalModal(true);
    } else {
      // Solution not possible
      setHint({
        nextMove: { type: 'EMPTY', jugIndex: 0, description: 'No solution possible' },
        stepsToGoal: -1,
        message: `❌ No solution exists from this state using ${algorithm}. This goal state may be unreachable from the current state. Try resetting or changing the goal.`
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M12 13V7"/><path d="M12 13a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">WaterJug<span className="text-indigo-600">AI</span></h1>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('game')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'game' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Puzzle</button>
            <button onClick={() => setActiveTab('learn')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'learn' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Learn</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'game' ? (
            <motion.div key="game" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-3">
                <SetupPanel onStart={handleStart} isGameActive={!!config && !gameCompleted} isGameCompleted={gameCompleted} />
              </div>

              <div className="lg:col-span-6 flex flex-col gap-8">
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-slate-200 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                  
                  {!config ? (
                    <div className="text-center space-y-4 max-w-xs">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M12 13V7"/><path d="M12 13a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/></svg>
                      </div>
                      <h3 className="text-lg font-bold text-slate-700">Ready to solve?</h3>
                      <p className="text-sm text-slate-500">Configure the jugs on the left and click "Start Puzzle" to begin.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap justify-center gap-8">
                        {config.capacities.map((cap, i) => (
                          <Jug key={i} index={i} capacity={cap} current={currentState[i]} onFill={handleFill} onEmpty={handleEmpty} onSelect={handleSelect} isSelected={selectedJug === i} isTarget={selectedJug !== null && selectedJug !== i} />
                        ))}
                      </div>
                      
                      {/* Undo/Redo Controls */}
                      <div className="mt-8 flex gap-4">
                        <button onClick={handleUndo} disabled={history.length <= 1} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-30 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                        </button>
                        <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-30 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
                        </button>
                        <button 
                          onClick={() => setShowTree(!showTree)} 
                          className={`p-3 border rounded-xl shadow-sm transition-all ${showTree ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                          title="Toggle Search Tree Visualization"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h6v6H3z"/><path d="M15 3h6v6h-6z"/><path d="M9 15h6v6H9z"/><path d="M6 9v3a3 3 0 0 0 3 3"/><path d="M18 9v3a3 3 0 0 1-3 3"/></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Search Tree Visualization */}
                <AnimatePresence>
                  {showTree && searchTree.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <SearchTreeVisualizer nodes={searchTree} algorithm={algorithm} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="lg:col-span-3">
                {config && (
                  <AssistantPanel moveCount={moveCount} currentState={currentState} goalState={config.goalState} hint={hint} onGetHint={handleGetHint} onAutoSolve={handleAutoSolve} onViewSolution={handleViewSolution} onReset={handleReset} isSolving={isSolving} analytics={analytics} />
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="learn" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <EducationPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Goal Achieved Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setShowGoalModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-4xl w-full text-center space-y-8 my-8 border border-white/20">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-200 rotate-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-slate-800 tracking-tighter">Puzzle Solved!</h2>
                <p className="text-slate-500 text-lg">You've mastered the state space for this configuration.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-10 text-left">
                {/* User Journey */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Your Journey</h3>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">{history.length - 1} Steps</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                    {history.map((state, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={i} 
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <span className="w-6 h-6 flex items-center justify-center bg-white shadow-sm rounded-lg font-bold text-[10px] text-slate-400">{i}</span>
                        <div className="flex-1">
                          <p className="text-xs font-mono font-bold text-slate-700">[{state.join(', ')}]</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* AI Comparison */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <h3 className="text-sm font-black text-indigo-500 uppercase tracking-widest">AI Comparison</h3>
                    <select 
                      value={comparisonAlgorithm} 
                      onChange={(e) => setComparisonAlgorithm(e.target.value as SearchAlgorithm)}
                      className="text-[10px] bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                    >
                      <option value="BFS">BFS (Optimal)</option>
                      <option value="DFS">DFS</option>
                      <option value="IDDFS">IDDFS</option>
                      <option value="UCS">UCS</option>
                      <option value="A*">A*</option>
                    </select>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto pr-4 space-y-3 custom-scrollbar">
                    {comparisonSolution?.path.map((state, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={i} 
                        className="flex items-center gap-4 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 hover:border-indigo-200 transition-colors"
                      >
                        <span className="w-6 h-6 flex items-center justify-center bg-white shadow-sm rounded-lg font-bold text-[10px] text-indigo-400">{i}</span>
                        <div className="flex-1">
                          <p className="text-xs font-mono font-bold text-indigo-900">[{state.join(', ')}]</p>
                          {i > 0 && <p className="text-[9px] text-indigo-400 font-semibold italic">{comparisonSolution.moves[i-1].description}</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total AI Steps</span>
                    <span className="text-sm font-black text-indigo-600">{comparisonSolution?.moves.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                <button onClick={handleReset} className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-95">Play Again</button>
                <button onClick={() => setShowGoalModal(false)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold hover:bg-slate-200 transition-all active:scale-95">Review Path</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
