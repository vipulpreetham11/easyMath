// Manage syllabus state
let subjects = [];
let units = [];
let chapters = [];

let selectedSubjectId = null;
let selectedUnitId = null;

// DOM Elements
const subjectsList = document.getElementById('subjects-list');
const unitsList = document.getElementById('units-list');
const chaptersList = document.getElementById('chapters-list');
const unitsCol = document.getElementById('units-col');
const chaptersCol = document.getElementById('chapters-col');

const addUnitBtn = document.getElementById('add-unit-btn');
const addChapterBtn = document.getElementById('add-chapter-btn');

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth to settle
    setTimeout(loadSubjects, 500);

    // Form submit listener
    document.getElementById('crud-form').addEventListener('submit', handleFormSubmit);
});

async function loadSubjects() {
    subjectsList.innerHTML = '<div class="loader-container text-center"><div class="loader"></div></div>';

    const { data, error } = await window.supabaseClient
        .from('subjects')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching subjects', error);
        subjectsList.innerHTML = '<div class="text-center" style="color:var(--error-color)">' + error.message + '</div>';
        return;
    }

    subjects = data;
    renderSubjects();
}

function renderSubjects() {
    if (subjects.length === 0) {
        subjectsList.innerHTML = '<div class="text-center" style="color:var(--text-secondary); margin-top:20px;">No subjects found.</div>';
        return;
    }

    subjectsList.innerHTML = subjects.map(sub => `
        <div class="list-item ${selectedSubjectId === sub.id ? 'active' : ''}" onclick="selectSubject('${sub.id}')">
            <div>
                <div style="font-weight: 600;">${sub.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${sub.is_active ? 'Active' : 'Hidden'}</div>
            </div>
            <div class="item-actions">
                <button onclick="editItem(event, 'subject', '${sub.id}')">✏️</button>
            </div>
        </div>
    `).join('');
}

async function selectSubject(id) {
    selectedSubjectId = id;
    selectedUnitId = null;

    renderSubjects(); // Update active class

    // Enable units column
    unitsCol.style.opacity = '1';
    addUnitBtn.disabled = false;

    // Disable chapters column
    chaptersCol.style.opacity = '0.5';
    addChapterBtn.disabled = true;
    chaptersList.innerHTML = '<div class="text-center" style="color: var(--text-secondary); margin-top: 20px;">Select a unit</div>';

    await loadUnits(id);
}

async function loadUnits(subjectId) {
    unitsList.innerHTML = '<div class="loader-container text-center"><div class="loader"></div></div>';

    const { data, error } = await window.supabaseClient
        .from('units')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching units', error);
        return;
    }

    units = data;
    renderUnits();
}

function renderUnits() {
    if (units.length === 0) {
        unitsList.innerHTML = '<div class="text-center" style="color:var(--text-secondary); margin-top:20px;">No units in this subject.</div>';
        return;
    }

    unitsList.innerHTML = units.map(u => `
        <div class="list-item ${selectedUnitId === u.id ? 'active' : ''}" onclick="selectUnit('${u.id}')">
            <div>
                <div style="font-weight: 600;">${u.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${u.is_active ? 'Active' : 'Hidden'}</div>
            </div>
            <div class="item-actions">
                <button onclick="editItem(event, 'unit', '${u.id}')">✏️</button>
            </div>
        </div>
    `).join('');
}

async function selectUnit(id) {
    selectedUnitId = id;
    renderUnits();

    // Enable chapters column
    chaptersCol.style.opacity = '1';
    addChapterBtn.disabled = false;

    await loadChapters(id);
}

async function loadChapters(unitId) {
    chaptersList.innerHTML = '<div class="loader-container text-center"><div class="loader"></div></div>';

    const { data, error } = await window.supabaseClient
        .from('chapters')
        .select('*')
        .eq('unit_id', unitId)
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching chapters', error);
        return;
    }

    chapters = data;
    renderChapters();
}

function renderChapters() {
    if (chapters.length === 0) {
        chaptersList.innerHTML = '<div class="text-center" style="color:var(--text-secondary); margin-top:20px;">No chapters in this unit.</div>';
        return;
    }

    chaptersList.innerHTML = chapters.map(c => `
        <div class="list-item">
            <div>
                <div style="font-weight: 600;">${c.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.is_active ? 'Active' : 'Hidden'}</div>
            </div>
            <div class="item-actions">
                <button onclick="editItem(event, 'chapter', '${c.id}')">✏️</button>
            </div>
        </div>
    `).join('');
}


// --- MODAL & CRUD LOGIC ---

function openModal(type) {
    const modal = document.getElementById('form-modal');
    modal.classList.add('active');

    // Reset form
    document.getElementById('crud-form').reset();
    document.getElementById('form-type').value = type;
    document.getElementById('form-id').value = '';
    document.getElementById('modal-error').style.display = 'none';

    const title = document.getElementById('modal-title');
    const slugGroup = document.getElementById('group-slug');
    const descGroup = document.getElementById('group-desc');

    slugGroup.classList.add('hidden');
    descGroup.classList.add('hidden');
    document.getElementById('input-slug').required = false;

    if (type === 'subject') {
        title.textContent = 'Add Subject';
        slugGroup.classList.remove('hidden');
        document.getElementById('input-slug').required = true;
    } else if (type === 'unit') {
        title.textContent = 'Add Unit';
    } else if (type === 'chapter') {
        title.textContent = 'Add Chapter';
        descGroup.classList.remove('hidden');
    }
}

function closeModal() {
    const modal = document.getElementById('form-modal');
    modal.classList.remove('active');
}

function editItem(e, type, id) {
    e.stopPropagation(); // prevent row click selection

    openModal(type);
    document.getElementById('modal-title').textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    document.getElementById('form-id').value = id;

    let item;
    if (type === 'subject') item = subjects.find(s => s.id === id);
    if (type === 'unit') item = units.find(u => u.id === id);
    if (type === 'chapter') item = chapters.find(c => c.id === id);

    if (item) {
        document.getElementById('input-name').value = item.name;
        document.getElementById('input-order').value = item.order_index;
        document.getElementById('input-active').checked = item.is_active;

        if (type === 'subject') document.getElementById('input-slug').value = item.slug;
        if (type === 'chapter') document.getElementById('input-desc').value = item.description || '';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></div> Saving...';

    const type = document.getElementById('form-type').value;
    const id = document.getElementById('form-id').value;
    const errorEl = document.getElementById('modal-error');
    errorEl.style.display = 'none';

    const payload = {
        name: document.getElementById('input-name').value,
        order_index: parseInt(document.getElementById('input-order').value) || 0,
        is_active: document.getElementById('input-active').checked
    };

    if (type === 'subject') {
        payload.slug = document.getElementById('input-slug').value;
    } else if (type === 'unit') {
        if (!selectedSubjectId) return;
        payload.subject_id = selectedSubjectId;
    } else if (type === 'chapter') {
        if (!selectedUnitId || !selectedSubjectId) return;
        payload.unit_id = selectedUnitId;
        payload.subject_id = selectedSubjectId; // denormalized for speed
        payload.description = document.getElementById('input-desc').value;
    }

    const table = type + 's'; // subject -> subjects

    try {
        let result;
        if (id) {
            // Update
            result = await window.supabaseClient.from(table).update(payload).eq('id', id);
        } else {
            // Insert
            result = await window.supabaseClient.from(table).insert([payload]);
        }

        if (result.error) throw result.error;

        closeModal();

        // Refresh list
        if (type === 'subject') await loadSubjects();
        if (type === 'unit') await loadUnits(selectedSubjectId);
        if (type === 'chapter') await loadChapters(selectedUnitId);

    } catch (err) {
        console.error("Save error", err);
        errorEl.textContent = err.message || "An error occurred";
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save';
    }
}
