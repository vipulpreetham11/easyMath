let chapterId = null;
let questions = [];
let currentIndex = 0;
let answers = {}; // { questionId: { selected, correct, isCorrect } }
let correctCount = 0;
let wrongCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    chapterId = params.get('chapter_id');

    if (!chapterId) {
        window.location.href = 'app.html';
        return;
    }

    document.getElementById('back-btn').href = 'app.html';
    document.getElementById('return-btn').onclick = () => window.location.href = 'app.html';

    setTimeout(initPyq, 500);
});

async function initPyq() {
    loadBreadcrumb();

    // Fetch ALL PYQ questions for this chapter
    const { data, error } = await window.supabaseClient
        .from('questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, exam_name, exam_year, exam_shift')
        .eq('chapter_id', chapterId)
        .eq('source', 'pyq')
        .eq('is_active', true)
        .order('exam_year', { ascending: false });

    if (error || !data || data.length === 0) {
        document.getElementById('loader-state').innerHTML = '<p style="color: var(--text-secondary);">No Past Year Questions available for this chapter.</p>';
        return;
    }

    questions = data;
    document.getElementById('loader-state').style.display = 'none';
    renderQuestion();
}

async function loadBreadcrumb() {
    const crumbEl = document.getElementById('breadcrumb');

    const { data: chapter } = await window.supabaseClient
        .from('chapters')
        .select('name, units(name, subjects(name))')
        .eq('id', chapterId)
        .single();

    if (!chapter) {
        crumbEl.textContent = 'Past Year Questions';
        return;
    }

    crumbEl.innerHTML = `
        <a href="app.html">Subjects</a> &gt;
        ${chapter.units.subjects.name} &gt;
        ${chapter.units.name} &gt;
        <a href="app.html">${chapter.name}</a> &gt;
        <strong style="color: #f472b6;">PYQ</strong>
    `;
}

function renderQuestion() {
    const q = questions[currentIndex];
    if (!q) return;

    const total = questions.length;

    // Update counter and progress bar
    document.getElementById('q-counter').textContent = `PYQ ${currentIndex + 1} of ${total}`;
    document.getElementById('progress-bar').style.width = `${((currentIndex + 1) / total) * 100}%`;

    // Set question text
    document.getElementById('q-text').textContent = q.question_text;

    // Set difficulty
    const diffEl = document.getElementById('q-difficulty');
    diffEl.textContent = q.difficulty ? q.difficulty.toUpperCase() : '';
    diffEl.className = `difficulty-badge ${q.difficulty || ''}`;

    // Set exam tag
    let tag = q.exam_name || 'PYQ';
    if (q.exam_year) tag += ` · ${q.exam_year}`;
    if (q.exam_shift) tag += ` · ${q.exam_shift}`;
    document.querySelector('#q-exam-tag span').textContent = tag;

    // Set options
    document.getElementById('opt-a-text').textContent = q.option_a;
    document.getElementById('opt-b-text').textContent = q.option_b;
    document.getElementById('opt-c-text').textContent = q.option_c;
    document.getElementById('opt-d-text').textContent = q.option_d;

    // Reset option styles
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => {
        b.className = 'option-btn';
        b.disabled = false;
    });

    // Hide explanation
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('next-btn').style.display = 'none';

    // Show/hide prev button
    document.getElementById('prev-btn').style.display = currentIndex > 0 ? 'inline-flex' : 'none';

    // If already answered, restore state
    if (answers[q.id]) {
        restoreAnsweredState(q, answers[q.id]);
    }

    // Show question card
    document.getElementById('q-container').style.display = 'block';
}

function restoreAnsweredState(q, answer) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => {
        b.disabled = true;
        const optVal = b.getAttribute('data-opt');

        if (optVal === q.correct_option) {
            b.classList.add('correct');
        } else if (optVal === answer.selected && !answer.isCorrect) {
            b.classList.add('wrong');
        }
    });

    showExplanation(q, answer.isCorrect);

    document.getElementById('next-btn').style.display = 'inline-flex';
    document.getElementById('next-btn').textContent = currentIndex < questions.length - 1 ? 'Next PYQ →' : 'See Results →';
}

function selectOption(opt) {
    const q = questions[currentIndex];
    if (!q || answers[q.id]) return; // Already answered

    const isCorrect = opt === q.correct_option;

    // Record answer
    answers[q.id] = { selected: opt, correct: q.correct_option, isCorrect };
    if (isCorrect) correctCount++;
    else wrongCount++;

    // Highlight options
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => {
        b.disabled = true;
        const optVal = b.getAttribute('data-opt');

        if (optVal === q.correct_option) {
            b.classList.add('correct');
        } else if (optVal === opt && !isCorrect) {
            b.classList.add('wrong');
        }
    });

    showExplanation(q, isCorrect);

    // Show next button
    const nextBtn = document.getElementById('next-btn');
    nextBtn.style.display = 'inline-flex';
    nextBtn.textContent = currentIndex < questions.length - 1 ? 'Next PYQ →' : 'See Results →';
}

function showExplanation(q, isCorrect) {
    const expBox = document.getElementById('explanation-box');
    const qExp = document.getElementById('q-exp');

    if (q.explanation) {
        qExp.textContent = q.explanation;
    } else {
        qExp.textContent = isCorrect
            ? '✅ Excellent! You got it right.'
            : `❌ The correct answer is Option ${q.correct_option.toUpperCase()}. Review this concept before the exam.`;
    }
    expBox.style.display = 'block';
}

function loadNextQuestion() {
    if (currentIndex >= questions.length - 1) {
        showCompletion();
        return;
    }

    currentIndex++;
    renderQuestion();
}

function loadPrevQuestion() {
    if (currentIndex <= 0) return;
    currentIndex--;
    renderQuestion();
}

function showCompletion() {
    document.getElementById('q-container').style.display = 'none';

    const total = questions.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    document.getElementById('stat-correct').textContent = correctCount;
    document.getElementById('stat-wrong').textContent = wrongCount;
    document.getElementById('stat-accuracy').textContent = `${accuracy}%`;

    // Update progress bar to 100%
    document.getElementById('progress-bar').style.width = '100%';
    document.getElementById('q-counter').textContent = 'PYQs Complete';

    document.getElementById('completion-state').style.display = 'block';
}
