document.addEventListener('DOMContentLoaded', () => {
    const languageList = document.getElementById('language-list');
    const addLanguageForm = document.getElementById('add-language-form');
    const languageNameInput = document.getElementById('language-name');
    const programListArea = document.getElementById('program-list-area');
    const selectedLanguageTitle = document.getElementById('selected-language-title');
    const programList = document.getElementById('program-list');
    const addProgramForm = document.getElementById('add-program-form');
    const programTitleInput = document.getElementById('program-title');
    const programCodeInput = document.getElementById('program-code');
    const editModal = document.getElementById('edit-modal');
    const editProgramForm = document.getElementById('edit-program-form');
    const editProgramTitle = document.getElementById('edit-program-title');
    const editProgramCode = document.getElementById('edit-program-code');
    const editCancelBtn = document.getElementById('edit-cancel-btn');
    const editDeleteBtn = document.getElementById('edit-delete-btn');

    let currentLanguage = null;
    let editingProgram = null;

    // 言語一覧を取得して表示
    async function fetchLanguages() {
        try {
            const response = await fetch('/languages');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const languages = await response.json();
            languageList.innerHTML = '';
            languages.forEach(lang => {
                const li = document.createElement('li');
                li.textContent = lang.name;
                li.classList.add('language-box');
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    showProgramList(lang);
                });
                languageList.appendChild(li);
            });
        } catch (error) {
            languageList.innerHTML = '<li>言語の取得に失敗しました。</li>';
        }
    }

    // 言語追加フォームの送信
    addLanguageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = languageNameInput.value.trim();
        if (!name) return;
        try {
            const response = await fetch('/languages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (!response.ok) {
                if (response.status === 409) {
                    alert('その言語はすでに存在します');
                } else {
                    alert('追加に失敗しました');
                }
                return;
            }
            languageNameInput.value = '';
            await fetchLanguages();
        } catch (error) {
            alert('追加に失敗しました');
        }
    });

    // コード一覧取得
    async function fetchPrograms(language) {
        const res = await fetch(`/languages/${language.id}/programs`);
        if (!res.ok) {
            programList.innerHTML = '<li>コードの取得に失敗しました。</li>';
            return;
        }
        const programs = await res.json();
        programList.innerHTML = '';
        if (programs.length === 0) {
            programList.innerHTML = '<li>（まだコードはありません）</li>';
            return;
        }
        programs.forEach(program => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${escapeHtml(program.title)}</strong>
                <pre style="white-space:pre-wrap;background:#f8f8f8;padding:8px;border-radius:4px;cursor:pointer;">${escapeHtml(program.code)}</pre>
            `;
            // コードクリックで編集UI＋削除ボタン
            li.querySelector('pre').addEventListener('click', () => {
                editingProgram = program;
                editProgramTitle.value = program.title;
                editProgramCode.value = program.code;
                editModal.style.display = 'flex';
            });
            programList.appendChild(li);
        });
    }

    // 編集モーダルの保存
    editProgramForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!editingProgram) return;
        const newTitle = editProgramTitle.value.trim();
        const newCode = editProgramCode.value.trim();
        if (!newTitle || !newCode) return;
        await fetch(`/programs/${editingProgram.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, code: newCode })
        });
        editModal.style.display = 'none';
        fetchPrograms(currentLanguage);
    });

    // 編集モーダルのキャンセル
    editCancelBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // 編集モーダルの削除
    editDeleteBtn.addEventListener('click', async () => {
        if (!editingProgram) return;
        if (!confirm('本当に削除しますか？')) return;
        await fetch(`/programs/${editingProgram.id}`, { method: 'DELETE' });
        editModal.style.display = 'none';
        fetchPrograms(currentLanguage);
    });

    // コード追加フォーム
    if (addProgramForm) {
        addProgramForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentLanguage) return;
            const title = programTitleInput.value.trim();
            const code = programCodeInput.value.trim();
            if (!title || !code) return;
            await fetch(`/languages/${currentLanguage.id}/programs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, code, language_id: currentLanguage.id })
            });
            programTitleInput.value = '';
            programCodeInput.value = '';
            fetchPrograms(currentLanguage);
        });
    }

    // 言語の箱クリック時にコード一覧を表示
    function showProgramList(lang) {
        currentLanguage = lang;
        selectedLanguageTitle.textContent = `${lang.name} のコード一覧`;
        programListArea.style.display = 'block';
        fetchPrograms(lang);
    }

    // HTMLエスケープ
    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function (m) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[m];
        });
    }

    // 初期表示
    fetchLanguages();
});