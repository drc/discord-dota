<script lang="ts">
  import type { Member } from '../lib/api.js';
  import { deleteUserSound, playInVoice, setUserSound } from '../lib/api.js';
  import { audio, toggleSound } from '../lib/audio.svelte.js';
  import { app, loadUserSounds } from '../lib/state.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import MemberAutocomplete from './MemberAutocomplete.svelte';

  let autocomplete: MemberAutocomplete | undefined = $state();
  let userId = $state('');
  let sound = $state('');

  const entries = $derived(Object.entries(app.userSounds));

  function pick(m: Member) {
    userId = m.id;
  }

  async function add() {
    if (!userId || !sound) {
      showToast('User ID and sound are required', 'error');
      return;
    }
    try {
      await setUserSound(userId, sound);
      showToast('User sound added', 'success');
      autocomplete?.clear();
      userId = '';
      sound = '';
      await loadUserSounds();
    } catch {
      showToast('Failed to add user sound', 'error');
    }
  }

  async function update(uid: string, value: string) {
    if (!value) return;
    try {
      await setUserSound(uid, value);
      showToast('User sound updated', 'success');
      await loadUserSounds();
    } catch {
      showToast('Failed to update user sound', 'error');
    }
  }

  async function remove(uid: string) {
    if (!confirm(`Remove custom sound for user ${uid}?`)) return;
    try {
      await deleteUserSound(uid);
      showToast('User sound removed', 'success');
      await loadUserSounds();
    } catch {
      showToast('Failed to delete user sound', 'error');
    }
  }

  function voice(name: string) {
    playInVoice(name)
      .then(() => showToast('Playing in voice', 'success'))
      .catch((e: Error) => showToast(e.message, 'error'));
  }
</script>

<div class="card">
  <h3>Add User Sound</h3>
  <div style="margin-top: 20px">
    <div class="field-group">
      <MemberAutocomplete onPick={pick} bind:this={autocomplete} />
      <div class="field">
        <label for="newUserSound">Sound</label>
        <select id="newUserSound" bind:value={sound}>
          <option value="">Select a sound...</option>
          {#each app.sounds as s (s)}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>
      <button class="btn-primary" onclick={add}>Add</button>
    </div>
  </div>
</div>

<div class="mappings-header">
  <h3>User Sounds</h3>
</div>
<div class="sound-list">
  {#each entries as [uid, s] (uid)}
    {@const displayName = app.members.find((m) => m.id === uid)?.username ?? `${uid} (left server)`}
    <div class="sound-item">
      <span class="sound-name">{displayName}</span>
      <select value={s} style="flex: 1;" onchange={(e) => update(uid, e.currentTarget.value)}>
        <option value="">Select a sound...</option>
        {#each app.sounds as s2 (s2)}
          <option value={s2}>{s2}</option>
        {/each}
      </select>
      <div class="sound-actions">
        <button
          class="btn-icon btn-play"
          class:playing={audio.currentKey === `user:${uid}`}
          title="Play"
          onclick={() => toggleSound('/api/sounds/' + encodeURIComponent(s), `user:${uid}`)}
        >
          {audio.currentKey === `user:${uid}` ? '⏸' : '▶'}
        </button>
        <button class="btn-icon" title="Play in Discord voice" onclick={() => voice(s)}>🔊</button>
        <button class="btn-icon danger" title="Delete" onclick={() => remove(uid)}>✕</button>
      </div>
    </div>
  {:else}
    <div class="empty">No user sounds configured. All users play open-aim.mp3 by default.</div>
  {/each}
</div>
