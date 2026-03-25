// ====================================
// DLX CORE — Dancing Links (Knuth)
// ====================================

class Node {
    constructor({ rowId = -1, colId = -1 } = {}) {
        this.left = this;
        this.right = this;
        this.up = this;
        this.down = this;
        this.column = null;
        this.rowId = rowId;
        this.colId = colId;
        this.nodeCount = 0; // column headers only
    }
}

class DLXSolver {

    /**
     * @param {number[][]} matrix - sparse 0/1 exact-cover matrix
     * @param {any[]} rowMeta - one entry per row, returned in solutions
     * @param {number} [numPrimary] - primary columns count (default: all)
     */
    constructor(matrix, rowMeta, numPrimary) {
        if (!matrix || matrix.length === 0) {
            throw new Error("Matrix cannot be empty");
        }
        if (matrix.length !== rowMeta.length) {
            throw new Error(`matrix has ${matrix.length} rows but rowMeta has ${rowMeta.length} entries`);
        }

        this.matrix = matrix;
        this.rowMeta = rowMeta;
        this.numPrimary = numPrimary ?? matrix[0].length;

        this.root = null;
        this.colHeaders = [];
        this.partial = [];

        // results & stats
        this.solution = null;  // first solution (array of rowMeta entries)
        this.allSolutions = [];
        this.nodesExpanded = 0;
        this.updates = 0;
        this.computationTime = 0;

        this._buildLinks();
    }


    _buildLinks() {
        const numCols = this.matrix[0].length;
        this.root = new Node();

        this.colHeaders = Array.from({ length: numCols }, (_, c) => {
            const h = new Node({ colId: c });
            h.column = h;
            return h;
        });

        // root, primary headers (circular)
        this.root.right = this.colHeaders[0];
        this.root.left = this.colHeaders[this.numPrimary - 1];

        for (let i = 0; i < numCols; i++) {
            const h = this.colHeaders[i];
            if (i < this.numPrimary) {
                h.left  = i === 0 ? this.root : this.colHeaders[i - 1];
                h.right = i < this.numPrimary - 1 ? this.colHeaders[i + 1] : this.root;
            } else {
                h.left = h; 
                h.right = h; // secondary: self-linked, detached from root
            }
        }

        // One node per "1" in the matrix
        for (let r = 0; r < this.matrix.length; r++) {
            let first = null, prev = null;
            for (let c = 0; c < this.matrix[r].length; c++) {
                if (!this.matrix[r][c]) 
                    continue;
                
                const node = new Node({ rowId: r, colId: c });
                const hdr = this.colHeaders[c];
                node.column = hdr;

                // append to bottom of column (vertical circular list)
                node.up = hdr.up; 
                node.down = hdr;
                hdr.up.down = node; 
                hdr.up = node;
                hdr.nodeCount++;

                // append to right of row (horizontal circular list)
                if (!prev) {
                    first = node;
                } else {
                    node.left = prev; 
                    node.right = first;
                    prev.right = node; 
                    first.left = node;
                }
                prev = node;
            }
        }
    }


    _chooseCol() {
        let best = null;
        for (let j = this.root.right; j !== this.root; j = j.right) {
            if (!best || j.nodeCount < best.nodeCount) {
                best = j;
            }
        }  
        return best;
    }

    _cover(col) {
        col.right.left = col.left;
        col.left.right = col.right;
        this.updates++;
        for (let i = col.down; i !== col; i = i.down) {
            for (let j = i.right; j !== i; j = j.right) {
                j.down.up = j.up; 
                j.up.down = j.down;
                j.column.nodeCount--;
                this.updates++;
            }
        }
    }

    _uncover(col) {
        for (let i = col.up; i !== col; i = i.up) {
            for (let j = i.left; j !== i; j = j.left) {
                j.column.nodeCount++;
                j.down.up = j; 
                j.up.down = j;
            }
        }
        col.right.left = col;
        col.left.right = col;
    }

    _search(findAll = false) {
        this.nodesExpanded++;

        if (this.root.right === this.root) {
            const sol = this.partial.map(n => this.rowMeta[n.rowId]);
            this.allSolutions.push(sol);
            if (!this.solution) {
                 this.solution = sol;
            }
            return !findAll; // true = stop (first-only mode), false = keep going  
        }

        const col = this._chooseCol();
        this._cover(col);

        for (let r = col.down; r !== col; r = r.down) {
            this.partial.push(r);
            for (let j = r.right; j !== r; j = j.right) {
                this._cover(j.column);
            }

            if (this._search(findAll)) { 
                return true;
            }

            this.partial.pop();
            for (let j = r.left; j !== r; j = j.left) {
                this._uncover(j.column);
            }
        }

        this._uncover(col);
        return false;
    }


    /** find the first solution. Returns array of rowMeta entries, or null. */
    solve() {
        const t0 = performance.now();
        this._search(false);
        this.computationTime = (performance.now() - t0) / 1000;
        return this.solution;
    }

    /** find all solutions. Returns array of solutions (each is array of rowMeta entries). */
    solveAll() {
        const t0 = performance.now();
        this._search(true);
        this.computationTime = (performance.now() - t0) / 1000;
        return this.allSolutions;
    }

    getStatistics() {
        return {
            totalSolutions: this.allSolutions.length,
            computationTime: this.computationTime,
            nodesExpanded: this.nodesExpanded,
            updates: this.updates
        };
    }
}

// export for Node.js / bundlers; ignored in plain <script> tags
if (typeof module !== 'undefined') module.exports = { Node, DLXSolver };