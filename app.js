// 1. ADD NEW JSON FILES HERE
const WORKOUT_FILES = [
    'data/abs.json',
    'data/boxing.json'
];

let state = {
    view: 'home', // 'home' or a workout ID
    progress: JSON.parse(localStorage.getItem('hub_progress')) || {},
    workouts: []
};

// 2. BOOTSTRAP THE APP
async function init() {
    try {
        // Fetch all JSON files listed above
        const fetches = WORKOUT_FILES.map(file => fetch(file).then(res => res.json()));
        state.workouts = await Promise.all(fetches);
        
        // Ensure progress object exists for every loaded workout
        state.workouts.forEach(w => {
            if (!state.progress[w.id]) {
                state.progress[w.id] = { cur: 1, logs: [] };
            }
        });

        render();
    } catch (err) {
        document.getElementById('app-root').innerHTML = `<p class="text-red-500 text-center mt-20">Error loading data. Are you running this on a server/GitHub Pages?</p>`;
        console.error(err);
    }
}

// 3. RENDER LOGIC
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
            const taskRows = Object.entries(dayData)
                .filter(([k]) => k !== 'day' && k !== 'rest')
                .map(([k, v]) => `
                    <div>
                        <p class="text-[10px] text-slate-500 font-bold uppercase mb-2">${k}</p>
                        <div class="bg-white/5 p-4 rounded-2xl flex items-center gap-4">
                            <input type="checkbox" class="w-6 h-6 rounded bg-slate-800 border-slate-700">
                            <span class="text-xl font-bold">${v}</span>
                        </div>
                    </div>
                `).join('');

            contentHtml = `
                <div class="flex justify-between items-center mb-8">
                    <h2 class="text-3xl font-black italic uppercase leading-none">Day ${prog.cur}</h2>
                    <span class="text-[10px] font-black px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">WORK</span>
                </div>
                <div class="space-y-4 mb-8">${taskRows}</div>`;
        }
    } else {
        // Routine type (like Boxing)
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

    root.innerHTML = `
        <button onclick="nav('home')" class="text-slate-500 text-[10px] font-black uppercase mb-6 tracking-[0.2em]">← Back to Hub</button>
        <div class="glass p-6 rounded-[2.5rem] shadow-2xl">
            ${contentHtml}
            ${(!workout.tasks[prog.cur - 1] && workout.type === 'challenge') ? '' : 
                `<button onclick="finishSession('${workout.id}')" class="w-full bg-${color}-600 py-5 rounded-2xl font-black text-xl uppercase shadow-xl shadow-${color}-600/20 active:scale-95 transition">Log Session</button>`
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

// 4. ACTIONS
function nav(viewId) {
    state.view = viewId;
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

    localStorage.setItem('hub_progress', JSON.stringify(state.progress));
    render();
}

function resetProgress(workoutId) {
    if (confirm("Reset this specific program?")) {
        state.progress[workoutId] = { cur: 1, logs: [] };
        localStorage.setItem('hub_progress', JSON.stringify(state.progress));
        render();
    }
}

// Start the engine
init();
