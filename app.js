const WORKOUT_FILES = [
    'data/abs.json',
    'data/boxing.json'
];

let state = {
    view: 'home',
    progress: JSON.parse(localStorage.getItem('hub_progress')) || {},
    workouts: [],
    sessionRound: 1 // Tracks the current round for multi-round days
};

let timerInterval;

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
                <div class="text-${color}-500 text-3xl">→</div>
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

    if (workout.type === 'challenge') {
        const dayData = workout.tasks[prog.cur - 1];
        if (!dayData) {
            contentHtml = `<p class="text-green-500 font-black text-center p-10">PROGRAM COMPLETE 🏆</p>`;
        } else if (dayData.rest) {
            contentHtml = `
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-black italic uppercase leading-none">Day ${prog.cur}</h2>
                    <span class="text-[10px] font-black px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">REST</span>
                </div>
                <div class="p-10 text-center border border-blue-500/20 text-blue-400 font-black italic uppercase tracking-widest rounded-2xl mb-8">Active Recovery</div>`;
        } else {
            isTaskDay = true;
            const totalRounds = dayData.rounds || 1;
            
            const taskRows = Object.entries(dayData)
                .filter(([k]) => k !== 'day' && k !== 'rest' && k !== 'rounds')
                .map(([k, v]) => {
                    let extraHtml = '';
                    // Inject Timer for Planks
                    if (k.toLowerCase().includes('plank')) {
                        extraHtml = `<button onclick="startTimer(this, '${v}')" class="mt-2 block w-full text-[10px] bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg font-black tracking-widest text-blue-400 active:scale-95 transition">START TIMER</button>`;
                    }

                    return `
                    <div>
                        <p class="text-[10px] text-slate-500 font-bold uppercase mb-2">${k}</p>
                        <div class="bg-white/5 p-4 rounded-2xl">
                            <div class="flex items-center gap-4">
                                <input type="checkbox" onchange="handleCheck('${workout.id}', ${totalRounds})" class="task-checkbox w-6 h-6 rounded bg-slate-800 border-slate-700">
                                <span class="text-xl font-bold">${v}</span>
                            </div>
                            ${extraHtml}
                        </div>
                    </div>
                `}).join('');

            contentHtml = `
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-3xl font-black italic uppercase leading-none">Day ${prog.cur}</h2>
                    <span class="text-[10px] font-black px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">WORK</span>
                </div>
                ${totalRounds > 1 ? `<p class="text-blue-500 font-black italic mb-6">ROUND ${state.sessionRound} OF ${totalRounds}</p>` : '<div class="mb-8"></div>'}
                <div class="space-y-4 mb-8">${taskRows}</div>`;
        }
    } else {
        // Routine type code remains identical
        const taskRows = workout.tasks.map((t, i) => `
            <div class="bg-white/5 p-4 rounded-2xl flex items-start gap-4 mb-4">
                <input type="checkbox" id="${workout.id}-${i}" class="mt-1 w-5 h-5 rounded bg-slate-800 border-slate-700 text-${workout.color}-500">
                <label for="${workout.id}-${i}">
                    <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">${t.label}</p>
                    <p class="text-md font-bold leading-tight">${t.val}</p>
                </label>
            </div>
        `).join('');

        contentHtml = `
            <h2 class="text-3xl font-black italic uppercase mb-8 leading-none text-${workout.color}-500">${workout.name}</h2>
            <div>${taskRows}</div>`;
    }

    const gridHtml = renderGrid(prog.logs, workout.type === 'challenge' ? prog.cur : null);
    const color = workout.color || 'blue';

    // Hide the finish button initially if it's a task day (revealed via handleCheck)
    const buttonClass = isTaskDay ? "hidden" : "";

    root.innerHTML = `
        <button onclick="nav('home')" class="text-slate-500 text-[10px] font-black uppercase mb-6 tracking-[0.2em]">← Back to Hub</button>
        <div class="glass p-6 rounded-[2.5rem] shadow-2xl">
            ${contentHtml}
            ${(!workout.tasks[prog.cur - 1] && workout.type === 'challenge') ? '' : 
                `<button id="finish-btn" onclick="finishSession('${workout.id}')" class="${buttonClass} w-full bg-${color}-600 py-5 rounded-2xl font-black text-xl uppercase shadow-xl shadow-${color}-600/20 active:scale-95 transition">Log Session</button>`
            }
        </div>
        <div class="mt-10 grid grid-cols-10 gap-1.5">${gridHtml}</div>
        <button onclick="resetProgress('${workout.id}')" class="w-full mt-8 text-[9px] text-slate-700 font-black uppercase tracking-widest">Reset Progress</button>
    `;
}

function renderGrid(logs, currentActive) {
    let html = '';
    for (let i = 1; i <= 30; i++) {
        const done = logs.includes(i);
        const active = i === currentActive;
        let classes = "grid-box ";
        
        if (done) classes += "bg-green-500 border-green-500 text-slate-900";
        else if (active) classes += "border-blue-500 text-blue-500 animate-pulse";
        else classes += "text-slate-800";
        
        html += `<div class="${classes}">${done ? '✓' : i}</div>`;
    }
    return html;
}

// Checkboxes and Rounds Logic
function handleCheck(workoutId, totalRounds) {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    if (allChecked) {
        if (state.sessionRound < totalRounds) {
            setTimeout(() => {
                state.sessionRound++;
                if (timerInterval) clearInterval(timerInterval);
                render(); 
            }, 400); // Small delay so the user sees the final tick before it switches
        } else {
            // Unhide the Log Session button
            document.getElementById('finish-btn').classList.remove('hidden');
        }
    }
}

// Timer Logic
function parseTime(timeStr) {
    let seconds = 0;
    const mMatch = timeStr.match(/(\d+)\s*m/i);
    const sMatch = timeStr.match(/(\d+)\s*s/i);
    if (mMatch) seconds += parseInt(mMatch[1]) * 60;
    if (sMatch) seconds += parseInt(sMatch[1]);
    return seconds;
}

function startTimer(btn, timeStr) {
    if (timerInterval) clearInterval(timerInterval);
    let time = parseTime(timeStr);
    if(time === 0) return;
    
    btn.disabled = true;
    btn.classList.add('bg-blue-600', 'text-white');
    btn.classList.remove('bg-slate-800', 'text-blue-400');
    btn.innerText = time + ' SECONDS';
    
    timerInterval = setInterval(() => {
        time--;
        if(time <= 0) {
            clearInterval(timerInterval);
            btn.innerText = "DONE!";
            btn.classList.replace('bg-blue-600', 'bg-green-500');
            
            // Auto-check the plank box if possible
            const parent = btn.parentElement;
            const checkbox = parent.querySelector('.task-checkbox');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change'));
            }
        } else {
            btn.innerText = time + ' SECONDS';
        }
    }, 1000);
}

// Navigation & Actions
function nav(viewId) {
    state.view = viewId;
    state.sessionRound = 1; // Reset round on navigation
    if (timerInterval) clearInterval(timerInterval);
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

    state.sessionRound = 1; // Reset round for next time
    localStorage.setItem('hub_progress', JSON.stringify(state.progress));
    nav('home');
}

function resetProgress(workoutId) {
    if (confirm("Reset this specific program?")) {
        state.progress[workoutId] = { cur: 1, logs: [] };
        state.sessionRound = 1;
        localStorage.setItem('hub_progress', JSON.stringify(state.progress));
        render();
    }
}

// Start the engine
init();
