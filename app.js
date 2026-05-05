/**
 * app.js - v2.0 Canvas Stitching 기술 적용 (다중 악보 완벽 통합)
 */

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        currentHymn: null,
        favorites: JSON.parse(localStorage.getItem('hymn_favs') || '[]'),
        darkMode: localStorage.getItem('darkMode') !== 'false',
        showFavsOnly: false,
        includeLyrics: false,
        isNewHymnMode: false,
        transpose: 0,
        oldToNewMap: {},
        newToOldMap: {},
        chordsEnabled: true
    };

    const CHORD_MAP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

    function transposeChord(chord, semitones) {
        if (!chord || semitones === 0) return chord;
        const match = chord.match(/^([A-G][#b]?)(.*)$/);
        if (!match) return chord;

        let root = match[1];
        const suffix = match[2];

        // Normalize root for lookup
        if (root === 'Db') root = 'C#';
        if (root === 'D#') root = 'Eb';
        if (root === 'Gb') root = 'F#';
        if (root === 'G#') root = 'Ab';
        if (root === 'A#') root = 'Bb';

        let index = CHORD_MAP.indexOf(root);
        if (index === -1) return chord;

        index = (index + semitones + 12) % 12;
        return CHORD_MAP[index] + suffix;
    }

    const UI = {
        homeView: document.getElementById('homeView'),
        viewerView: document.getElementById('viewerView'),
        hymnList: document.getElementById('hymnList'),
        mainTitle: document.getElementById('mainTitle'),
        menuBtn: document.getElementById('menuBtn'),
        backBtn: document.getElementById('backBtn'),
        universalFavBtn: document.getElementById('universalFavBtn'),
        mainSearchInput: document.getElementById('mainSearchInput'),
        searchRow: document.querySelector('.search-row'),
        newHymnToggle: document.getElementById('newHymnToggle'),
        mainLyricsToggle: document.getElementById('mainLyricsToggle'),
        searchResults: document.getElementById('searchResults'),
        settingsSidebar: document.getElementById('settingsSidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        closeSettings: document.getElementById('closeSettings'),
        
        imageCanvas: document.getElementById('imageCanvas'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        viewerBody: document.getElementById('viewerBody'),
        transposeToggle: document.getElementById('transposeToggle'),
        transposePanel: document.getElementById('transposeControl'),
        transposeValue: document.getElementById('transposeValue'),
        closeTranspose: document.getElementById('closeTranspose')
    };

    const closeMenu = () => {
        UI.settingsSidebar.classList.remove('show');
        UI.sidebarOverlay.classList.add('hidden');
    };

    function init() {
        try {
            applyDarkMode(state.darkMode);
            if (UI.darkModeToggle) UI.darkModeToggle.checked = state.darkMode;
            
            // 초기 렌더링
            renderHymnList();
            updateHeaderUI();
            updatePlaceholder();
            
            // 인덱스 로딩 (백그라운드)
            loadHymnIndex();
        } catch (err) {
            console.error('Init error:', err);
        }
    }

    async function loadHymnIndex() {
        try {
            const res = await fetch('old_new_index/index.csv');
            if (!res.ok) return;
            const text = await res.text();
            if (!text) return;

            const lines = text.split(/\r?\n/);
            lines.forEach((line) => {
                if (!line.includes(',')) return;
                const parts = line.split(',');
                
                const newNo = (parts[0] || "").replace(/[^\d]/g, '').trim();
                const oldNo = (parts[1] || "").replace(/[^\d]/g, '').trim();
                
                if (newNo && oldNo) {
                    state.newToOldMap[newNo] = oldNo;
                    state.oldToNewMap[oldNo] = newNo;
                }
            });
            console.log('Index loaded:', Object.keys(state.newToOldMap).length);
        } catch (err) {
            console.warn('Index load failed:', err);
        }
    }

    function applyDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('darkMode', isDark);
        state.darkMode = isDark;
    }
    UI.darkModeToggle.addEventListener('change', (e) => {
        applyDarkMode(e.target.checked);
        // 모드 변경 후 약간의 여유를 두고 설정창을 닫습니다.
        setTimeout(closeMenu, 300);
    });

    function updatePlaceholder() {
        if (state.isNewHymnMode) {
            UI.mainSearchInput.placeholder = "신찬송가 번호 검색";
        } else {
            UI.mainSearchInput.placeholder = state.includeLyrics ? "번호, 제목, 가사 검색" : "번호, 제목 검색";
        }
    }

    function updateHeaderUI() {
        const isViewer = !UI.viewerView.classList.contains('hidden');
        if (isViewer && state.currentHymn) {
            const oldNo = state.currentHymn.no;
            const newNo = state.oldToNewMap[oldNo];
            
            let displayTitle;
            if (state.isNewHymnMode && newNo) {
                displayTitle = `신${newNo}장 ${state.currentHymn.title}`;
            } else {
                displayTitle = `${oldNo}장 ${state.currentHymn.title}`;
            }
            
            UI.mainTitle.textContent = displayTitle;
            UI.menuBtn.classList.add('hidden');
            UI.backBtn.classList.remove('hidden');
            UI.universalFavBtn.classList.toggle('active', state.favorites.includes(state.currentHymn.no));
        } else {
            UI.mainTitle.textContent = '샬롬찬송가';
            UI.menuBtn.classList.remove('hidden');
            UI.backBtn.classList.add('hidden');
            UI.universalFavBtn.classList.toggle('active', state.showFavsOnly);
        }
    }

    function handleSearch() {
        const query = UI.mainSearchInput ? UI.mainSearchInput.value.trim() : "";
        let filteredList = [];

        if (state.isNewHymnMode) {
            if (query === "") {
                filteredList = window.hymnDb.hymns;
            } else if (/^\d+$/.test(query)) {
                const oldNo = state.newToOldMap[query];
                filteredList = oldNo ? window.hymnDb.hymns.filter(h => h.no === parseInt(oldNo)) : [];
            } else {
                filteredList = [];
            }
        } else {
            filteredList = query ? window.hymnDb.search(query, state.includeLyrics) : window.hymnDb.hymns;
        }

        if (UI.homeView && !UI.homeView.classList.contains('hidden')) {
            renderHymnListWithData(filteredList);
        } else if (UI.searchResults) {
            if (!query) { UI.searchResults.classList.add('hidden'); return; }
            
            if (filteredList.length === 0) {
                const msg = state.isNewHymnMode ? "구 찬송가에는 없는 곡입니다" : "검색 결과가 없습니다";
                UI.searchResults.innerHTML = `<div class="no-results-msg" style="padding: 15px; font-size: 14px;">${msg}</div>`;
                UI.searchResults.classList.remove('hidden');
            } else {
                UI.searchResults.innerHTML = filteredList.map(h => `
                    <div class="result-item" data-no="${h.no}">
                        <strong>${h.no}. ${h.title}</strong>
                    </div>
                `).join('');
                UI.searchResults.classList.remove('hidden');
            }
        }
    }

    function renderHymnList() {
        handleSearch();
    }

    function renderHymnListWithData(list) {
        if (!list || !UI.hymnList) return;
        if (state.showFavsOnly) list = list.filter(h => state.favorites.includes(h.no));

        const query = UI.mainSearchInput ? UI.mainSearchInput.value.trim() : "";
        if (list.length === 0 && query !== '') {
            const msg = state.isNewHymnMode ? "구 찬송가에는 없는 곡입니다" : "검색 결과가 없습니다";
            UI.hymnList.innerHTML = `<div class="no-results-msg">${msg}</div>`;
            return;
        }

        UI.hymnList.innerHTML = list.map(h => `
            <div class="hymn-item" data-no="${h.no}">
                <div class="title">${h.no}. ${h.title}</div>
                <div class="lyrics-preview">${(h.lyrics || "").substring(0, 50)}...</div>
            </div>
        `).join('');
    }


    UI.mainSearchInput.addEventListener('input', handleSearch);
    UI.mainLyricsToggle.addEventListener('click', () => {
        state.includeLyrics = !state.includeLyrics;
        UI.mainLyricsToggle.classList.toggle('active', state.includeLyrics);
        updatePlaceholder();
        handleSearch();
    });

    UI.newHymnToggle.addEventListener('click', () => {
        state.isNewHymnMode = !state.isNewHymnMode;
        UI.newHymnToggle.classList.toggle('active', state.isNewHymnMode);
        UI.mainLyricsToggle.classList.toggle('hidden', state.isNewHymnMode); // 가사 토글 숨김
        updatePlaceholder();
        handleSearch();
    });

    UI.searchResults.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (item) {
            openViewer(parseInt(item.dataset.no));
        }
    });

    UI.universalFavBtn.addEventListener('click', () => {
        if (!UI.viewerView.classList.contains('hidden') && state.currentHymn) {
            const no = state.currentHymn.no;
            const idx = state.favorites.indexOf(no);
            if (idx > -1) state.favorites.splice(idx, 1);
            else state.favorites.push(no);
            localStorage.setItem('hymn_favs', JSON.stringify(state.favorites));
        } else {
            state.showFavsOnly = !state.showFavsOnly;
            renderHymnList();
        }
        updateHeaderUI();
    });

    // --- [핵심] 이미지 Stitching 로직 ---
    async function openViewer(no, isPopState = false) {
        const hymn = window.hymnDb.hymns.find(h => h.no === no);
        if (!hymn) return;
        state.currentHymn = hymn;
        UI.imageCanvas.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">악보를 준비 중입니다...</div>';
        
        const baseNo = String(hymn.no).padStart(3, '0');
        const imageUrls = [];
        if (hymn.pages > 1) {
            for (let i = 1; i <= hymn.pages; i++) imageUrls.push(`images/${baseNo}-${i}.gif`);
        } else {
            imageUrls.push(`images/${baseNo}.gif`);
        }

        try {
            const stitchedImg = await stitchImages(imageUrls);
            UI.imageCanvas.innerHTML = '';
            
            const wrapper = document.createElement('div');
            wrapper.className = 'score-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block'; // Fit to image size
            wrapper.appendChild(stitchedImg);

            // Overlay chords
            if (state.chordsEnabled && hymn.chords) {
                hymn.chords.forEach(c => {
                    const chordEl = document.createElement('div');
                    chordEl.className = 'chord-item';
                    
                    // If it's a stitched image, we need to calculate Y based on pages
                    // For now, let's assume y is percentage of the whole stitched height
                    // or relative to the page. 
                    // Let's simplify: y is percentage of total height if p=1, 
                    // but if pages > 1, we need to offset it.
                    // However, for v1, let's just use y as % of total.
                    chordEl.style.left = c.x + '%';
                    chordEl.style.top = c.y + '%';
                    chordEl.textContent = transposeChord(c.t, state.transpose);
                    wrapper.appendChild(chordEl);
                });
            }

            UI.imageCanvas.appendChild(wrapper);
        } catch (err) {
            UI.imageCanvas.innerHTML = '<div style="padding:20px; text-align:center; color:#ff4757;">악보를 불러오지 못했습니다.</div>';
        }

        // 히스토리 관리: 직접 열었을 때만 pushState (뒤로가기로 열린 게 아닐 때)
        if (!isPopState && UI.viewerView.classList.contains('hidden')) {
            history.pushState({ view: 'viewer', no: no }, '');
        } else if (!isPopState) {
            // 이미 뷰어 상태에서 다음/이전 이동 시에는 상태만 교체
            history.replaceState({ view: 'viewer', no: no }, '');
        }

        UI.homeView.classList.add('hidden');
        UI.viewerView.classList.remove('hidden');
        UI.imageCanvas.scrollTop = 0;
        UI.mainSearchInput.value = '';
        UI.searchResults.classList.add('hidden');
        updateHeaderUI();
    }

    function closeViewer() {
        UI.viewerView.classList.add('hidden');
        UI.homeView.classList.remove('hidden');
        UI.transposePanel.classList.add('hidden');
        state.currentHymn = null;
        renderHymnList(); // 목록 초기화 (검색어 비워진 상태 반영)
        updateHeaderUI();
    }

    // 뒤로가기(popstate) 이벤트 리스너
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.view === 'viewer') {
            openViewer(e.state.no, true);
        } else {
            closeViewer();
        }
    });

    async function stitchImages(urls) {
        const images = await Promise.all(urls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject();
                img.src = url;
            });
        }));

        if (images.length === 1) {
            images[0].className = "stitched-score";
            return images[0];
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const totalHeight = images.reduce((sum, img) => sum + img.height, 0);
        const maxWidth = Math.max(...images.map(img => img.width));

        canvas.width = maxWidth;
        canvas.height = totalHeight;

        let currentY = 0;
        images.forEach(img => {
            ctx.drawImage(img, (maxWidth - img.width) / 2, currentY);
            currentY += img.height;
        });

        const finalImg = new Image();
        finalImg.src = canvas.toDataURL('image/png');
        finalImg.className = "stitched-score";
        return finalImg;
    }

    UI.hymnList.addEventListener('click', (e) => {
        const item = e.target.closest('.hymn-item');
        if (item) openViewer(parseInt(item.dataset.no));
    });

    UI.backBtn.addEventListener('click', () => {
        history.back(); // 시스템 뒤로가기와 동일하게 동작 유도
    });

    function navigate(dir) {
        const list = window.hymnDb.hymns;
        const currentIdx = list.findIndex(h => h.no === state.currentHymn?.no);
        const nextIdx = currentIdx + dir;
        if (nextIdx >= 0 && nextIdx < list.length) {
            openViewer(list[nextIdx].no);
        }
    }

    UI.prevBtn.addEventListener('click', () => navigate(-1));
    UI.nextBtn.addEventListener('click', () => navigate(1));

    UI.menuBtn.addEventListener('click', () => {
        UI.settingsSidebar.classList.add('show');
        UI.sidebarOverlay.classList.remove('hidden');
    });
    UI.closeSettings.addEventListener('click', closeMenu);
    UI.sidebarOverlay.addEventListener('click', closeMenu);

    UI.transposeToggle.addEventListener('click', () => UI.transposePanel.classList.toggle('hidden'));
    UI.closeTranspose.addEventListener('click', () => UI.transposePanel.classList.add('hidden'));

    // Transpose Buttons
    document.querySelectorAll('.t-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = parseInt(btn.dataset.dir);
            state.transpose += dir;
            if (state.transpose > 6) state.transpose -= 12;
            if (state.transpose < -6) state.transpose += 12;
            
            if (UI.transposeValue) {
                UI.transposeValue.textContent = (state.transpose > 0 ? '+' : '') + state.transpose;
            }
            if (state.currentHymn) openViewer(state.currentHymn.no, true);
        });
    });

    init();
});
