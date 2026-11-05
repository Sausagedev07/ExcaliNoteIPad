/**
 * Kleiner Parser für Funktionsterme f(x), ohne eval.
 *
 * Unterstützt: + − * / ^ (auch ², ³), Klammern, Vorzeichen, Dezimalkomma,
 * implizite Multiplikation (2x, 3(x+1), x sin(x)), Konstanten pi/π und e,
 * Funktionen sin cos tan asin acos atan sqrt/wurzel abs ln log exp.
 */

export type Fn = (x: number) => number;

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'var' }
  | { kind: 'neg'; arg: Node }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Node; right: Node }
  | { kind: 'call'; fn: (v: number) => number; arg: Node };

const FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sqrt: Math.sqrt,
  wurzel: Math.sqrt,
  abs: Math.abs,
  betrag: Math.abs,
  ln: Math.log,
  log: Math.log10,
  lg: Math.log10,
  exp: Math.exp,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, 'π': Math.PI, e: Math.E };

type Token =
  | { type: 'num'; value: number }
  | { type: 'name'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' };

export class ParseError extends Error {}

function tokenize(input: string): Token[] {
  const text = input
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/[·×]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/−/g, '-');
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9.,]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9.,]/.test(text[j])) j++;
      const value = Number(text.slice(i, j).replace(',', '.'));
      if (Number.isNaN(value)) throw new ParseError(`Ungültige Zahl „${text.slice(i, j)}“`);
      tokens.push({ type: 'num', value });
      i = j;
    } else if (/[a-zA-Zπäöü]/.test(ch)) {
      let j = i;
      while (j < text.length && /[a-zA-Zπäöü]/.test(text[j])) j++;
      tokens.push(...splitName(text.slice(i, j).toLowerCase()));
      i = j;
    } else if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
    } else if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
    } else if (ch === '[' || ch === '{') {
      tokens.push({ type: 'paren', value: '(' });
      i++;
    } else if (ch === ']' || ch === '}') {
      tokens.push({ type: 'paren', value: ')' });
      i++;
    } else {
      throw new ParseError(`Unbekanntes Zeichen „${ch}“`);
    }
  }
  return tokens;
}

/** „xsin“ → x, sin; „pix“ → pi, x; „2ex“ wird vom Aufrufer schon als Zahl + Name getrennt */
function splitName(name: string): Token[] {
  const tokens: Token[] = [];
  let rest = name;
  const known = [...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS), 'x'].sort((a, b) => b.length - a.length);
  while (rest) {
    const match = known.find((k) => rest.startsWith(k));
    if (!match) throw new ParseError(`Unbekannter Name „${rest}“`);
    tokens.push({ type: 'name', value: match });
    rest = rest.slice(match.length);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): Node {
    if (this.tokens.length === 0) throw new ParseError('Bitte einen Term eingeben');
    const node = this.sum();
    if (this.pos < this.tokens.length) throw new ParseError('Unerwartetes Zeichen im Term');
    return node;
  }

  private peek() {
    return this.tokens[this.pos];
  }

  private sum(): Node {
    let left = this.product();
    for (let t = this.peek(); t?.type === 'op' && (t.value === '+' || t.value === '-'); t = this.peek()) {
      this.pos++;
      left = { kind: 'bin', op: t.value as '+' | '-', left, right: this.product() };
    }
    return left;
  }

  /** Produkt, auch implizit: 2x, 3(x+1), x sin(x) */
  private product(): Node {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (t?.type === 'op' && (t.value === '*' || t.value === '/')) {
        this.pos++;
        left = { kind: 'bin', op: t.value as '*' | '/', left, right: this.unary() };
      } else if (t && (t.type === 'num' || t.type === 'name' || (t.type === 'paren' && t.value === '('))) {
        left = { kind: 'bin', op: '*', left, right: this.power() };
      } else {
        return left;
      }
    }
  }

  private unary(): Node {
    const t = this.peek();
    if (t?.type === 'op' && (t.value === '-' || t.value === '+')) {
      this.pos++;
      const arg = this.unary();
      return t.value === '-' ? { kind: 'neg', arg } : arg;
    }
    return this.power();
  }

  /** Potenz ist rechtsassoziativ und bindet stärker als das Vorzeichen: -x^2 = -(x^2) */
  private power(): Node {
    const base = this.atom();
    const t = this.peek();
    if (t?.type === 'op' && t.value === '^') {
      this.pos++;
      return { kind: 'bin', op: '^', left: base, right: this.unary() };
    }
    return base;
  }

  private atom(): Node {
    const t = this.peek();
    if (!t) throw new ParseError('Der Term ist unvollständig');
    this.pos++;
    if (t.type === 'num') return { kind: 'num', value: t.value };
    if (t.type === 'paren' && t.value === '(') {
      const inner = this.sum();
      const close = this.peek();
      if (close?.type !== 'paren' || close.value !== ')') throw new ParseError('Eine Klammer wird nicht geschlossen');
      this.pos++;
      return inner;
    }
    if (t.type === 'name') {
      if (t.value === 'x') return { kind: 'var' };
      if (t.value in CONSTANTS) return { kind: 'num', value: CONSTANTS[t.value] };
      const fn = FUNCTIONS[t.value];
      // sin x, sin(x), sin 2x: Argument ist das folgende Potenz-Atom
      return { kind: 'call', fn, arg: this.power() };
    }
    throw new ParseError('Unerwartetes Zeichen im Term');
  }
}

function evaluate(node: Node, x: number): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'var':
      return x;
    case 'neg':
      return -evaluate(node.arg, x);
    case 'call':
      return node.fn(evaluate(node.arg, x));
    case 'bin': {
      const a = evaluate(node.left, x);
      const b = evaluate(node.right, x);
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '^': return a < 0 && Number.isInteger(1 / b) && (1 / b) % 2 === 1 ? -Math.pow(-a, b) : Math.pow(a, b);
      }
    }
  }
}

/** Term (mit oder ohne „f(x) =“ bzw. „y =“) → Funktion; wirft ParseError mit deutscher Meldung */
export function parseFunction(input: string): Fn {
  const term = input.replace(/^\s*(?:[a-z]\s*\(\s*x\s*\)|y)\s*=/i, '');
  const node = new Parser(tokenize(term)).parse();
  return (x: number) => evaluate(node, x);
}
