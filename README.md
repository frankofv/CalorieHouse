# NutriCasa — lista para Netlify

App web/PWA estática para registrar calorías, macros, despensa, consumo familiar, boletas y peso.

## Costo
- Hosting: puede funcionar en el plan gratuito de Netlify, sujeto a los límites vigentes de Netlify.
- Base de datos: no usa servidor; guarda los datos en `localStorage` del navegador.
- OCR: usa Tesseract.js en el navegador desde jsDelivr. No requiere API key ni servicio de pago.

## Subir a Netlify
### Método rápido
1. Descomprime la carpeta.
2. En Netlify, abre **Add new site > Deploy manually**.
3. Arrastra la carpeta `NutriCasa-Netlify` completa.
4. Netlify publicará `index.html` automáticamente.

También puedes subir el ZIP al área de despliegue manual si tu interfaz de Netlify lo permite.

## Instalar en iPhone
1. Abre la URL publicada en Safari.
2. Compartir > **Agregar a pantalla de inicio**.
3. Se abrirá como una app independiente gracias al `manifest.webmanifest`.

## Funciones incluidas
- Meta diaria de calorías.
- Proteínas, carbohidratos y grasas.
- Registro de comidas.
- Descuento opcional de alimentos al registrar una comida.
- Despensa con suma/resta manual.
- Consumo familiar sin sumar calorías personales.
- Alertas visuales de stock bajo.
- Historial de movimientos por producto.
- Carga de boletas por foto o PDF.
- OCR en imágenes con Tesseract.js.
- Confirmación/editado manual de los productos detectados antes de agregarlos.
- Registro e historial de peso.
- Gráfico simple de peso.
- Configuración de metas.
- PWA y service worker para cargar la interfaz sin conexión luego de la primera visita.
- Diseño pastel azul, calipso y coral con microanimaciones.

## Privacidad y respaldo
Los datos quedan guardados únicamente en ese navegador/dispositivo. Si borras los datos del sitio o cambias de teléfono, no se restauran automáticamente.

Para una futura versión se puede agregar exportar/importar JSON, sincronización gratuita con una cuenta o una base de datos con plan gratuito.

## OCR
El reconocimiento de boletas reales nunca es perfecto porque cada supermercado imprime nombres abreviados de forma distinta. Por eso esta versión obliga a revisar y editar lo detectado antes de actualizar la despensa.
