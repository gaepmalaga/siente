<script lang="ts">
  // Anillo de puntuación (0-100) para SEO y salud de la web.
  let { valor, tamano = 64, etiqueta = '' }: { valor: number; tamano?: number; etiqueta?: string } = $props();
  const r = 26;
  const c = 2 * Math.PI * r;
  const nivel = $derived(valor >= 80 ? 'bien' : valor >= 55 ? 'mejorable' : 'mal');
</script>

<div class="anillo {nivel}" style={`width:${tamano}px;height:${tamano}px`} role="img" aria-label={`${etiqueta} ${valor} de 100`}>
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r={r} fill="none" stroke="var(--p-borde)" stroke-width="7" />
    <circle
      cx="32"
      cy="32"
      r={r}
      fill="none"
      stroke="currentColor"
      stroke-width="7"
      stroke-linecap="round"
      stroke-dasharray={c}
      stroke-dashoffset={c * (1 - valor / 100)}
      transform="rotate(-90 32 32)"
    />
  </svg>
  <span>{valor}</span>
</div>

<style>
  .anillo { position: relative; display: grid; place-items: center; flex: none; }
  .anillo svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .anillo circle:last-child { transition: stroke-dashoffset 0.6s cubic-bezier(0.3, 0.7, 0.3, 1); }
  span { position: relative; font-weight: 800; font-size: 1.05em; font-variant-numeric: tabular-nums; }
  .bien { color: var(--p-ok); }
  .mejorable { color: #c98a14; }
  .mal { color: var(--p-error); }
  span { color: var(--p-texto); }
</style>
