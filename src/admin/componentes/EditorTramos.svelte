<script lang="ts">
  // Horario semanal editable: por cada día, uno o varios tramos de horas.
  import Icono from './Icono.svelte';
  import Interruptor from './Interruptor.svelte';
  import { DIAS, NOMBRE_DIA, erroresHorario, type Dia, type HorarioSemana } from '../../lib/horario';

  let { semana = $bindable() }: { semana: HorarioSemana } = $props();
  const errores = $derived(erroresHorario(semana));

  function anadir(d: Dia) {
    semana[d].push(semana[d].length ? { abre: '17:00', cierra: '20:00' } : { abre: '10:00', cierra: '14:00' });
  }
</script>

<div class="dias">
  {#each DIAS as d (d)}
    <div class="dia" class:cerrado={!semana[d].length}>
      <div class="nombre">
        <strong>{NOMBRE_DIA[d]}</strong>
        <Interruptor
          compacto
          etiqueta={semana[d].length ? 'Con citas' : 'Sin citas'}
          activo={semana[d].length > 0}
          onchange={(v) => (semana[d] = v ? [{ abre: '10:00', cierra: '14:00' }] : [])}
        />
      </div>
      <div class="tramos">
        {#each semana[d] as t, i (i)}
          <div class="tramo">
            <input class="p-input hora" type="time" step="300" bind:value={t.abre} aria-label={`${NOMBRE_DIA[d]}: desde`} />
            <span>a</span>
            <input class="p-input hora" type="time" step="300" bind:value={t.cierra} aria-label={`${NOMBRE_DIA[d]}: hasta`} />
            <button class="p-btn fantasma solo-icono pequeno" type="button" aria-label="Quitar tramo" onclick={() => semana[d].splice(i, 1)}><Icono nombre="X" /></button>
          </div>
        {/each}
        {#if semana[d].length && semana[d].length < 3}
          <button class="p-btn fantasma pequeno" type="button" onclick={() => anadir(d)}><Icono nombre="Plus" /> Tramo</button>
        {/if}
      </div>
    </div>
  {/each}
  {#each errores as e (e)}<p class="p-error-campo"><Icono nombre="CircleAlert" /> {e}</p>{/each}
</div>

<style>
  .dias { display: grid; border: 1px solid var(--p-borde); border-radius: 12px; overflow: hidden; }
  .dia { display: grid; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--p-borde); }
  @media (min-width: 720px) { .dia { grid-template-columns: 200px 1fr; align-items: center; } }
  .dia.cerrado { background: var(--p-superficie-2); }
  .nombre { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .tramos { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .tramo { display: flex; align-items: center; gap: 6px; padding: 4px; border-radius: 12px; background: var(--p-superficie-2); border: 1px solid var(--p-borde); }
  .hora { width: 112px; min-height: 36px; padding: 4px 8px; font-variant-numeric: tabular-nums; }
  .p-error-campo { display: flex; gap: 6px; align-items: center; padding: 8px 14px; margin: 0; }
</style>
