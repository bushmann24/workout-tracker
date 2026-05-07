// A simple registry of your workouts
const WORKOUT_FILES = ['data/abs.json', 'data/boxing.json'];

let progress = JSON.parse(localStorage.getItem('workout_progress')) || {};
let activeWorkout = null;

async function init() {
    const root = document.getElementById('app-root');
    const workoutId = localStorage.getItem('activeWorkoutId');

    if (workoutId) {
        // Load the specific workout file
        const res = await fetch(`data/${workoutId.split('-')[0]}.json`);
        activeWorkout = await res.json();
        renderWorkout(root);
    } else {
        renderDashboard(root);
    }
}

async function renderDashboard(root) {
    root.innerHTML = `<h1 class="text-4xl font-black mb-10 italic">TRAINING HUB</h1><div id="list" class="grid gap-4"></div>`;
    const list = document.getElementById('list');

    for (const file of WORKOUT_FILES) {
        const res = await fetch(file);
        const w = await res.json();
        const count = progress[w.id]?.history.length || 0;
        
        list.innerHTML += `
            <button onclick="selectWorkout('${w.id}')" class="glass p-6 rounded-3xl text-left flex justify-between items-center group">
                <div><h3 class="text-xl font-bold text-${w.color}-400">${w.name}</h3><p class="text-xs font-bold text-slate-500 uppercase">${count} Sessions Done</p></div>
                <div class="text-${w.color}-400">→</div>
            </button>`;
    }
}

function selectWorkout(id) {
    localStorage.setItem('activeWorkoutId', id);
    init();
}

function goHome() {
    localStorage.removeItem('activeWorkoutId');
    init();
}

function renderWorkout(root) {
    if (!progress[activeWorkout.id]) progress[activeWorkout.id] = { currentDay: 1, history: [] };
    const state = progress[activeWorkout.id];

    root.innerHTML = `
        <button onclick="goHome()" class="text-slate-500 text-xs font-black uppercase mb-6">← Home</button>
        <div class="glass p-8 rounded-[2.5rem] shadow-2xl">
            <h1 class="text-3xl font-black italic">${activeWorkout.name}</h1>
            <div class="space-y-6 mt-8">${renderTasks(state)}</div>
            <button onclick="completeSession()" class="w-full mt-10 btn-${activeWorkout.color} py-5 rounded-2xl font-black text-xl uppercase">Complete Session</button>
        </div>`;
}

function renderTasks(state) {
    if (activeWorkout.type === 'challenge') {
        const dayData = activeWorkout.tasks[state.currentDay - 1];
        return Object.entries(dayData).filter(([k]) => k !== 'day').map(([k, v]) => `
            <div class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <input type="checkbox" id="${k}" class="w-6 h-6"><label for="${k}" class="text-lg font-bold"><span class="text-xs block text-slate-500 uppercase">${k}</span>${v}</label>
            </div>`).join('');
    }
    // Logic for 'routine' type would go here...
}

function completeSession() {
    const state = progress[activeWorkout.id];
    if (activeWorkout.type === 'challenge') {
        state.history.push(state.currentDay);
        state.currentDay++;
    }
    localStorage.setItem('workout_progress', JSON.stringify(progress));
    renderWorkout(document.getElementById('app-root'));
}

init();
