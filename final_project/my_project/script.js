document.addEventListener('DOMContentLoaded', async () => {
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
    const favoriteList = document.getElementById('favorite-list');
    const tagBarList = document.getElementById('tag-bar-list');
    const tagPrevBtn = document.getElementById('tag-prev-btn');
    const tagNextBtn = document.getElementById('tag-next-btn');

    let currentLanguage = null;
    let editingProgram = null;
    let currentTagFilter = null;

    // タグバー用ページング
    let tagBarPage = 0;
    const TAGS_PER_PAGE = 10;
    let tagBarTags = [];

    // タグバー表示更新
    function updateTagBar() {
        tagBarList.innerHTML = '';
        if (!currentLanguage) {
            tagBarList.innerHTML = '<li style="color:#888;">（言語を選択してください）</li>';
            tagPrevBtn.style.display = 'none';
            tagNextBtn.style.display = 'none';
            return;
        }
        if (tagBarTags.length === 0) {
            tagBarList.innerHTML = '<li style="color:#888;">（タグはありません）</li>';
            tagPrevBtn.style.display = 'none';
            tagNextBtn.style.display = 'none';
            return;
        }
        const start = tagBarPage * TAGS_PER_PAGE;
        const end = start + TAGS_PER_PAGE;
        const pageTags = tagBarTags.slice(start, end);

        pageTags.forEach(tag => {
            const li = document.createElement('li');
            li.textContent = tag;
            li.className = 'program-tag';
            li.style.cursor = 'pointer';
            if (currentTagFilter === tag) {
                li.style.background = '#b3d7ff';
                li.style.color = '#0056b3';
            }
            li.addEventListener('click', () => {
                currentTagFilter = tag;
                fetchPrograms(currentLanguage);
                showTagFilterInfo();
                updateTagBar();
            });
            tagBarList.appendChild(li);
        });

        // ページ送りボタン表示制御
        tagPrevBtn.style.display = tagBarPage > 0 ? '' : 'none';
        tagNextBtn.style.display = end < tagBarTags.length ? '' : 'none';
    }

    tagPrevBtn.onclick = () => {
        if (tagBarPage > 0) {
            tagBarPage--;
            updateTagBar();
        }
    };
    tagNextBtn.onclick = () => {
        if ((tagBarPage + 1) * TAGS_PER_PAGE < tagBarTags.length) {
            tagBarPage++;
            updateTagBar();
        }
    };

    // タグ一覧を取得して表示（言語ごと、タグバー用）
    async function fetchAndShowTags() {
        tagList.innerHTML = '';
        if (!currentLanguage) {
            tagList.innerHTML = '<li>（言語を選択してください）</li>';
            tagBarTags = [];
            tagBarPage = 0;
            updateTagBar();
            return;
        }
        let allTags = new Set();
        const progRes = await fetch(`/languages/${currentLanguage.id}/programs`);
        if (!progRes.ok) {
            tagList.innerHTML = '<li>（タグの取得に失敗）</li>';
            tagBarTags = [];
            tagBarPage = 0;
            updateTagBar();
            return;
        }
        const programs = await progRes.json();
        console.log("取得したプログラム", programs); // ←追加
        programs.forEach(p => {
            console.log("p.tagsの型", typeof p.tags, p.tags); // ←追加
            (p.tags || []).forEach(tag => allTags.add(tag));
        });
        if (allTags.size === 0) {
            tagList.innerHTML = '<li>（タグはありません）</li>';
            tagBarTags = [];
            tagBarPage = 0;
            updateTagBar();
            return;
        }
        tagBarTags = Array.from(allTags).sort();
        tagBarPage = 0;
        updateTagBar();

        // サイドバー用タグリストも更新（必要なら）
        Array.from(allTags).sort().forEach(tag => {
            const li = document.createElement('li');
            li.textContent = tag;
            li.className = 'program-tag';
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                currentTagFilter = tag;
                fetchPrograms(currentLanguage);
                showTagFilterInfo();
                updateTagBar();
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
            updateTagBar();
        };
        tagList.appendChild(clearLi);
    }

    // 言語一覧を取得して表示
    async function fetchLanguages() {
        try {
            const response = await fetch('/languages');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const languages = await response.json(); // ← これが必須
            languageList.innerHTML = '';
            languages.forEach(lang => {
                const li = document.createElement('li');
                li.textContent = lang.name;
                li.classList.add('language-box');
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    showProgramList(lang);
                });

                // 削除ボタン追加（基本は非表示、liにホバーしたときだけ表示）
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;'; // ×マーク
                deleteBtn.title = '削除';
                deleteBtn.style.marginLeft = '12px';
                deleteBtn.style.background = 'transparent';
                deleteBtn.style.color = '#b30000';
                deleteBtn.style.border = 'none';
                deleteBtn.style.borderRadius = '50%';
                deleteBtn.style.padding = '2px 10px';
                deleteBtn.style.fontSize = '1.3em';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.verticalAlign = 'middle';
                deleteBtn.style.display = 'none'; // ← 基本は非表示

                li.addEventListener('mouseenter', () => {
                    deleteBtn.style.display = '';
                });
                li.addEventListener('mouseleave', () => {
                    deleteBtn.style.display = 'none';
                });

                deleteBtn.onmouseenter = () => {
                    deleteBtn.style.background = '#f8d7da';
                };
                deleteBtn.onmouseleave = () => {
                    deleteBtn.style.background = 'transparent';
                };
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`「${lang.name}」を削除しますか？（この言語の全プログラムも削除されます）`)) {
                        const res = await fetch(`/languages/${lang.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            await fetchLanguages();
                            programListArea.style.display = 'none';
                        } else {
                            alert('削除に失敗しました');
                        }
                    }
                });
                li.appendChild(deleteBtn);

                languageList.appendChild(li);
            });
            if (languages.length > 0 && !currentLanguage) {
                await showProgramList(languages[0]);
            }
        } catch (error) {
            console.error("fetchLanguages error:", error);
            languageList.innerHTML = '<li>言語の取得に失敗しました。</li>';
        }
        // await fetchAndShowTags(); // ←この行は不要
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
            // ★ボタン追加
            const starBtn = document.createElement('span');
            starBtn.textContent = isFavorite(program.id) ? '★' : '☆';
            starBtn.style.cursor = 'pointer';
            starBtn.style.color = '#ffb300';
            starBtn.style.fontSize = '1.3em';
            starBtn.style.position = 'absolute';
            starBtn.style.top = '12px';
            starBtn.style.right = '18px';
            starBtn.title = isFavorite(program.id) ? 'お気に入り解除' : 'お気に入り追加';
            starBtn.onclick = (e) => {
                e.stopPropagation();
                toggleFavorite(program);
                starBtn.textContent = isFavorite(program.id) ? '★' : '☆';
                starBtn.title = isFavorite(program.id) ? 'お気に入り解除' : 'お気に入り追加';
            };
            li.appendChild(starBtn);

            // タイトル
            const strong = document.createElement('strong');
            strong.textContent = program.title;
            li.appendChild(strong);

            // コード
            const pre = document.createElement('pre');
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.background = '#f8f8f8';
            pre.style.padding = '8px';
            pre.style.borderRadius = '4px';
            pre.style.cursor = 'pointer';
            pre.innerHTML = escapeHtml(program.code);
            pre.addEventListener('click', () => {
                editingProgram = program;
                editProgramTitle.value = program.title;
                editProgramCode.value = program.code;
                editProgramTags.value = (program.tags || []).join(', ');
                editModal.style.display = 'flex';
            });
            li.appendChild(pre);

            // タグ
            if (program.tags && program.tags.length > 0) {
                const tagsSpan = document.createElement('span');
                tagsSpan.className = 'program-tags';
                tagsSpan.style.color = '#888';
                tagsSpan.style.fontSize = '0.9em';
                tagsSpan.style.marginLeft = '8px';
                program.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'program-tag';
                    tagEl.textContent = tag;
                    tagEl.style.cursor = 'pointer';
                    tagEl.style.color = '#007bff';
                    tagEl.style.textDecoration = 'underline';
                    tagEl.style.marginRight = '4px';
                    tagEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        currentTagFilter = tag;
                        fetchPrograms(currentLanguage);
                        showTagFilterInfo();
                    });
                    tagsSpan.appendChild(tagEl);
                });
                li.appendChild(tagsSpan);
            }

            // コメントエリア追加
            const commentDiv = createCommentArea(program.id);
            li.appendChild(commentDiv);

            programList.appendChild(li);
        });
        showTagFilterInfo();
        updateTagBar();
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
    async function showProgramList(lang) {
        currentLanguage = lang;
        selectedLanguageTitle.textContent = `${lang.name} のコード一覧`;
        programListArea.style.display = 'block';
        currentTagFilter = null; // ← 言語切り替え時にタグフィルタ解除
        await fetchPrograms(lang);
        await fetchAndShowTags();
        showTagFilterInfo();
        updateTagBar();
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

    // お気に入りIDリストをローカルストレージで管理
    function getFavorites() {
        return JSON.parse(localStorage.getItem('favorites') || '[]');
    }
    function setFavorites(favs) {
        localStorage.setItem('favorites', JSON.stringify(favs));
    }
    function isFavorite(programId) {
        return getFavorites().includes(programId);
    }
    function toggleFavorite(program) {
        let favs = getFavorites();
        if (favs.includes(program.id)) {
            favs = favs.filter(id => id !== program.id);
        } else {
            favs.push(program.id);
        }
        setFavorites(favs);
        updateFavoriteSidebar();
    }

    // お気に入りサイドバーの更新
    async function updateFavoriteSidebar() {
        const favIds = getFavorites();
        favoriteList.innerHTML = '';
        if (favIds.length === 0) {
            favoriteList.innerHTML = '<li>（お気に入りなし）</li>';
            return;
        }
        // プログラム情報を取得
        for (const id of favIds) {
            // プログラム情報取得APIがないので全言語から検索
            let found = false;
            const langRes = await fetch('/languages');
            if (!langRes.ok) continue;
            const languages = await langRes.json();
            for (const lang of languages) {
                const progRes = await fetch(`/languages/${lang.id}/programs`);
                if (!progRes.ok) continue;
                const programs = await progRes.json();
                const prog = programs.find(p => p.id === id);
                if (prog) {
                    const li = document.createElement('li');
                    li.innerHTML = `<span style="color:#ffb300;">★</span> <span style="cursor:pointer; color:#0056b3; text-decoration:underline;">${escapeHtml(prog.title)}</span>`;
                    li.onclick = () => {
                        currentLanguage = lang;
                        selectedLanguageTitle.textContent = `${lang.name} のコード一覧`;
                        programListArea.style.display = 'block';
                        fetchPrograms(lang).then(() => {
                            // スクロールして該当プログラムを目立たせる
                            setTimeout(() => {
                                const items = programList.querySelectorAll('li');
                                for (const item of items) {
                                    if (item.querySelector('strong') && item.querySelector('strong').textContent === prog.title) {
                                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        item.style.boxShadow = '0 0 0 3px #ffb300';
                                        setTimeout(() => item.style.boxShadow = '', 1200);
                                    }
                                }
                            }, 300);
                        });
                    };
                    favoriteList.appendChild(li);
                    found = true;
                    break;
                }
            }
            if (!found) {
                // 削除された場合
                setFavorites(favIds.filter(fid => fid !== id));
            }
        }
    }

    // 初期表示
    await fetchLanguages();         // ← awaitを付けて呼び出す
    updateFavoriteSidebar();
});