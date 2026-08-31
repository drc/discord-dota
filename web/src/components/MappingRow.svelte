<script lang="ts">
  import type { MappingEntry } from '../../../src/types.js';

  import { playInVoice } from '../lib/api.js';
  import { audio, toggleSound } from '../lib/audio.svelte.js';
  import { app, CONDITIONS, isSoundBroken, moveMapping, removeMapping, updateMapping } from '../lib/state.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';

  let { event, i, entry }: { event: string; i: number; entry: MappingEntry } = $props();

  const broken = $derived(isSoundBroken(entry.sound));
  const playKey = $derived(`mapping:${event}:${i}`);
  const playing = $derived(audio.currentKey === playKey);

  function voice() {
    playInVoice(entry.sound)
      .then(() => showToast('Playing in voice', 'success'))
      .catch((e: Error) => showToast(e.message, 'error'));
  }
</script>

<div class="mapping-item" class:broken data-event={event} data-idx={i}>
  <div class="order-btns">
    <button class="btn-icon" disabled={i === 0} onclick={() => moveMapping(event, i, -1)}>▲</button>
    <button
      class="btn-icon"
      disabled={i === (app.mappings?.dota[event]?.length ?? 0) - 1}
      onclick={() => moveMapping(event, i, 1)}
    >
      ▼
    </button>
  </div>
  <div class="mapping-row">
    <div class="field">
      <label for={`sound-${event}-${i}`}>Sound {#if broken}<span class="missing">(missing)</span>{/if}</label>
      <div class="sound-picker">
        <select id={`sound-${event}-${i}`} value={entry.sound}
          onchange={(e) => updateMapping(event, i, 'sound', e.currentTarget.value)}
        >
          <option value="">Select a sound...</option>
          {#each app.sounds as s (s)}
            <option value={s}>{s}</option>
          {/each}
        </select>
        <button
          type="button"
          class="btn-icon btn-play"
          class:playing={playing}
          title="Play"
          disabled={!entry.sound}
          onclick={() => toggleSound('/api/sounds/' + encodeURIComponent(entry.sound), playKey)}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button type="button" class="btn-icon" title="Play in Discord voice" disabled={!entry.sound} onclick={voice}>
          🔊
        </button>
      </div>
    </div>
    <div class="field small">
      <label for={`condition-${event}-${i}`}>Condition</label>
      <select id={`condition-${event}-${i}`} value={entry.condition ?? '==='} onchange={(e) => updateMapping(event, i, 'condition', e.currentTarget.value)}>
        {#each CONDITIONS as c (c.value)}
          <option value={c.value}>{c.label}</option>
        {/each}
      </select>
    </div>
    <div class="field tiny">
      <label for={`value-${event}-${i}`}>Value</label>
      <input id={`value-${event}-${i}`} type="text"
        value={entry.condition === '*' ? '' : (entry.value ?? '')}
        disabled={entry.condition === '*'}
        onchange={(e) => updateMapping(event, i, 'value', e.currentTarget.value)}
      />
    </div>
    <div class="field small">
      <label class="checkbox-label" for={`suppress-${event}-${i}`}>Suppress</label>
      <input id={`suppress-${event}-${i}`} type="checkbox"
        checked={entry.suppress}
        onchange={(e) => updateMapping(event, i, 'suppress', e.currentTarget.checked)}
      />
    </div>
  </div>
  <div class="mapping-actions">
    <button class="btn-icon danger" onclick={() => removeMapping(event, i)}>✕</button>
  </div>
</div>

<style>
  .mapping-item {
    display: flex;
    align-items: center;
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 16px;
    margin-bottom: 8px;
    transition: all 0.15s ease;
    gap: 10px;
  }
  .mapping-item:hover {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    box-shadow: var(--glow);
  }
  .mapping-item.broken {
    border-color: var(--danger);
    box-shadow: 0 0 10px color-mix(in srgb, var(--danger) 20%, transparent);
  }
  .mapping-item.broken .field select {
    border-color: var(--danger);
  }
  .mapping-item .field {
    margin-bottom: 0;
    position: relative;
  }
  .mapping-item .field label {
    position: absolute;
    margin-top: -16px;
  }
  .mapping-row {
    flex: 1;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .mapping-row .field:first-child {
    flex: 2;
  }
  .mapping-row .field:nth-child(2) {
    flex: 0 0 90px;
  }
  .sound-picker {
    display: flex;
    gap: 8px;
  }
  .missing {
    color: var(--danger);
  }
  .mapping-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
    align-items: center;
  }
  .order-btns {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  @media (max-width: 700px) {
    .mapping-item {
      flex-wrap: wrap;
    }
    .mapping-row {
      flex-wrap: wrap;
      width: 100%;
    }
    .mapping-row .field:first-child,
    .mapping-row .field:nth-child(2) {
      flex: 1 1 100%;
    }
    .order-btns {
      flex-direction: row;
      margin-right: 0;
      margin-bottom: 12px;
    }
    .mapping-actions {
      margin-left: 0;
      margin-top: 12px;
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
