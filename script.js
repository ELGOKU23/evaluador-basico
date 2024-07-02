// Diccionario para almacenar las variables y sus valores
const tablaDeSimbolos = {};

// Clase Escáner para tokenización
class Escaner {
  constructor(codigo) {
    this.codigo = codigo;
    this.TipoToken = {
      PALABRA_RESERVADA: "PALABRA_RESERVADA",
      ID: "ID",
      NUM: "NUM",
      OPERADOR: "OPERADOR",
      SIMBOLO: "SIMBOLO",
      DESCONOCIDO: "DESCONOCIDO",
      EOF: "EOF"
    };
    this.palabrasReservadas = ["entero", "real", "si", "sino", "mientras", "fmientras", "fsi", "imprime", "verdadero", "falso"];
    this.linea = 1;
    this.generadorDeTokens = null;
    this.ultimoToken = null;
  }

  *obtenerGenerador() {
    let lexema = "";
    for (let i = 0; i < this.codigo.length; i++) {
      const char = this.codigo[i];

      if (char === '\n') {
        if (lexema) {
          yield this.clasificarLexema(lexema);
          lexema = "";
        }
        yield this.clasificarLexema('\n');
        this.linea++;
      } else if (char.match(/[\s,()=+\-*/^<>|&]/)) {
        if (lexema) {
          yield this.clasificarLexema(lexema);
          lexema = "";
        }
        if (!char.match(/\s/)) {
          yield this.clasificarLexema(char);
        }
      } else if (char.match(/[a-zA-Z0-9\.]/)) {
        lexema += char;
      } else if (char) {
        yield this.clasificarLexema(char);
      }
    }
    if (lexema) {
      yield this.clasificarLexema(lexema);
    }
  }

  clasificarLexema(lexema) {
    if (this.palabrasReservadas.includes(lexema)) {
      return { type: this.TipoToken.PALABRA_RESERVADA, value: lexema, linea: this.linea };
    }
    if (lexema.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      return { type: this.TipoToken.ID, value: lexema, linea: this.linea };
    }
    if (lexema.match(/^[0-9]+(\.[0-9]+)?$/)) {
      return { type: this.TipoToken.NUM, value: lexema, linea: this.linea };
    }
    if (lexema.match(/[=+\-*/^<>|&]/)) {
      return { type: this.TipoToken.OPERADOR, value: lexema, linea: this.linea };
    }
    if (lexema.match(/[\n,()]/)) {
      return { type: this.TipoToken.SIMBOLO, value: lexema, linea: this.linea };
    }
    let tokenDesconocido = { type: this.TipoToken.DESCONOCIDO, value: lexema, linea: this.linea };
    console.error("Error Léxico", tokenDesconocido);
    return tokenDesconocido;
  }

  obtenerToken() {
    if (!this.generadorDeTokens) {
      this.generadorDeTokens = this.obtenerGenerador();
    }

    const result = this.generadorDeTokens.next();
    let tokenActual;
    if (!result.done) {
      tokenActual = result.value;
      if (!(tokenActual.value === "\n" && (this.ultimoToken == null || this.ultimoToken.value === "\n"))) {
        this.ultimoToken = result.value;
        return result.value;
      } else {
        return this.obtenerToken();
      }
    } else {
      return { type: this.TipoToken.EOF, value: 'EOF', linea: this.linea };
    }
  }
}

// Clase Analizador para análisis sintáctico
class Analizador {
  constructor(tokens) {
    this.tokens = tokens;
    this.tokenActual = null;
    this.indice = 0;
    this.banderaDeError = false;
  }

  escanear() {
    if (this.indice < this.tokens.length) {
      this.tokenActual = this.tokens[this.indice];
      this.indice++;
    } else {
      this.tokenActual = { type: 'EOF', value: 'EOF' }; // Fin de entrada
    }
  }

  principal() {
    this.escanear();
    this.expresion();
    if (this.tokenActual.type === 'EOF' && !this.banderaDeError) {
      console.log("Cadena válida");
    } else {
      console.log("Error en la cadena");
    }
  }

  expresion() {
    this.termino();
    this.z();
  }

  z() {
    if (this.tokenActual.type === 'OPERADOR' && ['+', '-'].includes(this.tokenActual.value)) {
      this.escanear();
      this.expresion();
    } else if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === ')') {
      // transición epsilon
    } else if (this.tokenActual.type === 'EOF') {
      // transición epsilon
    } else {
      this.error();
    }
  }

  termino() {
    this.factor();
    this.x();
  }

  x() {
    if (this.tokenActual.type === 'OPERADOR' && ['*', '/'].includes(this.tokenActual.value)) {
      this.escanear();
      this.termino();
    } else if (this.tokenActual.type === 'OPERADOR' && ['+', '-'].includes(this.tokenActual.value)) {
      // transición epsilon
    } else if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === ')') {
      // transición epsilon
    } else if (this.tokenActual.type === 'EOF') {
      // transición epsilon
    } else {
      this.error();
    }
  }

  factor() {
    if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === '(') {
      this.escanear();
      this.expresion();
      if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === ')') {
        this.escanear();
      } else {
        this.error();
      }
    } else if (this.tokenActual.type === 'NUM') {
      this.escanear();
    } else if (this.tokenActual.type === 'ID') {
      this.escanear();
    } else {
      this.error();
    }
  }

  error() {
    console.log("Error en la cadena");
    this.banderaDeError = true;
  }
}

// Función para analizar expresiones aritméticas
function analizarExpresion(tokens) {
  const parser = new Analizador(tokens);
  parser.principal();
  if (parser.banderaDeError) {
    throw new Error("Expresión inválida.");
  }
}

function escanearExpresion(expresion) {
  const escaner = new Escaner(expresion);
  const tokens = [];
  let token = escaner.obtenerToken();
  while (token.type !== escaner.TipoToken.EOF) {
    tokens.push(token);
    token = escaner.obtenerToken();
  }
  return tokens;
}

function evaluarExpresion() {
  const expresion = document.getElementById('expression').value.trim();
  const elementoResultado = document.getElementById('result');
  // Limpiar los resultados previos
  elementoResultado.innerHTML = '';

  // Limpiar la tabla de símbolos
  Object.keys(tablaDeSimbolos).forEach(key => delete tablaDeSimbolos[key]);

  // Dividir las expresiones por ';' o saltos de línea
  const expresiones = expresion.split(/;|\n/);

  try {
    expresiones.forEach(expr => {
      expr = expr.trim();
      if (expr) {
        const match = expr.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)/); // Corregido el patrón de expresión regular
        if (match) {
          const nombreVar = match[1];
          const valorExpr = match[2];
          const tokensExpr = escanearExpresion(valorExpr);
          analizarExpresion(tokensExpr);
          const resultado = evaluarTokens(tokensExpr);
          tablaDeSimbolos[nombreVar] = resultado;
        } else {
          // Evaluar una expresión
          const tokensExpr = escanearExpresion(expr);
          analizarExpresion(tokensExpr);
        }
      }
    });

    // Actualizar la sección de resultados
    actualizarResultados();
  } catch (error) {
    elementoResultado.innerText = `Error: ${error.message}`;
  }
}

function evaluarTokens(tokens) {
  const expr = tokens.map(token => {
    if (token.type === 'ID') {
      if (tablaDeSimbolos.hasOwnProperty(token.value)) {
        return tablaDeSimbolos[token.value];
      } else {
        throw new Error(`Variable ${token.value} no definida`);
      }
    }
    return token.value;
  }).join(' ');
  return eval(expr);
}

function actualizarResultados() {
  const elementoResultado = document.getElementById('result');
  elementoResultado.innerHTML = '';
  for (const [key, value] of Object.entries(tablaDeSimbolos)) {
    elementoResultado.innerHTML += `${key} = ${value}\n`;
  }
}

function mostrarTokens() {
  const expresion = document.getElementById('expression').value.trim();
  const elementoTokens = document.getElementById('tokens');
  const tokens = escanearExpresion(expresion);

  elementoTokens.innerHTML = tokens.map(token => 
    `Tipo: ${token.type}, Valor: ${token.value}, Línea: ${token.linea}`).join('\n');
}
