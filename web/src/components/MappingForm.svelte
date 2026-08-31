<script lang="ts">
  import type { MappingEntry } from '../../../src/types.js';

  import { app, CONDITIONS, addMapping } from '../lib/state.svelte.js';
  import { showToast } from '../lib/toast.svelte.js';

  let event = $state('');
  let sound = $state('');
  let condition = $state('===');
  let rawValue = $state('');
  let suppress = $state(false);

  const valueDisabled = $derived(condition === '*');

  function add() {
    const eventName = event.trim();
    if (!eventName || !sound) {
      showToast('Event and sound are required', 'error');
      return;
    }
    addMapping(eventName, sound, condition as MappingEntry['condition'], rawValue, suppress);
    clear();
    showToast('Mapping added', 'success');
  }

  function clear() {
    event = '';
    sound = '';
    condition = '===';
    rawValue = '';
    suppress = false;
  }
</script>

<div class="card">
  <h3>Add Mapping</h3>
  <div style="margin-top: 20px">
    <div class="field-group">
      <div class="field">
        <label for="newEvent">Event Name</label>
        <select id="newEvent" bind:value={event}>
          <optgroup label="Player">
            <option value="player.kills">kills</option>
            <option value="player.deaths">deaths</option>
            <option value="player.assists">assists</option>
            <option value="player.last_hits">last_hits</option>
            <option value="player.denies">denies</option>
            <option value="player.kill_streak">kill_streak</option>
            <option value="player.gold">gold</option>
            <option value="player.gold_from_hero_kills">gold_from_hero_kills</option>
            <option value="player.gold_from_creep_kills">gold_from_creep_kills</option>
          </optgroup>
          <optgroup label="Map">
            <option value="map.win_team">win_team</option>
            <option value="map.clock_time">clock_time</option>
          </optgroup>
        </select>
      </div>
      <div class="field">
        <label for="newSound">Sound</label>
        <select id="newSound" bind:value={sound}>
          <option value="">Select a sound...</option>
          {#each app.sounds as s (s)}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>
      <div class="field small">
        <label for="newCondition">Condition</label>
        <select id="newCondition" bind:value={condition}>
          {#each CONDITIONS as c (c.value)}
            <option value={c.value}>{c.label}</option>
          {/each}
        </select>
      </div>
      <div class="field tiny">
        <label for="newValue">Value</label>
        <input id="newValue" type="text" bind:value={rawValue} disabled={valueDisabled} />
      </div>
      <div class="field small">
        <label class="checkbox-label" for="newSuppress">Suppress</label>
        <input id="newSuppress" type="checkbox" bind:checked={suppress} />
      </div>
      <button class="btn-primary" onclick={add}>Add</button>
    </div>
  </div>
</div>
