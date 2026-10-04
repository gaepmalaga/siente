<script lang="ts">
  import { ICONOS, type NombreIcono } from '../lib/iconos';

  let { nombre, clase = '', etiqueta = '' }: { nombre: NombreIcono; clase?: string; etiqueta?: string } = $props();

  const svg = $derived(
    ICONOS[nombre]
      .replace(/\s(width|height)="24"/g, '')
      .replace(/class="[^"]*"/, `class="p-icono ${clase}" ${etiqueta ? `role="img" aria-label="${etiqueta}"` : 'aria-hidden="true" focusable="false"'}`),
  );
</script>

{@html svg}
