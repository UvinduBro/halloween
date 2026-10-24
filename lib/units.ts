import type { Unit } from "./store";

const CM_PER_IN = 2.54;

function trim(n: number, digits: number) {
  const s = n.toFixed(digits);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** Format a length given in centimetres. */
export function fmtLen(cm: number, unit: Unit, digits = 1): string {
  if (unit === "in") return `${trim(cm / CM_PER_IN, digits)} in`;
  return `${trim(cm, digits)} cm`;
}

/** Format a bare number (no unit suffix) converted to the active unit. */
export function convNum(cm: number, unit: Unit, digits = 1): string {
  return unit === "in" ? trim(cm / CM_PER_IN, digits) : trim(cm, digits);
}

export function fmtRange(a: number, b: number, unit: Unit, digits = 1): string {
  return `${convNum(a, unit, digits)}–${convNum(b, unit, digits)} ${unit}`;
}

export function fmtMm(mm: number, unit: Unit): string {
  return unit === "in" ? `${trim(mm / 25.4, 2)} in` : `${trim(mm, 1)} mm`;
}

export function fmtM(m: number, unit: Unit): string {
  return unit === "in" ? `${trim(m * 3.28084, 1)} ft` : `${trim(m, 2)} m`;
}

export function fmtM2(m2: number, unit: Unit): string {
  return unit === "in" ? `${trim(m2 * 10.7639, 0)} ft²` : `${trim(m2, 1)} m²`;
}

export function fmtMl(ml: number, unit: Unit): string {
  return unit === "in" ? `${trim(ml / 29.5735, 0)} fl oz` : `${trim(ml, 0)} ml`;
}

export function toCm(value: number, unit: Unit): number {
  return unit === "in" ? value * CM_PER_IN : value;
}

export function fromCm(cm: number, unit: Unit): number {
  return unit === "in" ? cm / CM_PER_IN : cm;
}

export type TextVars = Record<string, number>;

/**
 * Text tokens used in the data files:
 *   {32}        → 32 cm (converted)
 *   {2.5–3}     → range in cm
 *   {$name}     → derived variable (cm) from the fit lab
 *   {$name|0}   → derived variable with 0 decimals
 *   {mm:25}     → millimetres
 *   {m:2.5}     → metres
 *   {m2:3}      → square metres
 *   {ml:500}    → millilitres
 *   {n:$name}   → derived plain number (no unit), e.g. a count or scale factor
 */
export const TOKEN_RE = /\{([^{}]+)\}/g;

export function renderToken(token: string, unit: Unit, vars: TextVars): string {
  const [rawBody, digitsStr] = token.split("|");
  const digits = digitsStr !== undefined ? Number(digitsStr) : 1;
  const body = rawBody.trim();
  const value = (s: string) => (s.startsWith("$") ? vars[s.slice(1)] ?? NaN : Number(s));

  const prefixed = body.match(/^(mm|m2|m|ml|n):(.+)$/);
  if (prefixed) {
    const v = value(prefixed[2]);
    switch (prefixed[1]) {
      case "mm":
        return fmtMm(v, unit);
      case "m":
        return fmtM(v, unit);
      case "m2":
        return fmtM2(v, unit);
      case "ml":
        return fmtMl(v, unit);
      case "n":
        return trim(v, digitsStr !== undefined ? digits : 2);
    }
  }
  const range = body.split("–");
  if (range.length === 2) return fmtRange(value(range[0]), value(range[1]), unit, digits);
  const v = value(body);
  if (Number.isNaN(v)) return `{${token}}`;
  return fmtLen(v, unit, digits);
}

export function renderText(text: string, unit: Unit, vars: TextVars = {}): string {
  return text.replace(TOKEN_RE, (_, t: string) => renderToken(t, unit, vars));
}
