# AI Water Jug Tutor

Interactive tutor and visualizer for water‑jug puzzles. Configure jug capacities, initial and goal states, run different search algorithms (BFS, DFS, IDDFS, UCS, A*), inspect the search tree, get AI hints, and auto‑solve while comparing analytics (nodes expanded, frontier size, time).

Created by `krrishchopra7`.

## Live demo

The app is published via GitHub Pages: https://krrishchopra7.github.io/AI_water_jug_problem/

## Run locally

Prerequisites: Node.js

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Build

```bash
npm run build
# Serve the generated `dist/` with any static host
```

## Features

- Configure jug capacities, initial state and goal state
- Solve with BFS, DFS, IDDFS, UCS, and A* (heuristic = Σ |current_i − goal_i|)
- Visual search tree with node annotations (`g`, `h`, `f`)
- Get hints, view full solution, or auto‑solve step by step

## Tech

- React + TypeScript
- Vite
- D3 for search tree visualization

## License

This project is provided by the author. Add a license file (e.g., MIT) if you want to open-source it.
