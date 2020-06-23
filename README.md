# Chess App

El “rey de los juegos”, o el juego de los grandes maestros. El ajedrez ha sido — y aún es— uno de los juegos de mesa más populares del mundo. Tal popularidad se debe en parte a la simplicidad de sus reglas y su facilidad de aprendizaje, y a la vez la profundidad estratégica de sus partidas.

Sin embargo, no fue sino hasta los albores de la ciencia computacional que el ajedrez adquirió una nueva importancia: la posibilidad de emular el modo de pensar de los grandes maestros. De este modo comenzó una carrera para lograr una “inteligencia artificial” capaz de vencer a los mejores jugadores humanos.

El momento cúlmine de esa carrera llegó a finales del siglo XX, cuando se desarrollaron algoritmos (y hardware) capaces de vencer a los mejores jugadores de ajedrez del mundo. Hoy en día ya damos por sentado que sea muy difícil o casi imposible vencer a una IA en el juego del ajedrez, por lo que los ingenieros y expertos han enfocado sus esfuerzos al desarrollo de IAs capaces de afrontar juegos más complejos (como el Go, por ejemplo).

## Inicio de la carrera

En este artículo intentaremos explicar cómo emular con javascript la que quizá sea la IA más elemental posible: un árbol de búsqueda.

## Estructura del desarrollo

A nivel de javascript, el código está organizado en 2 archivos:

- **chessApp.js**: aquí desarrollamos los métodos principales de la app.
- **ai_evaluator.js**: aquí desarrollamos la función evaluadora de la IA.

### ChessApp.js

Los métodos de chessApp.js están estructurados en 4 partes:

1. **Variables globales**: esto nos permitirá manejar los datos de la app en todo el entorno, así como comunicarse con el localhost del navegador para almacenar variables.
2. **AI**: aquí desarrollamos los métodos para comunicarnos con la función evaluadora de la IA.
3. **UI**: esta parte nos permite recibir las interacciones del usuario con la interfaz, y a la vez mantenerla actualizada.
4. **Board**: control del tablero de juego. Utilizamos [chessboard](https://chessboardjs.com/) para el render del tablero y la interacción con el usuario.
   Para reconocer las posiciones y las posibles jugadas en cada caso, utilizamos [chess.js](https://github.com/jhlywa/chess.js).

### Ai_evaluator.js

La base de la función evaluadora es la recursividad: comenzando por una posición de piezas determinadas, se evalúan las siguientes posiciones luego de cada movimiento en el árbol de decisiones posibles.

Esta opción tiene la ventaja de que se evalúa en profundidad todos los casos, pero en contrapartida la cantidad de posiciones crece exponencialmente en varios órdenes de magnitud: con solo 2 ó 3 niveles de profundidad la cantidad de posiciones crece a varios miles, con lo que el tiempo de procesamiento se hace extremadamente largo.

Para abordar esto —y hacer que el tiempo de procesamiento sea medianamente tolerable— utilizamos 2 estrategia:

- Utilizamos web workers, que nos permite que el motor de javascript procese los datos en varios hilos en paralelo (y sin el bloqueo del navegador).
- Usamos una [poda alfa-beta](https://es.wikipedia.org/wiki/Poda_alfa-beta) que nos permite reducir la cantidad de posiciones evaluadas.

Cualquier duda, déjame tu comentario aquí: [Chess App: desarrollando una IA para jugar ajedrez](https://artepolimata.com/developer/2020/06/23/chess-app-desarrollando-una-ia-para-jugar-ajedrez/)
