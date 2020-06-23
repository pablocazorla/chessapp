// Importamos chess.min.js para tener disponible 'Chess'
importScripts("libs/chess.min.js");

// Creamos 'game'
var game = new Chess();

// Esta variable nos permitirá contar la cantidad total de posiciones evaluadas
var positionCount;

/* Función de evaluación de situación en el tablero
  board: array con las 64 casillas, mostrando las piezas existentes en cada una
  color: color de la AI ('w' ó 'b')
*/
var evaluateBoard = function (board, color) {
  // Valores estándar de las diferentes piezas, asignados según 'https://en.wikipedia.org/wiki/Chess_piece_relative_value'
  var pieceValue = {
    p: 100,
    n: 350,
    b: 350,
    r: 525,
    q: 1015,
    k: 10000,
  };

  // Valor posicional añadido de cada pieza según su lugar en el tablero
  // para las piezas blancas
  var positionValue = {
    pw: [
      [9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0],
      [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
      [1.0, 1.0, 2.0, 4.0, 4.0, 2.0, 1.0, 1.0],
      [0.5, 0.5, 1.0, 3.5, 3.5, 1.0, 0.5, 0.5],
      [0.0, 0.0, 0.0, 3.0, 3.0, 0.0, 0.0, 0.0],
      [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
      [0.5, 1.0, 1.0, -3.0, -3.0, 1.0, 1.0, 0.5],
      [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    ],
    nw: [
      [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
      [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
      [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
      [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
      [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
      [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
      [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
      [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
    ],
    bw: [
      [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
      [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
      [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
      [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
      [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
      [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
      [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
      [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    ],
    rw: [
      [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
      [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
      [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
      [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
      [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
      [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
      [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0],
    ],
    qw: [
      [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
      [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
      [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
      [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
      [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
      [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
      [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
      [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    ],
    kw: [
      [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
      [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
      [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
      [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
      [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
      [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
      [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
      [2.0, 4.0, 1.0, 0.0, 0.0, 1.0, 4.0, 2.0],
    ],
  };
  // Usamos esta función para invertir los valores posicionales para las piezas negras
  var reverseArray = function (array) {
    return array.slice().reverse();
  };
  // para las piezas negras
  positionValue.pb = reverseArray(positionValue.pw);
  positionValue.nb = reverseArray(positionValue.nw);
  positionValue.bb = reverseArray(positionValue.bw);
  positionValue.rb = reverseArray(positionValue.rw);
  positionValue.qb = reverseArray(positionValue.qw);
  positionValue.kb = reverseArray(positionValue.kw);

  // Buscamos cada pieza en el tablero para asignarle un valor total
  var boardValue = 0;
  // En cada fila
  board.forEach(function (row, rowIndex) {
    // En cada columna
    row.forEach(function (piece, colIndex) {
      // Si hay una pieza en esa casilla
      if (piece) {
        // Asignamos el valor de la pieza en función de su posición en el tablero
        var posValue =
          10 *
          positionValue[piece["type"] + piece["color"]][rowIndex][colIndex];

        // Sumamos (o restamos) el valor total de la pieza, según sea propia o del adversario de la AI
        boardValue +=
          (pieceValue[piece["type"]] + posValue) *
          (piece["color"] === color ? 1 : -1);
      }
    });
  });

  return boardValue;
};

//

/* Función que calcula la mejor jugada
  depth: profundidad de búsqueda en el árbol; normalmente definido en 3
  game: instancia de Chess, que permite obtener las posibles jugadas, las posiciones en el tablero, etc.
  playerColor: color de la AI ('w' ó 'b')
  alpha: valor mínimo para la poda alpha-beta (https://en.wikipedia.org/wiki/Alpha-beta_pruning)
  beta: valor ´maximo para la poda alpha-beta
  isMaximizingPlayer: true ó false, según se trate de MAX ó MIN (https://en.wikipedia.org/wiki/Minimax)
  positionMovesInitial: listado de posiciones iniciales asignadas tras el reparto entre los diferentes web workers
*/
var calcBestMove = function (
  depth,
  game,
  playerColor,
  alpha,
  beta,
  isMaximizingPlayer,
  positionMovesInitial
) {
  // Por cada posición evaluada, sumamos 1 en el contador
  positionCount++;

  // Variable que almacena el valor de la posición evaluada
  var value;

  // Variable que almacena la mejor posición (jugada) evaluada
  var bestMove = null;

  // Para una profundidad del árbol = 0, sólo se evalúa la situación actual
  if (depth === 0) {
    value = evaluateBoard(game.board(), playerColor);
    bestMove = game.moves()[0];
    return [value, bestMove];
  }

  // Para una profundidad del árbol > 0: búsqueda recursiva MINIMAX (https://en.wikipedia.org/wiki/Minimax):

  // Listado de las jugadas posibles. Al inicio se parte sólo de las posiciones iniciales asignadas tras el reparto entre los diferentes web workers; luego más en profundidad sí se toman todas las posibles jugadas
  var possibleMoves =
    positionMovesInitial && positionMovesInitial.length > 0
      ? positionMovesInitial
      : game.moves();

  // Mezclamos el listado para dar una cierta 'variabilidad' en la evaluación, de manera que no se repitan siempre las mismas evaluaciones
  possibleMoves.sort(function (a, b) {
    return 0.5 - Math.random();
  });

  // Variable que almacena el valor de comparación para cada posición. Por defecto, se asigna un valor infinito positivo o negativo según se trate de evaluación MAX ó MIN respectivamente
  var bestMoveValue = isMaximizingPlayer ? -99999999 : 99999999;

  // Búsqueda por cada jugada en el listado
  for (var i = 0; i < possibleMoves.length; i++) {
    var move = possibleMoves[i];

    // Simulamos el movimiento de manera "virtual" (no real, en el tablero) para poder evaluarla
    game.move(move);

    // Obtención recursiva del valor de esta jugada
    value = calcBestMove(
      depth - 1,
      game,
      playerColor,
      alpha,
      beta,
      !isMaximizingPlayer,
      false
    )[0];

    // Según si es MAX ó MIN, se compara el valor obtenido con el mejor dado hasta este momento
    if (isMaximizingPlayer) {
      // MAX
      if (value > bestMoveValue) {
        bestMoveValue = value;
        bestMove = move;
      }

      // Asignamos el valor máximo para alpha
      alpha = Math.max(alpha, value);
    } else {
      // MIN
      if (value < bestMoveValue) {
        bestMoveValue = value;
        bestMove = move;
      }

      // Asignamos el valor mínimo para beta
      beta = Math.min(beta, value);
    }

    // Como sólo 'simulamos' el movimiento, luego de ser evaluado es necesario deshacerlo
    game.undo();

    // Poda alfa-beta, para reducir las ramas del árbol con malos resultados (https://en.wikipedia.org/wiki/Alpha-beta_pruning)
    if (beta <= alpha) {
      break;
    }
  }

  // Retornamos un array con 2 elementos: mejor el valor obtenido y la mejor jugada
  return [bestMoveValue, bestMove || possibleMoves[0]];
};

// Función utilizada por el web worker para recibir mensajes
onmessage = function (answerToWorker) {
  // Vovemos a cero el contador de posiciones, antes de comenzar la evaluación
  positionCount = 0;

  // Actualizamos el 'game' con la posición actual en el tablero
  game.load(answerToWorker.data.fen);

  // Buscamos la mejor jugada
  var best = calcBestMove(
    answerToWorker.data.depth,
    game,
    answerToWorker.data.aiColor,
    -999999,
    999999,
    true,
    answerToWorker.data.possibleMoves
  );

  // Usamos esta función del web worker para devolver los resultados
  postMessage({
    positionCount: positionCount, // cantidad total de posiciones evaluadas
    bestMove: {
      // Mejor jugada obtenida
      val: best[0], // valor
      mov: best[1], // la jugada propia
    },
  });
};
