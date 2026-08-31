<script lang="ts">
  import type { Member } from '../lib/api.js';
  import { app } from '../lib/state.svelte.js';

  let { onPick }: { onPick: (m: Member) => void } = $props();

  let root: HTMLDivElement;
  let query = $state('');
  let open = $state(false);
  let highlighted = $state(-1);

  const matches = $derived(
    query
      ? app.members.filter((m) => m.username.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
      : app.members.slice(0, 10),
  );

  export function clear() {
    query = '';
    highlighted = -1;
    open = false;
  }

  function choose(m: Member) {
    query = m.username;
    open = false;
    onPick(m);
  }

  function onInput() {
    highlighted = -1;
    open = true;
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlighted = Math.min(highlighted + 1, matches.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const m = matches[highlighted];
      if (highlighted >= 0 && m) choose(m);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  function onWindowClick(e: MouseEvent) {
    if (root && !root.contains(e.target as Node)) open = false;
  }
</script>

<svelte:window onclick={onWindowClick} />

<div class="field autocomplete" bind:this={root}>
  <label for="memberSearch">Discord User</label>
  <input
    id="memberSearch"
    type="text"
    placeholder="Search by username..."
    autocomplete="off"
    bind:value={query}
    oninput={onInput}
    onfocus={() => {
      highlighted = -1;
      open = true;
    }}
    onkeydown={onKeydown}
  />
  {#if open}
    <ul class="member-dropdown open">
      {#each matches as m, i (m.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
        <li class:highlighted={i === highlighted} onclick={() => choose(m)}>{m.username}</li>
      {:else}
        <li class="no-results">No members found</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .autocomplete {
    position: relative;
  }
  .member-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--input-bg);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 2px 2px;
    max-height: 240px;
    overflow-y: auto;
    z-index: 100;
    list-style: none;
  }
  .member-dropdown li {
    padding: 8px 12px;
    font-size: 13px;
    color: var(--text);
    cursor: pointer;
    border-bottom: 1px solid var(--border);
  }
  .member-dropdown li:last-child {
    border-bottom: none;
  }
  .member-dropdown li:hover,
  .member-dropdown li.highlighted {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    color: var(--accent);
  }
  .member-dropdown li.no-results {
    color: var(--text-muted);
    cursor: default;
  }
</style>
