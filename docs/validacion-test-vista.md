# Validación del test de vista online

El test es un **cribado orientativo**. Antes de promocionarlo conviene comprobar, con el optometrista del centro, que el semáforo se parece a lo que luego se mide en la revisión. Este protocolo lo hace en una o dos semanas, sin coste.

## 1. Qué se valida

| Prueba | Se compara con | Criterio de acierto |
| --- | --- | --- |
| Agudeza (decimal) | Agudeza medida en la revisión (misma corrección) | Diferencia ≤ 1 nivel de la tabla en el 80 % de los ojos |
| Astigmatismo | Cilindro de la refracción | Detecta (línea marcada) cuando hay ≥ 0,75 D |
| Rojo/verde | Esfera de la refracción | «Rojo» con miopía, «verde» con hipermetropía en la mayoría |
| Cerca | Adición medida | Marca «aleja» cuando hay presbicia |
| Color | Ishihara o Farnsworth del centro | Sin falsos negativos en daltonismo rojo-verde |
| Amsler | Exploración de retina | Ninguna alteración real sin marcar (**cero** falsos negativos) |
| Semáforo global | Valoración del optometrista (normal / revisar / derivar) | Sensibilidad y especificidad (ver abajo) |

## 2. Cómo se hace

1. Pide a **20-30 personas** que vienen a revisión (adultos, algunos con gafas, y 5-10 niños con un adulto) que hagan el test **antes** de entrar a la consulta, con la misma pantalla y distancia que usarán en casa.
2. Apunta el **resumen del test** (botón «Copiar resumen»). Va también en el campo «Nota» de la cita.
3. El optometrista hace su revisión sin ver el resumen y anota su valoración.
4. Rellena una fila por persona:

| Nº | Edad | Gafas | Dispositivo | AV test OD/OI | AV real OD/OI | Cil. real | Esf. real | Adición | Color real | Retina | Semáforo test | Valoración optometrista |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | | | | | |

## 3. Cómo se interpreta

- **Sensibilidad** = de las personas que el optometrista marca «revisar/derivar», cuántas marca también el test (ámbar o rojo). Objetivo: **≥ 90 %**. Es lo importante: un falso «todo bien» es peor que un falso aviso.
- **Especificidad** = de las que el optometrista marca «normal», cuántas marca el test en verde. Objetivo: ≥ 60 % (es un cribado: se acepta algún aviso de más).
- Si la sensibilidad es baja, **sube los umbrales** de `src/lib/testVista.ts` (`umbralesAgudeza`, `semaforoCerca`, `semaforoColor`) y repite.
- Si hay falsos negativos en Amsler, **no publicar** hasta entender el motivo.

## 4. Dispositivos

Repite la calibración y una prueba de agudeza en al menos: un iPhone, un Android de gama media, un Android de gama baja, una tableta y un portátil. Comprueba que la tarjeta real coincide con el rectángulo y que se distingue el hueco del aro más pequeño (20/25).

## 5. Lo que no valida este protocolo

Los textos legales y de privacidad. Esos los revisa quien lleve la parte jurídica del centro.
