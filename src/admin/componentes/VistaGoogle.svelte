<script lang="ts">
  // Así aparecería la página en los resultados de Google (aproximación).
  let { titulo, descripcion, url }: { titulo: string; descripcion: string; url: string } = $props();
  const corta = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
  const migas = $derived(url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/').join(' › '));
</script>

<div class="google" aria-label="Vista previa en Google">
  <div class="sitio">
    <span class="fav" aria-hidden="true">S</span>
    <span>
      <span class="nombre">Siente</span>
      <span class="url">{migas}</span>
    </span>
  </div>
  <p class="titulo">{corta(titulo || 'Título de la página', 62)}</p>
  <p class="desc">{corta(descripcion || 'Escribe una descripción: es el texto que convence a la gente para entrar.', 160)}</p>
</div>

<style>
  .google { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; padding: 14px 16px; border-radius: 12px; background: #fff; border: 1px solid var(--p-borde); font-family: Arial, sans-serif; }
  .sitio { display: flex; align-items: center; gap: 10px; }
  .fav { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: #f1ece4; font-family: var(--p-mono); font-weight: 700; font-size: 13px; }
  .sitio > span:last-child { display: grid; line-height: 1.25; }
  .nombre { font-size: 14px; color: #202124; }
  .url { font-size: 12px; color: #4d5156; overflow-wrap: anywhere; }
  .titulo { color: #1a0dab; font-size: 19px; line-height: 1.3; margin-top: 2px; }
  .desc { color: #4d5156; font-size: 14px; line-height: 1.55; }
</style>
