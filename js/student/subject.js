    document.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) {
            window.location.href = 'app.html';
            return;
        }

        setTimeout(() => loadSubject(id), 500);
    });

    async function loadSubject(id) {
        const titleEl = document.getElementById('subject-title');
        const crumbEl = document.getElementById('subject-crumb');
        const container = document.getElementById('units-container');

        const { data: subject, error: sErr } = await window.supabaseClient
            .from('subjects')
            .select('name, icon')
            .eq('id', id)
            .single();

        if (sErr || !subject) {
            titleEl.textContent = 'Subject not found';
            crumbEl.textContent = 'Error';
            container.innerHTML = '<p style="color:var(--error-color)">Redirecting...</p>';
            setTimeout(() => window.location.href = 'app.html', 2000);
            return;
        }

        titleEl.textContent = `${subject.icon || ''} ${subject.name}`;
        crumbEl.textContent = subject.name;

        // Load Units
        const { data: units, error: uErr } = await window.supabaseClient
            .from('units')
            .select('*')
            .eq('subject_id', id)
            .eq('is_active', true)
            .order('order_index');

        if (uErr || !units || units.length === 0) {
            container.innerHTML = '<div class="glass-panel" style="text-align:center; padding: 40px; color: var(--text-secondary);">No units available for this subject yet.</div>';
            return;
        }

        container.innerHTML = units.map(u => `
            <a href="unit.html?id=${u.id}" style="text-decoration: none; display: block; filter: brightness(1); transition: filter 0.2s;">
                <div class="glass-panel" style="padding: 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="font-size: 1.4rem; color: var(--text-primary); margin-bottom: 8px;">${u.name}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Click to view chapters</p>
                    </div>
                    <div style="color: var(--primary-color);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </div>
            </a>
        `).join('');
    }
