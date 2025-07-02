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
    const programTagsInput = document.getElementById('program-tags');
    const editModal = document.getElementById('edit-modal');
    const editProgramForm = document.getElementById('edit-program-form');
    const editProgramTitle = document.getElementById('edit-program-title');
    const editProgramCode = document.getElementById('edit-program-code');
    const editProgramTags = document.getElementById('edit-program-tags');
    const editCancelBtn = document.getElementById('edit-cancel-btn');
    const editDeleteBtn = document.getElementById('edit-delete-btn');
    const tagList = document.getElementById('tag-list');

    let currentLanguage = null;
    let editingProgram = null;
    let currentTagFilter = null;

    // タグ一覧を取得して表示
    async function fetchAndShowTags() {
        // 全言語の全プログラムからタグを集計
        let allTags = new Set();
        const langRes = await fetch('/languages');
        if (!langRes.ok) return;
        const languages = await langRes.json();
        for (const lang of languages) {
            const progRes = await fetch(`/languages/${lang.id}/programs`);
            if (!progRes.ok) continue;
            const programs = await progRes.json();
            programs.forEach(p => {
                (p.tags || []).forEach(tag => allTags.add(tag));
            });
        }
        tagList.innerHTML = '';
        if (allTags.size === 0) {
            tagList.innerHTML = '<li>（タグはありません）</li>';
            return;
        }
        Array.from(allTags).sort().forEach(tag => {
            const li = document.createElement('li');
            li.textContent = tag;
            li.className = 'program-tag';
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                currentTagFilter = tag;
                fetchPrograms(currentLanguage);
                showTagFilterInfo();
            });
            tagList.appendChild(li);
        });
        // フィルタ解除ボタン
        const clearLi = document.createElement('li');
        clearLi.innerHTML = '<button id="clear-tag-filter">タグ絞り込み解除</button>';
        clearLi.querySelector('button').onclick = () => {
            currentTagFilter = null;
            fetchPrograms(currentLanguage);
            showTagFilterInfo();
        };
        tagList.appendChild(clearLi);
    }

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
        await fetchAndShowTags();
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

    // コメントUI生成
    function createCommentArea(programId) {
        const commentArea = document.createElement('div');
        commentArea.className = 'comment-area';
        commentArea.innerHTML = `
            <h3><span class="comment-toggle" style="cursor:pointer; color:#007bff; text-decoration:underline;">コメント</span></h3>
            <div class="comment-detail-area" style="display:none;">
                <ul class="comment-list"></ul>
                <span class="add-comment-toggle" style="cursor:pointer; color:#007bff; text-decoration:underline; font-size:0.9em;">追加</span>
                <form class="add-comment-form" style="margin-top:10px; display:none;">
                    <input type="text" class="comment-text" placeholder="コメントを入力" required style="width:70%;">
                    <button type="submit">送信</button>
                </form>
            </div>
        `;
        // コメント詳細エリアの表示/非表示切り替え
        const toggle = commentArea.querySelector('.comment-toggle');
        const detailArea = commentArea.querySelector('.comment-detail-area');
        toggle.addEventListener('click', () => {
            if (detailArea.style.display === 'none') {
                detailArea.style.display = '';
                fetchComments(programId, commentArea);
            } else {
                detailArea.style.display = 'none';
            }
        });

        // 「追加」クリックでフォーム表示
        const addCommentToggle = commentArea.querySelector('.add-comment-toggle');
        const addCommentForm = commentArea.querySelector('.add-comment-form');
        addCommentToggle.addEventListener('click', () => {
            addCommentToggle.style.display = 'none';
            addCommentForm.style.display = '';
            addCommentForm.querySelector('.comment-text').focus();
        });

        // コメント追加
        setupCommentForm(programId, commentArea);
        return commentArea;
    }

    // コメント取得・表示
    async function fetchComments(programId, commentArea) {
        const commentList = commentArea.querySelector('.comment-list');
        if (!commentList) return;
        commentList.innerHTML = '';
        const res = await fetch(`/programs/${programId}/comments`);
        if (!res.ok) {
            commentList.innerHTML = '<li>コメントの取得に失敗しました。</li>';
            return;
        }
        let comments = await res.json();
        if (comments.length === 0) {
            commentList.innerHTML = '<li>（コメントはありません）</li>';
            return;
        }
        comments.forEach(comment => {
            const li = document.createElement('li');
            // 表示用
            const textSpan = document.createElement('span');
            textSpan.className = 'comment-text';
            textSpan.textContent = comment.text;

            // 編集ボタン
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-comment-btn';
            editBtn.textContent = '編集';
            editBtn.style.marginLeft = '10px';

            // 削除ボタン
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-comment-btn';
            deleteBtn.textContent = '削除';
            deleteBtn.style.marginLeft = '5px';

            // 編集フォーム（非表示）
            const editForm = document.createElement('form');
            editForm.style.display = 'inline';
            editForm.style.marginLeft = '10px';
            editForm.style.display = 'none';

            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.value = comment.text;
            editInput.style.width = '60%';

            const saveBtn = document.createElement('button');
            saveBtn.type = 'submit';
            saveBtn.textContent = '保存';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.textContent = 'キャンセル';
            cancelBtn.style.marginLeft = '5px';

            editForm.appendChild(editInput);
            editForm.appendChild(saveBtn);
            editForm.appendChild(cancelBtn);

            // 編集ボタン押下で編集フォーム表示
            editBtn.addEventListener('click', () => {
                textSpan.style.display = 'none';
                editBtn.style.display = 'none';
                deleteBtn.style.display = 'none';
                editForm.style.display = 'inline';
                editInput.value = comment.text;
                editInput.focus();
            });

            // キャンセル
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                editForm.style.display = 'none';
                textSpan.style.display = '';
                editBtn.style.display = '';
                deleteBtn.style.display = '';
            });

            // 保存
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newText = editInput.value.trim();
                if (!newText) return;
                await fetch(`/comments/${comment.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ program_id: comment.program_id, text: newText })
                });
                fetchComments(programId, commentArea);
            });

            // 削除
            deleteBtn.addEventListener('click', () => {
                if (confirm('このコメントを削除しますか？')) {
                    fetch(`/comments/${comment.id}`, { method: 'DELETE' })
                        .then(() => fetchComments(programId, commentArea));
                }
            });

            li.appendChild(textSpan);
            li.appendChild(editBtn);
            li.appendChild(deleteBtn);
            li.appendChild(editForm);
            commentList.appendChild(li);
        });
    }

    // コメント追加フォーム
    function setupCommentForm(programId, commentArea) {
        const addCommentForm = commentArea.querySelector('.add-comment-form');
        const commentTextInput = commentArea.querySelector('.comment-text');
        if (!addCommentForm) return;
        addCommentForm.onsubmit = async (e) => {
            e.preventDefault();
            const text = commentTextInput.value.trim();
            if (!text) return;
            await fetch(`/programs/${programId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ program_id: programId, text })
            });
            commentTextInput.value = '';
            addCommentForm.style.display = 'none';
            const addCommentToggle = commentArea.querySelector('.add-comment-toggle');
            if (addCommentToggle) addCommentToggle.style.display = '';
            fetchComments(programId, commentArea);
        };
    }

    // コード一覧取得（タグ付き・アルファベット順）
    async function fetchPrograms(language) {
        const res = await fetch(`/languages/${language.id}/programs`);
        if (!res.ok) {
            programList.innerHTML = '<li>コードの取得に失敗しました。</li>';
            return;
        }
        let programs = await res.json();
        // タグでアルファベット順ソート
        programs.sort((a, b) => {
            const tagA = (a.tags && a.tags.length > 0) ? a.tags[0].toLowerCase() : '';
            const tagB = (b.tags && b.tags.length > 0) ? b.tags[0].toLowerCase() : '';
            if (tagA < tagB) return -1;
            if (tagA > tagB) return 1;
            return 0;
        });

        // タグフィルタが有効な場合は絞り込み
        if (currentTagFilter) {
            programs = programs.filter(p => (p.tags || []).includes(currentTagFilter));
        }

        programList.innerHTML = '';
        if (programs.length === 0) {
            programList.innerHTML = '<li>（まだコードはありません）</li>';
            return;
        }
        programs.forEach(program => {
            const li = document.createElement('li');
            // タグをクリック可能なspanで表示
            let tagsHtml = '';
            if (program.tags && program.tags.length > 0) {
                tagsHtml = program.tags.map(tag =>
                    `<span class="program-tag" style="cursor:pointer; color:#007bff; text-decoration:underline; margin-right:4px;">${escapeHtml(tag)}</span>`
                ).join('');
            }
            li.innerHTML = `
                <strong>${escapeHtml(program.title)}</strong>
                <pre style="white-space:pre-wrap;background:#f8f8f8;padding:8px;border-radius:4px;cursor:pointer;">${escapeHtml(program.code)}</pre>
                <span class="program-tags" style="color:#888;font-size:0.9em;margin-left:8px;">${tagsHtml}</span>
            `;
            // コードクリックで編集UI＋削除ボタン
            li.querySelector('pre').addEventListener('click', () => {
                editingProgram = program;
                editProgramTitle.value = program.title;
                editProgramCode.value = program.code;
                editProgramTags.value = (program.tags || []).join(', ');
                editModal.style.display = 'flex';
            });
            // タグクリックでフィルタ
            li.querySelectorAll('.program-tag').forEach(tagEl => {
                tagEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentTagFilter = tagEl.textContent;
                    fetchPrograms(currentLanguage);
                    showTagFilterInfo();
                });
            });
            // コメントエリア追加
            const commentDiv = createCommentArea(program.id);
            li.appendChild(commentDiv);
            programList.appendChild(li);
        });
        showTagFilterInfo();
    }

    // タグフィルタ情報と解除ボタン表示
    function showTagFilterInfo() {
        let filterInfo = document.getElementById('tag-filter-info');
        if (!filterInfo) {
            filterInfo = document.createElement('div');
            filterInfo.id = 'tag-filter-info';
            filterInfo.style.margin = '10px 0';
            programList.parentNode.insertBefore(filterInfo, programList);
        }
        if (currentTagFilter) {
            filterInfo.innerHTML = `タグ「<strong>${escapeHtml(currentTagFilter)}</strong>」で絞り込み中 <button id="clear-tag-filter-inline">解除</button>`;
            // ここでイベントを必ずバインド
            document.getElementById('clear-tag-filter-inline').onclick = () => {
                currentTagFilter = null;
                fetchPrograms(currentLanguage);
            };
        } else {
            filterInfo.innerHTML = '';
        }
    }

    // 編集モーダルの保存
    editProgramForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!editingProgram) return;
        const newTitle = editProgramTitle.value.trim();
        const newCode = editProgramCode.value.trim();
        const newTags = editProgramTags.value.split(',').map(t => t.trim()).filter(t => t);
        if (!newTitle || !newCode) return;
        await fetch(`/programs/${editingProgram.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, code: newCode, tags: newTags })
        });
        editModal.style.display = 'none';
        fetchPrograms(currentLanguage);
        await fetchAndShowTags(); // ←追加
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
            const tags = programTagsInput.value.split(',').map(t => t.trim()).filter(t => t);
            if (!title || !code) return;
            await fetch(`/languages/${currentLanguage.id}/programs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, code, language_id: currentLanguage.id, tags })
            });
            programTitleInput.value = '';
            programCodeInput.value = '';
            programTagsInput.value = '';
            fetchPrograms(currentLanguage);
            await fetchAndShowTags(); // ←追加
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