// ====================================
// IMPERIAL EARTH CALENDAR - MAIN APP
// ====================================

// === Constants ===
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const WEEKDAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const COLORS = ['#FF9999','#66B2FF','#99FF99','#FFCC99','#FFD700','#FF99CC','#C2C2F0','#FFB366','#88E0EF','#B3B3B3'];

const BOARD_POS = {
    months: {
        JAN:[0,0], FEB:[0,1], MAR:[0,2], APR:[0,3], MAY:[0,4], JUN:[0,5],
        JUL:[1,0], AUG:[1,1], SEP:[1,2], OCT:[1,3], NOV:[1,4], DEC:[1,5]
    },
    days: (() => { 
        const d = {};
        for (let i = 1; i <= 31; i++) {
            d[i] = [Math.floor((i-1)/7)+2, (i-1)%7];
        }
        return d;
    })(),
    weekdays: {
        SUN:[6,3], MON:[6,4], TUE:[6,5], WED:[6,6],
        THU:[7,4], FRI:[7,5], SAT:[7,6]
    },
    blocked: [[0,6], [1,6], [7,0], [7,1], [7,2], [7,3]]
};

// application State 
let state = {
    monthIdx: new Date().getMonth(),
    day: new Date().getDate(),
    weekdayIdx: new Date().getDay(),
    solution: null,
    hintIdx: 0
};

// helper Functions
function getTargetCells() {
    const target = new Set();
    target.add(`${BOARD_POS.months[MONTHS[state.monthIdx]].join(',')}`);
    target.add(`${BOARD_POS.days[state.day].join(',')}`);
    target.add(`${BOARD_POS.weekdays[WEEKDAYS[state.weekdayIdx]].join(',')}`);
    return target;
}

function getBlockedCells() {
    const blocked = new Set();
    BOARD_POS.blocked.forEach(([r,c]) => blocked.add(`${r},${c}`));
    return blocked;
}

function showMessage(msg, type) {
    const el = document.getElementById('message');
    if (!msg) { 
        el.classList.remove('show');
        el.textContent = '';
        return; 
    }
    el.className = `message ${type} show`;
    el.textContent = msg;
}

function updateDisplay() {
    document.getElementById('month-display').textContent = MONTHS[state.monthIdx];
    document.getElementById('day-display').textContent = state.day;
    document.getElementById('weekday-display').textContent = WEEKDAYS[state.weekdayIdx];
}

function updateButtons() {
    const hintBtn = document.getElementById('hint-btn');
    const showAllBtn = document.getElementById('show-all-btn');
    
    const hasSolution = state.solution && state.solution.length > 0;
    const canShowMore = hasSolution && state.hintIdx < state.solution.length;
    
    hintBtn.disabled = !canShowMore;
    showAllBtn.disabled = !canShowMore;
    
    const hintText = document.getElementById('hint-text');
    if (hintText) {
        hintText.textContent = `Hint (${state.hintIdx}/${state.solution?.length || 0})`;
    }
}

// main UI functions
async function solve() {
    const btn = document.getElementById('solve-btn');
    btn.innerHTML = '<span class="spinner"></span><span class="btn-text">Solving...</span>';
    btn.disabled = true;
    showMessage('Running DLX exact cover algorithm...', 'info');
    
    state.solution = null;
    state.hintIdx = 0;
    updateButtons();
    renderBoard();
    
    // give UI time to update before heavy computation
    await new Promise(r => setTimeout(r, 100));
    
    try {
        const startTime = performance.now();
        const result = dlxSolver(getTargetCells(), getBlockedCells());
        const endTime = performance.now();
        
        if (result && Array.isArray(result) && result.length > 0) {
            state.solution = result;
            const time = ((endTime - startTime) / 1000).toFixed(2);
            showMessage(`Solution found! (${result.length} pieces, ${time}s)`, 'success');
        } else {
            showMessage('No solution found (try a different date)', 'error');
        }
    } catch (e) {
        showMessage('Error: ' + e.message, 'error');
        console.error(e);
    }
    
    btn.innerHTML = '<span class="btn-text">Solve Puzzle</span>';
    btn.disabled = false;
    updateButtons();
    renderBoard();
}

function hint() {
    if (state.solution && state.hintIdx < state.solution.length) {
        state.hintIdx++;
        updateButtons();
        renderBoard();
    }
}

function showAll() {
    if (state.solution) {
        state.hintIdx = state.solution.length;
        updateButtons();
        renderBoard();
    }
}

function clearBoard() {
    state.solution = null;
    state.hintIdx = 0;
    showMessage('', '');
    updateButtons();
    renderBoard();
}

// date Navigation
function changeMonth(dir) { 
    state.monthIdx = (state.monthIdx + dir + 12) % 12;
    if (state.solution) clearBoard();
    updateDisplay();
    renderBoard();
}

function changeDay(dir) {
    state.day += dir;
    if (state.day < 1) state.day = 31;
    if (state.day > 31) state.day = 1;
    if (state.solution) clearBoard();
    updateDisplay();
    renderBoard();
}

function changeWeekday(dir) {
    state.weekdayIdx = (state.weekdayIdx + dir + 7) % 7;
    if (state.solution) clearBoard();
    updateDisplay();
    renderBoard();
}

// board rendering 
function renderBoard() {
    const board = Array(8).fill(0).map(() => Array(7).fill(null));
    const m = MONTHS[state.monthIdx];
    const w = WEEKDAYS[state.weekdayIdx];
    
    // target positions for highlighting
    const targetPositions = new Set();
    targetPositions.add(`${BOARD_POS.months[m].join(',')}`);
    targetPositions.add(`${BOARD_POS.days[state.day].join(',')}`);
    targetPositions.add(`${BOARD_POS.weekdays[w].join(',')}`);
    
    // create label map for rendering
    const labelMap = new Map();
    Object.entries(BOARD_POS.months).forEach(([name,[r,c]]) => {
        labelMap.set(`${r},${c}`, name);
    });
    Object.entries(BOARD_POS.days).forEach(([day,[r,c]]) => {
        labelMap.set(`${r},${c}`, day);
    });
    Object.entries(BOARD_POS.weekdays).forEach(([name,[r,c]]) => {
        labelMap.set(`${r},${c}`, name);
    });
    
    // mark blocked cells
    BOARD_POS.blocked.forEach(([r,c]) => { 
        board[r][c] = {type:'blocked'}; 
    });
    
    // place pieces on board
    if (state.solution && state.hintIdx > 0) {
        state.solution.slice(0, state.hintIdx).forEach((piece, idx) => {
            const color = COLORS[idx % COLORS.length];
            piece.cells.forEach(cell => {
                const [r, c] = [cell[0], cell[1]];
                if (r >= 0 && r < 8 && c >= 0 && c < 7 && board[r][c] === null) {
                    board[r][c] = {type:'piece', color};
                }
            });
        });
    }
    
    // render board to HTML
    const html = board.map((row, r) =>
        row.map((cell, c) => {
            const key = `${r},${c}`;
            
            // blocked cells (transparent, no border)
            if (cell && cell.type === 'blocked') {
                return '<div class="cell blocked"></div>';
            }
            
            // piece cells
            if (cell && cell.type === 'piece') {
                return `<div class="cell piece" style="background:${cell.color}"></div>`;
            }
            
            // label cells (months, days, weekdays)
            if (labelMap.has(key)) {
                const text = labelMap.get(key);
                const isTarget = targetPositions.has(key);
                return `<div class="cell ${isTarget ? 'target' : 'label'}">${text}</div>`;
            }
            
            // empty cells
            return '<div class="cell empty"></div>';
            
        }).join('')
    ).join('');
    
    document.getElementById('board').innerHTML = html;
}

// initialize application 
updateDisplay();
updateButtons();
renderBoard();
console.log('Imperial Earth Calendar Solver ready!');