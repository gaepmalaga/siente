<script lang="ts">
  // Gráfica diaria sencilla (barras + línea) en SVG, sin librerías.
  type Serie = { nombre: string; valores: number[]; tipo: 'barras' | 'linea'; color: string };
  let { etiquetas, series, alto = 200 }: { etiquetas: string[]; series: Serie[]; alto?: number } = $props();

  const ANCHO = 720;
  const M = { arriba: 12, abajo: 26, izq: 34, der: 34 };
  let activo = $state<number | null>(null);

  const n = $derived(etiquetas.length);
  const paso = $derived((ANCHO - M.izq - M.der) / Math.max(1, n));
  const escala = (valores: number[]) => {
    const max = Math.max(1, ...valores);
    const bonito = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / bonito) * bonito;
  };
  const maxIzq = $derived(escala(series.filter((s) => s.tipo === 'barras').flatMap((s) => s.valores)));
  const maxDer = $derived(escala(series.filter((s) => s.tipo === 'linea').flatMap((s) => s.valores)));
  const y = (v: number, max: number) => alto - M.abajo - (v / max) * (alto - M.arriba - M.abajo);
  const x = (i: number) => M.izq + paso * i + paso / 2;
  const fechaCorta = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number);
    return `${d}/${m}`;
  };
  const cadaCuanto = $derived(Math.ceil(n / 8));

  function mover(e: PointerEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * ANCHO;
    const i = Math.floor((px - M.izq) / paso);
    activo = i >= 0 && i < n ? i : null;
  }
</script>

<div class="grafica">
  <svg viewBox={`0 0 ${ANCHO} ${alto}`} role="img" aria-label={series.map((s) => s.nombre).join(' y ')} onpointermove={mover} onpointerleave={() => (activo = null)}>
    {#each [0, 0.5, 1] as f (f)}
      <line x1={M.izq} x2={ANCHO - M.der} y1={y(maxIzq * f, maxIzq)} y2={y(maxIzq * f, maxIzq)} class="guia" />
      <text x={M.izq - 6} y={y(maxIzq * f, maxIzq) + 4} class="eje" text-anchor="end">{Math.round(maxIzq * f)}</text>
      {#if series.some((s) => s.tipo === 'linea')}
        <text x={ANCHO - M.der + 6} y={y(maxDer * f, maxDer) + 4} class="eje">{Math.round(maxDer * f)}</text>
      {/if}
    {/each}
    {#each series.filter((s) => s.tipo === 'barras') as s (s.nombre)}
      {#each s.valores as v, i (i)}
        <rect x={x(i) - paso * 0.34} width={paso * 0.68} y={y(v, maxIzq)} height={Math.max(0, alto - M.abajo - y(v, maxIzq))} rx="3" fill={s.color} opacity={activo === null || activo === i ? 1 : 0.45} />
      {/each}
    {/each}
    {#each series.filter((s) => s.tipo === 'linea') as s (s.nombre)}
      <polyline points={s.valores.map((v, i) => `${x(i)},${y(v, maxDer)}`).join(' ')} fill="none" stroke={s.color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      {#each s.valores as v, i (i)}
        {#if activo === i}<circle cx={x(i)} cy={y(v, maxDer)} r="4.5" fill={s.color} stroke="#fff" stroke-width="2" />{/if}
      {/each}
    {/each}
    {#each etiquetas as e, i (i)}
      {#if i % cadaCuanto === 0}<text x={x(i)} y={alto - 8} class="eje" text-anchor="middle">{fechaCorta(e)}</text>{/if}
    {/each}
  </svg>
  <div class="leyenda">
    {#each series as s (s.nombre)}
      <span><i style={`background:${s.color}`} class:linea={s.tipo === 'linea'}></i>{s.nombre}{#if activo !== null}: <strong>{s.valores[activo]}</strong>{/if}</span>
    {/each}
    {#if activo !== null}<span class="p-apagado">{fechaCorta(etiquetas[activo])}</span>{/if}
  </div>
</div>

<style>
  .grafica { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
  svg { width: 100%; height: auto; touch-action: pan-y; }
  .guia { stroke: var(--p-borde); stroke-dasharray: 3 4; }
  .eje { font-size: 11px; fill: var(--p-apagado); font-family: var(--p-sans); }
  .leyenda { display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.85rem; color: var(--p-texto-2); }
  .leyenda span { display: inline-flex; align-items: center; gap: 6px; }
  .leyenda i { width: 12px; height: 12px; border-radius: 3px; }
  .leyenda i.linea { height: 3px; border-radius: 2px; }
</style>
