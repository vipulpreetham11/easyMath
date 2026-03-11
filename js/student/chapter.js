document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        window.location.href = 'app.html';
        return;
    }

    loadChapter(id);
});

async function loadChapter(id) {
    const titleEl = document.getElementById('chapter-title');
    const descEl = document.getElementById('chapter-desc');
    const crumbEl = document.getElementById('breadcrumb');
    const backBtn = document.getElementById('back-btn');

    // 1 Query - Get Chapter, Unit, Subject, and Meta seamlessly
    // Using Supabase Joins for single network request
    const { data: chapter, error: cErr } = await window.supabaseClient
        .from('chapters')
        .select(`
            *,
            units(id, name, subjects(id, name)),
            chapter_meta(*)
        `)
        .eq('id', id)
        .single();

    if (cErr || !chapter) {
        titleEl.textContent = 'Chapter not found';
        crumbEl.textContent = 'Error';
        setTimeout(() => window.location.href = 'app.html', 2000);
        return;
    }

    const subject = chapter.units.subjects;
    const unit = chapter.units;
    // Fetch accurate live counts to prevent UI lockouts from out-of-sync meta table
    const [notesRes, pracRes, pyqRes, testRes] = await Promise.all([
        window.supabaseClient.from('notes').select('*', { count: 'exact', head: true }).eq('chapter_id', id).eq('is_active', true),
        window.supabaseClient.from('questions').select('*', { count: 'exact', head: true }).eq('chapter_id', id).eq('source', 'practice').eq('is_active', true),
        window.supabaseClient.from('questions').select('*', { count: 'exact', head: true }).eq('chapter_id', id).eq('source', 'pyq').eq('is_active', true),
        window.supabaseClient.from('chapter_tests').select('*', { count: 'exact', head: true }).eq('chapter_id', id).eq('is_active', true)
    ]);

    const meta = {
        notes_count: notesRes.count || 0,
        practice_count: pracRes.count || 0,
        pyq_count: pyqRes.count || 0,
        has_test: (testRes.count || 0) > 0
    };

    titleEl.textContent = chapter.name;
    descEl.textContent = chapter.description || '';

    crumbEl.innerHTML = `
        <a href="app.html" style="color: var(--primary-color); text-decoration: none;">Subjects</a> &gt; 
        <a href="subject.html?id=${subject.id}" style="color: var(--primary-color); text-decoration: none;">${subject.name}</a> &gt; 
        <a href="unit.html?id=${unit.id}" style="color: var(--primary-color); text-decoration: none;">${unit.name}</a> &gt; 
        ${chapter.name}
    `;
    backBtn.href = `unit.html?id=${unit.id}`;

    // Configure Action Cards based on Meta (Zero additional queries!)
    const cardNotes = document.getElementById('card-notes');
    const cardPractice = document.getElementById('card-practice');
    const cardPyq = document.getElementById('card-pyq');
    const cardTest = document.getElementById('card-test');

    document.getElementById('count-notes').textContent = `${meta.notes_count} Items`;
    document.getElementById('count-practice').textContent = `${meta.practice_count} Questions`;
    document.getElementById('count-pyq').textContent = `${meta.pyq_count} Questions`;

    if (meta.notes_count > 0) {
        cardNotes.classList.remove('disabled');
        cardNotes.href = `notes.html?chapter_id=${chapter.id}`;
    }
    if (meta.practice_count > 0) {
        cardPractice.classList.remove('disabled');
        cardPractice.href = `practice.html?chapter_id=${chapter.id}`;
    }
    if (meta.pyq_count > 0) {
        cardPyq.classList.remove('disabled');
        cardPyq.href = `pyq.html?chapter_id=${chapter.id}`;
    }
    if (meta.has_test) {
        cardTest.classList.remove('disabled');
        cardTest.href = `test.html?chapter_id=${chapter.id}`;
        document.getElementById('count-test').textContent = 'Ready to start';
    }

    // Future Phase 4: Read Score from progress table
    fetchProgress(id);
}

async function fetchProgress(chapterId) {
    if (!currentUser) return;

    const { data } = await window.supabaseClient
        .from('progress')
        .select('best_score')
        .eq('user_id', currentUser.id)
        .eq('chapter_id', chapterId)
        .single();

    if (data && data.best_score > 0) {
        document.getElementById('best-score').textContent = `${data.best_score}%`;
    }
}


