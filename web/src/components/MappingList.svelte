<script lang="ts">
  import { saveMappings } from '../lib/api.js';
  import { app, hasBrokenMappings, isDirty } from '../lib/state.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';
  import MappingRow from './MappingRow.svelte';

  const events = $derived(app.mappings ? Object.keys(app.mappings.dota) : []);

  async function saveAll() {
    if (!app.mappings) return;
    if (hasBrokenMappings()) {
      showToast('Fix broken mappings before saving', 'error');
      return;
    }
    try {
      await saveMappings(app.mappings);
      app.original = JSON.parse(JSON.stringify(app.mappings));
      showToast('Saved successfully!', 'success');
    } catch {
      showToast('Save failed', 'error');
    }
  }
</script>

<div class="mappings-header">
  <h3>Mappings</h3>
  <button class="btn-primary" disabled={!isDirty() || hasBrokenMappings()} onclick={saveAll}>
    Save Changes
  </button>
</div>

{#if events.length === 0}
  <div class="empty">No mappings yet. Add one above.</div>
{:else}
  {#each events as event (event)}
    {@const entries = app.mappings?.dota[event] ?? []}
    <div class="event-group">
      <div class="event-group-header">
        <span class="event-name">{event}</span>
        <span class="event-count">{entries.length}</span>
      </div>
      <div class="event-group-body">
        {#each entries as entry, i (i)}
          <MappingRow {event} {i} {entry} />
        {/each}
      </div>
    </div>
  {/each}
{/if}

<style>
  .event-group {
    margin-bottom: 20px;
  }
  .event-group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: 2px 2px 0 0;
  }
  .event-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    text-shadow: var(--glow);
  }
  .event-count {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--card-bg);
    padding: 2px 8px;
    border-radius: 2px;
    border: 1px solid var(--border);
  }
  .event-group-body {
    border: 1px solid var(--border);
    border-radius: 0 0 2px 2px;
    padding: 8px;
    background: var(--card-bg);
  }
</style>
