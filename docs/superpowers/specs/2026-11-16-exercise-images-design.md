# Imágenes de ejercicios — diseño

Fecha: 2026-11-16. Estado: aprobado por el usuario (con el requisito de músculos correctos).

## Intención

Que cada ejercicio de la app tenga una imagen con un acabado visual cuidado, en la línea de la biblioteca de Symmetry. Es por estética, no como guía de ejecución. El usuario valora tres cosas de Symmetry: el muñeco con los músculos marcados en color, la pose del ejercicio y el acabado limpio y oscuro.

## Objetivos

- Cada ejercicio muestra una tarjeta oscura con la pose y el muñeco con músculos resaltados.
- Los músculos principales van en un color y los secundarios en otro más suave.
- **Los músculos resaltados deben ser los que de verdad trabaja cada ejercicio**, tanto principales como secundarios. Ejemplo: en un remo, los principales son los dorsales. Es un requisito del usuario.
- El nombre y los músculos trabajados van debajo, en letra pequeña y discreta.
- Funciona sin conexión (la app guarda los datos en local).
- Se amplía el catálogo con ejercicios nuevos que tengan imagen.

## No objetivos

- Copiar o imitar al trazo las imágenes de Symmetry (tienen copyright).
- Ilustraciones dibujadas a medida para cada pose: es la segunda fase, fuera de este alcance.
- Vídeos o GIF animados.
- Guía de ejecución paso a paso.

## Anti-objetivos

- Que haya licencias dudosas en el repo. Solo se usan fuentes con licencia libre comprobada.
- Que la app crezca de forma notable en tamaño o se ralentice al abrir listas.
- Cambiar los `id` de ejercicios ya existentes: los entrenos guardados apuntan a ellos.

## Decisiones

**Fuente de las fotos:** *free-exercise-db* (`yuhonas/free-exercise-db`), licencia Unlicense (dominio público, comprobada en la API de GitHub). Unos 876 ejercicios, con fotos de la pose inicial y final.

**Tarjeta por ejercicio:** foto de la pose tintada en un tono oscuro uniforme, junto al mapa corporal anatómico que la app ya tiene (rojo = principales, tono suave = secundarios), con nombre y músculos debajo.

**Ejercicios sin foto:** muestran solo el muñeco con los músculos. Ninguno queda sin imagen.

**Dónde viven las imágenes:** dentro de la app (APK), para que funcionen sin red. Se guarda una sola foto por ejercicio (la pose inicial), redimensionada y comprimida a WebP.

## Cómo se hace (decisiones mías, a revisar)

- **Emparejado:** hay una tabla `id de la app → carpeta de la foto`. El cruce automático por nombre acierta con 83 de 156; el resto lo emparejo a mano, por ejemplo "Lat pulldown" con "Wide-Grip Lat Pulldown". Cada pareja se comprueba mirando la foto.
- **Tinte oscuro:** se aplica al procesar las imágenes (un script), no en el móvil, para que todas tengan el mismo aspecto y la app no gaste proceso.
- **Tamaño:** unos 400 px de lado en WebP, del orden de 15–25 KB por foto. Con unos 240 ejercicios, entre 4 y 6 MB en total.
- **Catálogo nuevo:** añado unos 60–80 ejercicios habituales que no tienes y sí tienen foto. Los nombres en español los redacto yo y los músculos los traduzco al sistema de la app. Los `id` nuevos siguen el formato actual.
- **Autoría:** se añade una nota de crédito al repo con la fuente y su licencia, aunque no sea obligatoria.

## Corrección de los músculos

- La tarjeta pinta lo que dice el catálogo (`primary` y `secondary`), así que esos datos tienen que ser correctos.
- Se auditan los 156 ejercicios actuales: cada uno se revisa contra los músculos que da *free-exercise-db* y contra criterio anatómico. Los desacuerdos se corrigen en el catálogo, sin tocar los `id`.
- Los ejercicios nuevos entran con los músculos ya revisados.
- Se añade una prueba que comprueba que todo ejercicio tiene al menos un músculo principal y que principales y secundarios no se repiten.
- Se dejan por escrito los ejercicios corregidos para que el usuario los revise.

## Orden de trabajo

1. Descargar el dataset y hacer la tabla de emparejado de los 156 ejercicios actuales, y auditar sus músculos.
2. Script que procesa las fotos (tinte, tamaño, WebP) y las guarda en la app.
3. Mostrar la tarjeta en las pantallas de ejercicio y de entreno.
4. Añadir los ejercicios nuevos, con sus fotos.
5. Probar en el móvil.

## Pendiente de decidir por el constructor

- Dónde exactamente se muestra la tarjeta (lista del selector, detalle, entreno). Propuesta: detalle del ejercicio y entreno primero; el selector después, con miniatura.
- El tono exacto del tinte oscuro: se prueba con 2 o 3 variantes sobre fotos reales.
