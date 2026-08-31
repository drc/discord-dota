<script lang="ts">
  import { deleteSound, playInVoice, uploadSound } from '../lib/api.js';
  import { audio, toggleSound } from '../lib/audio.svelte.js';
  import { app, loadSounds } from '../lib/state.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';

  async function onUpload(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await uploadSound(file);
      showToast('Sound uploaded successfully', 'success');
      await loadSounds();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
    input.value = '';
  }

  async function onDelete(name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteSound(name);
      showToast('Sound deleted', 'success');
      await loadSounds();
    } catch {
      showToast('Delete failed', 'error');
    }
  }

  function voice(name: string) {
    playInVoice(name)
      .then(() => showToast('Playing in voice', 'success'))
      .catch((e: Error) => showToast(e.message, 'error'));
  }
</script>

<div class="card">
  <h3>Upload Sound</h3>
  <label class="upload-area">
    <input type="file" accept=".mp3" onchange={onUpload} />
    Click to upload MP3 (max 10MB)
  </label>
  <h3>Sound Files</h3>
  <div class="sound-list">
    {#if app.sounds.length === 0}
      <div class="empty">No sounds uploaded yet.</div>
    {:else}
      {#each app.sounds as s (s)}
        <div class="sound-item">
          <span class="sound-name">{s}</span>
          <div class="sound-actions">
            <button
              class="btn-icon btn-play"
              class:playing={audio.currentKey === `sound:${s}`}
              title="Play"
              onclick={() => toggleSound('/api/sounds/' + encodeURIComponent(s), `sound:${s}`)}
            >
              {audio.currentKey === `sound:${s}` ? '⏸' : '▶'}
            </button>
            <button class="btn-icon" title="Play in Discord voice" onclick={() => voice(s)}>🔊</button>
            <a class="btn-icon" href="/api/sounds/{encodeURIComponent(s)}" download={s} title="Download">↓</a>
            <button class="btn-icon danger" title="Delete" onclick={() => onDelete(s)}>✕</button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
