
// --- 1. Theme Logic ---
function toggleTheme() {
    const body = document.body;
    const sunIcon = document.getElementById('icon-sun');
    const moonIcon = document.getElementById('icon-moon');
    
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    
    if (isDark) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }

    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        document.getElementById('icon-sun').style.display = 'none';
        document.getElementById('icon-moon').style.display = 'block';
    } else {
        document.getElementById('icon-sun').style.display = 'block';
        document.getElementById('icon-moon').style.display = 'none';
    }
}

// --- 2. Game Data & Logic ---
const initialTasks = [
    "On TBR over 5 years",
    "Set in a country you've never visited",
    "You would normally judge",
    "Your boyfriend picks for you",
    "Published this year",
    "A trilogy/series",
    "5 books on your physical TBR",
    "With a title longer than 7 words",
    "The first book you touch on a shelf (TBR)",
    "People lie about reading",
    "A whole audiobook while knitting",
    "That was published the year you were born",
    "FREE",
    "Non-fiction",
    "Poetry collection",
    "Sci-fi or dystopian",
    "With red cover",
    "Unread book",
    "You can't pronounce the author's name",
    "You can finish in a day",
    "Large one (over 700p)",
    "Because the cover is ridiculous",
    "Classic novel",
    "With a number in the title",
    "You saw on Instagram"
];

let currentTasks = [];
let markedState = new Array(25).fill(false);
let previousBingoCount = 0;

const winPatterns = [
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
    [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
    [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
];

const gridElement = document.getElementById('bingo-grid');
const progressElement = document.getElementById('progress-count');
const progressBarElement = document.getElementById('progress-bar');
const toastElement = document.getElementById('toast');

function saveProgress() {
    const data = {
        version: 1,
        tasks: currentTasks,
        marked: markedState,
        bingoCount: previousBingoCount
    };
    localStorage.setItem('readingBingo2026', JSON.stringify(data));
}

function loadProgress() {
    const saved = localStorage.getItem('readingBingo2026');
    if (!saved) return false;

    try {
        const data = JSON.parse(saved);
        // Basic version check / compatibility
        if (data.version !== 1) return false;

        currentTasks = Array.isArray(data.tasks) && data.tasks.length === 25 
            ? data.tasks 
            : [...initialTasks];
        
        markedState = Array.isArray(data.marked) && data.marked.length === 25 
            ? data.marked 
            : new Array(25).fill(false);
        
        previousBingoCount = typeof data.bingoCount === 'number' 
            ? data.bingoCount 
            : 0;

        // Enforce free space
        currentTasks[12] = "FREE";

        return true;
    } catch (err) {
        console.warn("Could not load saved bingo state:", err);
        return false;
    }
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registered', reg);
      })
      .catch(err => {
        console.warn('Service Worker registration failed', err);
      });
  });
}

function init() {
    initTheme();

    const hasSavedState = loadProgress();
    if (!hasSavedState) {
        currentTasks = [...initialTasks];
        markedState = new Array(25).fill(false);
        previousBingoCount = 0;
        currentTasks[12] = "FREE"; // just in case
    }

    renderGrid();
    updateProgress();
    checkWin(); // restores highlights + confetti logic state
}

function renderGrid() {
    gridElement.innerHTML = ''; 
    currentTasks.forEach((task, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        if (markedState[index]) cell.classList.add('marked');
        if (task === "FREE") cell.classList.add('free-space');

        const span = document.createElement('span');
        span.textContent = task;
        cell.appendChild(span);

        cell.onclick = () => toggleMark(index);
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-pressed', markedState[index]);
        gridElement.appendChild(cell);
    });
}

function toggleMark(index) {
    markedState[index] = !markedState[index];
    const cells = gridElement.children;
    cells[index].classList.toggle('marked');
    cells[index].setAttribute('aria-pressed', markedState[index]);
    updateProgress();
    checkWin();
    saveProgress();
}

function updateProgress() {
    const count = markedState.filter(Boolean).length;
    const percentage = (count / 25) * 100;
    progressElement.textContent = `${count} / 25`;
    progressBarElement.style.width = `${percentage}%`;
}

function checkWin() {
    const cells = gridElement.children;
    let currentBingoCount = 0;
    
    Array.from(cells).forEach(c => c.classList.remove('winner'));

    for (const pattern of winPatterns) {
        if (pattern.every(index => markedState[index])) {
            currentBingoCount++;
            pattern.forEach(index => cells[index].classList.add('winner'));
        }
    }

    if (currentBingoCount > previousBingoCount) {
        const newBingos = currentBingoCount - previousBingoCount;
        showToast(newBingos === 1 ? "Bingo Completed!" : `${newBingos} New Bingos!`);
        fireConfetti();
        previousBingoCount = currentBingoCount;
        saveProgress();
    } else if (currentBingoCount < previousBingoCount) {
        previousBingoCount = currentBingoCount;
        saveProgress();
    }
}

function shuffleBoard() {
    if (!confirm('Shuffle the board? Your progress will be kept (checked boxes move with tasks).')) {
        return;
    }
    
    const markedTasks = currentTasks.filter((task, i) => 
        markedState[i] && task !== 'FREE'
    );
    
    const freeTask = "FREE";
    const otherTasks = initialTasks.filter(t => t !== freeTask);
    
    // Fisher-Yates shuffle
    for (let i = otherTasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherTasks[i], otherTasks[j]] = [otherTasks[j], otherTasks[i]];
    }
    
    const newTasks = [
        ...otherTasks.slice(0, 12),
        freeTask,
        ...otherTasks.slice(12)
    ];
    
    currentTasks = newTasks;
    
    // Re-apply marks based on task content
    markedState = new Array(25).fill(false);
    currentTasks.forEach((task, index) => {
        if (markedTasks.includes(task)) {
            markedState[index] = true;
        }
    });
    
    // Recalculate bingo count after shuffle
    let newBingoCount = 0;
    for (const pattern of winPatterns) {
        if (pattern.every(idx => markedState[idx])) {
            newBingoCount++;
        }
    }
    previousBingoCount = newBingoCount;
    
    renderGrid();
    updateProgress();
    checkWin();
    saveProgress();
    showToast("Board Curated");
}

function resetBoard() {
    if (!confirm('Reset all progress? This cannot be undone.')) {
        return;
    }
    
    markedState = new Array(25).fill(false);
    previousBingoCount = 0;
    currentTasks = [...initialTasks];
    currentTasks[12] = "FREE";
    
    renderGrid();
    updateProgress();
    checkWin();
    localStorage.removeItem('readingBingo2026');
    showToast("Board Reset");
}

function showToast(message) {
    toastElement.textContent = message;
    toastElement.className = "show";
    setTimeout(() => {
        toastElement.className = toastElement.className.replace("show", "");
    }, 3000);
}

// --- Share Progress Function ---
function shareProgress() {
    const completed = currentTasks.filter((task, index) => 
        markedState[index] && task !== 'FREE'
    );
    
    let bingoCount = 0;
    for (const pattern of winPatterns) {
        if (pattern.every(index => markedState[index])) {
            bingoCount++;
        }
    }
    
    let message = `📚 READING BINGO 2026 📚\n\n`;
    message += `Progress: ${markedState.filter(Boolean).length}/25 books archived\n`;
    message += `Bingo Lines: ${bingoCount}\n\n`;
    
    if (completed.length > 0) {
        message += `Completed Tasks:\n`;
        completed.forEach(task => {
            message += `◆ ${task}\n`;
        });
    }
        
    message += `\nshuflovic.github.io/reading_bingo`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Reading Bingo 2026 Progress',
            text: message
        }).catch(() => {
            copyToClipboard(message);
        });
    } else {
        copyToClipboard(message);
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Progress copied to clipboard!");
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast("Progress copied to clipboard!");
    } catch (err) {
        showToast("Could not copy progress");
    }
    document.body.removeChild(textarea);
}

// --- 3. Confetti Engine ---
const canvas = document.getElementById("confetti-canvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function fireConfetti() {
    particles = [];
    const colors = ['#2c3e50', '#e74c3c', '#f1c40f', '#2ecc71', '#ffffff'];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            w: Math.random() * 6 + 4,
            h: Math.random() * 10 + 6,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 120
        });
    }
    requestAnimationFrame(updateConfetti);
}

function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        if (p.life <= 0) particles.splice(index, 1);
    });
    if (particles.length > 0) requestAnimationFrame(updateConfetti);
}

// Start the app
init();
