const WORKOUT_FILES = [
    'data/abs.json',
    'data/boxing.json'
];

let state = {
    view: 'home',
    progress: JSON.parse(localStorage.getItem('hub_progress')) || {},
    workouts: [],
    sessionRound: 1
};

// Global Timer State
let tInterval = null;
let tLeft = 0;
let tActiveIdx = null;
let tRunning = false;

async function init() {
    try {
        const fetches = WORKOUT_FILES.map(file => fetch(file).then(res => res.json()));
        state.workouts = await Promise.all(fetches);
        
        state.workouts.forEach(w => {
            if (!state.progress[w.id]) {
                state.progress[w.id] = { cur: 1, logs: [] };
            }
        });
        render();
    } catch (err) {
        document.getElementById('app-root').innerHTML = `<p class="text-red-500 text-center mt-20">Error loading data.</p>`;
        console.error(err);
    }
}

function render() {
    const root = document.getElementById('app-root');
    if (state.view === 'home') {
        renderHome(root);
    } else {
        const activeWorkout = state.workouts.find(w => w.id === state.view);
        renderWorkout(root, activeWorkout);
    }
}

function renderHome(root) {
    const cards = state.workouts.map(w => {
        const prog = state.progress[w.id];
        const statusText = w.type === 'challenge' ? `${prog.logs.length}/${w.tasks.length} Days` : `${prog.logs.length} Sessions`;
        const color = w.color || 'blue';
        
        return `
            <button onclick="nav('${w.id}')" class="glass w-full p-6 rounded-3xl text-left flex justify-between items-center transition active:scale-95 border-l-8 border-${color}-500 mb-4">
                <div>
                    <h3 class="text-2xl font-black uppercase italic leading-none">${w.name}</h3>
                    <p class="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">${statusText}</p>
                </div>
            </button>
        `;
    }).join('');

    root.innerHTML = `
        <div class="pt-10">
            <h1 class="text-5xl font-black italic tracking-tighter mb-12 text-center uppercase leading-none">Training<br><span class="text-blue-500 text-6xl">Hub</span></h1>
            ${cards}
        </div>
    `;
}

function renderWorkout(root, workout) {
    const prog = state.progress[workout.id];
    let contentHtml = '';
    let isTaskDay = false;
    let totalRounds = 1;

    if (workout.type === 'challenge') {
        const dayData = workout.tasks[prog.cur - 1];
        if (!dayData) {
            contentHtml = `<p class="text-green-500 font-black text-center p-10 text-xl">PROGRAM COMPLETE 🏆</p>`;
        } else if (dayData.rest) {
            contentHtml = `
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-black italic uppercase leading-none">Day ${prog.cur}</h2>
                    <span class="text-[10px] font-black px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">REST</span>
                </div>
                <div class="p-10 text-center border border-blue-500/20 text-blue-400 font-black italic uppercase tracking-widest rounded-2xl mb-8">Active Recovery</div>`;
        } else {
            totalRounds = dayData.rounds || 1;
            
            // Build the visual Round Tracker
            let roundsTrackerHtml = '';
            if (totalRounds > 1 || state.sessionRound > 1) {
                const roundBoxes = Array.from({length: totalRounds}).map((_, i) => {
                    const rNum = i + 1;
                    const isDone = rNum < state.sessionRound;
                    const isCurrent = rNum === state.sessionRound;
                    return `
                        <div class="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-black transition-all duration-300 
                            ${isDone ? 'bg-green-500 border-green-500 text-slate-900 shadow-lg shadow-green-500/20 scale-100' : 
                              isCurrent ? 'border-blue-500 text-blue-500 bg-blue-500/10 scale-110 shadow-lg shadow-blue-500/20' : 
                              'border-slate-700 text-slate-600 bg-slate-800 scale-90'}">
                            ${isDone ? '✓' : rNum}
                        </div>
                    `;
                }).join('');

                roundsTrackerHtml = `
                    <div class="mt-8 mb-6 border-t border-slate-700/50 pt-8">
                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mb-4">Round Progress</p>
                        <div class="flex justify-center gap-4">
                            ${roundBoxes}
                        </div>
                    </div>
                `;
            }

            // Check if all rounds are completed
            if (state.sessionRound > totalRounds) {
                contentHtml = `
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="text-3xl font-black italic uppercase leading-none">Day ${prog.cur}</h2>
                        <span class="text-[10px] font-black px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/20">DONE</span>
                    </div>
                    ${roundsTrackerHtml}
                    <div class="mt-4 mb-8 p-8 text-center bg-green-500/10 rounded-3xl border border-green-500/20">
                        <p class="text-green-500 font-black text-2xl uppercase italic">Ready to Log! 🏆</p>
                    </div>
                `;
                isTaskDay = false; // Show the log session button
            } else {
                isTaskDay = true;
                const taskRows = Object.entries(dayData)
                    .filter(([k]) => k !== 'day' && k !== 'rest' && k !== 'rounds')
                    .map(([k, v], idx) => {
                        let timerHtml = '';
                        let timerToggleBtn = '';
                        
                        if (k.toLowerCase().includes('plank')) {
                            const secs = parseTime(v);
                            
                            // Re-positioned and styled Timer Toggle Button
                            timerToggleBtn = `
                                <div class="ml-10 mt-3">
                                    <button onclick="event.preventDefault(); toggleTimerView(${idx})" class="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-[11px] uppercase font-black active:scale-95 transition shadow-sm w-fit flex items-center gap-2">
                                        ⏱️ Timer Panel
                                    </button>
                                </div>
                            `;
                            
                            // Timer Panel Layout
                            timerHtml = `
                            <div id="timer-panel-${idx}" class="hidden ml-10 mt-3 flex gap-2 items-center bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-inner" onclick="event.preventDefault();">
                                <div id="time-disp-${idx}" class="font-mono text-xl font-black text-blue-400 w-20 text-center tracking-tighter">${formatTime(secs)}</div>
                                <div class="flex gap-2 flex-1">
                                    <button onclick="toggleTimer(${idx}, ${secs}, this)" class="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider active:bg-blue-500 transition">Start</button>
                                    <button onclick="resetTimer(${idx}, ${secs})" class="px-4 bg-slate-800 text-slate-400 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider active:bg-slate-700 transition">Reset</button>
                                </div>
                            </div>`;
                        }

                        return `
                        <div>
                            <p class="text-[10px] text-slate-500 font-bold uppercase mb-2 ml-1">${k}</p>
                            <label for="task-${idx}" class="block bg-white/5 p-4 rounded-2xl cursor-pointer hover:bg-white/10 active:scale-[0.98] transition border border-transparent select-none">
                                <div class="flex items-center gap-4">
                                    <input type="checkbox" id="task-${idx}" onchange="handleCheck('${workout.id}', ${totalRounds})" class="task-checkbox w-6 h-6 rounded bg-slate-800 border-slate-700 pointer-events-none">
                                    <span class="text-xl font-bold transition-all">${v}</span>
                                </div>
                                ${timerToggleBtn}
                                ${timerHtml}
                            </label>
                        </div>
                    `}).join('');

                contentHtml = `
                    <div class="flex justify-between items-center mb-8">
                        <h2 class="text-3xl font-black italic uppercase leading-none">Day ${prog.cur}</h2>
                        <span class="text-[10px] font-black px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">WORK</span>
                    </div>
                    <div class="space-y-4">${taskRows}</div>
                    ${roundsTrackerHtml}
                `;
            }
        }
    } else {
        const taskRows = workout.tasks.map((t, i) => `
            <label for="${workout.id}-${i}" class="block bg-white/5 p-4 rounded-2xl mb-4 cursor-pointer hover:bg-white/10 active:scale-[0.98] transition select-none">
                <div class="flex items-start gap-4">
                    <input type="checkbox" id="${workout.id}-${i}" class="mt-1 w-5 h-5 rounded bg-slate-800 border-slate-700 text-${workout.color}-500 pointer-events-none">
                    <span class="flex-1">
                        <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">${t.label}</p>
                        <p class="text-md font-bold leading-tight mt-1">${t.val}</p>
                    </span>
                </div>
            </label>
        `).join('');

        contentHtml = `
            <h2 class="text-3xl font-black italic uppercase mb-8 leading-none text-${workout.color}-500">${workout.name}</h2>
            <div>${taskRows}</div>`;
    }

    const gridHtml = renderGrid(prog.logs, workout.type === 'challenge' ? prog.cur : null);
    const color = workout.color || 'blue';

    root.innerHTML = `
        <button onclick="nav('home')" class="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2 text-[10px] uppercase tracking-widest font-black w-fit mb-6 transition">Back</button>
        <div class="glass p-6 rounded-[2.5rem] shadow-2xl">
            ${contentHtml}
            
            <!-- Dynamic Action Buttons -->
            ${(workout.type === 'challenge' && isTaskDay) ? 
                `<button id="next-round-btn" onclick="nextRound()" class="hidden w-full bg-slate-800 text-slate-400 border border-slate-700 py-5 rounded-2xl font-black text-lg uppercase active:scale-95 transition mb-4 shadow-xl">Complete Round</button>` 
            : ''}
            
            ${(!workout.tasks[prog.cur - 1] && workout.type === 'challenge') ? '' : 
                `<button id="finish-btn" onclick="finishSession('${workout.id}')" class="${isTaskDay ? 'hidden' : ''} w-full bg-${color}-600 py-5 rounded-2xl font-black text-xl uppercase shadow-xl shadow-${color}-600/20 active:scale-95 transition">Log Session</button>`
            }
        </div>
        <div class="mt-10 grid grid-cols-10 gap-1.5">${gridHtml}</div>
        <button onclick="showResetModal('${workout.id}')" class="w-full mt-10 p-4 rounded-xl border border-red-500/20 text-red-500 bg-red-500/5 text-[10px] font-black uppercase tracking-widest active:scale-95 transition">Reset Program Progress</button>
    `;
}

function renderGrid(logs, currentActive) {
    let html = '';
    for (let i = 1; i <= 30; i++) {
        const done = logs.includes(i);
        const active = i === currentActive;
        let classes = "grid-box ";
        
        if (done) classes += "bg-green-500 border-green-500 text-slate-900";
        else if (active) classes += "border-blue-500 text-blue-500 animate-pulse shadow-lg shadow-blue-500/20";
        else classes += "text-slate-800";
        
        html += `<div class="${classes}">${done ? '✓' : i}</div>`;
    }
    return html;
}

// Logic: Checkboxes & Rounds
function handleCheck(workoutId, totalRounds) {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    const nxtBtn = document.getElementById('next-round-btn');

    if (nxtBtn) {
        if (allChecked) {
            nxtBtn.classList.remove('hidden');
            if (state.sessionRound === totalRounds) {
                nxtBtn.innerText = "Complete Final Round →";
                nxtBtn.classList.replace('bg-slate-800', 'bg-green-600');
                nxtBtn.classList.replace('text-slate-400', 'text-white');
                nxtBtn.classList.replace('border-slate-700', 'border-green-500');
            } else {
                nxtBtn.innerText = `Complete Round ${state.sessionRound} →`;
                nxtBtn.classList.replace('text-slate-400', 'text-white');
            }
        } else {
            nxtBtn.classList.add('hidden');
        }
    }
}

function nextRound() {
    state.sessionRound++;
    clearActiveTimer();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Logic: Timer Toggle
function toggleTimerView(idx) {
    const panel = document.getElementById(`timer-panel-${idx}`);
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

// Logic: Timer
function parseTime(timeStr) {
    let seconds = 0;
    const mMatch = timeStr.match(/(\d+)\s*m/i);
    const sMatch = timeStr.match(/(\d+)\s*s/i);
    if (mMatch) seconds += parseInt(mMatch[1]) * 60;
    if (sMatch) seconds += parseInt(sMatch[1]);
    return seconds;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function clearActiveTimer() {
    if (tInterval) clearInterval(tInterval);
    tRunning = false;
    tActiveIdx = null;
}

function toggleTimer(idx, maxSecs, btnElem) {
    if (tActiveIdx !== idx) {
        clearActiveTimer();
        tActiveIdx = idx;
        tLeft = maxSecs;
    }

    if (tRunning) {
        // Pause
        clearInterval(tInterval);
        tRunning = false;
        btnElem.innerText = "Resume";
        btnElem.classList.replace('bg-red-500/20', 'bg-blue-600/20');
        btnElem.classList.replace('text-red-500', 'text-blue-500');
    } else {
        // Start
        tRunning = true;
        btnElem.innerText = "Pause";
        btnElem.classList.replace('bg-blue-600', 'bg-red-500/20');
        btnElem.classList.replace('text-white', 'text-red-500');

        tInterval = setInterval(() => {
            tLeft--;
            const disp = document.getElementById(`time-disp-${idx}`);
            if (disp) disp.innerText = formatTime(tLeft);

            if (tLeft <= 0) {
                clearInterval(tInterval);
                tRunning = false;
                btnElem.innerText = "Done";
                btnElem.disabled = true;
                btnElem.classList.replace('bg-red-500/20', 'bg-green-500/20');
                btnElem.classList.replace('text-red-500', 'text-green-500');
                
                // Auto-tick the checkbox
                const cb = document.getElementById(`task-${idx}`);
                if (cb && !cb.checked) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change'));
                }
            }
        }, 1000);
    }
}

function resetTimer(idx, maxSecs) {
    if (tActiveIdx === idx) {
        clearInterval(tInterval);
        tRunning = false;
        tLeft = maxSecs;
        
        const disp = document.getElementById(`time-disp-${idx}`);
        if (disp) disp.innerText = formatTime(maxSecs);

        // Reset the start/pause button beside it
        const container = disp.nextElementSibling;
        if (container) {
            const btn = container.querySelector('button');
            if (btn) {
                btn.innerText = "Start";
                btn.disabled = false;
                btn.className = "flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider active:bg-blue-500 transition";
            }
        }
    }
}

// Logic: Navigation & Actions
function nav(viewId) {
    state.view = viewId;
    state.sessionRound = 1;
    clearActiveTimer();
    window.scrollTo(0, 0);
    render();
}

function finishSession(workoutId) {
    const w = state.workouts.find(x => x.id === workoutId);
    const prog = state.progress[workoutId];

    if (w.type === 'challenge') {
        if (!prog.logs.includes(prog.cur)) prog.logs.push(prog.cur);
        prog.cur++;
    } else {
        const nextCount = prog.logs.length + 1;
        if (nextCount <= 30) prog.logs.push(nextCount);
    }

    state.sessionRound = 1;
    clearActiveTimer();
    localStorage.setItem('hub_progress', JSON.stringify(state.progress));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
}

// Logic: Reset Modal
function showResetModal(workoutId) {
    document.getElementById('reset-modal').classList.remove('hidden');
    document.getElementById('confirm-reset-btn').onclick = () => {
        state.progress[workoutId] = { cur: 1, logs: [] };
        state.sessionRound = 1;
        clearActiveTimer();
        localStorage.setItem('hub_progress', JSON.stringify(state.progress));
        hideResetModal();
        render();
    };
}

function hideResetModal() {
    document.getElementById('reset-modal').classList.add('hidden');
}

// Start the engine
init();
