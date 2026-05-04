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
        transpose: 0
    };

    const UI = {
        homeView: document.getElementById('homeView'),
        viewerView: document.getElementById('viewerView'),
        hymnList: document.getElementById('hymnList'),
        mainTitle: document.getElementById('mainTitle'),
        menuBtn: document.getElementById('menuBtn'),
        backBtn: document.getElementById('backBtn'),
        universalFavBtn: document.getElementById('universalFavBtn'),
        mainSearchInput: document.getElementById('mainSearchInput'),
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
        applyDarkMode(state.darkMode);
        UI.darkModeToggle.checked = state.darkMode;
        renderHymnList();
        updateHeaderUI();
        updatePlaceholder();
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
        UI.mainSearchInput.placeholder = state.includeLyrics ? "번호, 제목, 가사 검색" : "번호, 제목 검색";
    }

    function updateHeaderUI() {
        const isViewer = !UI.viewerView.classList.contains('hidden');
        if (isViewer && state.currentHymn) {
            UI.mainTitle.textContent = `${state.currentHymn.no}장. ${state.currentHymn.title}`;
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

    function renderHymnList() {
        const query = UI.mainSearchInput.value.trim();
        let list = query ? window.hymnDb.search(query, state.includeLyrics) : window.hymnDb.hymns;
        if (state.showFavsOnly) list = list.filter(h => state.favorites.includes(h.no));

        UI.hymnList.innerHTML = list.map(h => `
            <div class="hymn-item" data-no="${h.no}">
                <div class="title">${h.no}. ${h.title}</div>
                <div class="lyrics-preview">${h.lyrics.substring(0, 50)}...</div>
            </div>
        `).join('');
    }

    function handleSearch() {
        const query = UI.mainSearchInput.value.trim();
        if (!UI.homeView.classList.contains('hidden')) {
            renderHymnList();
        } else {
            if (!query) { UI.searchResults.classList.add('hidden'); return; }
            const list = window.hymnDb.search(query, state.includeLyrics);
            UI.searchResults.innerHTML = list.map(h => `
                <div class="result-item" data-no="${h.no}">
                    <strong>${h.no}. ${h.title}</strong>
                </div>
            `).join('');
            UI.searchResults.classList.toggle('hidden', list.length === 0);
        }
    }

    UI.mainSearchInput.addEventListener('input', handleSearch);
    UI.mainLyricsToggle.addEventListener('click', () => {
        state.includeLyrics = !state.includeLyrics;
        UI.mainLyricsToggle.classList.toggle('active', state.includeLyrics);
        updatePlaceholder();
        handleSearch();
    });

    UI.searchResults.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (item) {
            openViewer(parseInt(item.dataset.no));
            UI.mainSearchInput.value = '';
            UI.searchResults.classList.add('hidden');
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
    async function openViewer(no) {
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
            UI.imageCanvas.appendChild(stitchedImg);
            
            // 한 화면에 맞춰야 할 경우 클래스 부여
            if (hymn.pages > 1) UI.imageCanvas.classList.add('fit-screen');
            else UI.imageCanvas.classList.remove('fit-screen');

        } catch (err) {
            UI.imageCanvas.innerHTML = '<div style="padding:20px; text-align:center; color:#ff4757;">악보를 불러오지 못했습니다.</div>';
        }

        UI.homeView.classList.add('hidden');
        UI.viewerView.classList.remove('hidden');
        UI.viewerBody.scrollTop = 0;
        UI.searchResults.classList.add('hidden');
        updateHeaderUI();
    }

    async function stitchImages(urls) {
        const images = await Promise.all(urls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject();
                img.src = url;
            });
        }));

        if (images.length === 1) return images[0];

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
        UI.viewerView.classList.add('hidden');
        UI.homeView.classList.remove('hidden');
        UI.transposePanel.classList.add('hidden');
        updateHeaderUI();
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

    init();
});
