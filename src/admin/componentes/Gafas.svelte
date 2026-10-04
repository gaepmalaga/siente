<script lang="ts">
  // Las gafas del logotipo, para la pantalla de acceso y la barra lateral.
  let { ondas = true, clase = '' }: { ondas?: boolean; clase?: string } = $props();
</script>

<svg class={clase} viewBox={ondas ? '-12 -2 1624 486' : '230 40 1140 450'} aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-linecap="round">
    <circle cx="514" cy="265" r="189" stroke-width="48" />
    <circle cx="1086" cy="265" r="189" stroke-width="48" />
    <path d="M690 196 Q800 100 910 196" stroke-width="46" />
    <path d="M278 172 H336" stroke-width="56" />
    <path d="M1322 172 H1264" stroke-width="56" />
    {#if ondas}
      <g stroke-width="22" class="ondas">
        <path d="M203 98 Q133 184 203 270" /><path d="M145 43 Q31 184 145 325" /><path d="M78 10 Q-58 184 78 357" />
        <path d="M1397 98 Q1467 184 1397 270" /><path d="M1455 43 Q1569 184 1455 325" /><path d="M1522 10 Q1658 184 1522 357" />
      </g>
    {/if}
  </g>
</svg>
