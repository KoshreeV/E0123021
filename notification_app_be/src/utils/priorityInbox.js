const { MinHeap } = require('./minHeap');

const TYPE_WEIGHTS = { placement: 10, result: 7, event: 3, general: 1 };
const RECENCY_SCALE = 5;
const DECAY_RATE = 0.1;

function computeScore(notification) {
  const weight = TYPE_WEIGHTS[notification.type] ?? 1;
  const hours = (Date.now() - new Date(notification.created_at).getTime()) / 3600000;
  return weight + RECENCY_SCALE * Math.exp(-DECAY_RATE * hours);
}

class PriorityInbox {
  constructor(capacity = 10) {
    this._cap = capacity;
    this._heap = new MinHeap((a, b) => a.priority_score - b.priority_score);
  }

  add(notification) {
    const scored = { ...notification, priority_score: computeScore(notification) };
    if (this._heap.size < this._cap) {
      this._heap.push(scored);
    } else if (scored.priority_score > this._heap.peek().priority_score) {
      this._heap.pop();
      this._heap.push(scored);
    }
  }

  getTopN() {
    return this._heap.toSortedArray().reverse();
  }

  refresh() {
    const items = this._heap.toSortedArray();
    this._heap = new MinHeap((a, b) => a.priority_score - b.priority_score);
    items.forEach(item => { item.priority_score = computeScore(item); this._heap.push(item); });
  }

  get size() { return this._heap.size; }
}

module.exports = { PriorityInbox, computeScore, TYPE_WEIGHTS };
