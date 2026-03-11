let currentChapterId = null;
let currentSubjectId = null; // Denormalized for fast question fetching later
let questionsData = [];

// DOM Filter Elements
const selSubject = document.getElementById('sel-subject');
const selUnit = document.getElementById('sel-unit');
const selChapter = document.getElementById('sel-chapter');
const selSource = document.getElementById('sel-source');

const addQBtn = document.getElementById('add-q-btn');
const qContainer = document.getElementById('questions-container');
const qList = document.getElementById('questions-list');
const qCount = document.getElementById('q-count');

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadSubjects, 500);

    selSubject.addEventListener('change', onSubjectChange);
    selUnit.addEventListener('change', onUnitChange);
    selChapter.addEventListener('change', onChapterChange);
    selSource.addEventListener('change', renderQuestions);

    document.getElementById('question-form').addEventListener('submit', handleQSubmit);
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
    currentSubjectId = selSubject.value;

    selUnit.innerHTML = '<option value="">Select Unit...</option>';
    selChapter.innerHTML = '<option value="">Select Chapter...</option>';
    selUnit.disabled = !currentSubjectId;
    selChapter.disabled = true;

    resetChapterState();

    if (currentSubjectId) {
        const { data } = await window.supabaseClient
            .from('units')
            .select('id, name')
            .eq('subject_id', currentSubjectId)
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
        qContainer.style.opacity = '1';
        addQBtn.disabled = false;
        await loadQuestions();
    } else {
        resetChapterState();
    }
}

function resetChapterState() {
    currentChapterId = null;
    qContainer.style.opacity = '0.5';
    addQBtn.disabled = true;
    qList.innerHTML = '<div class="text-center" style="color: var(--text-secondary); padding: 40px 0;">Please select a chapter above.</div>';
    qCount.textContent = '(0)';
}

async function loadQuestions() {
    qList.innerHTML = '<div class="loader-container text-center" style="padding:40px;"><div class="loader"></div></div>';

    const { data, error } = await window.supabaseClient
        .from('questions')
        .select('*')
        .eq('chapter_id', currentChapterId)
        .order('created_at', { ascending: false });

    if (error) {
        qList.innerHTML = `<div class="text-center" style="color:var(--error-color); padding: 40px 0;">${error.message}</div>`;
        return;
    }

    questionsData = data || [];
    renderQuestions();
}

function renderQuestions() {
    const sourceFilter = selSource.value;

    const filtered = sourceFilter === 'all'
        ? questionsData
        : questionsData.filter(q => q.source === sourceFilter);

    qCount.textContent = `(${filtered.length})`;

    if (filtered.length === 0) {
        qList.innerHTML = '<div class="text-center" style="color:var(--text-secondary); padding: 40px 0;">No questions found. Click "+ Add Question" to create one.</div>';
        return;
    }

    qList.innerHTML = filtered.map(q => {
        let pyqMeta = '';
        if (q.source === 'pyq') {
            pyqMeta = `<span class="badge source" style="margin-left: 8px;">${q.exam_name || 'PYQ'} ${q.exam_year || ''}</span>`;
        }

        return `
        <div class="list-item">
            <div style="flex:1;">
                <div class="question-header">
                    <div>
                        <span class="badge ${q.difficulty}">${q.difficulty.toUpperCase()}</span>
                        <span class="badge" style="margin-left:8px; background: rgba(255,255,255,0.1);">${q.source.toUpperCase()}</span>
                        ${pyqMeta}
                        ${!q.is_active ? '<span class="badge" style="margin-left:8px; background:var(--error-color);color:#fff;">HIDDEN</span>' : ''}
                    </div>
                </div>
                <div style="font-size: 1.05rem; margin-bottom: 16px;">${q.question_text}</div>
                
                <div class="options-grid">
                    <div class="option ${q.correct_option === 'a' ? 'correct' : ''}"><strong>A.</strong> ${q.option_a}</div>
                    <div class="option ${q.correct_option === 'b' ? 'correct' : ''}"><strong>B.</strong> ${q.option_b}</div>
                    <div class="option ${q.correct_option === 'c' ? 'correct' : ''}"><strong>C.</strong> ${q.option_c}</div>
                    <div class="option ${q.correct_option === 'd' ? 'correct' : ''}"><strong>D.</strong> ${q.option_d}</div>
                </div>
                
                ${q.explanation ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);"><strong>💡 Explanation:</strong> ${q.explanation}</div>` : ''}
            </div>
            
            <div class="item-actions" style="margin-left: 24px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                <button onclick="editQuestion('${q.id}')">✏️ Edit</button>
                <button onclick="deleteQuestion('${q.id}')" style="color: var(--error-color);">🗑️ Drop</button>
            </div>
        </div>
        `;
    }).join('');
}


// --- MODAL LOGIC ---

function togglePyqFields() {
    const src = document.getElementById('q-source').value;
    const pyqFields = document.getElementById('pyq-fields');
    if (src === 'pyq') {
        pyqFields.style.display = 'flex';
    } else {
        pyqFields.style.display = 'none';
        document.getElementById('q-exam-name').value = '';
        document.getElementById('q-exam-year').value = '';
        document.getElementById('q-exam-shift').value = '';
    }
}

function openQuestionModal() {
    if (!currentChapterId || !currentSubjectId) return;
    const modal = document.getElementById('question-modal');
    document.getElementById('question-form').reset();
    document.getElementById('q-id').value = '';
    document.getElementById('modal-title').textContent = 'Add Question';
    document.getElementById('q-source').value = 'practice';
    togglePyqFields();
    document.getElementById('modal-error').style.display = 'none';
    modal.classList.add('active');
}

function closeQuestionModal() {
    document.getElementById('question-modal').classList.remove('active');
}

function editQuestion(id) {
    const q = questionsData.find(x => x.id === id);
    if (!q) return;

    openQuestionModal();
    document.getElementById('modal-title').textContent = 'Edit Question';
    document.getElementById('q-id').value = q.id;
    document.getElementById('q-source').value = q.source;
    document.getElementById('q-difficulty').value = q.difficulty;

    togglePyqFields();
    if (q.source === 'pyq') {
        document.getElementById('q-exam-name').value = q.exam_name || '';
        document.getElementById('q-exam-year').value = q.exam_year || '';
        document.getElementById('q-exam-shift').value = q.exam_shift || '';
    }

    document.getElementById('q-text').value = q.question_text;
    document.getElementById('q-op-a').value = q.option_a;
    document.getElementById('q-op-b').value = q.option_b;
    document.getElementById('q-op-c').value = q.option_c;
    document.getElementById('q-op-d').value = q.option_d;
    document.getElementById('q-correct').value = q.correct_option;
    document.getElementById('q-exp').value = q.explanation || '';
    document.getElementById('q-active').checked = q.is_active;
}

async function handleQSubmit(e) {
    e.preventDefault();
    if (!currentChapterId || !currentSubjectId) return;

    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving...';

    const id = document.getElementById('q-id').value;

    const payload = {
        chapter_id: currentChapterId,
        subject_id: currentSubjectId, // denormalized per schema
        source: document.getElementById('q-source').value,
        difficulty: document.getElementById('q-difficulty').value,
        question_text: document.getElementById('q-text').value,
        option_a: document.getElementById('q-op-a').value,
        option_b: document.getElementById('q-op-b').value,
        option_c: document.getElementById('q-op-c').value,
        option_d: document.getElementById('q-op-d').value,
        correct_option: document.getElementById('q-correct').value,
        explanation: document.getElementById('q-exp').value || null,
        is_active: document.getElementById('q-active').checked,
    };

    if (payload.source === 'pyq') {
        payload.exam_name = document.getElementById('q-exam-name').value || null;
        payload.exam_year = parseInt(document.getElementById('q-exam-year').value) || null;
        payload.exam_shift = document.getElementById('q-exam-shift').value || null;
    } else {
        payload.exam_name = null;
        payload.exam_year = null;
        payload.exam_shift = null;
    }

    try {
        let result;
        if (id) {
            result = await window.supabaseClient.from('questions').update(payload).eq('id', id);
        } else {
            result = await window.supabaseClient.from('questions').insert([payload]);
        }

        if (result.error) throw result.error;



        closeQuestionModal();
        await loadQuestions();

    } catch (err) {
        const errorEl = document.getElementById('modal-error');
        errorEl.textContent = err.message || "An error occurred";
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Question';
    }
}

async function deleteQuestion(id) {
    if (!confirm("Are you sure you want to delete this question? This action cannot be undone.")) return;
    try {
        const { error } = await window.supabaseClient.from('questions').delete().eq('id', id);
        if (error) throw error;
        await loadQuestions();
    } catch (err) {
        alert(err.message);
    }
}
