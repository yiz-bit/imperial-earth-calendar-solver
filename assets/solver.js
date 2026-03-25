// ====================================
// IMPERIAL EARTH CALENDAR — PUZZLE SOLVER
// ====================================

// Piece definitions 
// each piece is a list of [row, col] offsets (un-normalized, any orientation)

const PIECES = {
  P5_T: [[0,0],[0,1],[0,2],[1,1],[2,1]],   // Pentomino T
  P5_L: [[0,0],[1,0],[2,0],[3,0],[3,1]],   // Pentomino L
  P4_I: [[0,0],[1,0],[2,0],[3,0]],         // Tetromino I
  P4_S: [[0,0],[0,1],[1,1],[1,2]],         // Tetromino S
  P5_N: [[0,1],[1,0],[1,1],[2,0],[3,0]],   // Pentomino N
  P4_L: [[0,0],[1,0],[2,0],[2,1]],         // Tetromino L
  P5_P: [[0,0],[1,0],[2,0],[2,1],[2,2]],   // Pentomino P
  P5_W: [[0,0],[0,1],[1,1],[2,1],[2,2]],   // Pentomino W
  P5_F: [[0,0],[0,1],[1,0],[1,1],[2,0]],   // Pentomino F 
  P5_U: [[0,0],[0,2],[1,0],[1,1],[1,2]],   // Pentomino U
};


function normalize(coords) {
    const minR = Math.min(...coords.map(([r]) => r));
    const minC = Math.min(...coords.map(([,c]) => c));
    return coords
        .map(([r, c]) => [r - minR, c - minC])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function rotate90(coords) { 
    return coords.map(([r, c]) => [ c, -r]); 
}

function flipH(coords) { 
    return coords.map(([r, c]) => [ r, -c]); 
}

/** return all distinct orientations (rotations + flips) of a piece. */
function getOrientations(piece) {
    const seen = new Set();
    const result = [];
    let cur = piece;
    for (let i = 0; i < 4; i++) {
        for (const variant of [cur, flipH(cur)]) {
            const key = JSON.stringify(normalize(variant));

            if (!seen.has(key)) { 
                seen.add(key); result.push(normalize(variant)); 
            }
        }
        cur = rotate90(cur);
    }
    return result;
}

// ─── Exact-cover formulation ─────────────────────────────────────────────────
//
//  Primary columns [0 .. numCells-1] -> one per free cell (cover exactly once)
//  Secondary columns [numCells .. numCells+numPieces-1] -> one per piece (use at most once)
//
//  Each matrix row = one valid placement of one piece orientation:
//    - 1 in every free-cell column it occupies
//    - 1 in the secondary column of its piece
//
//  numPrimary = numCells so piece columns are outside the "must cover" constraint

function buildExactCoverMatrix(targetCells, blockedCells) {
    const freeCells = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 7; c++) {
            const key = `${r},${c}`;
            if (!blockedCells.has(key) && !targetCells.has(key)) {
                freeCells.push(key);
            }
        }
    }

    const cellIndex = new Map(freeCells.map((k, i) => [k, i]));
    const pieceNames = Object.keys(PIECES);
    const numCells = freeCells.length;   // = number of primary columns
    const numPieces = pieceNames.length;
    const numCols = numCells + numPieces;

    const matrix = [];  // one array per placement
    const rowMeta = [];  // parallel: { name, cells } for each placement

    pieceNames.forEach((name, pi) => {
        const pieceCol = numCells + pi; // secondary column for this piece

        for (const orient of getOrientations(PIECES[name])) {
            for (let baseR = 0; baseR < 8; baseR++) {
                for (let baseC = 0; baseC < 7; baseC++) {
                    const placed = orient.map(([dr, dc]) => [baseR + dr, baseC + dc]);
                    const keys = placed.map(([r, c]) => `${r},${c}`);

                    // all cells must be free (in-bounds + not blocked/target)
                    if (!keys.every(k => cellIndex.has(k))) 
                        continue;

                    const row = new Array(numCols).fill(0);
                    keys.forEach(k => { row[cellIndex.get(k)] = 1; });
                    row[pieceCol] = 1;

                    matrix.push(row);
                    rowMeta.push({ name, cells: placed });
                }
            }
        }
    });

    return { matrix, rowMeta, numPrimary: numCells };
}

/**
 * Solve the Imperial Earth Calendar puzzle for a given date.
 *
 * @param {Set<string>} targetCells - cells to leave uncovered (month/day/weekday)
 * @param {Set<string>} blockedCells - permanently blocked cells
 * @returns {Array<{name:string, cells:[number,number][]}>|null}
 */

function dlxSolver(targetCells, blockedCells) {
    const { matrix, rowMeta, numPrimary } = buildExactCoverMatrix(targetCells, blockedCells);
    if (!matrix.length) 
        return null;

    const solver = new DLXSolver(matrix, rowMeta, numPrimary); // DLXSolver
    const solution = solver.solve();
    if (!solution) 
        return null;

    return solution.map(({ name, cells }) => ({ name, cells }));
}