var ChessApp = function () {
  "use strict";

  /* 1)- VARIABLES GLOBALES ***************************************************************************/

  var DEPTH = 3, // Nivel de profundidad de evaluación de la IA
    AI_COLOR = "black", // Colores por defecto de cada jugador
    HUMAN_COLOR = "white",
    PGN = "", // texto en formato PGN que describe el estado del tablero (piezas existentes y sus posiciones)
    MESSAGE = "", // Mensajes mostrados al jugador mediante la UI
    THEME = "a", // Tema de colores de los casilleros (a ó b)
    PIECES = "wikipedia", // Tema de piezas (wikipedia ó freepik)
    STATS = {
      // Estadísticas de posiciones y tiempo
      P: "-",
      T: "-",
      PPS: "-",
    },
    // Creamos 'GAME', una instancia de "Chess", que permite obtener las posibles jugadas, las posiciones en el tablero, etc.
    GAME = new Chess(),
    // Aquí guardaremos nuestra instancia de 'chessBoard', para obtener la interfaz gráfica que necesitamos
    BOARD,
    // Usamos esta variable para indicar cuando la AI está evaluando
    THINKING = false,
    // Usamos esta variable STORE para almacenar/recuperar datos en localstore del navegador
    STORE = {
      save: function () {
        var o = {
          DEPTH: DEPTH,
          AI_COLOR: AI_COLOR,
          PGN: PGN,
          MESSAGE: MESSAGE,
          THEME: THEME,
          PIECES: PIECES,
          STATS: STATS,
        };
        localStorage.setItem("chessapp", JSON.stringify(o));
      },
      restore: function () {
        var str = localStorage.getItem("chessapp");
        if (str) {
          var obj = JSON.parse(str);
          DEPTH = obj.DEPTH;
          AI_COLOR = obj.AI_COLOR;
          HUMAN_COLOR = obj.AI_COLOR === "white" ? "black" : "white";
          PGN = obj.PGN;
          MESSAGE = obj.MESSAGE;
          THEME = obj.THEME;
          PIECES = obj.PIECES;
          STATS = obj.STATS;
        }
      },
      clear: function () {
        localStorage.removeItem("chessapp");
      },
    };

  // Actualizamos las variables globales desde "localstore"
  STORE.restore();

  /* 2)- AI ***************************************************************************/

  // Creamos una variable CHESS_AI para almacenar todos los métodos de la AI
  var CHESS_AI = (function () {
    // En la variable local "getCallback" almacenaremos una función que nos permitirá recuperar el resultado de la evaluación
    var getCallback = function () {};

    // Creamos un objeto, que luego retornaremos a la variable CHESS_AI previo haber completado todos sus métodos
    var CH_AI = {
      // Con el método "get" podremos almacenar en "getCallback" la función que nos permitirá recuperar el resultado de la evaluación
      get: function (callback) {
        getCallback = callback;
      },
    };

    var game = new Chess(), // Creamos 'game', una instancia de "Chess" local, que permite obtener las posibles jugadas, las posiciones en el tablero, etc.
      numMove = 0, // cantidad de movimientos en toda la partida
      numWorkers = 4, // cantidad de web workers que utilizaremos para dividir el trabajo de evaluación (y optimizar los tiempos de respuesta)
      positionCount = 0, // Esta variable nos permitirá guardar la cantidad total de posiciones evaluadas
      bestMoves = [], // En esta array guardaremos las mejores posiciones obtenidas por cada web worker
      startTime, // El tiempo en el que se inicia la evaluación de posiciones
      endTime, // El tiempo en el que termina la evaluación de posiciones
      moveTime, // La diferencia de tiempos (duración del proceso de evaluación)
      positionsPerS, // Performance (cantidad de posiciones por segundo evaluadas)
      thinking; // Con esta variable podemos saber cuantos web workers faltan que devuelvan sus resultados de evaluación

    // Función que se ejecuta cuando un web worker envía un mensaje con el resultado de su evaluación
    var onResult = function (responseWorker) {
      // Sumamos el número de posiciones evaluadas por el web worker
      positionCount += responseWorker.data.positionCount;

      // Guardamos la mejor jugada devuelta
      bestMoves.push(responseWorker.data.bestMove);

      // Un web worker menos 'evaluando'
      thinking--;

      if (thinking <= 0) {
        // Si todos los web workers han devuelto sus resultados
        // tiempo en el que termina la evaluación
        endTime = new Date().getTime();

        // tiempo total (en segundos) que tardó la evaluación
        moveTime = (endTime - startTime) / 1000;

        // Posiciones por segundo evaluadas
        positionsPerS = Math.round(positionCount / moveTime);

        var bestMove = null; // En esta variable almacenaremos la mejor jugada encontrada por la IA

        if (numMove > 0) {
          // Si no es la primera jugada

          // Seleccionamos la mejor jugada de las propuestas por cada web worker, basado en su "valor" (otorgado por IA)
          var maxValue = -999999999999999; // Partimos de un valor mínimo posible
          bestMoves.forEach(function (m) {
            if (m.val > maxValue) {
              maxValue = m.val;
              bestMove = m.mov;
            }
          });
        } else {
          // Si es la primera jugada, se selecciona un movimiento al azar
          var r = Math.floor(Math.random() * (numWorkers + 1));
          bestMove = bestMoves[r].mov;
        }

        // Usamos esta función del web worker para devolver los resultados
        getCallback({
          positionCount: positionCount, // cantidad total de posiciones evaluadas
          moveTime: moveTime, // tiempo total (en segundos) que tardó la evaluación
          positionsPerS: positionsPerS, // posiciones por segundo evaluadas
          bestMove: bestMove, // mejor jugada obtenida
        });
        numMove++; // Aumento el número de jugadas
      }
    };

    // Array en la que almacenamos los web workers
    var workers = [];

    // Creamos los web workers
    for (var i = 0; i < numWorkers; i++) {
      // Nuevo web worker
      var newWorker = new Worker("js/ai_evaluator.js");

      // Asignamos 'onResult' para que se ejecute cuando se envíe un mensaje
      newWorker.onmessage = onResult;

      // Guardamos el web worker
      workers.push(newWorker);
    }

    // Función utilizada por el web worker para recibir mensajes
    CH_AI.post = function (data) {
      if (data.newGame) {
        numMove = 0;
      } else {
        // Actualizamos 'game' a la posición actual
        game.load(data.fen);

        // Usamos esta función para dividir el listado de posiciones entre los web workers
        var chunkArray = function (myArray, chunk_size) {
          var index = 0;
          var arrayLength = myArray.length;
          var tempArray = [];

          for (index = 0; index < arrayLength; index += chunk_size) {
            var myChunk = myArray.slice(index, index + chunk_size);
            tempArray.push(myChunk);
          }
          return tempArray;
        };

        // Obtenemos todas las jugadas posibles
        var possibleMoves = game.moves();

        // Mezclamos el listado para dar una cierta 'variabilidad' a la evaluación, de manera que no se repitan siempre las mismas evaluaciones
        possibleMoves.sort(function (a, b) {
          return 0.5 - Math.random();
        });

        // Obtenemos un array con los listados para cada worker
        var arrayOfPositions = chunkArray(
          possibleMoves,
          Math.ceil(possibleMoves.length / numWorkers)
        );

        // Asignamos valores iniciales a las variables, antes de llamar a los workers para la evaluación
        positionCount = 0;
        bestMoves = [];
        startTime = new Date().getTime();
        thinking = numWorkers;

        // Activamos todos los web workers, y esperamos las respuestas
        workers.forEach(function (w, j) {
          var arr = arrayOfPositions[j] || [];

          // Enviamos al web worker las variables necesarias para que devuelva su evaluación
          w.postMessage({
            aiColor: data.aiColor === "white" ? "w" : "b", // Color que utiliza la IA
            depth: data.depth, // Profundidad de análisis de la IA (cuanto más profundidad, el tiempo de evaluación crece de manera exponencial)
            fen: data.fen, // Posiciones actuales de las piezas
            possibleMoves: arr, // Lista de posibles movimientos que evaluará este web worker
          });
        });
      }
    };

    return CH_AI; // Retornamos el objeto con sus métodos a "CHESS_AI"
  })();

  /* 3)- UI ***************************************************************************/

  // Objeto en el que almacenaremos todas las secciones de la UI
  var UI = {};

  // Vista de presentación de la aplicación
  UI.Presentation = (function () {
    var shown = true, // <- Set to TRUE
      P = {
        elem: $("#presentation"),
        animElems: $("#presentation .an-top"),
        toggle: function () {
          if (shown) {
            shown = false;
            this.elem.removeClass("shown");
            setTimeout(function () {
              P.animElems.removeClass("ready");
            }, 600);
          } else {
            shown = true;
            this.elem.addClass("shown");
            setTimeout(function () {
              P.animElems.addClass("ready");
            }, 500);
          }
        },
      };
    P.elem.click(function () {
      P.toggle();
    });
    setTimeout(function () {
      P.animElems.addClass("ready");
    }, 50);
    return P;
  })();

  var CHANGED_COLOR = false; // Si los colores por defecto (human = white, ia = black) están cambiados

  // Vista de menú
  UI.Menu = (function () {
    var shown = false,
      M = {
        elem: $("#menu"),
        animElems: $("#menu .an-left"),
        toggle: function () {
          if (shown) {
            shown = false;
            this.elem.removeClass("shown");
            M.animElems.removeClass("ready");
            setTimeout(function () {
              if (CHANGED_COLOR) {
                CHANGED_COLOR = false;
                getAIMove();
              }
            }, 800);
          } else {
            if (!THINKING) {
              shown = true;
              this.elem.addClass("shown");
              setTimeout(function () {
                M.animElems.addClass("ready");
              }, 300);
            }
          }
        },
      };
    return M;
  })();

  $(".toggle-menu").click(function () {
    UI.Menu.toggle();
  });
  $(".toggle-presentation").click(function () {
    UI.Presentation.toggle();
  });

  // Vista de opciones
  UI.Options = {};

  // Vista de opciones: tema
  UI.Options.Theme = (function () {
    var $container = $("#board-container");
    var O = {
      elems: $("#opt-theme .th-box"),
      set: function (theme) {
        this.elems
          .removeClass("current")
          .filter(".th-box-" + theme)
          .addClass("current");
        THEME = theme;
        $container
          .removeClass("theme-a")
          .removeClass("theme-b")
          .addClass("theme-" + THEME);
        STORE.save();
      },
    };
    O.elems.filter(".th-box-a").click(function () {
      O.set("a");
    });
    O.elems.filter(".th-box-b").click(function () {
      O.set("b");
    });
    return O;
  })();

  // Vista de opciones: piezas
  UI.Options.Pieces = (function () {
    var O = {
      elems: $("#opt-pieces .btn-op-col"),
      set: function (pieces) {
        this.elems
          .removeClass("current")
          .filter(".b-" + pieces)
          .addClass("current");
        if (pieces !== PIECES) {
          PIECES = pieces;
          STORE.save();
          createNewBoard();
        }
      },
    };
    O.elems.filter(".b-wikipedia").click(function () {
      O.set("wikipedia");
    });
    O.elems.filter(".b-freepik").click(function () {
      O.set("freepik");
    });
    return O;
  })();

  // Vista de opciones: color de jugador
  UI.Options.Color = (function () {
    var O = {
      elems: $("#opt-color .btn-op-col"),
      set: function (color) {
        this.elems
          .removeClass("current")
          .filter("." + color)
          .addClass("current");
        HUMAN_COLOR = color;
        AI_COLOR = color === "white" ? "black" : "white";
        if (BOARD) {
          // Orientamos el tablero según el color elegido
          BOARD.orientation(HUMAN_COLOR);
        }
        STORE.save();
      },
    };
    O.elems.filter(".white").click(function () {
      O.set("white");
      CHANGED_COLOR = true;
    });
    O.elems.filter(".black").click(function () {
      O.set("black");
      CHANGED_COLOR = true;
    });
    return O;
  })();

  // Vista de opciones: profundidad de la IA
  UI.Options.Depth = (function () {
    var O = {
      elems: $("#opt-depth .btn-op-depth"),
      set: function (depth) {
        this.elems
          .removeClass("current")
          .filter(".v" + depth)
          .addClass("current");
        DEPTH = depth;
        STORE.save();
      },
    };
    O.elems.click(function () {
      var depth = parseInt($(this).text(), 10);
      O.set(depth);
    });
    return O;
  })();

  // Vista de información
  UI.Info = {};

  // Vista de información: mensajes
  UI.Info.Messages = (function () {
    var O = {
      elems: $("#msg .mesg"),
      container: $("#board-container"),
      set: function (msg) {
        MESSAGE = msg;
        this.elems.hide();
        this.container.removeClass("think");
        if (msg) {
          MESSAGE = msg;
          this.elems.filter(".msg-" + msg).show();
          if (msg === "think") {
            this.container.addClass("think");
          }
        }
        STORE.save();
      },
    };
    return O;
  })();

  // Vista de información: estadísticas
  UI.Info.Stats = (function () {
    var $pCount = $("#position-count"),
      $time = $("#time"),
      $pps = $("#positions-per-s"),
      O = {
        set: function (obj) {
          $pCount.text(obj.positionCount);
          $time.text(obj.time);
          $pps.text(obj.positionsPerS);
          STATS.P = obj.positionCount;
          STATS.T = obj.time;
          STATS.PPS = obj.positionsPerS;
        },
      };
    return O;
  })();

  // Vista de información: historial
  UI.Info.Historial = (function () {
    var $history = $("#move-history"),
      O = {
        set: function (h) {
          var txt = "";
          if (h) {
            for (var i = 0; i < h.length; i++) {
              txt += h[i];
              if (i < h.length - 1) {
                txt += ", ";
              }
            }
          }
          $history.text(txt).scrollTop($history[0].scrollHeight);
          PGN = GAME.pgn();
          STORE.save();
        },
      };
    return O;
  })();

  // Comandos -> botones: nuevo juego
  UI.newGame = (function () {
    var O = {
      set: function () {
        newGame();
        if (HUMAN_COLOR === "black") {
          CHANGED_COLOR = true;
        } else {
          CHANGED_COLOR = false;
        }
      },
    };
    $("#btn-new-game").click(function () {
      O.set();
    });
    return O;
  })();

  // Comandos -> botones: deshacer jugada
  UI.undo = (function () {
    var O = {
      set: function () {
        undo();
      },
    };
    $("#btn-undo").click(function () {
      O.set();
    });
    return O;
  })();

  // Inicializamos la UI con los datos iniciales
  UI.Options.Theme.set(THEME);
  UI.Options.Pieces.set(PIECES);
  UI.Options.Color.set(HUMAN_COLOR);
  UI.Options.Depth.set(DEPTH);

  /* 4)- BOARD ***************************************************************************/

  // Configuración de nuestro tablero
  var boardConfig = {
    draggable: true, //podremos tomar las piezas y colocarlas en otra posición
  };

  // Funciones para controlar qué casillas se resaltan con color (ej: para movimientos posibles)
  var colorSquares = {
    current: function (square) {
      $("#board .square-" + square).addClass("current");
    },
    add: function (square) {
      $("#board .square-" + square).addClass("possible");
    },
    remove: function () {
      $("#board .square-55d63").removeClass("possible").removeClass("current");
    },
  };

  // Resaltamos las casillas para mostrar los posibles movimientos de cada pieza
  boardConfig.onMouseoverSquare = function (square, piece) {
    if (!THINKING) {
      // Si la AI no está evaluando
      // Obtenemos los movimientos posibles desde esa casilla
      var moves = GAME.moves({
        square: square,
        verbose: true,
      });

      if (moves.length === 0) return; // Si no hay movimientos posibles, no resalto ninguna casilla

      // resalto la casilla de origen
      colorSquares.current(square);

      // resalto las casillas de destino
      for (var i = 0; i < moves.length; i++) {
        colorSquares.add(moves[i].to);
      }
    }
  };

  // Quitamos el resalte de las casillas con mouse out
  boardConfig.onMouseoutSquare = colorSquares.remove;

  // Al terminar la interacción con el tablero, actualizamos las posiciones de las piezas
  boardConfig.onSnapEnd = function () {
    BOARD.position(GAME.fen());
  };

  // Al tomar una pieza del tablero
  boardConfig.onDragStart = function (source, piece, position, orientation) {
    // Sólo permitimos tomar las piezas del jugador humano
    var humanPieceSearch = AI_COLOR === "white" ? /^w/ : /^b/;

    // Si no se pueden tomar piezas:
    if (
      GAME.in_checkmate() === true || // En jaque mate
      GAME.in_draw() === true || // En tablas
      piece.search(humanPieceSearch) !== -1 || // Si no hay piezas del jugador humano para mover (Esto no debería ocurrir nunca)
      THINKING // Si la IA está evaluando
    ) {
      return false;
    }
  };

  // Al soltar una pieza en el tablero
  boardConfig.onDrop = function (source, target) {
    // Si la AI no está evaluando
    if (!THINKING) {
      // Ejecutamos el movimiento en el juego
      var move = GAME.move({
        from: source,
        to: target,
        promotion: "q", // por defecto, los peones promocionan a 'dama'
      });

      // Quitamos el resalte de las casillas
      colorSquares.remove();

      // Si no es posible ese movimiento
      if (move === null) {
        return "snapback";
      }

      if (GAME.in_check() === true) {
        // Si hay 'jaque'
        // Mostramos mensaje "Jaque!"
        UI.Info.Messages.set("check");
      } else {
        // No mostramos mensaje
        UI.Info.Messages.set(null);
      }

      // Actualizamos el historial
      UI.Info.Historial.set(GAME.history());

      // Llamamos a la AI para que ejecute su jugada
      getAIMove();
    }
  };

  /* 5)- INICIALIZACIÓN ***************************************************************************/

  // Funcion para iniciar el juego
  var newGame = function () {
    // Si la AI no está evaluando
    if (!THINKING) {
      // Reinicio de la vista de mensajes
      UI.Info.Messages.set(null);
      // Reinicio de la vista de historial
      UI.Info.Historial.set(null);
      // Reinicio de la vista de estadísticas
      UI.Info.Stats.set({
        positionCount: "-",
        time: "-",
        positionsPerS: "-",
      });

      // Limpiamos el tablero
      BOARD.clear();

      // Orientamos el tablero según el color elegido por el jugador humano
      BOARD.orientation(HUMAN_COLOR);

      // Reiniciamos el tablero
      BOARD.position("start");

      // Reiniciamos el juego
      GAME.reset();

      // Guardamos en localstorage del navegador los datos del juego
      STORE.save();

      // Reiniciamos la AI
      CHESS_AI.post({
        newGame: true,
      });
    }
  };

  // Funcion para deshacer una jugada
  var undo = function () {
    if (!THINKING && !GAME.game_over()) {
      // Si la AI no está evaluando, y no se ha llegado a un jaque mate
      // Deshacemos 2 jugadas atrás
      GAME.undo();
      GAME.undo();

      // Actualizamos la vista del tablero
      BOARD.position(GAME.fen());

      // Actualizamos el historial de movimientos
      UI.Info.Historial.set(GAME.history());
    }
  };

  // Función con la que nos comunicamos con la AI, para pedirle su mejor jugada
  var getAIMove = function () {
    if (GAME.game_over()) {
      // Si es el final del juego

      if (GAME.in_draw() || GAME.insufficient_material()) {
        // Si es tablas
        // Mostramos el mensaje "Tablas"
        UI.Info.Messages.set("draw");
        STORE.clear();
      } else {
        // Gana el jugador humano
        // Mostramos el mensaje "Jaque mate"
        UI.Info.Messages.set("checkmate-" + HUMAN_COLOR);
        STORE.clear();
      }
      return false;
    }

    // Marcamos la variable THINKING como 'evaluando'
    THINKING = true;

    // Mostramos el cartel 'Evaluando...'
    UI.Info.Messages.set("think");

    // Enviamos a la AI las variables necesarias para que devuelva su evaluación
    CHESS_AI.post({
      aiColor: AI_COLOR,
      depth: DEPTH,
      fen: GAME.fen(),
    });
  };

  // Recibimos de la AI el resultado de su evaluación
  CHESS_AI.get(function (data) {
    // Quito la marca de la variable como 'evaluando'
    THINKING = false;

    // Actualizamos la vista de estadísticas
    UI.Info.Stats.set({
      positionCount: data.positionCount, // Cantidad de posiciones evaluadas
      time: Math.round(data.moveTime * 10) / 10 + "s", // Tiempo consumido por la evaluación
      positionsPerS: data.positionsPerS, // Posiciones evaluadas por segundo
    });

    // Ejecutamos el movimento de la AI
    GAME.move(data.bestMove);

    // Actualizamos el tablero
    BOARD.position(GAME.fen());

    // Actualizamos la vista de historial
    UI.Info.Historial.set(GAME.history());

    if (GAME.game_over()) {
      // Si es el final del juego
      if (GAME.in_draw() || GAME.insufficient_material()) {
        // Si es tablas
        // Mostramos el mensaje "Tablas"
        UI.Info.Messages.set("draw");
        STORE.clear();
      } else {
        // Gana la IA
        // Mostramos el mensaje "Jaque mate"
        UI.Info.Messages.set("checkmate-" + AI_COLOR);
        STORE.clear();
      }
      return false;
    }

    if (GAME.in_check() === true) {
      // Si hay 'jaque'
      // Mostramos el mensaje "Jaque"
      UI.Info.Messages.set("check");
    } else {
      // Ocultamos el mensaje 'Evaluando'
      UI.Info.Messages.set(null);
    }
  });

  // Función para crear el tablero de juego
  var createNewBoard = function () {
    if (BOARD) BOARD.destroy(); // Si existe un tablero previo, lo eliminamos

    // Configuramos el tema de piezas elegido
    boardConfig.pieceTheme = "img/chesspieces/" + PIECES + "/{piece}.png";

    // Creamos el tablero
    BOARD = ChessBoard("board", boardConfig);

    // Actualizamos la vista del tablero a las posiciones actuales
    BOARD.position(GAME.fen());
  };

  // Inicializamos el tablero
  createNewBoard();

  if (PGN !== "") {
    // Si ya existe un juego previo (guardado en localhost del navegador)

    // Actualizamos las posiciones del juego según los datos guardados
    GAME.load_pgn(PGN);

    // Actualizamos la vista del tablero
    BOARD.position(GAME.fen());

    // Orientamos el tablero según el color elegido
    BOARD.orientation(HUMAN_COLOR);

    // Actualizamos la vista de historial
    UI.Info.Historial.set(GAME.history());

    // Actualizamos la vista de mensaje
    UI.Info.Messages.set(MESSAGE);

    // Actualizamos la vista de estadísticas
    UI.Info.Stats.set({
      positionCount: STATS.P,
      time: STATS.T,
      positionsPerS: STATS.PPS,
    });
  } else {
    // Inicializamos el juego
    newGame();
  }
};
/********************************************************************************/
// Inicializamos la aplicación
$("document").ready(ChessApp);
