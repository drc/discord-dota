<script lang="ts">
  import { onMount } from 'svelte';

  import MappingForm from './components/MappingForm.svelte';
  import MappingList from './components/MappingList.svelte';
  import SoundManager from './components/SoundManager.svelte';
  import UserSounds from './components/UserSounds.svelte';
  import { loadAll } from './lib/state.svelte.js';
  import { toast } from './lib/toast.svelte.js';

  const THEMES = [{ id: 'dota', label: 'Dota' }];
  const TABS = ['mappings', 'sounds', 'user-sounds'] as const;
  let tab = $state(
    (() => {
      const saved = localStorage.getItem('tab');
      return TABS.includes(saved as (typeof TABS)[number]) ? saved! : 'mappings';
    })()
  );
  let theme = $state(localStorage.getItem('theme') || 'dota');

  function setTab(id: string) {
    tab = id;
    localStorage.setItem('tab', id);
  }

  function applyTheme(id: string) {
    theme = id;
    localStorage.setItem('theme', id);
    document.documentElement.dataset.theme = id;
  }

  onMount(() => {
    void loadAll();
  });
</script>

<div class="container">
  <div class="header">
    <h1>
      <img
        src="https://cdn.steamstatic.com/apps/dota2/images/dota_react/global/dota2_logo_symbol.png"
        alt=""
      />OBSERVER WARD<span class="cursor">_</span>
    </h1>
    <select class="theme-picker" value={theme} onchange={(e) => applyTheme(e.currentTarget.value)}>
      {#each THEMES as t (t.id)}
        <option value={t.id}>{t.label}</option>
      {/each}
    </select>
  </div>
  <div class="msg {toast.kind} {toast.visible ? 'show' : ''}">{toast.text}</div>

  <div class="tabs">
    <button class="tab" class:active={tab === 'mappings'} onclick={() => setTab('mappings')}>Mappings</button>
    <button class="tab" class:active={tab === 'sounds'} onclick={() => setTab('sounds')}>Sounds</button>
    <button class="tab" class:active={tab === 'user-sounds'} onclick={() => setTab('user-sounds')}>User Sounds</button>
  </div>

  {#if tab === 'mappings'}
    <MappingForm />
    <MappingList />
  {:else if tab === 'sounds'}
    <SoundManager />
  {:else if tab === 'user-sounds'}
    <UserSounds />
  {/if}
</div>

<style>
  .container {
    max-width: 960px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 32px;
  }
  h1 {
    font-size: 48px;
    font-family: 'Reaver', sans-serif;
    font-weight: normal;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 14px;
    text-shadow: var(--glow-strong);
  }
  h1 img {
    height: 64px;
    filter: var(--logo-filter) drop-shadow(var(--glow));
  }
  .theme-picker {
    width: auto;
    flex: 0 0 auto;
  }
  .cursor {
    animation: blink 1s step-end infinite;
    font-weight: normal;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 24px;
  }
  .tab {
    padding: 10px 20px;
    border-radius: 2px;
    background: var(--input-bg);
    color: var(--text-muted);
    border: 1px solid var(--border);
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    font-family: 'Share Tech Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.15s;
  }
  .tab:hover {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    color: var(--text);
  }
  .tab.active {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    color: var(--accent);
    border-color: var(--accent);
    box-shadow: var(--glow);
    text-shadow: var(--glow);
  }
</style>
