// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const hamburger = document.getElementById('hamburger');
const sidebarClose = document.getElementById('sidebarClose');
const themeBtn = document.getElementById('themeBtn');
const views = document.querySelectorAll('.view-section');
const bottomTabs = document.querySelectorAll('.tab-item');
const navLinks = document.querySelectorAll('.nav-link');

// Dashboard Elements
const greetingTime = document.getElementById('greetingTime');
const statSubjects = document.getElementById('stat-subjects');
const statTests = document.getElementById('stat-tests');
const statStreak = document.getElementById('stat-streak');
const continueCard = document.getElementById('continue-card');
const ccChapterName = document.getElementById('cc-chapter-name');
const ccMetaName = document.getElementById('cc-meta-name');
const ccActionBtn = document.getElementById('cc-action-btn');
const recentItemsWrapper = document.getElementById('recent-items-wrapper');
const subjectsGrid = document.getElementById('subjects-grid');

// Chapter View Elements
const chapterBreadcrumb = document.getElementById('chapter-breadcrumb');
const chTitle = document.getElementById('ch-title');
const chDesc = document.getElementById('ch-desc');
const chScoreBadge = document.getElementById('ch-score-badge');
const chScoreVal = document.getElementById('ch-score-val');
const cardNotes = document.getElementById('card-notes');
const cardPractice = document.getElementById('card-practice');
const cardPyq = document.getElementById('card-pyq');
const cardTest = document.getElementById('card-test');
const countNotes = document.getElementById('count-notes');
const countPractice = document.getElementById('count-practice');
const countPyq = document.getElementById('count-pyq');
const countTest = document.getElementById('count-test');
const progBest = document.getElementById('prog-best');
const progAttempts = document.getElementById('prog-attempts');

// Global State
let currentSyllabus = []; // Cache syllabus data
let isNavigatingToChapter = false; // Prevent double loads

// Utility: Greeting based on time
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
}

// Sidebar Overlay Controls
function openSidebar() {
    sidebar.classList.add('show');
    sidebarOverlay.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeSidebar() {
    sidebar.classList.add('closing'); // Add closing class if needed for animation
    sidebar.classList.remove('show');
    sidebarOverlay.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => sidebar.classList.remove('closing'), 300); // Clean up
}

// Theme Management
function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

// View Management
function showView(viewId) {
    views.forEach(view => {
        if (view.id === viewId) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    const backBtn = document.getElementById('ch-back-btn');
    if (backBtn) {
        if (viewId === 'view-chapter') {
            backBtn.style.display = 'flex';
        } else {
            backBtn.style.display = 'none';
        }
    }

    // Update Bottom Tabs active state
    bottomTabs.forEach(tab => {
        if (tab.id === 'tab-home' && viewId === 'view-dashboard') tab.classList.add('active');
        else if (tab.id === 'tab-syllabus' && viewId === 'view-chapter') tab.classList.add('active');
        else tab.classList.remove('active');
    });

    // Update Sidebar Links active state (Desktop)
    const navDash = document.getElementById('nav-dashboard');
    if (navDash) {
        if (viewId === 'view-dashboard') {
            navDash.classList.add('active');
            // Clear active chapter in sidebar if returning to dashboard
            document.querySelectorAll('.acc-chapter.active').forEach(el => el.classList.remove('active'));
        } else {
            navDash.classList.remove('active');
        }
    }

    // Scroll to top when changing views
    window.scrollTo(0, 0);
}

// Format Name (First Name Only)
function getFirstName(fullName) {
    if (!fullName) return 'Student';
    return fullName.split(' ')[0];
}

/* ==========================================================================
   SUPABASE DATA FETCHING & RENDERING
   ========================================================================== */

// 1. Load Dashboard Data
window.loadDashboard = async function () {
    // Wait for currentUser to be available
    let attempts = 0;
    while (!window.currentUser && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }

    if (!window.currentUser) {
        console.error('No current user found');
        return;
    }

    // Hide loader if not already hidden by auth.js (failsafe)
    document.body.classList.remove('page-hidden');
    const loader = document.getElementById('auth-loader');
    if (loader) loader.remove();

    // Set Greetings
    if (greetingTime) greetingTime.textContent = getGreeting();
    document.querySelectorAll('.user-name-display').forEach(el => {
        // Use first name for the big greeting, full name elsewhere
        if (el.classList.contains('greeting-name')) {
            el.textContent = getFirstName(window.currentUser.name);
        } else {
            el.textContent = window.currentUser.name || window.currentUser.email || 'User';
        }
    });

    const initial = (window.currentUser.name || window.currentUser.email || 'U').charAt(0).toUpperCase();
    document.querySelectorAll('.user-avatar-initial').forEach(el => el.textContent = initial);

    try {
        // Parallel fetching for performance
        const [testsRes, unitsRes] = await Promise.all([
            window.supabaseClient.from('test_attempts').select('id', { count: 'exact', head: true }).eq('user_id', window.currentUser.id),
            window.supabaseClient.from('units').select('id, name').eq('is_active', true).order('order_index')
        ]);

        // Set Test Count
        if (statTests) {
            statTests.textContent = testsRes.error ? '0' : (testsRes.count || 0);
        }

        // Set Units Count & Grid instead of subjects
        if (unitsRes.data) {
            if (statSubjects) {
                statSubjects.textContent = unitsRes.data.length;
                const labelEl = statSubjects.parentElement.querySelector('.stat-label');
                if (labelEl) labelEl.textContent = 'UNITS';
            }
            renderUnitsGrid(unitsRes.data);
        } else {
            if (subjectsGrid) subjectsGrid.innerHTML = '<div style="color: var(--text-secondary);">No units available.</div>';
        }

    } catch (e) {
        console.error("Error loading dashboard stats:", e);
        if (subjectsGrid) subjectsGrid.innerHTML = '<div style="color: var(--error-color);">Failed to load units.</div>';
    }

    // Start loading syllabus in background immediately
    await loadSyllabus();

    // Check for recent chapter
    await checkRecentChapter();

    // Auto-open chapter if redirected back from notes/practice/pyq
    const urlParams = new URLSearchParams(window.location.search);
    const returnChapterId = urlParams.get('chapter_id');
    if (returnChapterId) {
        // Wait for syllabus to load then open chapter
        setTimeout(() => window.loadChapter(returnChapterId), 800);
        // Clean URL
        window.history.replaceState({}, '', 'app.html');
    }
}

function renderUnitsGrid(units) {
    if (!subjectsGrid) return;

    if (units.length === 0) {
        subjectsGrid.innerHTML = '<div style="color: var(--text-secondary);">No units available yet.</div>';
        return;
    }

    subjectsGrid.innerHTML = '';
    units.forEach(unit => {
        const card = document.createElement('div');
        card.className = 'subject-grid-card';
        card.innerHTML = `
            <div class="subject-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div class="subject-name">${unit.name}</div>
        `;
        // Scroll sidebar to unit and expand, then load first chapter
        card.addEventListener('click', () => {
            const sidebarUnitEl = document.querySelector(`.acc-unit[data-id="${unit.id}"]`);
            if (sidebarUnitEl) {
                if (window.innerWidth <= 768) {
                    openSidebar();
                }
                // If not open, click it
                if (!sidebarUnitEl.classList.contains('open')) {
                    sidebarUnitEl.click();
                }
                sidebarUnitEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Call loadChapter for the first chapter of this unit
            if (currentSyllabus) {
                const uData = currentSyllabus.find(u => u.id === unit.id);
                if (uData && uData.chapters && uData.chapters.length > 0) {
                    window.loadChapter(uData.chapters[0].id);
                }
            }
        });
        subjectsGrid.appendChild(card);
    });
}

// 2. Recent Chapter Logic
async function checkRecentChapter() {
    const lastChapterId = localStorage.getItem('easymath_last_chapter');

    if (!lastChapterId || !continueCard || !recentItemsWrapper) {
        if (continueCard) continueCard.style.display = 'none';
        if (recentItemsWrapper) recentItemsWrapper.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9rem;">No recent activity. Start learning from the syllabus!</div>';
        return;
    }

    try {
        // Fetch chapter details including unit name
        const { data, error } = await window.supabaseClient
            .from('chapters')
            .select(`
              id, 
              name, 
              unit_id,
              units (
                  name
              )
          `)
            .eq('id', lastChapterId)
            .single();

        if (error || !data) throw error;

        // Update Continue Card UI
        const unitName = data.units?.name || 'Unit';

        if (ccChapterName) ccChapterName.textContent = data.name;
        if (ccMetaName) ccMetaName.textContent = unitName; // Show unit name directly

        continueCard.style.display = 'flex';

        // Hide recent items wrapper since we are showing the big card
        const recentListContainer = document.getElementById('recent-list-container');
        if (recentListContainer) recentListContainer.style.display = 'none';

        // Setup click handler
        continueCard.onclick = () => {
            loadChapter(data.id);
        };

    } catch (err) {
        console.error("Error fetching recent chapter:", err);
        if (continueCard) continueCard.style.display = 'none';
    }
}

// 3. Load Syllabus (Sidebar Accordion structure)
window.loadSyllabus = async function () {
    const accordionContainer = document.getElementById('sidebarAccordion');
    if (!accordionContainer) return;

    try {
        // Query units directly, include chapters
        const { data: units, error: unitErr } = await window.supabaseClient
            .from('units')
            .select('*, chapters(*, chapter_meta(*))')
            .eq('is_active', true)
            .order('order_index');

        if (unitErr) throw unitErr;

        // Sort chapters by order_index just in case
        units.forEach(u => {
            if (u.chapters) {
                u.chapters.sort((a,b) => a.order_index - b.order_index);
            }
        });

        currentSyllabus = units; // Cache it
        renderSyllabusHTML(units, accordionContainer);

    } catch (err) {
        console.error("Failed to load syllabus configuration:", err);
        accordionContainer.innerHTML = `<div style="padding: 20px; color: var(--error-color); font-size: 0.8rem; text-align: center;">Error loading syllabus data.</div>`;
    }
}

function renderSyllabusHTML(units, container) {
    if (units.length === 0) {
        container.innerHTML = `<div style="padding: 20px; color: var(--text-secondary); font-size: 0.8rem; text-align: center;">No units available.</div>`;
        return;
    }

    let html = '';

    units.forEach(unit => {
        // Unit Header (now top level)
        html += `
            <div class="acc-unit" data-id="${unit.id}" onclick="event.stopPropagation(); toggleUnit(this)">
                ${unit.name}
                <svg class="chevron" width="14" height="14" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
            </div>
            <div class="chapters-wrapper" id="chaps-${unit.id}">
        `;

        if (unit.chapters && unit.chapters.length > 0) {
            unit.chapters.forEach(chap => {
                html += `
                    <a class="acc-chapter" data-id="${chap.id}" data-unit-id="${unit.id}" onclick="event.preventDefault(); window.loadChapter('${chap.id}')">
                        ${chap.name}
                    </a>
                `;
            });
        } else {
            html += `<div style="padding: 8px 20px 8px 48px; font-size: 0.8rem; color: var(--text-secondary);">Coming soon</div>`;
        }

        html += `</div>`; // Close chapters-wrapper
    });

    container.innerHTML = html;
}

// Sidebar Interaction Helpers
window.toggleUnit = function (el) {
    const isCurrentlyOpen = el.classList.contains('open');
    const wrapper = el.nextElementSibling;

    // Auto-close ALL other units (since they are top level now)
    document.querySelectorAll('.acc-unit').forEach(unitEl => {
        if (unitEl !== el && unitEl.classList.contains('open')) {
            unitEl.classList.remove('open');
            const w = unitEl.nextElementSibling;
            if (w) w.style.maxHeight = '0';
        }
    });

    if (isCurrentlyOpen) {
        el.classList.remove('open');
        wrapper.style.maxHeight = '0';
    } else {
        el.classList.add('open');
        wrapper.style.maxHeight = wrapper.scrollHeight + "px";
    }
}


// 4. Load Specific Chapter
window.loadChapter = async function (chapterId) {
    if (isNavigatingToChapter) return;
    isNavigatingToChapter = true;

    try {
        // Find chapter info from cached syllabus to build breadcrumb quickly
        let foundUnit, foundChapter;
        for (const u of currentSyllabus) {
            const c = u.chapters.find(chap => chap.id === chapterId);
            if (c) {
                foundUnit = u; foundChapter = c;
                break;
            }
        }

        // Fallback fetch if not in cache
        if (!foundChapter) {
            const { data, error } = await window.supabaseClient.from('chapters')
                .select('*, chapter_meta(*), units(name)')
                .eq('id', chapterId).single();
            if (error) throw error;

            foundChapter = data;
            foundUnit = { name: data.units?.name };
        }

        // Switch view
        showView('view-chapter');

        if (window.innerWidth <= 768) {
            closeSidebar();
        }

        // Update Breadcrumb - skip subject
        if (chapterBreadcrumb) {
            chapterBreadcrumb.innerHTML = `
              <span class="bread-item">${foundUnit?.name || 'Unit'}</span> › 
              <span class="bread-item active">${foundChapter.name}</span>
          `;
        }

        // Update Header
        if (chTitle) chTitle.textContent = foundChapter.name;
        if (chDesc) chDesc.textContent = foundChapter.description || '';

        // Set Meta / Action Cards
        console.log('chapter_meta:', foundChapter.chapter_meta);

        const meta = Array.isArray(foundChapter.chapter_meta) && foundChapter.chapter_meta.length > 0
            ? foundChapter.chapter_meta[0]
            : foundChapter.chapter_meta || { notes_count: 0, practice_count: 0, pyq_count: 0, has_test: false };

        updateResourceCard(cardNotes, countNotes, meta.notes_count, 'Items', `notes.html?chapter_id=${chapterId}`);
        updateResourceCard(cardPractice, countPractice, meta.practice_count, 'Questions', `practice.html?chapter_id=${chapterId}`);
        updateResourceCard(cardPyq, countPyq, meta.pyq_count, 'Questions', `pyq.html?chapter_id=${chapterId}`);

        if (cardTest && countTest) {
            if (meta.has_test) {
                cardTest.classList.remove('disabled');
                cardTest.href = `test.html?chapter_id=${chapterId}`;
                countTest.textContent = 'Ready to start';
            } else {
                cardTest.classList.add('disabled');
                cardTest.href = '#';
                countTest.textContent = 'Not available';
            }
        }

        // Update Active State in Sidebar
        document.querySelectorAll('.acc-chapter').forEach(el => el.classList.remove('active'));
        const activeEl = document.querySelector(`.acc-chapter[data-id="${chapterId}"]`);
        if (activeEl) {
            activeEl.classList.add('active');
            // Ensure parent unit is open
            const unitId = activeEl.getAttribute('data-unit-id');
            const unitHeader = document.querySelector(`.acc-unit[data-id="${unitId}"]`);

            if (unitHeader && !unitHeader.classList.contains('open')) toggleUnit(unitHeader);
        }

        // Fetch Progress
        const { data: progData } = await window.supabaseClient
            .from('progress')
            .select('best_score, practice_attempts')
            .eq('user_id', window.currentUser.id)
            .eq('chapter_id', chapterId)
            .single();

        if (progData) {
            if (progBest) progBest.textContent = progData.best_score !== null ? `${progData.best_score}%` : '-';
            if (progAttempts) progAttempts.textContent = progData.practice_attempts || 0;

            if (chScoreBadge && progData.best_score !== null) {
                chScoreBadge.classList.remove('hidden');
                if (chScoreVal) chScoreVal.textContent = progData.best_score;
            } else if (chScoreBadge) {
                chScoreBadge.classList.add('hidden');
            }
        } else {
            // Defaults if no progress record exists yet
            if (progBest) progBest.textContent = '-';
            if (progAttempts) progAttempts.textContent = '0';
            if (chScoreBadge) chScoreBadge.classList.add('hidden');
        }
        
        // Update best_score if test result exists
        const lastResult = sessionStorage.getItem('test_result');
        if (lastResult) {
            try {
                const parsed = JSON.parse(lastResult);
                if (parsed.chapter_id === chapterId && parsed.percentage !== undefined) {
                    const newScore = parsed.percentage;
                    const current = progData?.best_score || 0;
                    if (newScore > current) {
                        await window.supabaseClient
                            .from('progress')
                            .upsert({
                                user_id: window.currentUser.id,
                                chapter_id: chapterId,
                                best_score: newScore,
                                last_opened_at: new Date().toISOString()
                            });
                            
                        // Update UI optimistically
                        if (progBest) progBest.textContent = `${newScore}%`;
                        if (chScoreBadge) {
                            chScoreBadge.classList.remove('hidden');
                            if (chScoreVal) chScoreVal.textContent = newScore;
                        }
                    }
                }
            } catch(e) {}
            sessionStorage.removeItem('test_result');
        }

        // Log progress to db & localstorage
        localStorage.setItem('easymath_last_chapter', chapterId);
        upsertProgressRecord(chapterId);

    } catch (err) {
        console.error("Error loading chapter view:", err);
        alert('Failed to load chapter data.');
    } finally {
        isNavigatingToChapter = false;
    }
}

// Helper to set valid/invalid card states
function updateResourceCard(cardEl, countEl, count, suffix, href) {
    if (!cardEl || !countEl) return;
    
    const n = parseInt(count) || 0;
    
    if (n > 0) {
        cardEl.classList.remove('disabled');
        cardEl.removeAttribute('disabled');
        if (cardEl.tagName === 'A') cardEl.href = href;
        countEl.textContent = n;
        
        // Update suffix label separately
        const suffixEl = cardEl.querySelector('.card-count-label');
        if (suffixEl) suffixEl.textContent = suffix;
    } else {
        cardEl.classList.add('disabled');
        if (cardEl.tagName === 'A') cardEl.href = '#';
        countEl.textContent = '—';
        
        const suffixEl = cardEl.querySelector('.card-count-label');
        if (suffixEl) suffixEl.textContent = 'Not available';
    }
}

// Background task to ensure progress row exists and update last_opened_at
async function upsertProgressRecord(chapterId) {
    try {
        const { data } = await window.supabaseClient
            .from('progress')
            .select('id')
            .eq('user_id', window.currentUser.id)
            .eq('chapter_id', chapterId)
            .single();

        if (!data) {
            await window.supabaseClient.from('progress').insert([{
                user_id: window.currentUser.id,
                chapter_id: chapterId,
                practice_attempts: 0,
                last_opened_at: new Date().toISOString()
            }]);
        } else {
            await window.supabaseClient.from('progress').update({
                last_opened_at: new Date().toISOString()
            }).eq('id', data.id);
        }
    } catch (e) {
        // Non-critical background failure, ignore
    }
}

/* ==========================================================================
   EVENT LISTENERS SETUP
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Mobile navigation
    if (hamburger) hamburger.addEventListener('click', openSidebar);
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // Desktop/Static Nav Links
    const navDash = document.getElementById('nav-dashboard');
    if (navDash) navDash.addEventListener('click', (e) => { e.preventDefault(); showView('view-dashboard'); });

    const navSettings = document.getElementById('nav-settings');
    if (navSettings) navSettings.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showView('view-settings'); 
    });

    // Settings theme btn
    const settingsThemeBtn = document.getElementById('settings-theme-btn');
    if (settingsThemeBtn) settingsThemeBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Mobile Bottom Tabs
    const tabHome = document.getElementById('tab-home');
    const tabSyllabus = document.getElementById('tab-syllabus');

    if (tabHome) tabHome.addEventListener('click', () => { showView('view-dashboard'); window.scrollTo(0, 0); });
    if (tabSyllabus) tabSyllabus.addEventListener('click', () => {
        // Important detail: On mobile, clicking syllabus tab directly opens the sidebar
        if (window.innerWidth <= 768) {
            openSidebar();
        }
    });

    // Handle browser back button (rudimentary SPA behavior)
    window.addEventListener('popstate', (e) => {
        // If we implement history API, handle it here. 
        // For now, default to dashboard.
        showView('view-dashboard');
    });
});
