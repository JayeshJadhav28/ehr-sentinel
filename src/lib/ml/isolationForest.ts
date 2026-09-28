/**
 * Compact Isolation Forest implementation (Liu, Ting & Zhou).
 *
 * This is a genuine isolation-forest scorer, trained in-process on a
 * deterministic synthetic "normal behaviour" sample. It is the development
 * adapter for the ML service boundary; the production adapter is the Python
 * scikit-learn IsolationForest described in docs/ml-design.md. Both consume
 * the identical `features-v1` vector.
 */

type Vector = number[];

interface Node {
  splitAttribute?: number;
  splitValue?: number;
  left?: Node;
  right?: Node;
  size: number;
  external: boolean;
}

/** Deterministic PRNG (mulberry32) so every run produces identical scores. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function harmonic(n: number): number {
  return Math.log(n) + 0.5772156649;
}

function cFactor(n: number): number {
  if (n <= 1) return 1;
  return 2 * harmonic(n - 1) - (2 * (n - 1)) / n;
}

function buildTree(data: Vector[], depth: number, maxDepth: number, rand: () => number): Node {
  if (depth >= maxDepth || data.length <= 1) {
    return { size: data.length, external: true };
  }
  const dims = data[0]!.length;
  const attribute = Math.floor(rand() * dims) % dims;
  let min = Infinity;
  let max = -Infinity;
  for (const row of data) {
    const v = row[attribute] ?? 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { size: data.length, external: true };
  const splitValue = min + rand() * (max - min);
  const left: Vector[] = [];
  const right: Vector[] = [];
  for (const row of data) {
    if ((row[attribute] ?? 0) < splitValue) left.push(row);
    else right.push(row);
  }
  return {
    splitAttribute: attribute,
    splitValue,
    left: buildTree(left, depth + 1, maxDepth, rand),
    right: buildTree(right, depth + 1, maxDepth, rand),
    size: data.length,
    external: false,
  };
}

function pathLength(node: Node, point: Vector, depth = 0): number {
  if (node.external) return depth + cFactor(node.size);
  const attr = node.splitAttribute as number;
  const next = (point[attr] ?? 0) < (node.splitValue as number) ? node.left : node.right;
  return pathLength(next as Node, point, depth + 1);
}

export class IsolationForest {
  private trees: Node[] = [];
  private sampleSize: number;

  constructor(
    data: Vector[],
    private readonly numTrees = 100,
    sampleSize = 64,
    seed = 20260101,
  ) {
    const rand = prng(seed);
    this.sampleSize = Math.min(sampleSize, data.length);
    const maxDepth = Math.ceil(Math.log2(Math.max(2, this.sampleSize)));
    for (let t = 0; t < numTrees; t += 1) {
      const sample: Vector[] = [];
      for (let i = 0; i < this.sampleSize; i += 1) {
        sample.push(data[Math.floor(rand() * data.length) % data.length]!);
      }
      this.trees.push(buildTree(sample, 0, maxDepth, rand));
    }
  }

  /** Anomaly score in [0, 1]; higher means more isolated (more anomalous). */
  score(point: Vector): number {
    const avg = this.trees.reduce((s, tree) => s + pathLength(tree, point), 0) / this.trees.length;
    return Math.pow(2, -avg / cFactor(this.sampleSize));
  }
}
