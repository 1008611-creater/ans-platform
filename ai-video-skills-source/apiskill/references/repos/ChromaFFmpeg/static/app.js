function chromaApp() {
  return {
    apiKey: localStorage.getItem('chroma_api_key') || '',
    activeTab: 'merge',

    processingTabs: [
      { id: 'merge',        label: 'Merge Audio+Video', icon: '⊕' },
      { id: 'animate',      label: 'Animate',           icon: '✦' },
      { id: 'combine',      label: 'Combine',           icon: '⊞' },
      { id: 'imagetovideo', label: 'Image to Video',    icon: '▶' },
      { id: 'loop',         label: 'Loop',              icon: '↺' },
      { id: 'transitions',  label: 'Transitions',       icon: '⇉' },
      { id: 'metadata',     label: 'Metadata',          icon: 'ℹ' },
    ],

    manageTabs: [
      { id: 'upload',  label: 'Upload',  icon: '⬆' },
      { id: 'folders', label: 'Folders', icon: '⊡' },
      { id: 'storage', label: 'Storage', icon: '🗄' },
    ],

    merge:        { videoUrl: '', audioUrl: '', strategy: 'trim_or_slow', folder: '', loading: false, error: null, errorDetail: null, result: null, warning: null },
    animate:      { mediaUrl: '', mediaType: 'image', animation: 'zoom_in', duration: 6, fps: 25, resolution: '1920x1080', folder: '', loading: false, error: null, errorDetail: null, result: null },
    combine:      { type: 'video', urls: ['', ''], reencode: false, folder: '', loading: false, error: null, errorDetail: null, result: null },
    imageToVideo: { imageUrl: '', duration: 8, animation: 'none', fps: 25, resolution: '1920x1080', folder: '', loading: false, error: null, errorDetail: null, result: null },
    loop:         { videoUrl: '', loopCount: 3, folder: '', loading: false, error: null, errorDetail: null, result: null },
    transitions:  { urls: ['', ''], transition: 'fade', transitionDuration: 1.0, folder: '', loading: false, error: null, errorDetail: null, result: null },
    metadata:     { url: '', loading: false, error: null, errorDetail: null, result: null },

    upload: {
      file: null,
      filename: '',
      folder: '',
      dragging: false,
      loading: false,
      progress: 0,
      error: null,
      result: null,
    },

    folders: {
      list: [],
      loading: false,
      error: null,
      newName: '',
      creating: false,
      openFolder: null,      // name of expanded folder
      folderFiles: [],
      folderLoading: false,
      confirmDelete: null,   // folder name pending deletion
      previewKey: null,
    },

    storage: {
      files: [],
      totalBytes: 0,
      loading: false,
      error: null,
      confirmPurge: false,
      purging: false,
      previewKey: null,
    },

    init() {
      this.$watch('apiKey', val => localStorage.setItem('chroma_api_key', val));
    },

    async _post(endpoint, body) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        let detail = null;
        try {
          const err = await res.json();
          msg = err?.detail?.error || err?.detail || err?.error || msg;
          detail = err?.detail?.detail || null;
        } catch (_) {}
        const error = new Error(msg);
        error.ffmpegDetail = detail;
        throw error;
      }
      return res.json();
    },

    async _run(state, fn) {
      state.loading = true;
      state.error = null;
      state.errorDetail = null;
      if ('warning' in state) state.warning = null;
      state.result = null;
      try {
        const result = await fn();
        state.result = result;
        if ('warning' in state) state.warning = result?.warning || null;
      } catch (e) {
        state.error = e.message;
        state.errorDetail = e.ffmpegDetail || null;
      } finally {
        state.loading = false;
      }
    },

    submitMerge() {
      this._run(this.merge, () => this._post('/merge', {
        video_url: this.merge.videoUrl,
        audio_url: this.merge.audioUrl,
        strategy: this.merge.strategy,
        ...(this.merge.folder.trim() && { folder: this.merge.folder.trim() }),
      }));
    },

    submitAnimate() {
      this._run(this.animate, () => this._post('/animate', {
        media_url: this.animate.mediaUrl,
        media_type: this.animate.mediaType,
        animation: this.animate.animation,
        duration: this.animate.duration,
        fps: this.animate.fps,
        resolution: this.animate.resolution,
        ...(this.animate.folder.trim() && { folder: this.animate.folder.trim() }),
      }));
    },

    submitCombine() {
      this._run(this.combine, () => this._post('/combine', {
        type: this.combine.type,
        urls: this.combine.urls.filter(u => u.trim()),
        reencode: this.combine.reencode,
        ...(this.combine.folder.trim() && { folder: this.combine.folder.trim() }),
      }));
    },

    submitImageToVideo() {
      this._run(this.imageToVideo, () => this._post('/image-to-video', {
        image_url: this.imageToVideo.imageUrl,
        duration: this.imageToVideo.duration,
        animation: this.imageToVideo.animation,
        fps: this.imageToVideo.fps,
        resolution: this.imageToVideo.resolution,
        ...(this.imageToVideo.folder.trim() && { folder: this.imageToVideo.folder.trim() }),
      }));
    },

    submitLoop() {
      this._run(this.loop, () => this._post('/loop', {
        video_url: this.loop.videoUrl,
        loop_count: this.loop.loopCount,
        ...(this.loop.folder.trim() && { folder: this.loop.folder.trim() }),
      }));
    },

    submitTransitions() {
      this._run(this.transitions, () => this._post('/concat-transitions', {
        urls: this.transitions.urls.filter(u => u.trim()),
        transition: this.transitions.transition,
        transition_duration: this.transitions.transitionDuration,
        ...(this.transitions.folder.trim() && { folder: this.transitions.folder.trim() }),
      }));
    },

    submitMetadata() {
      this._run(this.metadata, async () => {
        const data = await this._post('/metadata', { url: this.metadata.url });
        return data;
      });
    },

    // ── Upload ────────────────────────────────────────────────────────────
    onFilePick(e) {
      const f = e.target.files[0];
      if (!f) return;
      this.upload.file = f;
      this.upload.filename = f.name;
      this.upload.result = null;
      this.upload.error = null;
    },

    onFileDrop(e) {
      this.upload.dragging = false;
      const f = e.dataTransfer.files[0];
      if (!f) return;
      this.upload.file = f;
      this.upload.filename = f.name;
      this.upload.result = null;
      this.upload.error = null;
    },

    async submitUpload() {
      if (!this.upload.file) { this.upload.error = 'No file selected.'; return; }
      this.upload.loading = true;
      this.upload.error = null;
      this.upload.result = null;

      const fd = new FormData();
      fd.append('file', this.upload.file);
      if (this.upload.folder.trim()) fd.append('folder', this.upload.folder.trim());

      try {
        const res = await fetch('/upload', {
          method: 'POST',
          headers: { 'X-API-Key': this.apiKey },
          body: fd,
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { const e = await res.json(); msg = e?.detail?.error || e?.detail || msg; } catch (_) {}
          throw new Error(msg);
        }
        this.upload.result = await res.json();
        // Refresh folder list if saved to a folder
        if (this.upload.result.folder) this.loadFolders();
      } catch (e) {
        this.upload.error = e.message;
      } finally {
        this.upload.loading = false;
      }
    },

    // ── Folders ───────────────────────────────────────────────────────────
    async loadFolders() {
      this.folders.loading = true;
      this.folders.error = null;
      try {
        const res = await fetch('/folders', { headers: { 'X-API-Key': this.apiKey } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.folders.list = data.folders;
      } catch (e) {
        this.folders.error = e.message;
      } finally {
        this.folders.loading = false;
      }
    },

    async createFolder() {
      if (!this.folders.newName.trim()) return;
      this.folders.creating = true;
      try {
        const res = await fetch('/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
          body: JSON.stringify({ name: this.folders.newName.trim() }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.folders.newName = '';
        await this.loadFolders();
      } catch (e) {
        this.folders.error = e.message;
      } finally {
        this.folders.creating = false;
      }
    },

    async openFolder(name) {
      if (this.folders.openFolder === name) {
        this.folders.openFolder = null;
        this.folders.folderFiles = [];
        return;
      }
      this.folders.openFolder = name;
      this.folders.folderLoading = true;
      this.folders.previewKey = null;
      try {
        const res = await fetch(`/folders/${name}`, { headers: { 'X-API-Key': this.apiKey } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.folders.folderFiles = data.files;
      } catch (e) {
        this.folders.error = e.message;
      } finally {
        this.folders.folderLoading = false;
      }
    },

    async deleteFolderFile(folder, filename) {
      try {
        const res = await fetch(`/folders/${folder}/${filename}`, {
          method: 'DELETE',
          headers: { 'X-API-Key': this.apiKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.folders.folderFiles = this.folders.folderFiles.filter(f => f.filename !== filename);
        if (this.folders.previewKey === folder + filename) this.folders.previewKey = null;
        await this.loadFolders();
      } catch (e) {
        this.folders.error = e.message;
      }
    },

    async deleteFolder(name) {
      try {
        const res = await fetch(`/folders/${name}`, {
          method: 'DELETE',
          headers: { 'X-API-Key': this.apiKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (this.folders.openFolder === name) {
          this.folders.openFolder = null;
          this.folders.folderFiles = [];
        }
        this.folders.confirmDelete = null;
        await this.loadFolders();
      } catch (e) {
        this.folders.error = e.message;
        this.folders.confirmDelete = null;
      }
    },

    addUrl() { this.combine.urls.push(''); },
    removeUrl(i) { if (this.combine.urls.length > 2) this.combine.urls.splice(i, 1); },

    addTransitionUrl() { this.transitions.urls.push(''); },
    removeTransitionUrl(i) { if (this.transitions.urls.length > 2) this.transitions.urls.splice(i, 1); },

    async copyUrl(url, btn) {
      await navigator.clipboard.writeText(url);
      const orig = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1800);
    },

    togglePreview(key) {
      this.storage.previewKey = this.storage.previewKey === key ? null : key;
    },

    // Storage tab
    async loadFiles() {
      this.storage.loading = true;
      this.storage.error = null;
      try {
        const res = await fetch('/files', { headers: { 'X-API-Key': this.apiKey } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.storage.files = data.files;
        this.storage.totalBytes = data.total_size_bytes;
      } catch (e) {
        this.storage.error = e.message;
      } finally {
        this.storage.loading = false;
      }
    },

    async purgeAll() {
      this.storage.purging = true;
      try {
        const res = await fetch('/files', {
          method: 'DELETE',
          headers: { 'X-API-Key': this.apiKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.storage.files = [];
        this.storage.totalBytes = 0;
        this.storage.confirmPurge = false;
        this.storage.previewKey = null;
      } catch (e) {
        this.storage.error = e.message;
        this.storage.confirmPurge = false;
      } finally {
        this.storage.purging = false;
      }
    },

    async deleteJob(jobId) {
      try {
        const res = await fetch(`/files/${jobId}`, {
          method: 'DELETE',
          headers: { 'X-API-Key': this.apiKey },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.storage.files = this.storage.files.filter(f => f.job_id !== jobId);
        this.storage.totalBytes = this.storage.files.reduce((s, f) => s + f.size_bytes, 0);
        if (this.storage.previewKey?.startsWith(jobId)) this.storage.previewKey = null;
      } catch (e) {
        this.storage.error = e.message;
      }
    },

    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      let i = 0, val = bytes;
      while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
      return `${val.toFixed(1)} ${units[i]}`;
    },

    formatDate(iso) {
      return new Date(iso).toLocaleString();
    },
  };
}
