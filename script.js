// ==========================================
//  APP LOCK!
// ==========================================


// (function checkAccess() {
//     const SECRET_CODE = "#schw3rundf4lsch!"; // DEIN CODE HIER (Ändern!)
//     const isUnlocked = localStorage.getItem('app_unlocked');

//     if (isUnlocked === 'true') return; // Schon freigeschaltet

//     // Overlay erstellen
//     const lock = document.createElement('div');
//     lock.id = 'app-lock-screen';
//     lock.innerHTML = `
//         <h2 style="color:white; font-family: sans-serif;">ACCESS RESTRICTED</h2>
//         <input type="password" class="lock-input" id="code-input" placeholder="••••" inputmode="numeric">
//         <button class="lock-btn" id="unlock-btn">ENTER</button>
//     `;
//     document.body.appendChild(lock);

//     const unlock = () => {
//         const input = document.getElementById('code-input').value;
//         if (input === SECRET_CODE) {
//             localStorage.setItem('app_unlocked', 'true');
//             lock.style.opacity = '0';
//             setTimeout(() => lock.remove(), 500);
//             if (navigator.vibrate) navigator.vibrate(20);
//         } else {
//             document.getElementById('code-input').style.borderColor = 'red';
//             if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
//         }
//     };

//     document.getElementById('unlock-btn').onclick = unlock;
//     document.getElementById('code-input').onkeypress = (e) => { if(e.key === 'Enter') unlock(); };
// })();

                                                                                        {}
// ==================================================================================== //
// ==================================================================================== //
//                          1. KONSTANTEN & VARIABLEN (STATE)                           //
// ==================================================================================== //
// ==================================================================================== //
                                                                                        {}          

let userExercises = JSON.parse(localStorage.getItem('exercise_names')) || [
    { id: 'ex_1', name: 'Bankdrücken', category: 'push', sub: 'brust', equipment: 'barbell'},
    { id: 'ex_2', name: 'Klimmzüge', category: 'pull', sub: 'ruecken', equipment: 'bodyweight' },
    { id: 'ex_3', name: 'Schulterdrücken', category: 'push', sub: 'schultern', equipment: 'barbell' },
    { id: 'ex_4', name: 'Beinpresse', category: 'legs', sub: 'legs', equipment: 'machine' }
];

let trainingHistory = JSON.parse(localStorage.getItem('workout_history')) || [];
let bodyStats = JSON.parse(localStorage.getItem('body_stats')) || [];
let lastTrackedEx = JSON.parse(localStorage.getItem('last_tracked_ex')) || null;
let activeSession = null;
let sessionTimerInterval = null;
let restTimerInterval = null;
let sortTimeout;
let shouldAnimateNewEntry = false;
let shouldAnimateNewSet = false;
let currentExerciseId = null;
let touchStartY = 0;
let startY = 0;
let currentY = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;
let isSwiping = false;
let bubbleIsDragging = false;
let currentEquipmentFilter = 'all';



                                                                                        {}
// ==================================================================================== //
// ==================================================================================== //
//                               2. LOGIK-MODULE (FUNCTIONS)                            //
// ==================================================================================== //
// ==================================================================================== //
                                                                                        {}



                                            {}
// ==========================================
// 2.1. SESSION FLOW (Start, Ende, Recovery)
// ==========================================
                                            {}




function initStartButtonAnimation() {
    const startBtn = document.getElementById('start-session-btn');
    if (!startBtn) return;

    startBtn.style.animation = "none";
    
    setTimeout(() => {
        startBtn.style.animation = "SlowPulse 8s infinite";
    }, 3000);
}

function toggleWorkoutMode(isActive) {
    const mainNav = document.getElementById('main-menu-bar');
    const startBtn = document.getElementById('start-session-btn');
    const endBtn = document.getElementById('end-session-btn');
    const activeDisplay = document.getElementById('active-workout-display');
    const idleDisplay = document.getElementById('idle-workout-display');

    if (isActive) {
        mainNav.classList.remove('hidden');
        startBtn.classList.add('hidden');
        endBtn.classList.remove('hidden');

        // Center-Tausch
        idleDisplay.classList.add('hidden');
        activeDisplay.classList.remove('hidden');        
        
        // showMainContent regelt den Puls jetzt automatisch am Ende der Funktion!
        showMainContent('exercises');
        
    } else {
        // Workout beendet
        startBtn.classList.remove('hidden');
        endBtn.classList.add('hidden');
        
        // Center-Tausch zurück
        activeDisplay.classList.add('hidden');
        idleDisplay.classList.remove('hidden');
        
        showMainContent('dashboard');
    }
}

function startWorkout() {
    if (activeSession) return;
    triggerBeastmode();
    activeSession = {
        id: 'session_' + Date.now(),
        name: 'Training', // Standardname
        startTimestamp: Date.now(),
        lastRestStart: null,
        exercises: [],
        date: new Date().toLocaleDateString('de-DE')
    };

    // --- HIER DER FIX: UI RESET ---
    const restDisplay = document.getElementById('rest-timer');
    if (restDisplay) {
        restDisplay.textContent = "00:00";
    }
    // ------------------------------
    
    saveToLocalStorage();
    toggleWorkoutMode(true);
    startSessionTimer();
    showMainContent('exercises'); 
}

function triggerBeastmode() {
    // Falls noch eins da ist, entfernen
    const oldOverlay = document.querySelector('.beastmode-overlay');
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'beastmode-overlay beastmode-active';
    
    overlay.innerHTML = `
        <div class="beastmode-text">
            <span class="line1">BEASTMODE</span>
            <span class="line2">ACTIVATED</span>
        </div>
    `;

    document.body.appendChild(overlay);

    // Haptik: Ein langer, kräftiger Vibe
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);

    // Nach der Animation (1.8s) das Element wieder entfernen
    setTimeout(() => {
        overlay.remove();
    }, 1800);
}
// -----------------------
async function endWorkout() {
    // 1. Prüfen, ob überhaupt etwas trainiert wurde
    const totalSets = activeSession.exercises.reduce((sum, ex) => sum + (ex.sets ? ex.sets.length : 0), 0);

    if (totalSets === 0) {
        // Fall A: Leeres Training
        const discard = await showCustomConfirm(
            "Leeres Training", 
            "Du hast keine Sätze eingetragen. Möchtest du dieses Training einfach verwerfen?",
            "Verwerfen",
            true // Danger-Rot, da Daten (die Session) gelöscht werden
        );

        if (discard) {
            cleanupSession(); // Hilfsfunktion zum Aufräumen
        }
        return; // Funktion hier abbrechen
    }
    // 1. Custom Confirm statt Standard confirm
    const confirmed = await showCustomConfirm(
        "Training beenden?", 
        "Training wird beendet und gespeichert!",
        "I'm done!", // Button Text
        false      // isDanger = false -> Kein Rot, sondern Akzentfarbe
    );

    if (confirmed) {
        clearInterval(sessionTimerInterval);
        clearInterval(restTimerInterval);
        // 2. Den Zeitstempel vernichten
        if (activeSession) {
            activeSession.lastRestStart = null;
        }

        // 3. Das UI "nullen", damit kein alter Wert stehen bleibt
        const restDisplay = document.getElementById('rest-timer'); 
        if (restDisplay) restDisplay.textContent = "00:00";
        
        if (!activeSession.type) activeSession.type = activeSession.name;

        // --- Namen-Check vor dem Speichern ---
        activeSession.exercises.forEach(sessionEx => {
            const masterEx = userExercises.find(ex => ex.id === sessionEx.id);
            if (masterEx) {
                sessionEx.name = masterEx.name;
            }
        });

        const finalDuration = document.getElementById('active-session-timer').textContent;
        activeSession.duration = finalDuration; 
        activeSession.date = new Date().toLocaleDateString('de-DE');         
        
        trainingHistory.unshift(activeSession);
        localStorage.setItem('workout_history', JSON.stringify(trainingHistory));
        
        activeSession = null;
        localStorage.removeItem('active_training_session');

        
        localStorage.removeItem('last_tracked_ex');
        lastTrackedEx = null;
        checkQuickResume();
        
        // UI Updates
        updateDashboard(); 
        renderWorkout();
        toggleWorkoutMode(false);
        
        // Das Alert ersetzen wir durch den Wechsel zum Dashboard
        renderWorkoutDetails(0, true);
        showMainContent('history');
    }
}

async function handleEndSessionClick() {
    const btn = document.getElementById('end-session-btn');
    if (!btn) return;

    // 1. Visuelles Feedback (Der Klick-Effekt)
    btn.style.transform = "scale(0.92)";
    btn.style.backgroundColor = "#902438";
    
    // 2. Kurz warten für das Auge
    setTimeout(async () => {
        btn.style.transform = "scale(1)";
        
        // 3. JETZT rufen wir deine große endWorkout auf
        // Da endWorkout "async" ist, nutzen wir hier "await"
        await endWorkout(); 

        // 4. Reset des Pulse-Effekts am Start-Button (nachdem endWorkout fertig ist)
        const startBtn = document.getElementById('start-session-btn');
        if (startBtn) {
            startBtn.style.animation = "SlowPulse 8s infinite";
            startBtn.style.backgroundColor = ""; 
        }
    }, 200);
}

function startSessionTimer() {
    const timerDisplay = document.getElementById('active-session-timer');
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionTimerInterval = setInterval(() => {
        const diff = Math.floor((Date.now() - activeSession.startTimestamp) / 1000);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${mins}:${secs}`;
    }, 1000);
}

function startRestTimer() {
    if (!activeSession) return;
    activeSession.lastRestStart = Date.now();
    saveToLocalStorage();
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = setInterval(updateRestTimerDisplay, 1000);
}

function updateRestTimerDisplay() {
    const timerDisplay = document.getElementById('rest-timer');
    if (!timerDisplay || !activeSession || !activeSession.lastRestStart) return;
    const diff = Math.floor((Date.now() - activeSession.lastRestStart) / 1000);
    const mins = Math.floor(diff / 60).toString().padStart(2, '0');
    const secs = (diff % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `${mins}:${secs}`;
}

function recoverActiveSession() {
    const saved = localStorage.getItem('active_training_session');
    if (!saved) return;

    activeSession = JSON.parse(saved);
    
    // UI in den Trainings-Modus schalten
    toggleWorkoutMode(true);
    
    // Timer fortsetzen
    startSessionTimer();
    
    // Falls ein Satz-Pause-Timer lief, diesen auch wiederbeleben
    if (activeSession.lastRestStart) {
        setInterval(updateRestTimerDisplay, 1000);
    }
}

function cleanupSession() {
    // Alle Intervalle stoppen
    clearInterval(sessionTimerInterval);
    clearInterval(restTimerInterval);
    
    // Daten löschen
    activeSession = null;
    localStorage.removeItem('active_training_session');
    localStorage.removeItem('last_tracked_ex');
    
    // Quick-Resume Button verstecken
    const resumeBtn = document.getElementById('quick-resume-btn');
    if (resumeBtn) resumeBtn.classList.add('hidden');
    lastTrackedEx = null;

    // UI zurücksetzen
    toggleWorkoutMode(false);
    updateDashboard(); 
    renderWorkout();
    showMainContent('dashboard');
}




                                            {}
// ==========================================
// 2.2. NAVIGATION & TABS
// ==========================================
                                            {}




function showMainContent(target) {
    const mainSections = ['dashboard', 'exercises', 'settings', 'history', 'body'];
    mainSections.forEach(id => {
        const el = document.getElementById('content-' + id);
        if (el) el.classList.toggle('hidden', id !== target);
    });

    const workoutNav = document.getElementById('workout-nav');
    if (workoutNav) workoutNav.classList.toggle('hidden', target !== 'exercises');
    const filterBar = document.getElementById('filter-bar-wrapper');
    if (filterBar) {
        const isExercises = target === 'exercises';
        filterBar.classList.toggle('hidden', !isExercises);

        if (isExercises) {
            // 1. Visuell: Den "Alle"-Chip aktivieren
            filterBar.querySelectorAll('.filter-chip').forEach(chip => {
                chip.classList.toggle('active', chip.dataset.filter === 'all');
            });

            // --- DER ENTSCHEIDENDE FIX ---
            // Wir überschreiben die Variable, die applyEquipmentFilter() nutzt.
            // Wichtig: Ohne 'const' oder 'let', damit die globale Variable geändert wird!
            currentEquipmentFilter = 'all'; 
            // ------------------------------

            // 2. Funktionell: Erstmal alle Karten einblenden
            document.querySelectorAll('.exercise-node').forEach(card => {
                card.classList.remove('hidden');
            });
            
            // 3. Optionaler Sicherheitscheck:
            // Falls switchWorkoutTab weiter unten applyEquipmentFilter() NICHT aufruft,
            // rufen wir es hier sicherheitshalber einmal selbst auf:
            if (typeof applyEquipmentFilter === 'function') {
                applyEquipmentFilter();
            }
        }
    }


    const dashArea = document.getElementById('dashboard');
    if (dashArea) dashArea.classList.toggle('hidden', target !== 'dashboard');

    if (target === 'exercises') {
        // 1. Welcher Workout-Tab war zuletzt aktiv? 
        // Falls keiner aktiv ist (Initialzustand), nehmen wir 'push'
        const activeTabBtn = document.querySelector('.tab-btn.active');
        const lastCategory = activeTabBtn ? activeTabBtn.dataset.tab : 'push';

        // 2. Wir rufen switchWorkoutTab auf statt nur renderAllExercises.
        // Das sorgt dafür, dass die komplette Logik inklusive "Erste Gruppe öffnen"
        // durchlaufen wird, die du dort definiert hast.
        if (typeof switchWorkoutTab === 'function') {
            switchWorkoutTab(lastCategory);
        }
    }

    

    const logo = document.querySelector('.app-logo');
    const infoCenter = document.getElementById('session-info-center');
    const title = document.querySelector('.session-title');
    const header = document.querySelector('header'); // Falls du dem Header die Klasse geben willst

    if (logo && infoCenter) {
        if (target === 'dashboard') {
            logo.classList.add('logo-animate-out');
            infoCenter.classList.add('dashboard-mode');
            title.classList.add('dashboard-mode');
            if (header) header.classList.add('is-dashboard');
        } else {
            logo.classList.remove('logo-animate-out');
            infoCenter.classList.remove('dashboard-mode');
            title.classList.remove('dashboard-mode');
            if (header) header.classList.remove('is-dashboard');
        }
    }


    document.querySelectorAll('.menu-link').forEach(btn => {
        const isNewActive = btn.dataset.main === target;
        btn.classList.toggle('active', isNewActive);

        // --- NEU: Puls-Logik ---
        // Wir prüfen, ob dieser spezifische Button der Training-Button ist (Hantel-Icon)
        const isTrainingBtn = btn.querySelector('i.fa-dumbbell');
        
        if (isTrainingBtn) {
            // Puls an, wenn: Training läuft UND wir NICHT in der Übungs-Sektion sind
            if (typeof activeSession !== 'undefined' && activeSession && target !== 'exercises') {
                btn.classList.add('force-pulse');
            } else {
                btn.classList.remove('force-pulse');
            }
        }
    });
}

function switchWorkoutTab(category) {
    const categories = ['push', 'pull', 'legs'];
    categories.forEach(cat => {
        const el = document.getElementById('content-' + cat);
        if (el) el.classList.toggle('hidden', cat !== category);
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === category);
    });

    renderAllExercises();
}

// function handleSubgroupToggle(event) {
//     // Das 'event.currentTarget' ist das h3, auf das geklickt wurde
//     const header = event.currentTarget;
//     const group = header.parentElement;
//     const grid = group.querySelector('.button-grid');
//     const isOpen = group.classList.contains('open');

//     // 1. Alle anderen Gruppen schließen (dein bisheriger Code)
//     document.querySelectorAll('.sub-group').forEach(el => {
//         el.classList.remove('open');
//         const otherGrid = el.querySelector('.button-grid');
//         if (otherGrid) otherGrid.style.display = 'none';
//     });

//     // 2. Die geklickte Gruppe öffnen, falls sie vorher zu war
//     if (!isOpen) {
//         group.classList.add('open');
//         if (grid) grid.style.display = 'flex';
//     }
// }

function showSuccessFeedback(btn, successText = "GESPEICHERT") {
    if (!btn) return;
    
    const originalText = btn.innerText;
    // Holt die echte Hintergrundfarbe vom Browser, egal wo sie definiert wurde
    const originalBg = window.getComputedStyle(btn).backgroundColor;

    btn.innerText = successText;
    btn.style.borderColor = "#03da44"; 
    btn.disabled = true;

    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.borderColor = ""; // Setzt es auf den CSS-Standard zurück
        btn.disabled = false;
    }, 1500);
}



                                            {}
// ==========================================
// 2.3. OVERLAY LOGIC (Die Exercise-Card)
// ==========================================
                                            {}



function openExerciseCard(ex) {
    currentExerciseId = ex.id;
    const overlay = document.getElementById('exercise-overlay');
    const isFirstOpening = overlay.classList.contains('hidden');

    // --- NEU: Icon & Farben Logik ---
    const iconContainer = document.getElementById('overlay-exercise-icon');
    const sub = (ex.sub || "").toLowerCase();
    const cat = (ex.category || "").toLowerCase();

    // 1. Hintergrundfarbe bestimmen (passend zu deinen Cards)
    let badgeClass = 'border-default'; // Fallback
    if (sub === 'brust' || sub.includes('schulter') || sub === 'trizeps') badgeClass = 'border-push';
    else if (sub === 'rücken' || sub === 'ruecken' || sub === 'bizeps') badgeClass = 'border-pull';
    else if (cat === 'legs' || sub === 'legs' || sub === 'beine') badgeClass = 'border-legs';

    // Klassen am Icon-Container setzen (entfernt alte Farben, setzt neue)
    if (iconContainer) {
        iconContainer.className = `exercise-icon-badge ${badgeClass}`;
        
        // 2. Icon-Typ bestimmen
        const eqIcons = {
            'machine': 'svg_icons/machine.svg',
            'barbell': 'fa-dumbbell',
            'cable': 'svg_icons/cable.svg',
            'bodyweight': 'fa-person'
        };

        const iconData = ex.equipment ? eqIcons[ex.equipment] : getCategoryIcon(ex.category, ex.sub);
        
        // 3. HTML Content setzen
        if (iconData && iconData.endsWith('.svg')) {
            iconContainer.innerHTML = `<img src="${iconData}" class="eq-svg-icon" alt="eq">`;
        } else {
            iconContainer.innerHTML = `<i class="fa-solid ${iconData || 'fa-question'}"></i>`;
        }
    }
    // --- Ende Icon Logik ---

    if (isFirstOpening) {
        const noteContainer = document.getElementById('note-input-container');
        const addNote = document.getElementById('add-note-btn');
        noteContainer.classList.remove('show', 'open');
        addNote.classList.remove('active');
        document.getElementById('previous-notes-container').classList.remove('show', 'open');
    }
    
    document.getElementById('current-exercise-name').innerText = ex.name;
    overlay.dataset.currentExId = ex.id;

    const stats = getExerciseStats(ex.id);
    const pbDisplay = document.getElementById('pb-display');
    if (pbDisplay) pbDisplay.innerText = stats.pb;

    document.getElementById('weight-input').value = "";
    document.getElementById('reps-input').value = "";

    const exEntry = activeSession ? activeSession.exercises.find(e => e.id === ex.id) : null;
    const noteField = document.getElementById('temp-exercise-note');
    if (noteField) {
        noteField.value = exEntry && exEntry.note ? exEntry.note : "";
    }

    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    window.history.pushState({ modalOpen: true }, "");

    const inputArea = document.querySelector('.input-area'); 
    if (inputArea) {
        inputArea.style.display = activeSession ? 'block' : 'none';
    }        
    
    checkQuickResume();
    renderCurrentSets(ex.id);
}

function closeExerciseCard() {
    const overlay = document.getElementById('exercise-overlay');
    if (!overlay) return;


    // 1. Visuelles Schließen einleiten
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    // Quick-Resume checken      
    

    // 2. Historie nur EINMAL aufräumen
    if (window.history.state && window.history.state.modalOpen) {
        window.history.back();
    }

    // 3. Den Reset der Styles erzwingen
    // Wir nutzen hier einen etwas längeren Timeout und stellen sicher,
    // dass die Elemente wirklich gefunden werden.
    setTimeout(() => {
        const dragHandle = document.getElementById('drag-handle-container');
        const header = document.querySelector('.overlay-header');
        const body = document.querySelector('.overlay-body');
        
        const elementsToReset = [dragHandle, header, body];

        const noteContainer = document.getElementById('note-input-container');
        const addNote = document.getElementById('add-note-btn');
        const viewNotes = document.getElementById('view-notes-btn');
        const prevNotesContainer = document.getElementById('previous-notes-container');

        if (noteContainer) noteContainer.classList.remove('show', 'open');
        if (addNote) addNote.classList.remove('active');
        if (viewNotes) viewNotes.classList.remove('active');
        if (prevNotesContainer) prevNotesContainer.classList.remove('show', 'open');



        
        elementsToReset.forEach(el => {
            if (el) {
                // Wir setzen die Styles auf null, um sie komplett aus dem Inline-HTML zu löschen
                el.style.removeProperty('transform');
                el.style.removeProperty('transition');
            }
        });
        
        // Variable für den Drag-Status zurücksetzen
        currentY = 0;
        isDragging = false; 
    }, 500); // 500ms sicherheitshalber, damit die CSS-Transition fertig ist
    checkQuickResume();
}

function handleOverlayDragStart(e) {
    const dragHandle = document.getElementById('drag-handle-container');
    const cardElements = [
        dragHandle, 
        document.querySelector('.overlay-header'), 
        document.querySelector('.overlay-body')
    ].filter(el => el !== null);

    isDragging = true;
    startY = e.touches[0].clientY;
    
    cardElements.forEach(el => el.style.transition = 'none');
}

function handleOverlayDragMove(e) {
    if (!isDragging) return;
    
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
        currentY = deltaY;
        const elements = [
            document.getElementById('drag-handle-container'),
            document.querySelector('.overlay-header'),
            document.querySelector('.overlay-body')
        ].filter(el => el !== null);

        elements.forEach(el => {
            el.style.transform = `translateY(${deltaY}px)`;
        });
    }
}

function handleOverlayDragEnd() {
    if (!isDragging) return;
    isDragging = false;

    const elements = [
        document.getElementById('drag-handle-container'),
        document.querySelector('.overlay-header'),
        document.querySelector('.overlay-body')
    ].filter(el => el !== null);

    elements.forEach(el => {
        el.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    });

    if (currentY > 150) {
        elements.forEach(el => el.style.transform = 'translateY(100vh)');
        closeExerciseCard(); 
    } else {
        elements.forEach(el => el.style.transform = 'translateY(0)');
    }
    currentY = 0;
}

function handlePopState() {
    const overlay = document.getElementById('exercise-overlay');
    
    // Nur reagieren, wenn das Overlay gerade sichtbar ist
    if (overlay && !overlay.classList.contains('hidden')) {
        // Wir rufen die existierende Funktion auf. 
        // WICHTIG: Falls closeExerciseCard selbst ein history.back() macht, 
        // müssen wir aufpassen, dass wir keine Endlosschleife bauen.
        
        overlay.classList.add('hidden');
        document.body.classList.remove('modal-open');
        checkQuickResume();
        
        // Reset der Drag-Werte (wie in deiner Original-Logik)
        setTimeout(() => {
            currentY = 0;
            isDragging = false;
        }, 500);
    }
}

function handleSaveSet() {
    // 1. Variablen definieren (Wichtig: overlay muss hier rein!)
    const btn = document.getElementById('save-set-btn');
    const overlay = document.getElementById('exercise-overlay'); 
    const weightInput = document.getElementById('weight-input');
    const repsInput = document.getElementById('reps-input');
    
    // Sicherheitscheck: Existiert das Overlay?
    if (!overlay) {
        console.error("Overlay nicht gefunden!");
        return;
    }

    uiPulse(btn); // Visuelles Feedback

    const exId = overlay.dataset.currentExId;
    const exName = document.getElementById('current-exercise-name').innerText;
    
    // 2. Validierung: Nichts tun, wenn Felder leer sind
    if (!weightInput.value || !repsInput.value) return;

    // 3. Übung in der Session finden oder neu anlegen
    let exEntry = activeSession.exercises.find(e => e.id === exId);
    if (!exEntry) {
        exEntry = { 
            id: exId, 
            name: exName, 
            sets: [], 
            note: document.getElementById('temp-exercise-note').value 
        };
        activeSession.exercises.push(exEntry);
    }

    // 4. Den Satz hinzufügen
    const restTime = document.getElementById('rest-timer').innerText;
    exEntry.sets.push({ 
        weight: parseFloat(weightInput.value.replace(',', '.')), 
        reps: parseInt(repsInput.value), 
        restTime: restTime                
    });

    lastTrackedEx = { id: exId, name: exName };
    localStorage.setItem('last_tracked_ex', JSON.stringify(lastTrackedEx)); 

    // 5. Folge-Aktionen
    if (typeof startRestTimer === 'function') startRestTimer();
    
    shouldAnimateNewSet = true; 
    renderCurrentSets(exId);
    saveToLocalStorage();
    
    // Erfolg zeigen & aufräumen
    showSuccessFeedback(btn, "SATZ GESPEICHERT");
    repsInput.value = ''; 
    
    // 6. Tastatur einklappen & GANZES Overlay nach oben scrollen
    setTimeout(() => { 
        document.activeElement.blur(); 
        // Wir scrollen jetzt das Overlay, weil der Body kein eigenes Scrollen mehr hat
        overlay.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
}

async function editSet(exId, setIndex) {
    const exEntry = activeSession.exercises.find(e => e.id === exId);
    if (!exEntry) return;
    const set = exEntry.sets[setIndex];

    // Wir rufen den neuen Prompt auf und warten auf das Ergebnis
    const result = await showSetPrompt("Satz bearbeiten", set.weight, set.reps);

    // Wenn der User nicht auf "Abbrechen" geklickt hat (result ist nicht null)
    if (result) {
        exEntry.sets[setIndex].weight = result.weight;
        exEntry.sets[setIndex].reps = result.reps;

        // UI aktualisieren
        renderCurrentSets(exId);
        saveToLocalStorage();
        
        // Optional: Stats/PB Check
        const stats = getExerciseStats(exId);
        if (document.getElementById('pb-display')) {
            document.getElementById('pb-display').innerText = stats.pb;
        }
    }
}

function toggleSetsList() {
    const list = document.getElementById('sets-list');
    const header = document.querySelector('.exercise-accordion-trigger');
    const overlay = document.getElementById('exercise-overlay');
    
    if (!list || !header) return;

    const isOpening = !list.classList.contains('show');

    if (isOpening) {
        // --- ÖFFNEN ---
        list.classList.add('show');
        header.classList.add('active');
        
        setTimeout(() => {
            header.scrollIntoView({ behavior: 'smooth', block: 'start' });
         }, 500);
    } else {
        // --- SCHLIESSEN ---
        // 1. Zuerst das Scrollen nach oben starten (Reset für den Browser)
        if (overlay) {
            overlay.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // 2. Wir warten 200ms (während der Scrollvorgang schon läuft),
        // bevor wir die Kachel zuklappen. 
        // So "sieht" der Browser beim Einklappen schon das obere Ende.
        
            list.classList.remove('show');
            header.classList.remove('active');        
    }
}

function toggleNoteInput() {
    const btn = document.getElementById('add-note-btn');
    const container = document.getElementById('note-input-container');
    const overlay = document.getElementById('exercise-overlay');
    const textarea = document.getElementById('temp-exercise-note');
    
    const isOpening = !container.classList.contains('show');

    if (isOpening) {
        container.classList.add('show');
        btn.classList.add('active');
        
        // 1. Fokus setzen
        setTimeout(() => {
            if (textarea) textarea.focus();
            
            // 2. Ein bisschen warten, bis die Tastatur physikalisch Platz beansprucht
            setTimeout(() => {
                // Wir scrollen das gesamte Overlay zum Button
                // scrollIntoView mit 'center' sorgt dafür, dass das Feld mittig im freien Platz landet
                btn.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300); 
        }, 100);
    } else {
        container.classList.remove('show');
        btn.classList.remove('active');
        if (overlay) overlay.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function togglePreviousNotes() {
    const btn = document.getElementById('view-notes-btn');
    const container = document.getElementById('previous-notes-container');
    const list = document.getElementById('previous-notes-list');
    const overlay = document.getElementById('exercise-overlay');
    const exId = overlay.dataset.currentExId;

    const isOpening = !container.classList.contains('show');

    if (isOpening) {
        // --- NOTIZEN LADEN & ANZEIGEN ---
        const prevNotes = getPreviousNotes(exId);
        list.innerHTML = prevNotes.length === 0 
            ? "<li><small>Keine alten Notizen.</small></li>" 
            : "";
            
        prevNotes.forEach(n => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${n.date}:</strong> ${n.text}`;
            list.appendChild(li);
        });

        container.classList.add('show');
        btn.classList.add('active'); // Chevron drehen via CSS

        // Sanftes Scrollen, damit die Notizen im Blickfeld sind
        setTimeout(() => {
            btn.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    } else {
        // --- ZUKLAPPEN ---
        // Erst nach oben scrollen für eine saubere Animation
        if (overlay) {
            overlay.scrollTo({ top: 0, behavior: 'smooth' });
        }

        setTimeout(() => {
            container.classList.remove('show');
            btn.classList.remove('active'); // Chevron zurückdrehen
        }, 200);
    }
}

function handleInputFocusScroll(e) {
    const overlay = document.getElementById('exercise-overlay');
    const targetInput = e.currentTarget;

    // Ein leichter Timeout ist nötig, da die Tastatur Zeit braucht, 
    // um hochzufahren und das Layout zu verschieben.
    setTimeout(() => {
        overlay.scrollTo({ 
            top: targetInput.offsetTop - 150, 
            behavior: 'smooth' 
        });
    }, 350);
}

function handleQuickResumeBtn() {
    const overlay = document.getElementById('exercise-overlay');
    // Nur ausführen, wenn die Card auch wirklich geschlossen ist
    if (lastTrackedEx && overlay.classList.contains('hidden')) {
        openExerciseCard(lastTrackedEx);
    }
}



                                            {}
// ==========================================
// 2.4. EDIT & DATA HANDLER
// ==========================================
                                            {}



async function handleExerciseEdit(id) {
    const ex = userExercises.find(e => e.id === id);
    if (!ex) return;

    // --- NEU: Vor dem Öffnen das richtige Icon im Modal markieren ---
    const currentEq = ex.equipment || 'machine'; // Standardmäßig 'machine', falls alt
    const modalEqOptions = document.querySelectorAll('#equipment-selection .eq-option');
    modalEqOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.eq === currentEq);
    });

    // Wir rufen showCustomPrompt mit 'true' auf, damit die Icons erscheinen
    const result = await showCustomPrompt("Übung bearbeiten", ex.name, true); 
    if (!result) return;

    if (result.action === 'delete') {
        const confirmed = await showCustomConfirm(
            "Übung löschen", 
            `Möchtest du "${ex.name}" wirklich unwiderruflich aus den Stammdaten löschen?`
        );

        if (confirmed) {
            userExercises = userExercises.filter(e => e.id !== id);
            localStorage.setItem('exercise_names', JSON.stringify(userExercises));
            renderAllExercises();
            document.getElementById('exercise-overlay').classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
    } else if (result.action === 'save' && result.value) {
        // --- NEU: Namen UND Equipment speichern ---
        ex.name = result.value;
        ex.equipment = result.equipment; 
        
        localStorage.setItem('exercise_names', JSON.stringify(userExercises));
        
        // UI aktualisieren
        renderAllExercises();
        document.getElementById('current-exercise-name').innerText = ex.name;
    }
}

async function handleSetEdit(exId, setIndex) {
    const exEntry = activeSession.exercises.find(e => e.id === exId);
    if (!exEntry) return;
    const set = exEntry.sets[setIndex];

    const result = await showSetPrompt("Satz bearbeiten", set.weight, set.reps);
    if (!result) return;

    if (result.action === 'delete') {
        const confirmed = await showCustomConfirm("Satz löschen", "Möchtest du diesen Satz wirklich entfernen?");
            if (confirmed) {
                exEntry.sets.splice(setIndex, 1);
            }
    } else if (result.action === 'save') {
        exEntry.sets[setIndex].weight = parseFloat(result.weight);
        exEntry.sets[setIndex].reps = parseInt(result.reps);
    }

    renderCurrentSets(exId);
    saveToLocalStorage();
    
    // Stats Update
    const stats = getExerciseStats(exId);
    if (document.getElementById('pb-display')) {
        document.getElementById('pb-display').innerText = stats.pb;
    }
}

/**
 * @param {HTMLElement} element - Das H2 oder Span, das editiert werden soll
 * @param {Function} onSave - Callback-Funktion, die den neuen Wert speichert
 */
function makeEditable(element, onSave) {
    if (!element) return;
    
    const originalText = element.innerText;
    const cleanText = originalText.replace(/[\u2700-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();

    // 1. Input-Feld erstellen
    const input = document.createElement('input');
    input.type = 'text';
    input.value = cleanText;
    input.maxLength = 60;
    input.className = 'inline-edit-input';

    // 2. Den temporären Apply-Button für den Edit-Modus erstellen
    const tempApplyBtn = document.createElement('button');
    tempApplyBtn.className = 'name-apply-btn edit-mode-active'; // Klasse für Styling
    tempApplyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    tempApplyBtn.type = 'button';

    // Container-Logik: Wir brauchen ein Hilfs-Element, um Input und Button nebeneinander zu halten
    const editContainer = document.createElement('div');
    editContainer.style.display = 'flex';
    editContainer.style.display = 'inline-flex';
    editContainer.style.alignItems = 'center';
    editContainer.style.gap = '8px';

    // Elemente ersetzen
    element.parentNode.replaceChild(editContainer, element);
    editContainer.appendChild(input);
    editContainer.appendChild(tempApplyBtn);

    input.focus();
    input.select();

    let isSaving = false;

    const saveAction = () => {
        if (isSaving) return;
        isSaving = true;

        const newValue = input.value.trim() || cleanText;
        const newElement = document.createElement(element.tagName.toLowerCase());
        newElement.className = element.className;
        newElement.id = element.id;
        newElement.innerText = newValue;
        
        if (editContainer.parentNode) {
            editContainer.parentNode.replaceChild(newElement, editContainer);
            addEditIcon(newElement, onSave);
            
            if (newValue !== cleanText) {
                onSave(newValue);
            }
        }
    };

    // Button-Klick löst Speichern aus
    tempApplyBtn.onmousedown = (e) => {
        e.preventDefault(); // Verhindert, dass blur vor dem Klick feuert
        saveAction();
    };

    input.onblur = () => {
        // Kleiner Timeout, damit ein Klick auf den Button registriert werden kann
        setTimeout(() => { if (!isSaving) saveAction(); }, 150);
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveAction();
        }
        if (e.key === 'Escape') {
            isSaving = true;
            const newElement = document.createElement(element.tagName.toLowerCase());
            newElement.className = element.className;
            newElement.id = element.id;
            newElement.innerText = cleanText;
            if (editContainer.parentNode) {
                editContainer.parentNode.replaceChild(newElement, editContainer);
                addEditIcon(newElement, onSave);
            }
        }
    };
}

function addEditIcon(targetElement, onSave) {
    if (!targetElement) return;
    
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-pen detail-edit-icon';
    icon.style.cursor = "pointer";
    
    icon.onclick = (e) => {
        e.stopPropagation();
        // Statt 'save' aufzurufen, rufen wir 'makeEditable' auf
        makeEditable(targetElement, onSave);
    };
    
    targetElement.appendChild(icon);
}

function initExerciseSorting() {
    const grids = ['grid-brust', 'grid-schultern', 'grid-trizeps', 'grid-ruecken', 'grid-bizeps', 'grid-legs'];
    
    grids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const sortableInstance = Sortable.get(el);
            if (sortableInstance) sortableInstance.destroy();

            Sortable.create(el, {
                animation: 150,
                delay: 500,
                delayOnTouchOnly: false,
                draggable: ".exercise-node", 
                filter: ".add-btn",
                chosenClass: "sort-active",
                dragClass: "sort-ghost",

                // NUR DIESE LOGIK KOMMT NEU DAZU:
                onMove: function (evt) {
                    // Verhindert das Verschieben NACH dem Add-Button
                    // Falls das Ziel-Element (related) die Klasse add-btn hat, Tausch abbrechen
                    return !evt.related.classList.contains('add-btn');
                },

                onEnd: function (evt) {
                    if (evt.oldIndex !== evt.newIndex) {
                        saveNewExerciseOrder(id);
                    }
                }
            });
        }
    });
}

function saveNewExerciseOrder(gridId) {
    const grid = document.getElementById(gridId);
    // Hole die IDs in der Reihenfolge, wie sie JETZT im HTML liegen (dank Sortable)
    const newOrderIds = Array.from(grid.querySelectorAll('.exercise-node:not(.add-btn)'))
                             .map(node => node.dataset.exId);

    if (newOrderIds.length === 0) return;

    // 1. Alle Übungen, die NICHT zu diesem Grid gehören
    const otherExercises = userExercises.filter(ex => !newOrderIds.includes(ex.id));
    
    // 2. Die Übungen dieses Grids in der NEUEN Reihenfolge
    // Wir mappen UND filtern sofort alles raus, was nicht gefunden wurde
const reorderedGridExercises = newOrderIds
    .map(id => userExercises.find(ex => ex.id === id))
    .filter(item => item !== undefined && item !== null);

    // 3. Zusammenführen: Wir behalten die anderen, und fügen die neuen an.
    // WICHTIG: Damit die Subgroups nicht wandern, müssen wir die Position halten.
    const firstIndex = userExercises.findIndex(ex => newOrderIds.includes(ex.id));
    
    let tempArray = [...userExercises.filter(ex => !newOrderIds.includes(ex.id))];
    tempArray.splice(firstIndex, 0, ...reorderedGridExercises);

    // 4. NUR Speichern, KEIN RENDER
    userExercises = tempArray;
    localStorage.setItem('exercise_names', JSON.stringify(userExercises));

    console.log("Daten im Hintergrund gespeichert. DOM bleibt unverändert.");
}

function initSwipeToDelete() {
    const cards = document.querySelectorAll('.swipe-card');
    
    cards.forEach((card, index) => {
        let startX = 0;
        let currentX = 0;
        const threshold = -100; // Ab wie viel Pixeln nach links (negativ) wird gelöscht?

        card.ontouchstart = (e) => {
            startX = e.touches[0].clientX;
            card.style.transition = 'none'; // Sofortiges Feedback ohne Verzögerung
        };

        card.ontouchmove = (e) => {
            currentX = e.touches[0].clientX - startX;
            
            if (currentX < 0) { // Nur nach links
                card.style.transform = `translateX(${currentX}px)`;
                
                // Finde den delete-hint in diesem speziellen Wrapper
                const hint = card.closest('.swipe-card-wrapper').querySelector('.delete-hint');
                if (hint) {
                    // Logik: Ab 0px fängt es an, bei -100px ist es voll da (1)
                    // Wir nutzen Math.abs um den negativen Wert positiv zu machen
                    let progress = Math.abs(currentX) / 100; 
                    
                    // Erst ab 30-50px wirklich sichtbar werden lassen für den "Einstieg"
                    if (Math.abs(currentX) < 30) {
                        hint.style.opacity = 0;
                    } else {
                        hint.style.opacity = Math.min(progress, 1);
                    }
                }
            }
        };

        card.ontouchend = async () => {
            // Weiche Animation für das Zurückschnappen oder Rausrutschen
            card.style.transition = 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
            
            // Wir brauchen den Hint, um ihn ggf. wieder auszublenden
            const hint = card.parentElement.querySelector('.delete-hint');

            if (currentX < threshold) {
                // 1. Karte erst mal ganz rausschieben für den visuellen Effekt
                card.style.transform = `translateX(-100%)`; 

                // 2. Deine Bestätigung abwarten
                const confirmed = await showCustomConfirm(
                    "Workout löschen",
                    "Bist du sicher? Das kann nicht rückgängig gemacht werden.",
                    "Löschen",
                    true
                );

                if (confirmed) {
                    // 3. Wenn gelöscht wird:
                    deleteWorkout(index);
                } else {
                    // 4. Wenn abgebrochen wird: Alles zurück auf Anfang
                    card.style.transform = `translateX(0)`;
                    if (hint) {
                        hint.style.transition = 'opacity 0.3s ease';
                        hint.style.opacity = 0;
                    }
                }
            } else {
                // Nicht weit genug geswiped: Einfach zurückgleiten
                card.style.transform = `translateX(0)`;
                if (hint) {
                    hint.style.transition = 'opacity 0.3s ease';
                    hint.style.opacity = 0;
                }
            }

            // Reset der Tracking-Variable
            currentX = 0;
        };
    });
}

async function deleteStat(index) {
    // Unser Custom Confirm statt des Browser-Standards
    const confirmed = await showCustomConfirm(
        "Eintrag löschen", 
        "Möchtest du diesen Eintrag wirklich unwiderruflich entfernen?",
        "Löschen",
        true // isDanger: Bleibt rot
    );

    if (confirmed) {
        // 1. Eintrag aus dem Array entfernen
        bodyStats.splice(index, 1);
        
        // 2. Aktualisiertes Array im LocalStorage speichern
        localStorage.setItem('body_stats', JSON.stringify(bodyStats));
        
        // 3. UI aktualisieren
        renderStatsHistory(); 
        updateDashboard();    
        
        // Falls alle Daten gelöscht wurden, Felder leeren
        if (bodyStats.length === 0) {
            ['weight', 'taille', 'bauch', 'brust', 'arm', 'bein'].forEach(f => {
                const input = document.getElementById(`stats-${f}`);
                if (input) input.value = "";
            });
        }
    }
}

function deleteWorkout(index) {
    // 1. Aus dem Array entfernen
    trainingHistory.splice(index, 1);
    
    // 2. Im LocalStorage speichern
    localStorage.setItem('workout_history', JSON.stringify(trainingHistory));
    
    // 3. UI aktualisieren
    renderWorkout(); 
    updateDashboard(); 
    
    return true; // Gibt true zurück, um der Swipe-Logik Erfolg zu melden
}

function editWorkout(index) {
    console.log("Edit für Training Index:", index);
    // Hier kommt später deine Edit-Logik rein
}

function updateDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // Januar ist 1
    const currentYear = now.getFullYear();

    const sessionsThisMonth = trainingHistory.filter(session => {
        if (!session.date) return false;
        
        // Wir teilen "29.1.2026" an den Punkten auf
        const parts = session.date.split('.'); 
        if (parts.length < 3) return false;

        const sDay = parseInt(parts[0]);
        const sMonth = parseInt(parts[1]);
        const sYear = parseInt(parts[2]);

        // Nur zählen, wenn Monat und Jahr exakt übereinstimmen
        return sMonth === currentMonth && sYear === currentYear;
    }).length;

    const focusExId = localStorage.getItem('dashboard_focus_ex_id') || 'brust_bankdruecken';
    let bestSet = { weight: 0, reps: 0 }; // Start bei 0, damit jeder echte Wert zählt
    let totalVolume = 0;

trainingHistory.forEach(session => {
    const ex = session.exercises?.find(e => e.id === focusExId);
    if (ex?.sets) {
        ex.sets.forEach(s => {
            let w = parseFloat(s.weight) || 0;
            let r = parseInt(s.reps) || 0;
            
            // Bestes Gewicht finden
            if (w > bestSet.weight || (w === bestSet.weight && r > bestSet.reps)) {
                bestSet = { weight: w, reps: r };
            }
            // Volumen für das Dashboard (Optional: nur der letzten Session oder All-time?)
            // Hier meist sinnvoll: Das Volumen der aktuellsten Session dieser Übung
            totalVolume += (w * r); 
        });
    }
});

// --- UI BEFÜLLEN ---
const dashMaxWeight = document.getElementById('dash-max-weight');
const dashMaxReps = document.getElementById('dash-max-reps');

if (dashMaxWeight) {
    dashMaxWeight.innerHTML = `${bestSet.weight}<span class="unit">kg</span>`;
}
if (dashMaxReps) {
    dashMaxReps.innerHTML = `${bestSet.reps}<span class="unit">reps</span>`;
}
    // Den Klick-Event legen wir auf das ELTERN-Element (die Karte)
    const weightCard = document.querySelector('.stat-card.body');
    if (weightCard) {
        weightCard.onclick = () => showMainContent('body');
        weightCard.classList.add('clickable-card');
    }

    // 2. SESSIONS (Analog dazu)
    const sessionCard = document.getElementById('dash-session-count');
    if (sessionCard) {
        sessionCard.innerText = sessionsThisMonth;
    }
    // Auch hier: Klick auf die ganze Karte
    const volumeCard = document.querySelector('.stat-card.volume');
    if (volumeCard) {
        volumeCard.onclick = () => showMainContent('history');
        volumeCard.classList.add('clickable-card');
    }
    // Auch hier: Klick auf die ganze Karte
    const cardioCard = document.querySelector('.stat-card.cardio');
    if (cardioCard) {
        //cardioCard.onclick = () => showMainContent('cardio');
        cardioCard.classList.add('clickable-card');
    }

    // 3. TOP SATZ (Fokus-Übung)
    const focusExName = localStorage.getItem('dashboard_focus_ex_name') || 'Bankdrücken';
    const benchLabel = document.querySelector('.stat-card.strength .stat-label');

    if (benchLabel) {
        benchLabel.innerText = `Top Satz ${focusExName}`;
    }
    const benchVal = document.getElementById('dash-bench-pr');
    if (benchVal) {
        benchVal.innerHTML = `${bestSet.weight}<span class="unit">kg</span>`;
        
        // Das meta-Element direkt unter dem Wert finden
        const benchMeta = benchVal.nextElementSibling; 
        if (benchMeta) {
            // Zeigt jetzt dynamisch z.B. "5 Reps (All-Time Best)"
            benchMeta.innerText = `${bestSet.reps} Reps (Bestleistung)`;
        }
        // CLICKABLE LOGIK: Die Karte öffnet direkt die Auswahl
        const strengthCard = benchVal.closest('.stat-card.strength');
        if (strengthCard) {
            strengthCard.classList.add('clickable-card');
            // Hier rufen wir direkt die Auswahl-Funktion auf
            strengthCard.onclick = (event) => handleFocusChange(event);
        }
    }

    const dashWeight = document.getElementById('dash-weight');
const dashWeightDate = document.getElementById('dash-weight-date');

    // Prüfen, ob Einträge in bodyStats vorhanden sind
    if (typeof bodyStats !== 'undefined' && bodyStats.length > 0) {
        const latestStat = bodyStats[0]; // Der aktuellste Eintrag

        if (dashWeight) {
            dashWeight.innerHTML = `${latestStat.weight}<span class="unit">kg</span>`;
        }
        if (dashWeightDate) {
            // Wir nehmen das Datum vom letzten Eintrag
            dashWeightDate.innerText = `Stand: ${latestStat.date}`;
        }
    } else {
        // Fallback, wenn noch keine Daten vorhanden sind
        if (dashWeight) dashWeight.innerHTML = `0<span class="unit">kg</span>`;
        if (dashWeightDate) dashWeightDate.innerText = `Keine Daten`;
    }
}

function handleFocusChange(event) {
    if (event) event.stopPropagation();

    const options = getAvailableExercises();

    if (options.length === 0) {
        console.warn("Keine Übungen zum Auswählen gefunden.");
        return;
    }

    // NÄCHSTER SCHRITT: 
    // Anstatt prompt() rufen wir hier gleich eine Funktion auf, 
    // die uns ein schönes Overlay baut.
    openFocusExercisePicker(options);
}

function handleOverlayBackgroundClick(e) {
    if (e.target.id === 'exercise-overlay') {
        closeExerciseCard();
    }
}

function handleNoteInput(e) {
    const overlay = document.getElementById('exercise-overlay');
    const exId = overlay.dataset.currentExId;
    const exName = document.getElementById('current-exercise-name').innerText;
    
    // Übung finden oder initialisieren
    let exEntry = activeSession.exercises.find(ex => ex.id === exId);
    if (!exEntry) {
        exEntry = { 
            id: exId, 
            name: exName, 
            sets: [], 
            note: "" 
        };
        activeSession.exercises.push(exEntry);
    }
    
    // Wert übertragen und persistent speichern
    exEntry.note = e.target.value;
    saveToLocalStorage();
}

function handleSaveBodyStats() {
    const btn = document.getElementById('save-stats-btn');
    
    // Datenobjekt aus den Inputs erstellen
    const entry = {
        date: new Date().toLocaleDateString('de-DE'),
        weight: parseFloat(document.getElementById('stats-weight').value.replace(',', '.')) || 0,
        taille: parseFloat(document.getElementById('stats-taille').value.replace(',', '.')) || 0,
        bauch: parseFloat(document.getElementById('stats-bauch').value.replace(',', '.')) || 0,
        brust: parseFloat(document.getElementById('stats-brust').value.replace(',', '.')) || 0,
        arm: parseFloat(document.getElementById('stats-arm').value.replace(',', '.')) || 0,
        bein: parseFloat(document.getElementById('stats-bein').value.replace(',', '.')) || 0
    };

    // Validierung (Ehrliche Ansage: Ohne Gewicht macht die Statistik keinen Sinn)
    if (entry.weight === 0) {
        return alert("Bitte zumindest das Gewicht eingeben!");
    }

    // Daten verarbeiten
    bodyStats.unshift(entry); 
    localStorage.setItem('body_stats', JSON.stringify(bodyStats));

    // UI Updates
    shouldAnimateNewEntry = true;
    renderStatsHistory();
    shouldAnimateNewEntry = false;
    updateDashboard();
    
    showSuccessFeedback(btn, "WERTE GESPEICHERT");
}

function saveToLocalStorage() {
    if (activeSession) localStorage.setItem('active_training_session', JSON.stringify(activeSession));
}

function exportAllData() {
    let confirmOverlay = document.getElementById('confirm-overlay');
    if (!confirmOverlay) {
        confirmOverlay = document.createElement('div');
        confirmOverlay.id = 'confirm-overlay';
        confirmOverlay.className = 'overlay hidden';
        document.body.appendChild(confirmOverlay);
    }

    confirmOverlay.innerHTML = `
        <div class="modal-card confirm-card">
            <div class="modal-header">
                <div class="header-title-group">
                    <i class="fa-solid fa-file-export" style="color: var(--accent);"></i>
                    <h3>Daten exportieren</h3>
                </div>
                <button class="close-icon" onclick="document.getElementById('confirm-overlay').classList.add('hidden')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-content">
                <p style="margin-bottom: 20px; color: var(--text-mid);">
                    Möchtest du ein vollständiges Backup deiner Daten erstellen? 
                    Dies beinhaltet alle Übungen, deine gesamte Trainingshistorie und Körperwerte.
                </p>
                
                <div class="export-actions-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="backup-action-btn" id="start-export-btn" style="width: 100%; justify-content: center; padding: 14px;">
                        <i class="fa-solid fa-download" style="margin-right: 8px;"></i> Jetzt sichern
                    </button>                    
                    
                </div>
            </div>
        </div>
    `;

    confirmOverlay.classList.remove('hidden');

    document.getElementById('start-export-btn').onclick = () => {
        const dataToExport = {
            exercises: JSON.parse(localStorage.getItem('exercise_names')) || [],
            history: JSON.parse(localStorage.getItem('workout_history')) || [],
            bodyStats: JSON.parse(localStorage.getItem('body_stats')) || [],
            settings: JSON.parse(localStorage.getItem('app_settings')) || {},
            exportDate: new Date().toISOString(),
            version: "1.0"
        };

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        const dateStr = new Date().toISOString().split('T')[0];
        downloadAnchorNode.setAttribute("download", `gym_backup_full_${dateStr}.json`);
        
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);

        confirmOverlay.classList.add('hidden');
    };
}

async function exportHistory() {
    // 1. Erstmal fragen!
    // Wir nutzen isDanger: false, damit der Button nicht Rot (Löschen) ist.
    const confirmed = await showCustomConfirm(
        "Backup erstellen", 
        "Möchtest du die gesamte Workout History als JSON-Datei herunterladen?",
        "Download",
        false 
    );

    if (!confirmed) return;

    // 2. Die History aus dem LocalStorage laden
    const historyData = localStorage.getItem('workout_history');
    
    if (!historyData || historyData === "[]") {
        alert("Keine Trainingsdaten in der History gefunden.");
        return;
    }

    // 3. Daten für den Export aufbereiten
    const exportObject = {
        type: "WORKOUT_HISTORY_BACKUP",
        version: "1.0",
        exportDate: new Date().toLocaleString('de-DE'),
        data: JSON.parse(historyData)
    };

    // 4. Datei-Download auslösen
    const dataStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `history_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    localStorage.setItem('last_backup_date', Date.now());
}

async function downloadSingleWorkout(index) {
    const workout = trainingHistory[index];
    if (!workout) return;

    // 1. Format abfragen
    const format = await askForExportFormat();
    if (!format) return; // Abgebrochen

    let blob;
    let fileName;
    const safeDate = workout.date ? workout.date.replace(/\./g, '-') : 'training';
    const type = (workout.name || workout.type || 'Workout').replace(/\s+/g, '_');

    if (format === 'txt') {
        const textData = convertWorkoutToHumanReadable(workout);
        blob = new Blob([textData], { type: "text/plain" });
        fileName = `${safeDate}_${type}.txt`;
    } else {
        const dataStr = JSON.stringify({ type: "SINGLE_EXPORT", data: workout }, null, 2);
        blob = new Blob([dataStr], { type: "application/json" });
        fileName = `${safeDate}_${type}.json`;
    }

    // 2. Download auslösen
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function convertWorkoutToHumanReadable(workout) {
    let text = `LIFTING LOG - ${workout.type || 'Training'}\n`;
    text += `Datum: ${workout.date}\n`;
    text += `Dauer: ${workout.duration || '--'} min\n`;
    text += `------------------------------------------\n\n`;

    const exercises = workout.exercises || [];
    exercises.forEach((ex, idx) => {
        text += `${idx + 1}. ${ex.name.toUpperCase()}\n`;
        
        if (ex.sets && ex.sets.length > 0) {
            ex.sets.forEach((set, sIdx) => {
                text += `   Satz ${sIdx + 1}: ${set.weight} kg x ${set.reps}`;
                if (set.restTime) text += ` (Pause: ${set.restTime})`;
                text += `\n`;
            });
        }
        
        if (ex.note) text += `   Notiz: ${ex.note}\n`;
        text += `\n`;
    });

    text += `------------------------------------------\n`;
    text += `Generiert von deiner Gym-App`;
    return text;
}

function handleImport() {
    let confirmOverlay = document.getElementById('confirm-overlay');
    if (!confirmOverlay) {
        confirmOverlay = document.createElement('div');
        confirmOverlay.id = 'confirm-overlay';
        confirmOverlay.className = 'overlay hidden';
        document.body.appendChild(confirmOverlay);
    }

    confirmOverlay.innerHTML = `
        <div class="modal-card confirm-card">
            <div class="modal-header">
                <div class="header-title-group">
                    <i class="fa-solid fa-file-import" style="color: var(--accent);"></i>
                    <h3>Daten wiederherstellen</h3>
                </div>
                <button class="close-icon" onclick="document.getElementById('confirm-overlay').classList.add('hidden')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div id="import-modal-content" class="modal-content">
                <p style="margin-bottom: 15px; font-size: 0.95rem; color: var(--text-mid);">
                    Wähle dein Full-Backup (.json) aus. Alle Daten werden überschrieben.
                </p>
                
                <div class="import-drop-zone" onclick="document.getElementById('final-file-input').click()">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <span>Datei auswählen</span>
                </div>

                <input type="file" id="final-file-input" hidden accept=".json">
                
                <p style="margin-top: 20px; font-size: 0.8rem; color: var(--text-low); font-style: italic;">
                    <i class="fa-solid fa-triangle-exclamation"></i> 
                    Bestehende Daten werden überschrieben!
                </p>
            </div>
        </div>
    `;

    // Die komplette Logik direkt am Input-Element
    const fileInput = confirmOverlay.querySelector('#final-file-input');
    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Direktes Mapping der Keys aus deiner Backup-Struktur
                if (data.exercises) localStorage.setItem('exercise_names', JSON.stringify(data.exercises));
                if (data.history)   localStorage.setItem('workout_history', JSON.stringify(data.history));
                if (data.bodyStats) localStorage.setItem('body_stats', JSON.stringify(data.bodyStats));
                if (data.settings)  localStorage.setItem('app_settings', JSON.stringify(data.settings));

                alert("Import erfolgreich! Seite wird neu geladen.");
                window.location.reload();
            } catch (err) {
                alert("Fehler: Ungültige Datei!");
            }
        };
        reader.readAsText(file);
    };

    confirmOverlay.classList.remove('hidden');
}

function processImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.type === "WORKOUT_HISTORY_BACKUP" && Array.isArray(importedData.data)) {
                
                const content = document.getElementById('import-modal-content');
                content.innerHTML = `
                    <p>Datei geladen: <strong>${importedData.data.length} Einheiten</strong> gefunden.</p>
                    <p class="warning-text"><i class="fa-solid fa-triangle-exclamation"></i> Deine aktuelle History wird überschrieben!</p>
                    
                    <button id="final-confirm-btn" class="backup-action-btn backup-confirm-final">
                        <i class="fa-solid fa-check"></i> Jetzt importieren
                    </button>
                `;

                document.getElementById('final-confirm-btn').onclick = () => {
                    localStorage.setItem('workout_history', JSON.stringify(importedData.data));
                    location.reload();
                };

            } else {
                alert("Fehler: Ungültiges Backup-Format.");
            }
        } catch (err) {
            alert("Fehler beim Lesen der Datei.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

function checkBackupStatus() {
    const lastBackup = localStorage.getItem('last_backup_date');
    const exportBtn = document.querySelector('.export-trigger-btn'); // Dein Button-Selektor
    
    if (lastBackup) {
        const daysSince = (Date.now() - lastBackup) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
            // Button rot färben oder Icon blinken lassen
            exportBtn.style.boxShadow = "0 0 10px rgba(255, 0, 0, 0.5)";
            console.log("Backup ist überfällig!");
        }
    }
}

window.saveProfile = function() {
    // 1. Werte aus den Inputs holen
    const nameVal = document.getElementById('prof-name').value.trim();
    const heightVal = document.getElementById('prof-height').value;
    const goalVal = document.getElementById('prof-goal-weight').value;

    // 2. No-Bullshit Check: Name ist Pflicht
    if (!nameVal) {
        alert("Ohne Namen kein Profil, Buddy. Trag was ein.");
        return;
    }

    // 3. Im LocalStorage speichern
    localStorage.setItem('user-name', nameVal);
    localStorage.setItem('user-height', heightVal);
    localStorage.setItem('user-goal-weight', goalVal);

    // 4. Visuelles Feedback am Button
    const saveBtn = document.querySelector('#settings-overlay .modal-btn.primary');
    const originalContent = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Gespeichert!';
    saveBtn.style.background = "#2e7d32"; // Success-Grün
    saveBtn.disabled = true;

    // 5. Nach kurzem Delay schließen
    setTimeout(() => {
        saveBtn.innerHTML = originalContent;
        saveBtn.style.background = "";
        saveBtn.disabled = false;
        renderProfileView();
        
        // Optional: UI oben im Dashboard direkt aktualisieren
        if (typeof updateDashboardName === "function") updateDashboardName();
    }, 800);
};

function checkQuickResume() {
    const timerContainer = document.getElementById('rest-timer-container');
    const overlay = document.getElementById('exercise-overlay');
    const resumeIcon = document.getElementById('resume-icon');
    
    if (!timerContainer || !overlay) return;

    if (!activeSession) {
        timerContainer.classList.add('hidden');
        timerContainer.style.display = 'none';
        return; 
    }

    const hasEx = lastTrackedEx !== null && lastTrackedEx !== undefined;
    const isOverlayClosed = overlay.classList.contains('hidden');

    if (hasEx && isOverlayClosed) {
        // --- BUBBLE MODUS ---
        timerContainer.classList.remove('hidden');
        timerContainer.classList.add('minimized');
        if (resumeIcon) resumeIcon.classList.remove('hidden'); 
        timerContainer.style.display = 'flex';

    } else if (!isOverlayClosed) {
        // --- HEADER MODUS (Hie kommt der Fix rein!) ---
        timerContainer.classList.remove('hidden', 'minimized');
        timerContainer.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)";
        
        // 1. Position der Exercise Card holen
        const overlayRect = overlay.getBoundingClientRect();


        // RESET: Alle manuell geschobenen Werte löschen
        timerContainer.style.top = "";
        timerContainer.style.left = "";
        timerContainer.style.bottom = "";
        timerContainer.style.right = "";
        timerContainer.style.transform = ""; // Wichtig für das translateX(-50%) im CSS!
        
        if (resumeIcon) resumeIcon.classList.add('hidden');
        timerContainer.style.display = 'flex';
        console.log("Positions-Reset für Header-Modus");

    } else {
        // --- VERSTECKT ---
        timerContainer.classList.add('hidden');
        timerContainer.style.display = 'none';
    }
}



                                            {}
// ==========================================
// 2.5. RENDERING (Die Maler-Werkstatt)
// ==========================================
                                            {}



function renderAllExercises() {
    const grids = {
        brust: document.getElementById('grid-brust'),
        schultern: document.getElementById('grid-schultern'),
        trizeps: document.getElementById('grid-trizeps'),
        ruecken: document.getElementById('grid-ruecken'),
        bizeps: document.getElementById('grid-bizeps'),
        legs: document.getElementById('grid-legs')
    };

    Object.values(grids).forEach(grid => {
        if (grid) grid.innerHTML = '';
    });

    // document.querySelectorAll('.button-grid').forEach(g => g.classList.remove('open'));
    // document.querySelectorAll('.sub-group-header').forEach(h => h.classList.remove('active'));

    if (!userExercises || userExercises.length === 0) {
        appendAddButtons();
        return;
    }

    userExercises.forEach(ex => {
    if (!ex) return; // Kritischer Fix: Überspringt kaputte Daten
    const card = createExerciseCard(ex);

        const sub = (ex.sub || "").toLowerCase();
        const cat = (ex.category || "").toLowerCase();

        let targetGrid = null;
        if (sub === 'brust') targetGrid = grids.brust;
        else if (sub === 'schulter' || sub === 'schultern') targetGrid = grids.schultern;
        else if (sub === 'trizeps') targetGrid = grids.trizeps;
        else if (sub === 'rücken' || sub === 'ruecken') targetGrid = grids.ruecken;
        else if (sub === 'bizeps') targetGrid = grids.bizeps;
        else if (cat === 'legs' || sub === 'legs' || sub === 'beine') targetGrid = grids.legs;

        if (targetGrid) targetGrid.appendChild(card);   
    });

    if (typeof initExerciseSorting === 'function') initExerciseSorting();
    applyEquipmentFilter();
    appendAddButtons();
    
}

function createExerciseCard(ex) {
    const card = document.createElement('div');
    card.setAttribute('data-ex-id', ex.id);
    
    const sub = (ex.sub || "").toLowerCase();
    const cat = (ex.category || "").toLowerCase();
    let borderClass = '';

    if (sub === 'brust' || sub.includes('schulter') || sub === 'trizeps') {
        borderClass = 'border-push';
    } else if (sub === 'rücken' || sub === 'ruecken' || sub === 'bizeps') {
        borderClass = 'border-push';
    } else if (cat === 'legs' || sub === 'legs' || sub === 'beine') {
        borderClass = 'border-push';
    }

    card.className = `card-template card-accent-left card-clickable exercise-node ${borderClass}`;
    
    // 1. Equipment-Icon Logik
    const eqIcons = {
        'machine': 'svg_icons/machine.svg',
        'barbell': 'fa-dumbbell',
        'cable': 'svg_icons/cable.svg',
        'bodyweight': 'fa-person'
    };

    // 2. Bestimmen, welches Icon (Equipment oder Fallback Muskelgruppe)
    const iconData = ex.equipment ? eqIcons[ex.equipment] : getCategoryIcon(ex.category, ex.sub);
    
    // 3. HTML generieren (Prüfung auf .svg)
    let iconHTML = '';
    if (iconData && iconData.endsWith('.svg')) {
        iconHTML = `<img src="${iconData}" class="eq-svg-icon" alt="equipment">`;
    } else {
        iconHTML = `<i class="fa-solid ${iconData || 'fa-question'}"></i>`;
    }

    // 4. Das generierte iconHTML unten einfügen
    card.innerHTML = `
        <div class="exercise-info-wrapper">
            <div class="exercise-icon-badge">
                ${iconHTML}
            </div>
            <div class="exercise-text-container">
                <h4 class="exercise-title">${ex.name}</h4>                    
            </div>
        </div>
    `;

    card.onclick = () => openExerciseCard(ex);
    return card;
}

function renderCurrentSets(exId) {
    const list = document.getElementById('sets-list');
    list.innerHTML = '';

    if (!activeSession) {
        const info = document.createElement('li');
        info.style.textAlign = 'center';
        info.style.padding = '20px';
        info.style.color = 'var(--text-mid)';
        info.innerText = 'Starte ein Training, um Sätze zu loggen.';
        list.appendChild(info);
        return; 
    }

    const exEntry = activeSession.exercises.find(e => e.id === exId);
    if (shouldAnimateNewSet) {
        const setsHeader = document.getElementById('toggle-sets-btn');
        if (setsHeader) {
            setsHeader.classList.remove('new-entry-anim');
            void setsHeader.offsetWidth; // Reflow triggern
            setsHeader.classList.add('new-entry-anim');            
            // Nach 500ms (oder Dauer deiner Anim) wieder entfernen
            setTimeout(() => setsHeader.classList.remove('new-entry-anim'), 500);
        }
    }


    list.innerHTML = '';
    if (!exEntry || !exEntry.sets) return;

    [...exEntry.sets].reverse().forEach((set, i) => {
        const realIndex = exEntry.sets.length - 1 - i; 
        const setNumber = realIndex + 1;
        const li = document.createElement('li');
        
        
        // UNSER NEUES SYSTEM: Basis + Spezifisch
        li.className = 'swipe-card set-specific-card'; 

        if (i === 0 && shouldAnimateNewSet) {
            li.classList.add('new-entry-anim');
            setTimeout(() => li.classList.remove('new-entry-anim'), 500);
        }

       li.innerHTML = `
            <div class="set-header">
                <span class="set-number-badge">SATZ ${setNumber}</span>
                <div class="swipe-card-actions">
                    <button class="workout-btn-action" onclick="handleSetEdit('${exId}', ${realIndex})">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </div>
            </div>

            <div class="set-stats-row">
                <span class="set-weight-display">${set.weight}kg</span>
                <span class="set-x-separator">×</span>
                <span class="set-reps-display">${set.reps} Reps</span>
            </div>

            <div class="set-meta-info">
                <i class="fa-regular fa-clock"></i> Pause: ${set.restTime}
            </div>
        `;
        list.appendChild(li);
    });
    shouldAnimateNewSet = false;
}

function renderStatsHistory() {
    const list = document.getElementById('stats-history-list');
    if (!list) return;
    list.innerHTML = '';
    if (bodyStats.length === 0) return;

    // 1. Input-Felder mit den Werten des letzten Eintrags vorbefüllen
    const lastEntry = bodyStats[0];
    ['weight', 'taille', 'bauch', 'brust', 'arm', 'bein'].forEach(f => {
        const input = document.getElementById(`stats-${f}`);
        if (input) input.value = lastEntry[f] || "";
    });

    bodyStats.forEach((s, index) => {
        const li = document.createElement('li');
        li.className = 'swipe-card stats-specific-card';
        if (index === 0 && shouldAnimateNewEntry) {
            li.classList.add('new-entry-anim');
            setTimeout(() => {
                li.classList.remove('new-entry-anim');
            }, 500);
        }

        // 3. Deine Logik für die Differenzberechnung (unverändert)
        const getDiff = (current, key) => {
            if (index >= bodyStats.length - 1) return "";
            const prev = bodyStats[index + 1];
            const diff = (current - prev[key]).toFixed(1);
            if (parseFloat(diff) === 0) return `<span style="color:#666; font-size:0.7rem;"> (±0)</span>`;
            
            // Logik: Weniger Gewicht/Bauch/Taille ist grün, mehr Brust/Arm/Bein ist grün
            const isShrinkingGood = ['weight', 'taille', 'bauch'].includes(key);
            const isGood = isShrinkingGood ? diff < 0 : diff > 0;
            const color = isGood ? "#03da44" : "#b42d46";
            
            return `<span style="color: ${color}; font-size: 0.75rem; font-weight: bold;"> (${diff > 0 ? "+" : ""}${diff})</span>`;
        };

        // 4. Das neue HTML-Template mit deiner Logik befüllt
        li.innerHTML = `
            <div class="swipe-card-content">
                <h4 class="swipe-card-title">
                    <i class="fa-solid fa-calendar-day" style="font-size: 0.9rem; margin-right: 8px;"></i>${s.date}
                </h4>
                
                <div class="body-history-grid">
                    <div class="stat-entry">
                        <span class="label">Gewicht</span>
                        <span class="value">${s.weight} kg${getDiff(s.weight, 'weight')}</span>
                    </div>
                    <div class="stat-entry">
                        <span class="label">Brust</span>
                        <span class="value">${s.brust} cm${getDiff(s.brust, 'brust')}</span>
                    </div>
                    <div class="stat-entry">
                        <span class="label">Bauch</span>
                        <span class="value">${s.bauch} cm${getDiff(s.bauch, 'bauch')}</span>
                    </div>
                    <div class="stat-entry">
                        <span class="label">Taille</span>
                        <span class="value">${s.taille} cm${getDiff(s.taille, 'taille')}</span>
                    </div>
                    <div class="stat-entry">
                        <span class="label">Oberarm</span>
                        <span class="value">${s.arm} cm${getDiff(s.arm, 'arm')}</span>
                    </div>
                    <div class="stat-entry">
                        <span class="label">Oberschenkel</span>
                        <span class="value">${s.bein} cm${getDiff(s.bein, 'bein')}</span>
                    </div>
                </div>
            </div>

            <div class="swipe-card-actions">
                <button class="workout-btn-action" onclick="deleteStat(${index})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        list.appendChild(li);
    });

    shouldAnimateNewEntry = false; 
}

function renderWorkout() {
    const historyList = document.getElementById('workout-history-list');
    if (!historyList) return;
    historyList.innerHTML = '';

    trainingHistory.forEach((workout, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'swipe-card-wrapper';
        wrapper.innerHTML = `
            <div class="delete-hint">
                <i class="fa-solid fa-trash-can"></i> LÖSCHEN
            </div>
        `;
        const li = document.createElement('li');
        li.className = 'swipe-card workout-specific-card';

        // HIER: Den Index am Element speichern
        li.dataset.index = index;

        li.onclick = (e) => {renderWorkoutDetails(index);}
        const currentExercises = workout.exercises || [];
        const count = currentExercises.length;
        const exerciseNames = currentExercises
            .map(ex => ex.name) 
            .filter(name => name && name.trim() !== "") // Nur echte Namen zulassen
            .join(', ');
        li.innerHTML = `
        <div class="swipe-card-main">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 class="swipe-card-title">${workout.type || 'Training'}</h4>
                    <div class="swipe-card-meta">
                        <span><i class="fa-solid fa-calendar-days"></i> ${workout.date}</span>
                        <span><i class="fa-solid fa-fire"></i> ${count} Übungen</span>
                        <span><i class="fa-solid fa-clock"></i> ${workout.duration || '00:00'}</span>
                    </div>
                </div>
            </div>
        </div>    
    `;
        wrapper.appendChild(li);
        historyList.appendChild(wrapper);
        
    });

        enableSwipeActions('.swipe-card', async (index) => {
        return await deleteWorkout(index);
    });
}

function renderWorkoutDetails(index, isNewWorkout = false) {
    const workout = trainingHistory[index];
    if (!workout) return;

    // Equipment-Mapping (identisch zu deiner createExerciseCard)
    const eqIcons = {
        'machine': 'svg_icons/machine.svg',
        'barbell': 'fa-dumbbell',
        'cable': 'svg_icons/cable.svg',
        'bodyweight': 'fa-person'
    };

    const overlay = document.createElement('div');
    overlay.className = 'history-detail-overlay';
    
    // 1. Gruppierung und Icon-Logik (SVG vs FontAwesome)
    const grouped = (workout.exercises || []).reduce((acc, ex) => {
        const masterEx = userExercises.find(ue => {
            const idMatch = String(ue.id) === String(ex.id);
            const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
            const nameMatch = normalize(ue.name) === normalize(ex.name);
            return idMatch || nameMatch;
        });

        // Icon-Daten bestimmen (Equipment -> Stammdaten -> Fallback)
        const iconData = (masterEx && masterEx.equipment) ? eqIcons[masterEx.equipment] : 'fa-dumbbell';
        
        // HTML für das Icon generieren (wie in deiner createExerciseCard)
        let iconHTML = '';
        if (typeof iconData === 'string' && iconData.endsWith('.svg')) {
            iconHTML = `<img src="${iconData}" class="eq-svg-icon" style="width: 20px; height: 20px; opacity: 0.5;" alt="eq">`;
        } else {
            iconHTML = `<i class="fa-solid ${iconData || 'fa-dumbbell'}" style="color: var(--text-mid); width: 22px; text-align: center;"></i>`;
        }

        const sub = masterEx && masterEx.sub ? masterEx.sub : 'andere';

        if (!acc[sub]) acc[sub] = [];
        acc[sub].push({ ...ex, iconHTML: iconHTML });
        return acc;
    }, {});

    const subNames = { 
        'brust': 'Brust', 'ruecken': 'Rücken', 'schultern': 'Schultern', 
        'legs': 'Beine', 'arme': 'Arme', 'andere': 'Diverses',
        'trizeps': 'Trizeps', 'bizeps': 'Bizeps' 
    };

    // 2. Sektions-HTML generieren
    const sectionsHtml = Object.keys(grouped).map(sub => `
        <div class="detail-subsection">
            <h4 class="detail-sub-title">${(subNames[sub] || sub).toUpperCase()}</h4>
            ${grouped[sub].map(ex => `
                <div class="detail-ex-block">
                    <div class="detail-ex-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <div style="width: 22px; display: flex; justify-content: center; align-items: center;">
                            ${ex.iconHTML}
                        </div>
                        <span class="detail-ex-name" style="font-weight: 600;">${ex.name}</span>
                    </div>
                    <div class="detail-sets-list">
                        ${(ex.sets || []).map((set, i) => `
                            <div class="detail-set-row">
                                <div class="set-main-data">
                                    <span class="detail-set-number">Satz ${i + 1}</span>
                                    <span class="detail-set-data"><strong>${set.weight} kg</strong> × ${set.reps}</span>
                                </div>
                                <div class="set-rest-data">
                                    ${set.restTime ? `<i class="fa-solid fa-hourglass-half"></i> ${set.restTime}` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${ex.note ? `<div class="detail-ex-note">${ex.note}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `).join('');

    // 3. Gesamt-Overlay HTML
    overlay.innerHTML = `
        <div class="history-detail-content">
            <div class="detail-main-header">
                <div class="detail-title-group">
                    <span class="detail-date">${workout.date}</span>
                    <h2 class="detail-session-name" id="edit-session-name">${workout.name || workout.type || 'Training'}</h2>
                </div>
                <div class="detail-header-actions">
                    <button class="detail-close-btn" onclick="this.closest('.history-detail-overlay').remove()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button class="detail-action-btn" onclick="downloadSingleWorkout(${index})" title="Exportieren">
                        <i class="fa-solid fa-file-export"></i>
                    </button>
                </div>
            </div>            
            <div class="detail-scroll-area">
                ${sectionsHtml}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 4. Edit-Logik (Name bearbeiten)
    const titleEl = overlay.querySelector('#edit-session-name');
    if (typeof addEditIcon === 'function') {
        addEditIcon(titleEl, (newName) => {
            workout.name = newName;
            workout.type = newName;
            localStorage.setItem('workout_history', JSON.stringify(trainingHistory));
            if (typeof renderWorkout === 'function') renderWorkout();
        });
    }

    // Automatischer Fokus nach dem Training
    if (isNewWorkout) {
        setTimeout(() => {
            const editIcon = titleEl.parentElement.querySelector('.edit-icon') || titleEl.querySelector('.edit-icon');
            if (editIcon) editIcon.click();
        }, 150);
    }

    // Schließen beim Klick auf Hintergrund
    overlay.onclick = (e) => { 
        if (e.target === overlay) overlay.remove(); 
    };
}

function renderProfileSettings() {
    let overlay = document.getElementById('settings-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.className = 'overlay hidden';
        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3 id="settings-card-title"></h3>
                    <button class="close-icon" onclick="closeSettingsCard()">
                    <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div id="settings-card-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const title = document.getElementById('settings-card-title');
    const content = document.getElementById('settings-card-content');

    const currentName = localStorage.getItem('user-name') || '';
    const currentHeight = localStorage.getItem('user-height') || '';
    const currentGoalWeight = localStorage.getItem('user-goal-weight') || ''; 
    const currentPic = localStorage.getItem('user-pic'); 

    const profilePicHTML = currentPic 
        ? `<img src="${currentPic}" id="profile-preview" class="profile-img" onclick="document.getElementById('pic-upload').click()">`
        : `<div id="profile-preview" class="pic-placeholder" onclick="document.getElementById('pic-upload').click()">
             <i class="fa-solid fa-user"></i>
           </div>`;

    title.innerText = "Profil bearbeiten";
    
    content.innerHTML = `
        <div class="profile-header">
            <div class="profile-pic-wrapper">
                ${profilePicHTML}
                <div class="pic-edit-badge" onclick="document.getElementById('pic-upload').click()">
                    <i class="fa-solid fa-pen"></i>
                </div>
            </div>
            <input type="file" id="pic-upload" hidden accept="image/*" onchange="handlePicUpload(event)">
        </div>

        <div class="profile-settings-list">
            <div class="setting-row">
                <span class="label">Name</span>
                <input type="text" id="prof-name" value="${currentName}" class="profile-input" placeholder="Name">
            </div>
            <div class="setting-row">
                <span class="label">Größe</span>
                <div class="input-unit">
                    <input type="number" id="prof-height" value="${currentHeight}" class="profile-input" placeholder="0">
                    <span class="unit">cm</span>
                </div>
            </div>   
            <div class="setting-row">
                <span class="label">Zielgewicht</span>
                <div class="input-unit">
                    <input type="number" id="prof-goal-weight" value="${currentGoalWeight}" class="profile-input" placeholder="0">
                    <span class="unit">kg</span>
                </div>
            </div>
        </div>

        <button class="modal-btn primary save-btn" onclick="saveProfile()">
            <i class="fa-solid fa-check"></i> Profil speichern
        </button>
    `;

    overlay.onclick = (e) => { if (e.target === overlay) closeSettingsCard(); };
    setTimeout(() => overlay.classList.remove('hidden'), 10);
}

function renderProfileView() {
    let overlay = document.getElementById('settings-overlay');
    
    // Falls das Overlay noch nicht existiert (wie in der Edit-Funktion)
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.className = 'overlay hidden';
        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3 id="settings-card-title"></h3>
                    <button class="close-icon" onclick="closeSettingsCard()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div id="settings-card-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const title = document.getElementById('settings-card-title');
    const content = document.getElementById('settings-card-content');

    // Daten holen (No Bullshit: Fallbacks, falls noch nichts gespeichert wurde)
    const currentName = localStorage.getItem('user-name') || 'Gast-Athlet';
    const currentHeight = localStorage.getItem('user-height') || '--';
    const currentGoalWeight = localStorage.getItem('user-goal-weight') || '--'; 
    const currentPic = localStorage.getItem('user-pic'); 

    const profilePicHTML = currentPic 
        ? `<img src="${currentPic}" class="profile-img">`
        : `<div class="pic-placeholder"><i class="fa-solid fa-user"></i></div>`;

    title.innerText = "Dein Profil";
    
    content.innerHTML = `
        <div class="profile-header">
            <div class="profile-pic-wrapper">
                ${profilePicHTML}
            </div>
        </div>

        <div class="profile-settings-list display-mode">
            <div class="setting-row">
                <span class="label">Name</span>
                <div class="profile-value-box">${currentName}</div>
            </div>
            <div class="setting-row">
                <span class="label">Größe</span>
                <div class="input-unit-wrapper">
                    <div class="profile-value-box">${currentHeight}</div>
                    <span class="unit">cm</span>
                </div>
            </div>   
            <div class="setting-row">
                <span class="label">Zielgewicht</span>
                <div class="input-unit-wrapper">
                    <div class="profile-value-box">${currentGoalWeight}</div>
                    <span class="unit">kg</span>
                </div>
            </div>
        </div>

        <button class="modal-btn secondary edit-trigger-btn" onclick="renderEditProfileSettings()">
            <i class="fa-solid fa-user-pen"></i> Profil bearbeiten
        </button>
    `;

    overlay.onclick = (e) => { if (e.target === overlay) closeSettingsCard(); };
    overlay.classList.remove('hidden');
}

function renderEditProfileSettings() {
    let overlay = document.getElementById('settings-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.className = 'overlay hidden';
        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3 id="settings-card-title"></h3>
                    <button class="close-icon" onclick="closeSettingsCard()">
                    <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div id="settings-card-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const title = document.getElementById('settings-card-title');
    const content = document.getElementById('settings-card-content');

    const currentName = localStorage.getItem('user-name') || '';
    const currentHeight = localStorage.getItem('user-height') || '';
    const currentGoalWeight = localStorage.getItem('user-goal-weight') || ''; 
    const currentPic = localStorage.getItem('user-pic'); 

    const profilePicHTML = currentPic 
        ? `<img src="${currentPic}" id="profile-preview" class="profile-img" onclick="document.getElementById('pic-upload').click()">`
        : `<div id="profile-preview" class="pic-placeholder" onclick="document.getElementById('pic-upload').click()">
             <i class="fa-solid fa-user"></i>
           </div>`;

    title.innerText = "Profil bearbeiten";
    
    content.innerHTML = `
        <div class="profile-header">
            <div class="profile-pic-wrapper">
                ${profilePicHTML}
                <div class="pic-edit-badge" onclick="document.getElementById('pic-upload').click()">
                    <i class="fa-solid fa-pen"></i>
                </div>
            </div>
            <input type="file" id="pic-upload" hidden accept="image/*" onchange="handlePicUpload(event)">
        </div>

        <div class="profile-settings-list">
            <div class="setting-row">
                <span class="label">Name</span>
                <input type="text" id="prof-name" value="${currentName}" class="profile-input" placeholder="Name">
            </div>
            <div class="setting-row">
                <span class="label">Größe</span>
                <div class="input-unit">
                    <input type="number" id="prof-height" value="${currentHeight}" class="profile-input" placeholder="0">
                    <span class="unit">cm</span>
                </div>
            </div>   
            <div class="setting-row">
                <span class="label">Zielgewicht</span>
                <div class="input-unit">
                    <input type="number" id="prof-goal-weight" value="${currentGoalWeight}" class="profile-input" placeholder="0">
                    <span class="unit">kg</span>
                </div>
            </div>
        </div>

        <button class="modal-btn primary save-btn" onclick="saveProfile()">
            <i class="fa-solid fa-check"></i> Profil speichern
        </button>
    `;

    overlay.onclick = (e) => { if (e.target === overlay) closeSettingsCard(); };
    setTimeout(() => overlay.classList.remove('hidden'), 10);
}

function renderBackupSettings() {
    let overlay = document.getElementById('settings-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.className = 'overlay hidden';
        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3 id="settings-card-title"></h3>
                    <button class="close-icon" onclick="closeSettingsCard()">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div id="settings-card-content"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const title = document.getElementById('settings-card-title');
    const content = document.getElementById('settings-card-content');

    title.innerText = "Backup & Sicherheit";

    // WICHTIG: onclick="handleImport()" direkt hier rein!
    content.innerHTML = `
        <div class="backup-settings-list">
            <div id="backup-export-trigger" class="card-template card-accent-left border-accent settings-card" onclick="exportAllData()">
                <i class="fa-solid fa-file-export"></i>
                <span class="settings-label">Daten exportieren (.json)</span>
            </div> 
            
            <div id="backup-import-trigger" class="card-template card-accent-left border-accent settings-card" onclick="handleImport()">
                <i class="fa-solid fa-file-import"></i>
                <span class="settings-label">Backup einspielen</span>
            </div>
        </div> 
    `;

    overlay.onclick = (e) => { if (e.target === overlay) closeSettingsCard(); };
    setTimeout(() => overlay.classList.remove('hidden'), 10);
}


                                            {}
// ==========================================
// 6. UI HELPERS & ANIMATIONS
// ==========================================
                                            {}


function updateHeaderClock() {
    const clockElement = document.getElementById('header-clock');
    if (!clockElement) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    clockElement.textContent = timeString;
}

function initEquipmentFilter() {
    const chips = document.querySelectorAll('.filter-chip');
    
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            currentEquipmentFilter = chip.dataset.filter; // Speichere den Filter global

            // UI: Aktiven Chip markieren
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Führe die Filterung aus
            applyEquipmentFilter(); 
        });
    });
}

function applyEquipmentFilter() {
    const allCards = document.querySelectorAll('.exercise-node');
    const allAddButtons = document.querySelectorAll('.add-btn'); 
    
    const filter = typeof currentEquipmentFilter !== 'undefined' ? currentEquipmentFilter : 'all';

    // 1. Übungskarten filtern
    allCards.forEach(card => {
        const exId = card.getAttribute('data-ex-id');
        const exercise = userExercises.find(e => e.id === exId);

        if (filter === 'all') {
            card.classList.remove('hidden');
        } else {            
            if (exercise && exercise.equipment === filter) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');                
            }
        }
    });

    // 2. Add-Buttons IMMER anzeigen
    allAddButtons.forEach(btn => {
        btn.classList.remove('hidden'); // Sicherstellen, dass er da ist
    });
}

function showCustomPrompt(title, defaultValue = "", showEquipment = false) { // NEU: Parameter showEquipment
    return new Promise((resolve) => {
        const modal = document.getElementById('input-modal');
        const inputField = document.getElementById('custom-modal-input');
        const deleteBtn = document.getElementById('edit-delete-btn');
        const confirmBtn = document.getElementById('input-modal-confirm');
        const cancelBtn = document.getElementById('input-modal-cancel');
        const equipmentSelection = document.getElementById('equipment-selection'); // NEU
        
        document.getElementById('input-modal-title').innerText = title;
        inputField.value = defaultValue;
        
        // Equipment-Bereich nur zeigen, wenn gewünscht
        equipmentSelection.classList.toggle('hidden', !showEquipment); // NEU
        
        deleteBtn.classList.toggle('hidden', !defaultValue);
        modal.classList.remove('hidden');
        inputField.focus();

        const handleConfirm = () => { 
            // NEU: Aktives Equipment auslesen
            const activeEq = equipmentSelection.querySelector('.eq-option.active').dataset.eq;
            cleanup(); 
            resolve({ 
                action: 'save', 
                value: inputField.value.trim(),
                equipment: activeEq // NEU: Wert wird mitgegeben
            }); 
        };
        
        const handleDelete = () => { cleanup(); resolve({ action: 'delete' }); };
        const handleCancel = () => { cleanup(); resolve(null); };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        };

        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            deleteBtn.removeEventListener('click', handleDelete);
            inputField.removeEventListener('keydown', handleKeyPress);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        deleteBtn.addEventListener('click', handleDelete);
        inputField.addEventListener('keydown', handleKeyPress);
    });
}

function initEquipmentSelector() {
    const options = document.querySelectorAll('.eq-option');
    
    options.forEach(option => {
        option.addEventListener('click', () => {
            // 1. Entferne 'active' von allen anderen Icons
            options.forEach(opt => opt.classList.remove('active'));
            
            // 2. Füge 'active' dem geklickten Icon hinzu
            option.classList.add('active');
        });
    });
}

function showSetPrompt(title, weight, reps) {
    return new Promise((resolve) => {
        const modal = document.getElementById('input-modal');
        const setInputs = document.getElementById('modal-set-inputs');
        const weightIn = document.getElementById('modal-weight-input');
        const repsIn = document.getElementById('modal-reps-input');
        const deleteBtn = document.getElementById('edit-delete-btn');

        document.getElementById('input-modal-title').innerText = title;
        document.getElementById('custom-modal-input').classList.add('hidden');
        setInputs.classList.remove('hidden');
        deleteBtn.classList.remove('hidden');

        weightIn.value = weight;
        repsIn.value = reps;
        modal.classList.remove('hidden');

        const handleConfirm = () => { cleanup(); resolve({ action: 'save', weight: weightIn.value, reps: repsIn.value }); };
        const handleDelete = () => { cleanup(); resolve({ action: 'delete' }); };
        const handleCancel = () => { cleanup(); resolve(null); };

        const cleanup = () => {
            modal.classList.add('hidden');
            document.getElementById('custom-modal-input').classList.remove('hidden');
            setInputs.classList.add('hidden');
            document.getElementById('input-modal-confirm').removeEventListener('click', handleConfirm);
            document.getElementById('input-modal-cancel').removeEventListener('click', handleCancel);
            deleteBtn.removeEventListener('click', handleDelete);
        };

        document.getElementById('input-modal-confirm').addEventListener('click', handleConfirm);
        document.getElementById('input-modal-cancel').addEventListener('click', handleCancel);
        deleteBtn.addEventListener('click', handleDelete);
    });
}

function showCustomConfirm(title, message, confirmText = "Löschen", isDanger = true) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        // Texte setzen
        titleEl.innerText = title;
        messageEl.innerText = message;
        confirmBtn.innerText = confirmText;

        // Farbe anpassen (Rot für Löschen, Gold/Blau für anderes)
        confirmBtn.style.background = isDanger ? 'var(--accent)' : 'var(--gold)';

        // Modal zeigen
        modal.classList.remove('hidden');

        // Handler für Klicks
        const handleConfirm = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

function getCategoryIcon(category, sub) {
    const term = (category + (sub || "")).toLowerCase();
    if (term.includes('brust') || term.includes('push')) return 'fa-dumbbell';
    if (term.includes('rücken') || term.includes('ruecken') || term.includes('pull')) return 'fa-layer-group';
    if (term.includes('bein') || term.includes('leg')) return 'fa-person-running';
    if (term.includes('bizeps') || term.includes('trizeps')) return 'fa-arm-flex';
    return 'fa-dumbbell';
}

async function handleAddNewExercise(sub) {
    // NEU: Wir schicken 'true' mit, damit die Equipment-Icons im Modal erscheinen
    const result = await showCustomPrompt("Neue Übung", "", true);
    
    if (result && result.action === 'save' && result.value) {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        const newEx = { 
            id: 'ex_' + Date.now(), 
            name: result.value, 
            category: activeTab, 
            sub: sub,
            equipment: result.equipment // NEU: Das gewählte Equipment (z.B. 'machine', 'barbell')
        };
        
        userExercises.push(newEx);
        localStorage.setItem('exercise_names', JSON.stringify(userExercises));

        // --- STATT renderAllExercises() ---
        renderSingleExerciseIncremental(newEx);
    }
}

function renderSingleExerciseIncremental(ex) {
    const subNormalized = ex.sub.toLowerCase().replace('ü', 'ue');
    const gridId = `grid-${subNormalized === 'schulter' ? 'schultern' : (subNormalized === 'rücken' ? 'ruecken' : subNormalized)}`;
    const grid = document.getElementById(gridId);

    if (!grid) return;

    // --- HIER WIRD DIE NEUE FUNKTION GENUTZT ---
    const card = createExerciseCard(ex);

    const addBtn = grid.querySelector('.add-btn');
    if (addBtn) {
        grid.insertBefore(card, addBtn);
    } else {
        grid.appendChild(card);
    }

    if (typeof initExerciseSorting === 'function') initExerciseSorting(); 
    if (typeof applyEquipmentFilter === 'function') {
        applyEquipmentFilter();
    }
}

function appendAddButtons() {
    const subGroups = ['brust', 'schultern', 'trizeps', 'ruecken', 'bizeps', 'legs']; 
    subGroups.forEach(sub => {
        const grid = document.getElementById(`grid-${sub}`);
        if (grid) {
            const addBtn = document.createElement('button');
            addBtn.className = 'card-template exercise-node add-btn';            
            addBtn.innerHTML = `<span>+ Übung</span>`;
            
            // WICHTIG: Hier einfach nur die Funktion aufrufen
            addBtn.onclick = () => handleAddNewExercise(sub);
            
            grid.appendChild(addBtn);
        }
    });
}

function enableSwipeActions(selector, onDelete) {
    const cards = document.querySelectorAll(selector);   
    
    cards.forEach((card, index) => {
        const threshold = -100;
        const deadzone = 15;

        card.ontouchstart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY; // Y-Position speichern
            card.style.transition = 'none';
            isSwiping = false; // Reset bei neuem Touch
        };

        card.ontouchmove = (e) => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            const diffX = touchX - startX;
            const diffY = touchY - startY;

            // Logik: Wenn wir noch nicht im Swipe-Modus sind...
            if (!isSwiping) {
                // ...prüfen wir, ob die horizontale Bewegung groß genug ist
                // UND ob sie größer ist als die vertikale (Scrollen verhindern)
                if (Math.abs(diffX) > deadzone && Math.abs(diffX) > Math.abs(diffY)) {
                    isSwiping = true;
                } else if (Math.abs(diffY) > deadzone) {
                    // Nutzer scrollt wohl vertikal -> Swipe für diesen Touch ignorieren
                    return; 
                }
            }

            // Nur wenn isSwiping aktiv ist, bewegen wir die Karte
            if (isSwiping && diffX < 0) {
                // Verhindert, dass die Seite beim Swipen mitscrollt
                if (e.cancelable) e.preventDefault(); 
                
                currentX = diffX;
                card.style.transform = `translateX(${currentX}px)`;

                const wrapper = card.closest('.swipe-card-wrapper');
                const hint = wrapper ? wrapper.querySelector('.delete-hint') : null;
                
                if (wrapper && hint) {
                    let absX = Math.abs(currentX);
                    let alpha = Math.min(absX / 100, 1);

                    if (absX > 10) {
                        wrapper.style.background = `linear-gradient(to left, 
                            rgba(108, 12, 9, ${alpha}) 0%, 
                            rgba(108, 12, 9, ${alpha * 0.5}) 50%, 
                            rgba(108, 12, 9, 0) 95%)`;
                        hint.style.opacity = alpha;
                    }
                }
            }
        };

        card.ontouchend = async () => {
            // Weiche Animation für die Karte
            card.style.transition = 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
            
            const wrapper = card.closest('.swipe-card-wrapper');
            const hint = wrapper ? wrapper.querySelector('.delete-hint') : null
            
            // NEU: Hol dir den gespeicherten Index vom li
            const realIndex = parseInt(card.dataset.index);

            if (currentX < threshold) {
                card.style.transform = `translateX(-100%)`; 

                const confirmed = await showCustomConfirm(
                    "Workout löschen",
                    "Bist du sicher? Das kann nicht rückgängig gemacht werden.",
                    "Löschen",
                    true
                );

                if (confirmed) {
                    deleteWorkout(realIndex);
                } else {
                    // Abbruch: Alles zurücksetzen
                    card.style.transform = `translateX(0)`;
                    if (wrapper) wrapper.style.background = 'none'; // Gradient entfernen
                    if (hint) {
                        hint.style.transition = 'opacity 0.3s ease';
                        hint.style.opacity = 0;
                    }
                }
            } else {
                // Nicht weit genug geswiped: Zurückgleiten
                card.style.transform = `translateX(0)`;
                if (wrapper) {
                    // Wir setzen den Background auf none, damit nichts stehen bleibt
                    wrapper.style.background = 'none';
                }
                if (hint) {
                    hint.style.transition = 'opacity 0.3s ease';
                    hint.style.opacity = 0;
                }
            }

            currentX = 0;
        };
       
    });
}

function getPreviousNotes(exId) {
    const notes = [];
    trainingHistory.slice().reverse().forEach(session => {
        const ex = session.exercises.find(e => e.id === exId);
        if (ex && ex.note && ex.note.trim() !== "") {
            const displayDate = session.date || "Unbekanntes Datum";
            notes.push({ date: displayDate, text: ex.note });
        }
    });
    return notes.slice(0, 5);
}

function getExerciseStats(exId) {
    let bestWeight = 0, bestReps = 0;
    const allWorkouts = [...trainingHistory];
    if (activeSession) allWorkouts.push(activeSession);
    allWorkouts.forEach(s => {
        if (s.exercises) {
            const ex = s.exercises.find(e => e.id === exId);
            if (ex && ex.sets) {
                ex.sets.forEach(set => {
                    if (set.weight > bestWeight || (set.weight === bestWeight && set.reps > bestReps)) {
                        bestWeight = set.weight; 
                        bestReps = set.reps;
                    }
                });
            }
        }
    });
    return { pb: bestWeight > 0 ? `${bestWeight}kg x ${bestReps}` : "--" };
}

function uiPulse(element) {
    if (!element) return;
    element.classList.remove('pulse-trigger');
    void element.offsetWidth; // Der Trick: Reset der Animation
    element.classList.add('pulse-trigger');
    setTimeout(() => element.classList.remove('pulse-trigger'), 400);
}

function updateGreeting() {
    const greetingEl = document.getElementById('greeting-text');
    if (!greetingEl) return;

    const quotes = [
    "Zeit für Gainz!",
    "100kg drücken sich nicht von alleine.",
    "Hör auf zu fackeln, beweg das Eisen.",
    "Fokus. Jede Rep zählt.",
    "Disziplin schlägt Talent.",
    "Keine Ausreden. Zieh durch.",
    "Schwitzen ist, wenn Muskeln weinen. Lass sie heulen.",
    "Wirst du heute stärker oder nur älter?",
    "Das einzige schlechte Workout ist das, das nicht stattgefunden hat.",
    "Eisen lügt nicht. 100kg sind immer 100kg.",
    "Dein Körper ist ein Spiegel deines Willens.",
    "Mitleid bekommt man geschenkt, Respekt muss man sich hart erarbeiten.",
    "Willst du das Ergebnis oder willst du die Ausrede?",
    "Schmerz geht vorbei, Stolz bleibt für immer.",
    "Heute schwer und falsch!",
    "Zähl nicht die Sätze, sorg dafür, dass die Sätze zählen.",
    "Dein Bizeps schrumpft schon vom bloßen Rumstehen.",
    "Erfolg ist kein Ziel, sondern eine Gewohnheit.",
    "Mach es für dich. Niemand anderes wird es tun."
    ];

    // Sanfter Wechsel mit Opacity
    greetingEl.style.opacity = 0;

    setTimeout(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        greetingEl.innerText = randomQuote;
        greetingEl.style.opacity = 1;
    }, 900); // 400ms warten, bis Text weggefadet ist

setInterval(updateGreeting, 15000);
}

function setFocusExercise(exId) {
    localStorage.setItem('dashboard_focus_ex_id', exId);
    updateDashboard();
}

function getAvailableExercises() {
    // Falls userExercises leer ist, geben wir ein leeres Array zurück
    if (!userExercises || userExercises.length === 0) return [];

    // Wir mappen die userExercises in ein flaches Format für die Auswahl
    return userExercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        category: ex.category,
        sub: ex.sub,
        // Wir merken uns auch das Icon, damit die Auswahl später schick aussieht
        icon: getCategoryIcon(ex.category, ex.sub)
    }))
    // Alphabetisch nach Name sortieren
    .sort((a, b) => a.name.localeCompare(b.name));
}

function openFocusExercisePicker(options) {
    const overlay = document.getElementById('exercise-picker-overlay');
    const list = document.getElementById('picker-list');
    if (!overlay || !list) return;

    list.innerHTML = ''; 

    // Definition der Gruppen
    const groups = [
        { id: 'push', label: 'Push', class: 'group-push' },
        { id: 'pull', label: 'Pull', class: 'group-pull' },
        { id: 'legs', label: 'Beine', class: 'group-legs' }
    ];

    groups.forEach(group => {
        // 1. Header erstellen
        const header = document.createElement('div');
        header.className = `picker-group-header accordion-header ${group.class}`;
        header.innerHTML = `
            <span>${group.label}</span>
            <i class="fa-solid fa-chevron-down"></i>
        `;

        // 2. Container für die Übungen (das zuklappbare Teil)
        const container = document.createElement('div');
        container.className = 'picker-group-container';
        
        // Header-Klick Logik (Accordion)
        header.onclick = () => {
            const isOpen = container.classList.contains('open');
            // Alle anderen schließen (optional, für mehr Fokus)
            document.querySelectorAll('.picker-group-container').forEach(c => c.classList.remove('open'));
            document.querySelectorAll('.picker-group-header').forEach(h => h.classList.remove('active'));
            
            if (!isOpen) {
                container.classList.add('open');
                header.classList.add('active');
            }
        };

        // 3. Übungen filtern und hinzufügen
        const filtered = options.filter(ex => {
            const sub = (ex.sub || "").toLowerCase();
            const cat = (ex.category || "").toLowerCase();
            if (group.id === 'push') return sub === 'brust' || sub.includes('schulter') || sub === 'trizeps';
            if (group.id === 'pull') return sub === 'rücken' || sub === 'ruecken' || sub === 'bizeps';
            if (group.id === 'legs') return cat === 'legs' || sub === 'beine';
            return false;
        });

        if (filtered.length > 0) {
            filtered.forEach(ex => {
                const item = document.createElement('div');
                
                // Hier nutzen wir jetzt die universellen Klassen aus deinem CSS
                // card-template: Grundform
                // card-accent-left: Der dicke Strich links
                // card-clickable: Für den Scale-Effekt beim Drücken
                // picker-list-item: Für Picker-spezifische Abstände
                // border-xxx: Die Farbe des Strichs
                
                let colorClass = '';
                if (group.id === 'push') colorClass = 'border-push';
                else if (group.id === 'pull') colorClass = 'border-pull';
                else if (group.id === 'legs') colorClass = 'border-legs';

                item.className = `card-template card-accent-left card-clickable picker-list-item ${colorClass}`;
                
                item.innerHTML = `<div class="picker-item-name">${ex.name}</div>`;
                
                item.onclick = (e) => {
                    e.stopPropagation();
                    localStorage.setItem('dashboard_focus_ex_id', ex.id);
                    localStorage.setItem('dashboard_focus_ex_name', ex.name);
                    closeFocusExercisePicker();
                    updateDashboard();
                };
                container.appendChild(item);
            });

            list.appendChild(header);
            list.appendChild(container);
        }
    });

    overlay.classList.add('open');
}

function closeFocusExercisePicker() {
    document.getElementById('exercise-picker-overlay').classList.remove('open');
}

function toggleAccordion(input) {
    let header;

    // Falls die Funktion durch einen Event-Listener gerufen wurde (input ist das Event)
    if (input.target) {
        header = input.target.closest('.accordion-header');
    } else {
        // Falls die Funktion manuell mit einem Element gerufen wurde
        header = input;
    }

    if (!header) return;

    const container = header.nextElementSibling;
    if (!container) return;

    const isOpen = container.classList.contains('open');

    // Das eigentliche Togglen
    container.classList.toggle('open', !isOpen);
    header.classList.toggle('active', !isOpen);
}

window.handlePicUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const size = 300; 
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // 1. Fokus-Logik (Smart Crop)
            let sX = 0, sY = 0, sW = img.width, sH = img.height;
            if (img.width > img.height) {
                sW = img.height;
                sX = (img.width - img.height) / 2;
            } else {
                sH = img.width;
                sY = (img.height - img.width) * 0.15; // Fokus etwas höher
            }

            // 2. Hintergrund weiß füllen (wichtig für Umwandlung von transparenten Bildern)
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, size, size);

            // 3. Zeichnen
            ctx.drawImage(img, sX, sY, sW, sH, 0, 0, size, size);

            // 4. Als JPEG speichern (0.7 Qualität = Perfekte Balance)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            localStorage.setItem('user-pic', compressedBase64);
            
            // 5. UI Update
            const preview = document.getElementById('profile-preview');
            if (preview && preview.tagName === 'IMG') {
                preview.src = compressedBase64;
            } else {
                renderEditProfileSettings();
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.closeSettingsCard = function() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function askForExportFormat() {
    return new Promise((resolve) => {
        const modal = document.getElementById('format-modal');
        const jsonBtn = document.getElementById('format-json-btn');
        const txtBtn = document.getElementById('format-txt-btn');
        const cancelBtn = document.getElementById('format-cancel-btn');

        modal.classList.remove('hidden');

        const close = (format) => {
            modal.classList.add('hidden');
            jsonBtn.onclick = null;
            txtBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(format);
        };

        jsonBtn.onclick = () => close('json');
        txtBtn.onclick = () => close('txt');
        cancelBtn.onclick = () => close(null);
    });
} 

function initFloatingBubbleDrag() {
    const bubble = document.getElementById('rest-timer-container');
    if (!bubble) return;

    let startX, startY, initialLeft, initialTop;

    bubble.addEventListener('touchstart', (e) => {
        console.log("1. Touchstart registriert!"); // TEST
    if (!bubble.classList.contains('minimized')) {
        console.log("Abbruch: Nicht minimiert"); // TEST
        return;
    }

        if (!bubble.classList.contains('minimized')) return;

        bubbleIsDragging = false; 
        const touch = e.touches[0];
        
        startX = touch.clientX;
        startY = touch.clientY;
        
        // Holt die exakte aktuelle Position auf dem Bildschirm
        const rect = bubble.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        bubble.style.transition = 'none'; // Keine Verzögerung beim Ziehen
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (startX === undefined || !bubble.classList.contains('minimized')) return;

        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        // Ab 5 Pixel Bewegung gilt es als Drag
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            bubbleIsDragging = true;
            
            // Wir setzen die Position direkt über die Styles
            bubble.style.left = `${initialLeft + dx}px`;
            bubble.style.top = `${initialTop + dy}px`;
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        if (!bubbleIsDragging) {
            startX = undefined;
            return;
        }

        // Magnet-Effekt (Snapping)
        snapToEdge(bubble);
        
        startX = undefined;
        // Kurzer Delay für den Click-Blocker
        setTimeout(() => { bubbleIsDragging = false; }, 50);
    });
}

function snapToEdge(el) {
    const screenWidth = window.innerWidth;
    const rect = el.getBoundingClientRect();
    
    el.style.transition = 'all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
    
    // Snapping zur linken oder rechten Seite
    if (rect.left + rect.width / 2 < screenWidth / 2) {
        el.style.left = '20px';
    } else {
        el.style.left = `${screenWidth - rect.width - 20}px`;
    }
}

function toggleFilterBar() {
    const filterbar = document.getElementById('equipment-filter-bar');
    
    if (filterbar) {
        // Toggle fügt 'hidden' hinzu, wenn es fehlt, und entfernt es, wenn es da ist
        filterbar.classList.toggle('hidden');
        
        // Optional: Speichere den Zustand, damit die Bar beim nächsten Start 
        // so bleibt, wie der User es zuletzt wollte
        const isHidden = filterbar.classList.contains('hidden');
        localStorage.setItem('filterBarHidden', isHidden);
    }
}


                                            {}
// ==========================================
// 99. ENTWICKLERTOOLS
// ==========================================
                                            {}



async function handleDevReset() {
    const confirmed = await showCustomConfirm(
        "Hard Reset", 
        "Wirklich ALLES löschen?",
        "Alles Löschen",
        true // Roter Button
    );

    if (confirmed) {
        localStorage.clear();
        
        // Deine Basis-Stats vom 10.01.2026 wiederherstellen
        const initialStats = [{ 
            date: "10.01.2026", 
            weight: 80.5, 
            taille: 84.0, 
            bauch: 89.5, 
            brust: 108.0, 
            arm: 38.0, 
            bein: 65.0 
        }];
        localStorage.setItem('body_stats', JSON.stringify(initialStats));
        
        // Seite neu laden, um alle Zustände zu bereinigen
        location.reload();
    }
}


                                                                                        {}
// ==================================================================================== //
// ==================================================================================== //
//                                 3. INITIALISIERUNG                                   //
// ==================================================================================== //
// ==================================================================================== //
                                                                                        {}

document.addEventListener('DOMContentLoaded', () => {      
    recoverActiveSession();
    renderAllExercises();
    renderStatsHistory();
    renderWorkout();
    updateDashboard();
    checkBackupStatus();
    checkQuickResume();
    updateHeaderClock();
    initEquipmentSelector(); 
    initEquipmentFilter();   
    setInterval(updateHeaderClock, 1000);
    updateHeaderClock();
    
//--- NAVIGATION ---// 
                                                                        {}             
//--- BOTTOM-MENU
document.querySelectorAll('.menu-link').forEach(btn => {
    btn.onclick = () => showMainContent(btn.dataset.main);
});

//--- EXERCISE-TOP-MENU
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => switchWorkoutTab(btn.dataset.tab);
});

//--- EXERCISE-SUB-MENU
// document.querySelectorAll('.sub-group h3').forEach(header => {
//     header.addEventListener('click', handleSubgroupToggle);
// });

//--- ACCORDIAN-MENUS
document.addEventListener('click', toggleAccordion);




//--- TRAINING ---// 
                                                                        {}             
//--- TRAINING STARTEN
const startBtn = document.getElementById('start-session-btn');
if (startBtn) {
    startBtn.onclick = function() {
        // KEINE Abfrage mehr - direkt rein ins Training!
        startWorkout(); 
    };
}
    
//--- TRAINING BEENDEN 
const endBtn = document.getElementById('end-session-btn');
if (endBtn) endBtn.onclick = handleEndSessionClick;




//--- OVERLAY ---// 
                                                                        {}              
//--- Hintergrund-Klick schließt Overlay
const overlay = document.getElementById('exercise-overlay');
if (overlay) overlay.onclick = handleOverlayBackgroundClick;

//--- SwipeDown schließt Overlay
const dragHandle = document.getElementById('drag-handle-container');
if (dragHandle) {
    dragHandle.addEventListener('touchstart', handleOverlayDragStart, { passive: true });
    dragHandle.addEventListener('touchmove', handleOverlayDragMove, { passive: true });
    dragHandle.addEventListener('touchend', handleOverlayDragEnd);
}

//--- ZURÜCK schließt das Overlay
window.addEventListener('popstate', handlePopState);

//--- EDIT BUTTON 
document.getElementById('edit-exercise-btn').onclick = () => 
    handleExerciseEdit(currentExerciseId);

//--- SATZ SPEICHERN 
const saveBtn = document.getElementById('save-set-btn');
if (saveBtn) saveBtn.onclick = handleSaveSet;

//--- SATZ History ein/ausklappen
const setsToggleBtn = document.getElementById('toggle-sets-btn');
if (setsToggleBtn) setsToggleBtn.onclick = toggleSetsList;

//--- NOTIZEN ein/ausklappen und schreiben
const addNoteBtn = document.getElementById('add-note-btn');
if (addNoteBtn) addNoteBtn.onclick = toggleNoteInput;

//--- NOTIZEN live speichern
const noteTextarea = document.getElementById('temp-exercise-note');
if (noteTextarea) noteTextarea.oninput = handleNoteInput;

//--- NOTIZEN-HISTORY ein/ausklappen
const viewNotesBtn = document.getElementById('view-notes-btn');
if (viewNotesBtn) viewNotesBtn.onclick = togglePreviousNotes;

//--- Tastatur-Fix: Inputs ins Sichtfeld scrollen
const inputs = ['weight-input', 'reps-input'].map(id => document.getElementById(id));
inputs.forEach(input => {
    if (input) input.addEventListener('click', handleInputFocusScroll);
});

//--- Quick Resume Button
const timerBtn = document.getElementById('rest-timer-container');
if (timerBtn) {
    timerBtn.addEventListener('click', handleQuickResumeBtn);
}

//--- Quick Resume Button mit Drag-Funktionalität
document.getElementById('rest-timer-container').addEventListener('click', () => {
    // Wenn die Funktion oben isDragging auf true gesetzt hat, bricht der Klick hier ab
    if (isDragging) return; 

    handleQuickResumeBtn();
});

//--- BODY-STATS ---// 
                                                                        {}             
//--- Körpermaße speichern
const saveStatsBtn = document.getElementById('save-stats-btn');
if (saveStatsBtn) saveStatsBtn.onclick = handleSaveBodyStats;


//--- WORKOUT-HISTORY ---// 
const btnExportAll = document.getElementById('btn-export-all-history');
if (btnExportAll) {
    btnExportAll.onclick = exportHistory; // Deine bestehende Funktion
}


//--- SETTINGS ---// 

//--- profile Einstellungen öffnen
document.getElementById('profile-settings').addEventListener('click', renderProfileView);

//--- Backup Einstellungen öffnen
document.getElementById('backup-settings').addEventListener('click', renderBackupSettings);

//--- FILTER-BAR toggle 
document.getElementById('filter-trigger').addEventListener('click', toggleFilterBar);



//--- ANDERES ---// 
                                                                        {}             
//--- Startbutton Animation
window.addEventListener('load', initStartButtonAnimation);




//--- Entwicklertools ---//
                                                                        {} 
//--- DATA WIPE
    const devBtn = document.getElementById('dev-reset-history');
    if (devBtn) devBtn.onclick = handleDevReset;
        
});

let logoClickTimes = [];

document.querySelector('.dashboard-logo').addEventListener('click', () => {
    const now = Date.now();
    
    // Aktuellen Klick hinzufügen
    logoClickTimes.push(now);

    // Nur die letzten 5 Klicks behalten
    if (logoClickTimes.length > 5) {
        logoClickTimes.shift();
    }

    // Prüfen, ob wir 5 Klicks haben und ob der erste der 5 Klicks max. 2 Sek her ist
    if (logoClickTimes.length === 5 && (now - logoClickTimes[0]) <= 2000) {
        // Zähler zurücksetzen, damit es nicht doppelt feuert
        logoClickTimes = []; 
        
        // Die Reset-Funktion aufrufen
        handleDevReset();
    }
});

if (document.readyState === "complete" || document.readyState === "interactive") {
    initFloatingBubbleDrag();
} else {
    document.addEventListener("DOMContentLoaded", initFloatingBubbleDrag);
}

 


