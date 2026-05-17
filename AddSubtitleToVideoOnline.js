// Paste this in chrome console tab, to make this work

(function() {
  // 1. HIDDEN SCROLLBAR CSS STYLES
  let styleEl = document.getElementById('sub-hide-scrollbar-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'sub-hide-scrollbar-style';
    styleEl.innerHTML = `
      #transcriptBox::-webkit-scrollbar { display: none !important; }
      #transcriptBox { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    `;
    document.head.appendChild(styleEl);
  }

  // 2. CLEAN SLATE LOGIC
  const oldPanel = document.getElementById('sub-offset-panel');
  if (oldPanel) oldPanel.remove();

  const video = document.querySelector('video');
  if (!video) return console.error('No video element found on this page/frame!');
  
  const oldTracks = video.querySelectorAll('track[label="Injected Panel Subs"]');
  oldTracks.forEach(t => t.remove());

  if (window._currentFsHandler) {
    document.removeEventListener('fullscreenchange', window._currentFsHandler);
    document.removeEventListener('webkitfullscreenchange', window._currentFsHandler);
  }

  let originalCues = [];
  let currentTrack = null;
  let isUserScrolling = false;
  let scrollTimeout = null;
  let currentMode = 'native'; 
  let fullscreenContainer = video.parentElement || document.body;

  if (window.getComputedStyle(fullscreenContainer).position === 'static') {
    fullscreenContainer.style.position = 'relative';
  }

  // 3. CREATE STYLED OVERLAY WITH LIVE SEARCH ICON ACTION
  const panel = document.createElement('div');
  panel.id = 'sub-offset-panel';
  panel.style.cssText = 'position:absolute; bottom:40px; right:20px; z-index:2147483647; background:rgba(20, 20, 20, 0.75); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color:#fff; font-family:sans-serif; display:flex; flex-direction:column; gap:12px; width:340px; padding:15px; border-radius:12px; border:1px solid rgba(250,250,250,0.1); box-shadow:0 8px 32px rgba(0,0,0,0.5); transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1); overflow:hidden;';
  
  panel.innerHTML = `
    <div id="panelHeader" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:8px; font-size:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-weight:bold; color:#aaa;">Mode:</span>
        <select id="modeToggle" style="background:#222; color:#fff; border:1px solid #444; border-radius:4px; padding:3px 6px; cursor:pointer; outline:none; font-size:11px;">
          <option value="transcript">Overlay Transcript</option>
          <option value="native" selected>Native Video Track</option>
        </select>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <button id="searchToggleBtn" title="Search transcript" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:13px; padding:0; display:none; transition:color 0.2s;">🔍</button>
        <button id="syncTimeBtn" title="Sync to current time" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:14px; padding:0; display:none; transition:color 0.2s;">🎯</button>
        <button id="minimizeBtn" style="background:none; border:none; color:#aaa; cursor:pointer; font-weight:bold; font-size:16px; padding:0 4px; transition:color 0.2s;">−</button>
      </div>
    </div>

    <div id="panelContent" style="display:flex; flex-direction:column; gap:10px; flex:1; overflow:hidden;">
      <div id="controlsUi" style="display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
        <input type="file" id="subFile" accept=".vtt,.srt" style="font-size:11px; width:100%; color:#ccc; cursor:pointer;">
        
        <div id="searchBarContainer" style="display:none; transition: all 0.2s; margin-top:4px;">
          <input type="text" id="searchBar" placeholder="Type to search..." style="width:100%; background:#222; border:1px solid #444; border-radius:4px; color:#fff; padding:5px 8px; font-size:11px; outline:none; box-sizing:border-box;">
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-top:4px;">
          <label style="color:#aaa; font-weight:500;">Sync Offset: <span id="offsetVal" style="color:#fff; font-weight:bold;">0.0</span>s</label>
          <input type="range" id="subSlider" min="-10" max="10" step="0.1" value="0" style="width:160px; height:4px; cursor:pointer;" disabled>
        </div>
      </div>
      
      <div id="transcriptBox" style="display:none; flex-direction:column; flex:1; overflow-y:auto; padding:20px 5px; max-height:200px; font-size:13px; line-height:1.5; scroll-behavior:smooth; mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, white 15%, white 85%, transparent 100%);">
        <div style="color:#888; text-align:center; font-style:italic; padding-top:20px;">No video captions loaded...</div>
      </div>
    </div>
    
    <button id="maximizeBtn" style="display:none; background:transparent; border:none; color:#fff; cursor:pointer; font-size:24px; font-weight:300; line-height:40px; width:100%; height:100%; text-align:center; outline:none;">+</button>
  `;
  
  fullscreenContainer.appendChild(panel);

  const fileInput = panel.querySelector('#subFile');
  const searchBarContainer = panel.querySelector('#searchBarContainer');
  const searchBar = panel.querySelector('#searchBar');
  const slider = panel.querySelector('#subSlider');
  const offsetVal = panel.querySelector('#offsetVal');
  const minimizeBtn = panel.querySelector('#minimizeBtn');
  const maximizeBtn = panel.querySelector('#maximizeBtn');
  const syncTimeBtn = panel.querySelector('#syncTimeBtn');
  const searchToggleBtn = panel.querySelector('#searchToggleBtn');
  const modeToggle = panel.querySelector('#modeToggle');
  const header = panel.querySelector('#panelHeader');
  const content = panel.querySelector('#panelContent');
  const controlsUi = panel.querySelector('#controlsUi');
  const transcriptBox = panel.querySelector('#transcriptBox');

  function scrollToActiveElement() {
    if (searchBar.value.trim() !== '') return;
    const activeLine = transcriptBox.querySelector('[data-active="true"]');
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

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
      
      const lineText = item.cue.text.toLowerCase();
      if (lineText.includes(cleanQuery)) {
        lineEl.style.display = 'block';
      } else {
        lineEl.style.display = 'none';
      }
    });
  }

  searchBar.oninput = (e) => {
    filterTranscript(e.target.value);
  };

  minimizeBtn.onclick = () => {
    header.style.display = 'none';
    content.style.display = 'none';
    maximizeBtn.style.display = 'block';
    panel.style.background = 'rgba(20, 20, 20, 0.5)';
    panel.style.backdropFilter = 'blur(4px)';
    panel.style.webkitBackdropFilter = 'blur(4px)';
    panel.style.boxShadow = 'none';
    panel.style.border = '1px solid rgba(250,250,250,0.05)';
    panel.style.width = '40px';
    panel.style.height = '40px';
    panel.style.padding = '0';
    panel.style.borderRadius = '50%';
  };

  maximizeBtn.onclick = () => {
    maximizeBtn.style.display = 'none';
    header.style.display = 'flex';
    content.style.display = 'flex';
    panel.style.background = 'rgba(20, 20, 20, 0.75)';
    panel.style.backdropFilter = 'blur(10px)';
    panel.style.webkitBackdropFilter = 'blur(10px)';
    panel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
    panel.style.border = '1px solid rgba(250,250,250,0.1)';
    panel.style.width = '340px';
    panel.style.height = 'auto';
    panel.style.padding = '15px';
    panel.style.borderRadius = '12px';
  };

  minimizeBtn.onmouseenter = () => minimizeBtn.style.color = '#fff';
  minimizeBtn.onmouseleave = () => minimizeBtn.style.color = '#aaa';
  syncTimeBtn.onmouseenter = () => syncTimeBtn.style.color = '#fff';
  syncTimeBtn.onmouseleave = () => syncTimeBtn.style.color = '#aaa';
  searchToggleBtn.onmouseenter = () => { if(searchBarContainer.style.display === 'none') searchToggleBtn.style.color = '#fff'; };
  searchToggleBtn.onmouseleave = () => { if(searchBarContainer.style.display === 'none') searchToggleBtn.style.color = '#aaa'; };

  transcriptBox.onscroll = () => {
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => { isUserScrolling = false; }, 2500);
  };

  modeToggle.onchange = (e) => {
    currentMode = e.target.value;
    const textTrack = video.textTracks[video.textTracks.length - 1];
    if (!textTrack) return;

    if (currentMode === 'native') {
      textTrack.mode = 'showing';
      transcriptBox.style.display = 'none';
      syncTimeBtn.style.display = 'none';
      searchToggleBtn.style.display = 'none';
      searchBarContainer.style.display = 'none';
      searchToggleBtn.style.color = '#aaa';
      searchBar.value = '';
      filterTranscript('');
    } else {
      textTrack.mode = 'hidden';
      transcriptBox.style.display = 'flex';
      syncTimeBtn.style.display = 'inline-block';
      searchToggleBtn.style.display = 'inline-block';
      setTimeout(scrollToActiveElement, 50); 
    }
  };

  window._currentFsHandler = () => {
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsElement) {
      fsElement.appendChild(panel);
    } else {
      fullscreenContainer.appendChild(panel);
    }
  };
  document.addEventListener('fullscreenchange', window._currentFsHandler);
  document.addEventListener('webkitfullscreenchange', window._currentFsHandler);

  // 4. FIXED INDIVIDUAL FILE EXTRACTOR ENGINE
  fileInput.onchange = e => {
    const files = e.target.files;
    // Safely crash out if selection window was cancelled
    if (!files || files.length === 0) return;
    
    const file = files[0]; // CRITICAL FIX: Explicitly target the individual file item node
    const reader = new FileReader();
    reader.onload = function(evt) {
      let text = evt.target.result;
      if (file.name.endsWith('.srt')) {
        text = 'WEBVTT\n\n' + text.replace(/,/g, '.');
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
        textTrack.mode = currentMode === 'native' ? 'showing' : 'hidden';

        originalCues = Array.from(textTrack.cues).map((cue, index) => ({
          cue: cue,
          id: index,
          startTime: cue.startTime,
          endTime: cue.endTime
        }));

        transcriptBox.innerHTML = '';
        transcriptBox.style.display = currentMode === 'native' ? 'none' : 'flex';
        syncTimeBtn.style.display = currentMode === 'native' ? 'none' : 'inline-block';
        searchToggleBtn.style.display = currentMode === 'native' ? 'none' : 'inline-block';
        searchBarContainer.style.display = 'none';
        searchToggleBtn.style.color = '#aaa';
        searchBar.value = ''; 
        
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

  video.ontimeupdate = () => {
    if (!originalCues.length) return;
    const currentTime = video.currentTime;
    
    originalCues.forEach(item => {
      const lineEl = document.getElementById(`cue-line-${item.id}`);
      if (!lineEl) return;

      if (currentTime >= item.cue.startTime && currentTime <= item.cue.endTime) {
        if (!lineEl.dataset.active) {
          lineEl.dataset.active = 'true';
          
          if (currentMode === 'transcript') {
            lineEl.style.opacity = '1';
            lineEl.style.transform = 'scale(1.08)';
            lineEl.style.fontWeight = 'bold';
            lineEl.style.color = '#38bdf8'; 
            
            if (!isUserScrolling) {
              scrollToActiveElement();
            }
          }
        }
      } else {
        if (lineEl.dataset.active) {
          lineEl.removeAttribute('data-active');
          if (currentMode === 'transcript') {
            lineEl.style.opacity = '0.4';
            lineEl.style.transform = 'scale(0.9)';
            lineEl.style.fontWeight = 'normal';
            lineEl.style.color = '#fff';
          }
        }
      }
    });
  };
})();

