let currentChapterId = null;
let testsData = [];

// DOM Elements
const selSubject = document.getElementById('sel-subject');
const selUnit = document.getElementById('sel-unit');
const selChapter = document.getElementById('sel-chapter');

const addTestBtn = document.getElementById('add-test-btn');
const tContainer = document.getElementById('tests-container');
const tList = document.getElementById('tests-list');

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadSubjects, 500);

    selSubject.addEventListener('change', onSubjectChange);
    selUnit.addEventListener('change', onUnitChange);
    selChapter.addEventListener('change', onChapterChange);

    document.getElementById('test-form').addEventListener('submit', handleTestSubmit);
    calcTotal(); // initial sum
});

async function loadSubjects() {
    const { data } = await window.supabaseClient
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
        if (data) selUnit.innerHTML += data.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
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
        if (data) selChapter.innerHTML += data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

async function onChapterChange() {
    currentChapterId = selChapter.value;
    if (currentChapterId) {
        tContainer.style.opacity = '1';
        addTestBtn.disabled = false;
        await loadTests();
    } else {
        resetChapterState();
    }
}

function resetChapterState() {
    currentChapterId = null;
    tContainer.style.opacity = '0.5';
    addTestBtn.disabled = true;
    tList.innerHTML = '<div class="text-center" style="color: var(--text-secondary); padding: 40px 0;">Please select a chapter above.</div>';
}

async function loadTests() {
    tList.innerHTML = '<div class="loader-container text-center" style="padding:40px;"><div class="loader"></div></div>';

    const { data, error } = await window.supabaseClient
        .from('chapter_tests')
        .select('*')
        .eq('chapter_id', currentChapterId)
        .order('created_at', { ascending: false });

    if (error) {
        tList.innerHTML = `<div class="text-center" style="color:var(--error-color); padding: 40px 0;">${error.message}</div>`;
        return;
    }

    testsData = data || [];
    renderTests();
}

function renderTests() {
    if (testsData.length === 0) {
        tList.innerHTML = '<div class="text-center" style="color:var(--text-secondary); padding: 40px 0;">No tests configured. Click "+ Create Test" to create one.</div>';
        // Only allow 1 test per chapter ideally, but UI supports many
        return;
    }

    tList.innerHTML = testsData.map(t => {
        return `
        <div class="list-item">
            <div style="flex:1;">
                <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
                    ${t.test_name} 
                    ${t.is_active ? '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7;">ACTIVE</span>' : '<span class="badge" style="background:var(--error-color);color:#fff;">HIDDEN</span>'}
                </div>
                <div style="display: flex; gap: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                    <div>⏱️ ${t.duration_minutes} Mins</div>
                    <div>📝 ${t.total_questions} Qs (${t.practice_count} Practice + ${t.pyq_count} PYQ)</div>
                    <div>🎯 ${t.marks_per_question} Mark(s) / Q ${t.negative_marking ? '[Negative Marking: ON]' : ''}</div>
                </div>
            </div>
            
            <div class="item-actions" style="margin-left: 24px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                <button onclick="editTest('${t.id}')">✏️ Edit</button>
                <button onclick="deleteTest('${t.id}')" style="color: var(--error-color);">🗑️ Drop</button>
            </div>
        </div>
        `;
    }).join('');
}


// --- MODAL LOGIC ---

function calcTotal() {
    const p = parseInt(document.getElementById('t-practice').value) || 0;
    const q = parseInt(document.getElementById('t-pyq').value) || 0;
    document.getElementById('t-total').value = p + q;
}

function openTestModal() {
    if (!currentChapterId) return;
    const modal = document.getElementById('test-modal');
    document.getElementById('test-form').reset();
    document.getElementById('t-id').value = '';
    document.getElementById('modal-title').textContent = 'Configure Test';
    calcTotal();
    document.getElementById('modal-error').style.display = 'none';
    modal.classList.add('active');
}

function closeTestModal() {
    document.getElementById('test-modal').classList.remove('active');
}

function editTest(id) {
    const t = testsData.find(x => x.id === id);
    if (!t) return;

    openTestModal();
    document.getElementById('modal-title').textContent = 'Edit Test Config';
    document.getElementById('t-id').value = t.id;

    document.getElementById('t-name').value = t.test_name;
    document.getElementById('t-duration').value = t.duration_minutes;
    document.getElementById('t-practice').value = t.practice_count;
    document.getElementById('t-pyq').value = t.pyq_count;
    calcTotal();
    document.getElementById('t-marks').value = t.marks_per_question;
    document.getElementById('t-negative').checked = t.negative_marking;
    document.getElementById('t-active').checked = t.is_active;
}

async function handleTestSubmit(e) {
    e.preventDefault();
    if (!currentChapterId) return;

    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving...';

    const id = document.getElementById('t-id').value;
    const practice = parseInt(document.getElementById('t-practice').value) || 0;
    const pyq = parseInt(document.getElementById('t-pyq').value) || 0;
    const total = practice + pyq;

    if (total <= 0) {
        document.getElementById('modal-error').textContent = "Total questions must be greater than 0.";
        document.getElementById('modal-error').style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Test Config';
        return;
    }

    const payload = {
        chapter_id: currentChapterId,
        test_name: document.getElementById('t-name').value,
        duration_minutes: parseInt(document.getElementById('t-duration').value) || 0,
        total_questions: total,
        practice_count: practice,
        pyq_count: pyq,
        marks_per_question: parseInt(document.getElementById('t-marks').value) || 1,
        negative_marking: document.getElementById('t-negative').checked,
        is_active: document.getElementById('t-active').checked,
    };

    try {
        let result;
        if (id) {
            result = await window.supabaseClient.from('chapter_tests').update(payload).eq('id', id);
        } else {
            result = await window.supabaseClient.from('chapter_tests').insert([payload]);
        }

        if (result.error) throw result.error;



        closeTestModal();
        await loadTests();

    } catch (err) {
        const errorEl = document.getElementById('modal-error');
        errorEl.textContent = err.message || "An error occurred";
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Test Config';
    }
}

async function deleteTest(id) {
    if (!confirm("Are you sure you want to delete this test configuration?")) return;
    try {
        const { error } = await window.supabaseClient.from('chapter_tests').delete().eq('id', id);
        if (error) throw error;
        await loadTests();
    } catch (err) {
        alert(err.message);
    }
}
