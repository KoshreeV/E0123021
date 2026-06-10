class MinHeap {
  constructor(compareFn) {
    this._data = [];
    this._cmp = compareFn;
  }

  get size() { return this._data.length; }
  peek() { return this._data[0]; }

  push(item) {
    this._data.push(item);
    this._bubbleUp(this._data.length - 1);
  }

  pop() {
    const min = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  toSortedArray() {
    return [...this._data].sort((a, b) => this._cmp(a, b));
  }

  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i) { return 2 * i + 1; }
  _right(i) { return 2 * i + 2; }

  _swap(i, j) { [this._data[i], this._data[j]] = [this._data[j], this._data[i]]; }

  _bubbleUp(i) {
    while (i > 0) {
      const p = this._parent(i);
      if (this._cmp(this._data[i], this._data[p]) < 0) { this._swap(i, p); i = p; }
      else break;
    }
  }

  _sinkDown(i) {
    const n = this._data.length;
    while (true) {
      let s = i;
      const l = this._left(i), r = this._right(i);
      if (l < n && this._cmp(this._data[l], this._data[s]) < 0) s = l;
      if (r < n && this._cmp(this._data[r], this._data[s]) < 0) s = r;
      if (s === i) break;
      this._swap(i, s);
      i = s;
    }
  }
}

module.exports = { MinHeap };
