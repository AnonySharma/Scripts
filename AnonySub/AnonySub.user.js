// ==UserScript==
// @name         AnonySub - Advanced Video Subtitle Overlay
// @namespace    https://github.com/AnonySharma
// @version      1.2
// @description  Adds an advanced, highly customizable subtitle overlay and transcript panel to HTML5 video players with true fullscreen support.
// @author       AnonySharma
// @homepage     https://github.com/AnonySharma
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // Polling function to catch dynamically loaded videos on streaming sites
  const videoCheckInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (video && !document.getElementById('sub-offset-panel')) {
      clearInterval(videoCheckInterval);
      bootAnonySub(video);
    }
  }, 1000);

  function bootAnonySub(video) {
    console.log('%c[AnonySub] Initializing Ultimate Chrome Container Engine...', 'color: #38bdf8; font-weight: bold; font-size: 14px;');

    // 1. SCORCHED-EARTH GHOST PANEL WIPE
    document.querySelectorAll('#sub-offset-panel').forEach(p => p.remove());
    document.querySelectorAll('#anonysub-core-styles, #anonysub-shield-styles').forEach(s => s.remove());

    if (window._anonySharedTimers) {
      window._anonySharedTimers.forEach(id => clearInterval(id));
      console.log('%c[Clean] Cleared background thread cycles.', 'color: #ef4444;');
    }
    window._anonySharedTimers = [];

    // 2. DYNAMIC CONTROLLER WRAPPER INJECTION
    let wrapper = document.getElementById('anonysub-wrapper');
    if (!wrapper) {
      console.log('[AnonySub] Creating dedicated structural parent wrapper...');
      wrapper = document.createElement('div');
      wrapper.id = 'anonysub-wrapper';
      wrapper.style.cssText = 'position: relative; display: block; background: #000; width: 100%; height: 100%;';
      
      video.parentNode.insertBefore(wrapper, video);
      wrapper.appendChild(video);
    }

    // Detach old listener maps
    if (window._currentFsHandler) {
      document.removeEventListener('fullscreenchange', window._currentFsHandler);
      document.removeEventListener('webkitfullscreenchange', window._currentFsHandler);
    }
    if (window._mySubTimeUpdate) {
      video.removeEventListener('timeupdate', window._mySubTimeUpdate);
    }

    // 3. MEDIA CONTROL CSS OVERRIDES
    const styleEl = document.createElement('style');
    styleEl.id = 'anonysub-shield-styles';
    document.head.appendChild(styleEl);
    
    function updateNativeSubtitleVisibility(shouldHideNatively) {
      styleEl.innerHTML = `
        #transcriptBox::-webkit-scrollbar { display: none !important; }
        #transcriptBox { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        
        video::-webkit-media-controls-fullscreen-button,
        video::-internal-media-controls-fullscreen-button { 
          display: none !important; 
        }
        
        #anonysub-wrapper:fullscreen { width: 100vw !important; height: 100vh !important; background: #000 !important; }
        #anonysub-wrapper:fullscreen video { width: 100% !important; height: 100% !important; max-height: 100vh !important; object-fit: contain !important; }
        
        ${shouldHideNatively ? 'video::cue, ::cue { opacity: 0 !important; background: transparent !important; color: transparent !important; }' : ''}
      `;
    }
    updateNativeSubtitleVisibility(false);

    let originalCues = [];
    let currentTrack = null;
    let isUserScrolling = false;
    let scrollTimeout = null;
    let currentMode = 'native'; 

    // 4. INTERFACE DOM GENERATION
    const panel = document.createElement('div');
    panel.id = 'sub-offset-panel';
    panel.style.cssText = 'position:fixed; top:20px; right:20px; z-index:2147483647 !important; background:rgba(20, 20, 20, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color:#fff; font-family:sans-serif; display:flex; flex-direction:column; gap:12px; width:340px; padding:15px; border-radius:12px; border:1px solid rgba(250,250,250,0.15); box-shadow:0 12px 40px rgba(0,0,0,0.6); transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1); overflow:hidden; pointer-events: auto !important;';
    
    panel.innerHTML = `
      <div id="panelHeader" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:8px; font-size:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:bold; color:#aaa;">AnonySub:</span>
          <select id="modeToggle" style="background:#222; color:#fff; border:1px solid #444; border-radius:4px; padding:3px 6px; cursor:pointer; outline:none; font-size:11px;">
            <option value="transcript">Overlay Transcript</option>
            <option value="native" selected>Native Video Track</option>
          </select>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <button id="searchToggleBtn" title="Search" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:13px; padding:0; display:none; transition:color 0.2s;">🔍</button>
          <button id="syncTimeBtn" title="Sync Time" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:14px; padding:0; display:none; transition:color 0.2s;">🎯</button>
          <button id="fsToggleBtn" title="Toggle Fullscreen (True Overlay)" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:13px; padding:0; transition:color 0.2s;">📺</button>
          <button id="minimizeBtn" title="Minimize" style="background:none; border:none; color:#aaa; cursor:pointer; font-weight:bold; font-size:16px; padding:0 4px; transition:color 0.2s;">−</button>
        </div>
      </div>

      <div id="panelContent" style="display:flex; flex-direction:column; gap:10px; flex:1; overflow:hidden;">
        <div id="controlsUi" style="display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
          <input type="file" id="subFile" accept=".vtt,.srt" style="font-size:11px; width:100%; color:#ccc; cursor:pointer;">
          <div id="searchBarContainer" style="display:none; transition: all 0.2s; margin-top:4px;">
            <input type="text" id="searchBar" placeholder="Type to search..." style="width:100%; background:#222; border:1px solid #444; border-radius:4px; color:#fff; padding:5px 8px; font-size:11px; outline:none; box-sizing:border-box;">
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-top:4px;">
            <label style="color:#aaa; font-weight:500;">Offset: <span id="offsetVal" style="color:#fff; font-weight:bold;">0.0</span>s</label>
            <input type="range" id="subSlider" min="-10" max="10" step="0.1" value="0" style="width:160px; height:4px; cursor:pointer;" disabled>
          </div>
        </div>
        <div id="transcriptBox" style="display:none; flex-direction:column; flex:1; overflow-y:auto; padding:20px 5px; max-height:200px; font-size:13px; line-height:1.5; scroll-behavior:smooth; mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%);">
          <div style="color:#888; text-align:center; font-style:italic; padding-top:20px;">No captions loaded...</div>
        </div>
      </div>
      
      <button id="maximizeBtn" title="Open Menu" style="display:none; background:transparent; border:none; color:#fff; cursor:pointer; font-size:24px; font-weight:300; width:100%; height:100%; text-align:center; display:flex; align-items:center; justify-content:center; outline:none; padding:0; line-height:1;">+</button>
    `;
    
    const maximizeBtn = panel.querySelector('#maximizeBtn');
    maximizeBtn.style.display = 'none';

    wrapper.appendChild(panel);

    const fileInput = panel.querySelector('#subFile');
    const searchBarContainer = panel.querySelector('#searchBarContainer');
    const searchBar = panel.querySelector('#searchBar');
    const slider = panel.querySelector('#subSlider');
    const offsetVal = panel.querySelector('#offsetVal');
    const minimizeBtn = panel.querySelector('#minimizeBtn');
    const syncTimeBtn = panel.querySelector('#syncTimeBtn');
    const fsToggleBtn = panel.querySelector('#fsToggleBtn');
    const searchToggleBtn = panel.querySelector('#searchToggleBtn');
    const modeToggle = panel.querySelector('#modeToggle');
    const header = panel.querySelector('#panelHeader');
    const content = panel.querySelector('#panelContent');
    const transcriptBox = panel.querySelector('#transcriptBox');

    function scrollToActiveElement() {
      if (searchBar.value.trim() !== '') return;
      const activeLine = transcriptBox.querySelector('[data-active="true"]');
      if (activeLine) activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const toggleSecureFullscreen = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        if (wrapper.requestFullscreen) wrapper.requestFullscreen();
        else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    };

    fsToggleBtn.onclick = toggleSecureFullscreen;
    video.ondblclick = (e) => {
      e.preventDefault();
      toggleSecureFullscreen();
    };

    searchToggleBtn.onclick = () => {
      if (searchBarContainer.style.display === 'none') {
        searchBarContainer.style.display = 'block';
        searchToggleBtn.style.color = '#38bdf8'; 
        searchBar.focus();
      } else {
        searchBarContainer.style.display = 'none';
        searchToggleBtn.style.color = '#aaa';
        searchBar.value = ''; 
        filterTranscript('');
        scrollToActiveElement();
      }
    };

    syncTimeBtn.onclick = () => {
      isUserScrolling = false; 
      searchBar.value = ''; 
      searchBarContainer.style.display = 'none';
      searchToggleBtn.style.color = '#aaa';
      filterTranscript('');
      scrollToActiveElement();
    };

    function filterTranscript(query) {
      const cleanQuery = query.toLowerCase().trim();
      originalCues.forEach(item => {
        const lineEl = document.getElementById(`cue-line-${item.id}`);
        if (!lineEl) return;
        lineEl.style.display = item.cue.text.toLowerCase().includes(cleanQuery) ? 'block' : 'none';
      });
    }

    searchBar.oninput = (e) => filterTranscript(e.target.value);

    minimizeBtn.onclick = () => {
      header.style.display = 'none'; content.style.display = 'none'; maximizeBtn.style.display = 'flex';
      panel.style.background = 'rgba(25, 25, 25, 0.85)'; panel.style.backdropFilter = 'blur(8px)'; panel.style.webkitBackdropFilter = 'blur(8px)';
      panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)'; panel.style.border = '1px solid rgba(255,255,255,0.2)';
      panel.style.width = '38px'; panel.style.height = '38px'; panel.style.padding = '0'; panel.style.borderRadius = '19px';
    };

    maximizeBtn.onclick = () => {
      maximizeBtn.style.display = 'none'; header.style.display = 'flex'; content.style.display = 'flex';
      panel.style.background = 'rgba(20, 20, 20, 0.75)'; panel.style.backdropFilter = 'blur(10px)'; panel.style.webkitBackdropFilter = 'blur(10px)';
      panel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)'; panel.style.border = '1px solid rgba(250,250,250,0.1)';
      panel.style.width = '340px'; panel.style.height = 'auto'; panel.style.padding = '15px'; panel.style.borderRadius = '12px';
    };

    panel.onmouseenter = () => { if (maximizeBtn.style.display === 'flex') { panel.style.background = 'rgba(40, 40, 40, 0.95)'; panel.style.borderColor = 'rgba(56, 189, 248, 0.6)'; } };
    panel.onmouseleave = () => { if (maximizeBtn.style.display === 'flex') { panel.style.background = 'rgba(25, 25, 25, 0.85)'; panel.style.borderColor = 'rgba(255,255,255,0.2)'; } };
    minimizeBtn.onmouseenter = () => minimizeBtn.style.color = '#fff'; minimizeBtn.onmouseleave = () => minimizeBtn.style.color = '#aaa';
    syncTimeBtn.onmouseenter = () => syncTimeBtn.style.color = '#fff'; syncTimeBtn.onmouseleave = () => syncTimeBtn.style.color = '#aaa';
    fsToggleBtn.onmouseenter = () => fsToggleBtn.style.color = '#fff'; fsToggleBtn.onmouseleave = () => fsToggleBtn.style.color = '#aaa';

    transcriptBox.onscroll = () => {
      isUserScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => { isUserScrolling = false; }, 2500);
    };

    modeToggle.onchange = (e) => {
      currentMode = e.target.value;
      const textTrack = video.textTracks[video.textTracks.length - 1];
      if (!textTrack) return;
      textTrack.mode = 'showing';

      if (currentMode === 'native') {
        updateNativeSubtitleVisibility(false); transcriptBox.style.display = 'none';
        syncTimeBtn.style.display = 'none'; searchToggleBtn.style.display = 'none';
        searchBarContainer.style.display = 'none'; searchBar.value = ''; filterTranscript('');
      } else {
        updateNativeSubtitleVisibility(true); transcriptBox.style.display = 'flex';
        syncTimeBtn.style.display = 'inline-block'; searchToggleBtn.style.display = 'inline-block';
        setTimeout(scrollToActiveElement, 50); 
      }
    };

    // 6. LAYOUT RENDERING PERSISTENCE LOOP
    const enforceShieldLayout = () => {
      const activeFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (activeFs && activeFs === wrapper) {
        if (wrapper.lastElementChild !== panel) {
          wrapper.appendChild(panel); 
        }
      }
      panel.style.setProperty('position', 'fixed', 'important');
      panel.style.setProperty('top', '20px', 'important');
      panel.style.setProperty('right', '20px', 'important');
      panel.style.setProperty('z-index', '2147483647', 'important');
    };

    window._currentFsHandler = () => setTimeout(enforceShieldLayout, 50);
    document.addEventListener('fullscreenchange', window._currentFsHandler);
    document.addEventListener('webkitfullscreenchange', window._currentFsHandler);

    const loopId = setInterval(enforceShieldLayout, 250);
    window._anonySharedTimers.push(loopId);

    // 7. FILE PROCESSING PIPELINE
    fileInput.onchange = e => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      const reader = new FileReader();
      reader.onload = function(evt) {
        let text = evt.target.result;
        if (file.name.endsWith('.srt')) {
          text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        }

        if (currentTrack) currentTrack.remove();

        const blob = new Blob([text], { type: 'text/vtt' });
        const trackUrl = URL.createObjectURL(blob);

        currentTrack = document.createElement('track');
        currentTrack.kind = 'subtitles';
        currentTrack.label = 'Injected Panel Subs';
        currentTrack.srclang = 'en';
        currentTrack.src = trackUrl;
        currentTrack.default = true;

        video.appendChild(currentTrack);

        currentTrack.addEventListener('load', () => {
          const textTrack = video.textTracks[video.textTracks.length - 1];
          textTrack.mode = 'showing';
          updateNativeSubtitleVisibility(currentMode === 'transcript');

          transcriptBox.innerHTML = '';
          transcriptBox.style.display = currentMode === 'native' ? 'none' : 'flex';
          syncTimeBtn.style.display = currentMode === 'native' ? 'none' : 'inline-block';
          searchToggleBtn.style.display = currentMode === 'native' ? 'none' : 'inline-block';
          searchBarContainer.style.display = 'none';
          searchBar.value = ''; 
          
          originalCues = Array.from(textTrack.cues).map((cue, index) => {
            cue.id = index.toString();
            return { cue: cue, id: index.toString(), startTime: cue.startTime, endTime: cue.endTime };
          });

          originalCues.forEach(item => {
            const line = document.createElement('div');
            line.id = `cue-line-${item.id}`;
            line.style.cssText = 'padding:6px 8px; border-radius:6px; cursor:pointer; text-align:right; transition: all 0.25s; color:#fff; opacity:0.4; transform: scale(0.9); transform-origin: right center; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);';
            line.innerText = item.cue.text.replace(/<[^>]*>/g, '');
            
            line.onclick = () => { video.currentTime = item.cue.startTime; };
            line.onmouseenter = () => { if(!line.dataset.active) line.style.opacity = '0.8'; };
            line.onmouseleave = () => { if(!line.dataset.active) line.style.opacity = '0.4'; };

            transcriptBox.appendChild(line);
          });

          slider.disabled = false;
          slider.value = 0;
          offsetVal.textContent = "0.0";
        });
      };
      reader.readAsText(file);
    };

    slider.oninput = e => {
      const offset = parseFloat(e.target.value);
      offsetVal.textContent = offset >= 0 ? `+${offset.toFixed(1)}` : offset.toFixed(1);
      originalCues.forEach(item => {
        item.cue.startTime = Math.max(0, item.startTime + offset);
        item.cue.endTime = Math.max(0, item.endTime + offset);
      });
    };

    // 8. O(1) PERFORMANCE ACTIVE TIMING CALCULATOR
    window._mySubTimeUpdate = () => {
      if (!originalCues.length) return;
      const textTrack = video.textTracks[video.textTracks.length - 1];
      if (!textTrack || !textTrack.activeCues) return;

      const activeIds = new Set(Array.from(textTrack.activeCues).map(c => c.id));
      const currentlyActiveEls = transcriptBox.querySelectorAll('[data-active="true"]');
      
      currentlyActiveEls.forEach(el => {
        const cueId = el.id.replace('cue-line-', '');
        if (!activeIds.has(cueId)) {
          el.removeAttribute('data-active');
          if (currentMode === 'transcript') {
            el.style.cssText += 'opacity:0.4; transform: scale(0.9); font-weight:normal; color:#fff;';
          }
        }
      });

      activeIds.forEach(cueId => {
        const el = document.getElementById(`cue-line-${cueId}`);
        if (el && !el.dataset.active) {
          el.dataset.active = 'true';
          if (currentMode === 'transcript') {
            el.style.cssText += 'opacity:1; transform: scale(1.08); font-weight:bold; color:#38bdf8;'; 
            if (!isUserScrolling) scrollToActiveElement();
          }
        }
      });
    };
    
    video.addEventListener('timeupdate', window._mySubTimeUpdate);
    console.log('%c[AnonySub] Secure Sandbox Running. Use the panel "📺" button or Double-Click the video to trigger Fullscreen.', 'color: #22c55e; font-weight: bold;');
  }
})();
