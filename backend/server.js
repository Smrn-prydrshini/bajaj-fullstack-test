const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const userInfo = {
  user_id: "simranpriyadarshini_24042026",
  email_id: "simran@example.com",
  college_roll_number: "CS2023001"
};

app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        ...userInfo,
        hierarchies: [],
        invalid_entries: ["Invalid input format"],
        duplicate_edges: [],
        summary: { total_trees: 0, total_cycles: 0, largest_tree_root: null }
      });
    }

    const graph = {};
    const invalid_entries = new Set();
    const duplicate_edges = new Set();
    const seenEdges = new Set();
    const childParentMap = {}; // for multi-parent rule

    const regex = /^[A-Z]->[A-Z]$/;

    for (let edge of data) {
      let clean = edge.trim();

      if (!regex.test(clean) || clean[0] === clean[3]) {
        invalid_entries.add(edge);
        continue;
      }

      if (seenEdges.has(clean)) {
        duplicate_edges.add(clean);
        continue;
      }

      seenEdges.add(clean);

      const [parent, child] = clean.split("->");

      // multi-parent rule (first parent wins)
      if (childParentMap[child]) continue;
      childParentMap[child] = parent;

      if (!graph[parent]) graph[parent] = [];
      graph[parent].push(child);
    }

    // collect nodes
    const nodes = new Set();
    Object.keys(graph).forEach(p => {
      nodes.add(p);
      graph[p].forEach(c => nodes.add(c));
    });

    // find children
    const childrenSet = new Set();
    Object.values(graph).flat().forEach(c => childrenSet.add(c));

    // roots
    let roots = [...nodes].filter(n => !childrenSet.has(n)).sort();

    if (roots.length === 0 && nodes.size > 0) {
      roots = [[...nodes].sort()[0]];
    }

    let hierarchies = [];
    let total_cycles = 0;
    let total_trees = 0;

    function buildTree(node, visited = new Set()) {
      if (visited.has(node)) return null; // cycle

      visited.add(node);
      let obj = {};

      let children = graph[node] || [];

      for (let child of children) {
        let subtree = buildTree(child, new Set(visited));
        if (subtree === null) return null;
        obj[child] = subtree;
      }

      return obj;
    }

    function getDepth(node) {
      if (!graph[node] || graph[node].length === 0) return 1;

      let max = 0;
      for (let child of graph[node]) {
        max = Math.max(max, getDepth(child));
      }
      return 1 + max;
    }

    let maxDepth = 0;
    let largest_tree_root = "";

    for (let root of roots) {
      let tree = buildTree(root);

      if (tree === null) {
        total_cycles++;
        hierarchies.push({
          root,
          tree: {},
          has_cycle: true
        });
      } else {
        let depth = getDepth(root);
        total_trees++;

        hierarchies.push({
          root,
          tree: { [root]: tree },
          depth
        });

        if (
          depth > maxDepth ||
          (depth === maxDepth && root < largest_tree_root)
        ) {
          maxDepth = depth;
          largest_tree_root = root;
        }
      }
    }

    res.json({
      ...userInfo,
      hierarchies,
      invalid_entries: [...invalid_entries],
      duplicate_edges: [...duplicate_edges],
      summary: {
        total_trees,
        total_cycles,
        largest_tree_root
      }
    });

  } catch (err) {
    res.status(500).json({
      ...userInfo,
      hierarchies: [],
      invalid_entries: ["Server error"],
      duplicate_edges: [],
      summary: { total_trees: 0, total_cycles: 0, largest_tree_root: null }
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});