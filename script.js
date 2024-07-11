// Diccionario para almacenar las variables y sus valores
const tablaDeSimbolos = {};

// Clase AFD para Identificadores
class AFDIdentificador {
  constructor() {
    this.estadoInicial = 0;
    this.estadosAceptacion = [1];
  }

  esEstadoDeAceptacion(estado) {
    return this.estadosAceptacion.includes(estado);
  }

  transicion(estado, caracter) {
    switch (estado) {
      case 0:
        if (caracter.match(/[a-zA-Z_]/)) return 1;
        break;
      case 1:
        if (caracter.match(/[a-zA-Z0-9_]/)) return 1;
        break;
    }
    return -1; // Estado de error
  }

  escanear(cadena) {
    let estado = this.estadoInicial;
    let i;
    for (i = 0; i < cadena.length; i++) {
      estado = this.transicion(estado, cadena[i]);
      if (estado === -1) break;
    }
    return this.esEstadoDeAceptacion(estado) ? cadena.slice(0, i) : '';
  }
}

// Clase AFD para Números
class AFDNumero {
  constructor() {
    this.estadoInicial = 0;
    this.estadosAceptacion = [1, 3];
  }

  esEstadoDeAceptacion(estado) {
    return this.estadosAceptacion.includes(estado);
  }

  transicion(estado, caracter) {
    switch (estado) {
      case 0:
        if (caracter.match(/[0-9]/)) return 1;
        break;
      case 1:
        if (caracter.match(/[0-9]/)) return 1;
        if (caracter === '.') return 2;
        break;
      case 2:
        if (caracter.match(/[0-9]/)) return 3;
        break;
      case 3:
        if (caracter.match(/[0-9]/)) return 3;
        break;
    }
    return -1; // Estado de error
  }

  escanear(cadena) {
    let estado = this.estadoInicial;
    let i;
    for (i = 0; i < cadena.length; i++) {
      estado = this.transicion(estado, cadena[i]);
      if (estado === -1) break;
    }
    return this.esEstadoDeAceptacion(estado) ? cadena.slice(0, i) : '';
  }
}

// Clase AFD para Operadores
class AFDOerador {
  constructor() {
    this.operadores = ["+", "-", "*", "/", "=", "<", ">", "|", "&"];
  }

  escanear(cadena) {
    for (let operador of this.operadores) {
      if (cadena.startsWith(operador)) {
        return operador;
      }
    }
    return '';
  }
}

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
    this.afdIdentificador = new AFDIdentificador();
    this.afdNumero = new AFDNumero();
    this.afdOperador = new AFDOerador();
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
    if (this.afdIdentificador.escanear(lexema)) {
      return { type: this.TipoToken.ID, value: lexema, linea: this.linea };
    }
    if (this.afdNumero.escanear(lexema)) {
      return { type: this.TipoToken.NUM, value: lexema, linea: this.linea };
    }
    if (this.afdOperador.escanear(lexema)) {
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
    this.ast = null;  // Nodo raíz del AST PARA EVALUAR LAS EXPRESIONES 
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
    this.ast = this.expresion();
    if (this.tokenActual.type === 'EOF' && !this.banderaDeError) {
      console.log("Cadena válida");
    } else {
      console.log("Error en la cadena");
    }
    return this.ast;  // Retornar el AST
  }

  expresion() {
    const nodoTermino = this.termino();
    return this.z(nodoTermino);
  }

  z(nodoIzquierdo) {
    if (this.tokenActual.type === 'OPERADOR' && ['+', '-'].includes(this.tokenActual.value)) {
      const operador = this.tokenActual.value;
      this.escanear();
      const nodoDerecho = this.expresion();
      return { type: 'binOp', operator: operador, left: nodoIzquierdo, right: nodoDerecho };
    } else if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === ')') {
      // transición epsilon
      return nodoIzquierdo;
    } else if (this.tokenActual.type === 'EOF') {
      // transición epsilon
      return nodoIzquierdo;
    } else {
      this.error();
      return null;
    }
  }

  termino() {
    const nodoFactor = this.factor();
    return this.x(nodoFactor);
  }

  x(nodoIzquierdo) {
    if (this.tokenActual.type === 'OPERADOR' && ['*', '/'].includes(this.tokenActual.value)) {
      const operador = this.tokenActual.value;
      this.escanear();
      const nodoDerecho = this.termino();
      return { type: 'binOp', operator: operador, left: nodoIzquierdo, right: nodoDerecho };
    } else if (this.tokenActual.type === 'OPERADOR' && ['+', '-'].includes(this.tokenActual.value)) {
      // transición epsilon
      return nodoIzquierdo;
    } else if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === ')') {
      // transición epsilon
      return nodoIzquierdo;
    } else if (this.tokenActual.type === 'EOF') {
      // transición epsilon
      return nodoIzquierdo;
    } else {
      this.error();
      return null;
    }
  }

  factor() {
    if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === '(') {
      this.escanear();
      const nodoExpresion = this.expresion();
      if (this.tokenActual.type === 'SIMBOLO' && this.tokenActual.value === ')') {
        this.escanear();
        return nodoExpresion;
      } else {
        this.error();
        return null;
      }
    } else if (this.tokenActual.type === 'NUM') {
      const nodoNumero = { type: 'num', value: parseFloat(this.tokenActual.value) };
      this.escanear();
      return nodoNumero;
    } else if (this.tokenActual.type === 'ID') {
      const nodoVariable = { type: 'var', name: this.tokenActual.value };
      this.escanear();
      return nodoVariable;
    } else {
      this.error();
      return null;
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
  const ast = parser.principal();
  if (parser.banderaDeError) {
    throw new Error("Expresión inválida.");
  }
  return ast;
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
          const ast = analizarExpresion(tokensExpr);
          const resultado = evaluarAST(ast);
          tablaDeSimbolos[nombreVar] = resultado;
        } else {
          // Evaluar una expresión
          const tokensExpr = escanearExpresion(expr);
          const ast = analizarExpresion(tokensExpr);
          const resultado = evaluarAST(ast);
          console.log(resultado);
        }
      }
    });

    // Actualizar la sección de resultados
    actualizarResultados();
  } catch (error) {
    elementoResultado.innerText = `Error: ${error.message}`;
  }
}

function evaluarAST(nodo) {
  if (nodo.type === 'num') {
    return nodo.value;
  } else if (nodo.type === 'var') {
    if (tablaDeSimbolos.hasOwnProperty(nodo.name)) {
      return tablaDeSimbolos[nodo.name];
    } else {
      throw new Error(`Variable ${nodo.name} no definida`);
    }
  } else if (nodo.type === 'binOp') {
    const leftValue = evaluarAST(nodo.left);
    const rightValue = evaluarAST(nodo.right);
    switch (nodo.operator) {
      case '+':
        return leftValue + rightValue;
      case '-':
        return leftValue - rightValue;
      case '*':
        return leftValue * rightValue;
      case '/':
        if (rightValue === 0) {
          throw new Error("División por cero");
        }
        return leftValue / rightValue;
      default:
        throw new Error(`Operador desconocido: ${nodo.operator}`);
    }
  } else {
    throw new Error(`Tipo de nodo desconocido: ${nodo.type}`);
  }
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
