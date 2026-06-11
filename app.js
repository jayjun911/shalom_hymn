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
        oldToNewMap: {},
        newToOldMap: {},
        chordsEnabled: true,
        baseKey: 'C',
        tempo: null,
        displayMode: 'fit-width',
        isPlayingMetro: false,
        temposDb: {},
        metroVisualEnabled: localStorage.getItem('metroVisual') !== 'false'
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
        metroBtn: document.getElementById('metroBtn'),
        metroVisualToggle: document.getElementById('metroVisualToggle')
    };

    const closeMenu = () => {
        UI.settingsSidebar.classList.remove('show');
        UI.sidebarOverlay.classList.add('hidden');
    };

    function init() {
        try {
            applyDarkMode(state.darkMode);
            if (UI.darkModeToggle) UI.darkModeToggle.checked = state.darkMode;
            if (UI.metroVisualToggle) UI.metroVisualToggle.checked = state.metroVisualEnabled;
            
            // 초기 렌더링
            renderHymnList();
            updateHeaderUI();
            updatePlaceholder();
            
            // 인덱스 로딩 (백그라운드)
            loadHymnIndex();
            // 템포 로딩 (백그라운드)
            loadTempos();
        } catch (err) {
            console.error('Init error:', err);
        }
    }

    async function loadTempos() {
        try {
            const res = await fetch('tempos.json');
            if (res.ok) {
                state.temposDb = await res.json();
                console.log('Tempos loaded:', Object.keys(state.temposDb).length);
            }
        } catch (err) {
            console.warn('Failed to load tempos.json:', err);
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

        // 메트로놈 정지 및 초기화
        stopMetronome();

        state.currentHymn = hymn;
        UI.imageCanvas.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">악보를 준비 중입니다...</div>';
        
        const baseNo = String(hymn.no).padStart(3, '0');
        const imageUrls = [];
        if (hymn.pages > 1) {
            for (let i = 1; i <= hymn.pages; i++) imageUrls.push(`images/${baseNo}-${i}.gif`);
        } else {
            imageUrls.push(`images/${baseNo}.gif`);
        }

        // Lazy-load chord data from chords/NNN.json (cached)
        if (!state.chordCache) state.chordCache = {};
        if (state.chordCache[no] === undefined) {
            try {
                const res = await fetch(`chords/${baseNo}.json`);
                state.chordCache[no] = res.ok ? await res.json() : null;
            } catch {
                state.chordCache[no] = null;
            }
        }
        const chordData = state.chordCache[no]; // null if no chord file
        
        let finalTempo = null;
        if (chordData && chordData.tempo) {
            finalTempo = chordData.tempo;
        } else if (state.temposDb && state.temposDb[baseNo]) {
            finalTempo = state.temposDb[baseNo];
        }
        
        state.tempo = finalTempo || null; // 스캔된 템포가 없으면 null 지정
        
        // 메트로놈 버튼 상태 및 템포 표시 업데이트
        const metroBpmText = document.getElementById('metroBpmText');
        if (UI.metroBtn) {
            if (state.tempo) {
                UI.metroBtn.disabled = false;
                if (metroBpmText) {
                    metroBpmText.textContent = `: ${state.tempo}`;
                }
            } else {
                UI.metroBtn.disabled = true;
                if (metroBpmText) {
                    metroBpmText.textContent = `: -`;
                }
            }
        }
        
        if (chordData) {
            state.baseKey = chordData.key || 'C';
        } else {
            state.baseKey = 'C';
        }

        try {
            const stitchedImg = await stitchImages(imageUrls);
            UI.imageCanvas.innerHTML = '';
            
            const wrapper = document.createElement('div');
            wrapper.className = 'score-wrapper';
            wrapper.style.position = 'relative';
            wrapper.appendChild(stitchedImg);

            // Overlay chords from lazy-loaded chordData
            if (state.chordsEnabled && chordData && chordData.chords) {
                const pageHeights = await Promise.all(imageUrls.map(url => new Promise(resolve => {
                    const tmpImg = new Image();
                    tmpImg.onload = () => resolve(tmpImg.naturalHeight);
                    tmpImg.onerror = () => resolve(0);
                    tmpImg.src = url;
                })));

                const totalH = pageHeights.reduce((a, b) => a + b, 0);
                const pageOffsets = [0];
                for (let i = 1; i < pageHeights.length; i++) {
                    pageOffsets.push(pageOffsets[i-1] + (pageHeights[i-1] / totalH) * 100);
                }

                chordData.chords.forEach(c => {
                    const chordEl = document.createElement('div');
                    chordEl.className = 'chord-item';

                    const pageIdx = (c.p || 1) - 1;
                    const pageHratio = totalH > 0 ? (pageHeights[pageIdx] / totalH) : 1;
                    const absY = (pageOffsets[pageIdx] || 0) + c.y * pageHratio;

                    chordEl.style.left = c.x + '%';
                    chordEl.style.top = absY + '%';
                    chordEl.textContent = c.t;
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
        UI.viewerView.classList.toggle('fit-entire', state.displayMode === 'fit-entire');
        UI.imageCanvas.scrollTop = 0;
        UI.mainSearchInput.value = '';
        UI.searchResults.classList.add('hidden');
        updateHeaderUI();
    }

    function closeViewer() {
        stopMetronome(); // 뷰어를 닫을 때 메트로놈 중지
        UI.viewerView.classList.add('hidden');
        UI.homeView.classList.remove('hidden');
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
        closeViewer(); // 무조건 목록창으로 점프
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

    // Double-tap to toggle display mode (Fit Width / Fit Entire Score)
    let lastTap = 0;
    UI.imageCanvas.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            state.displayMode = state.displayMode === 'fit-width' ? 'fit-entire' : 'fit-width';
            UI.viewerView.classList.toggle('fit-entire', state.displayMode === 'fit-entire');
        }
        lastTap = currentTime;
    });



    // 메트로놈 오디오 및 제어 로직
    let audioCtx = null;
    let metroIntervalId = null;
    let nextTickTime = 0.0;
    const clickLength = 0.04; // seconds (crisp click)

    function startMetronome() {
        if (state.isPlayingMetro) return;
        if (!state.tempo) return; // 템포 값이 없으면 실행하지 않음
        
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        state.isPlayingMetro = true;
        if (UI.metroBtn) UI.metroBtn.classList.add('active');
        nextTickTime = audioCtx.currentTime;
        
        scheduler();
    }

    function stopMetronome() {
        state.isPlayingMetro = false;
        if (UI.metroBtn) {
            UI.metroBtn.classList.remove('active');
            UI.metroBtn.classList.remove('flash');
        }
        if (metroIntervalId) {
            clearTimeout(metroIntervalId);
            metroIntervalId = null;
        }
    }

    function scheduler() {
        if (!state.isPlayingMetro) return;
        while (nextTickTime < audioCtx.currentTime + 0.1) {
            scheduleClick(nextTickTime);
            const secondsPerBeat = 60.0 / state.tempo;
            nextTickTime += secondsPerBeat;
        }
        metroIntervalId = setTimeout(scheduler, 25);
    }

    function scheduleClick(time) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.frequency.value = 1000; // 1000Hz 맑은 하이 톤
        
        gainNode.gain.setValueAtTime(1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + clickLength);
        
        osc.start(time);
        osc.stop(time + clickLength);

        // 녹색 LED 깜빡임 및 테두리 반짝임 동기화 (오디오 재생 시점 예측 지연 계산)
        const delayMs = (time - audioCtx.currentTime) * 1000;
        setTimeout(() => {
            if (!state.isPlayingMetro) return;
            
            // LED 깜빡임
            if (UI.metroBtn) {
                UI.metroBtn.classList.add('flash');
                setTimeout(() => {
                    if (state.isPlayingMetro && UI.metroBtn) {
                        UI.metroBtn.classList.remove('flash');
                    }
                }, 40);
            }
            
            // 화면 테두리 반짝임 (비주얼 큐 활성화 시)
            if (state.metroVisualEnabled) {
                const appContainer = document.getElementById('app');
                if (appContainer) {
                    appContainer.classList.add('metro-beat-flash');
                    setTimeout(() => {
                        if (appContainer) {
                            appContainer.classList.remove('metro-beat-flash');
                        }
                    }, 40);
                }
            }
        }, Math.max(0, delayMs));
    }

    // 메트로놈 토글 버튼 리스너
    if (UI.metroBtn) {
        UI.metroBtn.addEventListener('click', () => {
            if (state.isPlayingMetro) {
                stopMetronome();
            } else {
                startMetronome();
            }
        });
    }

    // 메트로놈 비주얼 큐 설정 변경 리스너
    if (UI.metroVisualToggle) {
        UI.metroVisualToggle.addEventListener('change', (e) => {
            state.metroVisualEnabled = e.target.checked;
            localStorage.setItem('metroVisual', state.metroVisualEnabled);
        });
    }

    // 100단위 빠른 스크롤 버튼 리스너
    const fastScrollIndex = document.querySelector('.fast-scroll-index');
    if (fastScrollIndex) {
        fastScrollIndex.addEventListener('click', (e) => {
            const item = e.target.closest('.index-item');
            if (!item) return;
            
            const targetNo = parseInt(item.dataset.target);
            const items = UI.hymnList.querySelectorAll('.hymn-item');
            
            let foundElement = null;
            for (let hymnItem of items) {
                const no = parseInt(hymnItem.dataset.no);
                if (no >= targetNo) {
                    foundElement = hymnItem;
                    break;
                }
            }
            
            const listContainer = document.querySelector('.list-container');
            if (foundElement && listContainer) {
                listContainer.scrollTo({
                    top: foundElement.offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    }

    init();
});
