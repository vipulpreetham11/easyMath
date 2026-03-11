// Notes management logic
let currentChapterId = null;
let notesData = [];

// DOM Elements
const selSubject = document.getElementById('sel-subject');
const selUnit = document.getElementById('sel-unit');
const selChapter = document.getElementById('sel-chapter');

const addNoteBtn = document.getElementById('add-note-btn');
const notesContainer = document.getElementById('notes-container');
const notesList = document.getElementById('notes-list');

document.addEventListener('DOMContentLoaded', () => {
    // Populate Subjects
    setTimeout(loadSubjects, 500);

    selSubject.addEventListener('change', onSubjectChange);
    selUnit.addEventListener('change', onUnitChange);
    selChapter.addEventListener('change', onChapterChange);

    document.getElementById('note-form').addEventListener('submit', handleNoteSubmit);
});

async function loadSubjects() {
    const { data, error } = await window.supabaseClient
        .from('subjects')
        .select('id, name')
        .order('order_index');

    if (data) {
        selSubject.innerHTML = '<option value="">Select Subject...</option>' +
            data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

async function onSubjectChange() {
    const sid = selSubject.value;

    // Reset lower dropdowns
    selUnit.innerHTML = '<option value="">Select Unit...</option>';
    selChapter.innerHTML = '<option value="">Select Chapter...</option>';
    selUnit.disabled = !sid;
    selChapter.disabled = true;

    resetChapterState();

    if (sid) {
        const { data } = await window.supabaseClient
            .from('units')
            .select('id, name')
            .eq('subject_id', sid)
            .order('order_index');

        if (data) {
            selUnit.innerHTML += data.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        }
    }
}

async function onUnitChange() {
    const uid = selUnit.value;

    selChapter.innerHTML = '<option value="">Select Chapter...</option>';
    selChapter.disabled = !uid;

    resetChapterState();

    if (uid) {
        const { data } = await window.supabaseClient
            .from('chapters')
            .select('id, name')
            .eq('unit_id', uid)
            .order('order_index');

        if (data) {
            selChapter.innerHTML += data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }
}

async function onChapterChange() {
    currentChapterId = selChapter.value;

    if (currentChapterId) {
        notesContainer.style.opacity = '1';
        addNoteBtn.disabled = false;
        await loadNotes();
    } else {
        resetChapterState();
    }
}

function resetChapterState() {
    currentChapterId = null;
    notesContainer.style.opacity = '0.5';
    addNoteBtn.disabled = true;
    notesList.innerHTML = '<div class="text-center" style="color: var(--text-secondary); padding: 40px 0;">Please select a chapter above to view or add notes.</div>';
}

async function loadNotes() {
    notesList.innerHTML = '<div class="loader-container text-center" style="padding:40px;"><div class="loader"></div></div>';

    const { data, error } = await window.supabaseClient
        .from('notes')
        .select('*')
        .eq('chapter_id', currentChapterId)
        .order('order_index');

    if (error) {
        notesList.innerHTML = `<div class="text-center" style="color:var(--error-color); padding: 40px 0;">${error.message}</div>`;
        return;
    }

    notesData = data;
    renderNotes();
}

function renderNotes() {
    if (notesData.length === 0) {
        notesList.innerHTML = '<div class="text-center" style="color:var(--text-secondary); padding: 40px 0;">No notes found for this chapter. Click "+ Add Note" to create one.</div>';
        return;
    }

    notesList.innerHTML = notesData.map(n => `
        <div class="list-item">
            <div>
                <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">${n.title}</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="badge ${n.type}">${n.type.toUpperCase()}</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Sort: ${n.order_index} | ${n.is_active ? 'Active' : 'Hidden'}</span>
                </div>
            </div>
            <div class="item-actions">
                <button onclick="editNote('${n.id}')">✏️ Edit</button>
                <button onclick="deleteNote('${n.id}')" style="color: var(--error-color);">🗑️ Drop</button>
            </div>
        </div>
    `).join('');
}


// --- MODAL ---

function toggleNoteType() {
    const type = document.getElementById('note-type').value;
    const gHtml = document.getElementById('group-html');
    const gPdf = document.getElementById('group-pdf');

    if (type === 'html') {
        gHtml.classList.remove('hidden');
        gPdf.classList.add('hidden');
        document.getElementById('note-pdf').required = false;
        // HTML is theoretically optional but good to have
    } else {
        gHtml.classList.add('hidden');
        gPdf.classList.remove('hidden');
        document.getElementById('note-pdf').required = true;
    }
}

function openNotesModal() {
    if (!currentChapterId) return;

    const modal = document.getElementById('note-modal');
    modal.classList.add('active');

    document.getElementById('note-form').reset();
    document.getElementById('note-id').value = '';
    document.getElementById('modal-title').textContent = 'Add Note';
    document.getElementById('note-type').value = 'html';
    toggleNoteType();

    document.getElementById('modal-error').style.display = 'none';
}

function closeNotesModal() {
    document.getElementById('note-modal').classList.remove('active');
}

function editNote(id) {
    const note = notesData.find(n => n.id === id);
    if (!note) return;

    openNotesModal();
    document.getElementById('modal-title').textContent = 'Edit Note';
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-order').value = note.order_index;
    document.getElementById('note-active').checked = note.is_active;

    document.getElementById('note-type').value = note.type;
    toggleNoteType();

    if (note.type === 'html') {
        document.getElementById('note-html').value = note.html_content || '';
    } else {
        document.getElementById('note-pdf').value = note.pdf_url || '';
    }
}

async function handleNoteSubmit(e) {
    e.preventDefault();
    if (!currentChapterId) return;

    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving...';

    const id = document.getElementById('note-id').value;
    const type = document.getElementById('note-type').value;

    const payload = {
        chapter_id: currentChapterId,
        title: document.getElementById('note-title').value,
        type: type,
        order_index: parseInt(document.getElementById('note-order').value) || 0,
        is_active: document.getElementById('note-active').checked,
        updated_at: new Date().toISOString()
    };

    if (type === 'html') {
        payload.html_content = document.getElementById('note-html').value;
        payload.pdf_url = null;
    } else {
        payload.pdf_url = document.getElementById('note-pdf').value;
        payload.html_content = null;
    }

    try {
        let result;
        if (id) {
            result = await window.supabaseClient.from('notes').update(payload).eq('id', id);
        } else {
            result = await window.supabaseClient.from('notes').insert([payload]);
        }

        if (result.error) throw result.error;



        closeNotesModal();
        await loadNotes();

    } catch (err) {
        const errorEl = document.getElementById('modal-error');
        errorEl.textContent = err.message || "An error occurred";
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Note';
    }
}

async function deleteNote(id) {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

    try {
        const { error } = await window.supabaseClient.from('notes').delete().eq('id', id);
        if (error) throw error;
        await loadNotes();
    } catch (err) {
        alert(err.message);
    }
}
