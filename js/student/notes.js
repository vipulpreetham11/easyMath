let notesData = [];
let activeNoteId = null;
let chapterId = null;
let openedNoteIds = []; // Track which notes the user has opened

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    chapterId = params.get('chapter_id');

    if (!chapterId) {
        window.location.href = 'app.html';
        return;
    }

    document.getElementById('back-btn').href = `app.html?chapter_id=${chapterId}`;

    setTimeout(() => {
        loadBreadcrumb(chapterId);
        loadNotes(chapterId);
    }, 500);
});

async function loadBreadcrumb(cId) {
    const crumbEl = document.getElementById('breadcrumb');

    const { data: chapter, error } = await window.supabaseClient
        .from('chapters')
        .select(`
            name,
            units(name, subjects(name))
        `)
        .eq('id', cId)
        .single();

    if (error || !chapter) {
        crumbEl.textContent = 'Notes';
        return;
    }

    const subjectName = chapter.units.subjects.name;
    const unitName = chapter.units.name;
    const chapterName = chapter.name;

    crumbEl.innerHTML = `${subjectName} &gt; ${unitName} &gt; ${chapterName}`;
}

async function loadNotes(cId) {
    const listEl = document.getElementById('notes-list');

    const { data, error } = await window.supabaseClient
        .from('notes')
        .select('*')
        .eq('chapter_id', cId)
        .eq('is_active', true)
        .order('order_index');

    if (error || !data || data.length === 0) {
        listEl.innerHTML = '<div style="padding: 24px; color: var(--text-secondary);">No notes available for this chapter.</div>';
        document.getElementById('note-viewer').innerHTML = '<div class="flex-center" style="height: 100%;"><p style="color: var(--text-secondary);">No content found.</p></div>';
        return;
    }

    notesData = data;

    // Show progress counter
    const counterEl = document.getElementById('progress-counter');
    counterEl.style.display = 'flex';
    document.getElementById('total-count').textContent = notesData.length;

    renderSidebar();

    // Auto-select first note
    if (notesData.length > 0) {
        selectNote(notesData[0].id);

        // Show mark complete button
        document.getElementById('mark-complete-btn').style.display = 'block';
        document.getElementById('mark-complete-btn').onclick = markChapterNotesCompleted;
    }
}

function renderSidebar() {
    const listEl = document.getElementById('notes-list');

    listEl.innerHTML = notesData.map(n => {
        const isActive = activeNoteId === n.id;
        const isOpened = openedNoteIds.includes(n.id);

        let badges = '';
        if (n.type === 'pdf') {
            badges += '<span class="note-badge pdf">PDF</span>';
        }
        if (isOpened) {
            badges += '<span class="note-badge opened">✓</span>';
        }

        return `
        <div class="note-item ${isActive ? 'active' : ''}" onclick="selectNote('${n.id}')">
            <div class="note-item-row">
                <div>${n.title}</div>
                <div style="display:flex; gap:4px;">${badges}</div>
            </div>
        </div>
        `;
    }).join('');
}

function selectNote(id) {
    activeNoteId = id;

    // Track opened notes
    if (!openedNoteIds.includes(id)) {
        openedNoteIds.push(id);
        document.getElementById('opened-count').textContent = openedNoteIds.length;
    }

    renderSidebar(); // Update active class + opened badges

    const note = notesData.find(n => n.id === id);
    const viewer = document.getElementById('note-viewer');

    if (!note) return;

    if (note.type === 'html') {
        viewer.innerHTML = `
            <div class="html-content">
                <h1 style="color: var(--primary-color); margin-bottom: 24px; font-size: 2.2rem;">${note.title}</h1>
                <div class="glass-panel" style="padding: 40px;">
                    ${note.html_content}
                </div>
            </div>
        `;
    } else if (note.type === 'pdf') {
        viewer.innerHTML = `
            <iframe src="${note.pdf_url}" class="pdf-container"></iframe>
        `;
    }

    // Add next/prev navigation
    const noteIndex = notesData.findIndex(n => n.id === id);
    const nextNote = notesData[noteIndex + 1];
    const prevNote = notesData[noteIndex - 1];
    let navHtml = '<div style="display:flex; gap:12px; margin-top:32px; padding:24px 0; border-top: 1px solid var(--border-color);">';
    if (prevNote) navHtml += `<button onclick="selectNote('${prevNote.id}')" class="btn btn-outline" style="flex:1;">← Previous Note</button>`;
    if (nextNote) navHtml += `<button onclick="selectNote('${nextNote.id}')" class="btn btn-primary" style="flex:1;">Next Note →</button>`;
    navHtml += '</div>';
    viewer.innerHTML += navHtml;
}

async function markChapterNotesCompleted() {
    const btn = document.getElementById('mark-complete-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        if (window.currentUser && chapterId) {
            await window.supabaseClient.from('progress').upsert({
                user_id: window.currentUser.id,
                chapter_id: chapterId,
                notes_completed: true,
                last_opened_at: new Date().toISOString()
            }, { onConflict: 'user_id,chapter_id' });
        }
    } catch(e) {}

    btn.innerHTML = '✓ Completed! Returning...';
    btn.style.background = 'linear-gradient(135deg, #059669, #047857)';
    setTimeout(() => {
        window.location.href = `app.html?chapter_id=${chapterId}`;
    }, 1200);
}
