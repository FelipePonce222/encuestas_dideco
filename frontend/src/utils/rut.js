// ---------------------------------------------------------------------------
// Utilidades de RUT (misma lógica que backend/rut_utils.py).
// Formato único del sistema: 12345678-5  (sin puntos, con guion, K mayúscula)
// ---------------------------------------------------------------------------

// Convierte cualquier forma de escribir un RUT al formato del sistema.
//   '12.345.678-5' | '123456785' | '12345678 5'  ->  '12345678-5'
//   '7.654.321-k'                                ->  '7654321-K'
// Si el texto no parece un RUT, se devuelve tal cual (sin espacios sobrantes).
export function normalizarRut(texto) {
  const original = String(texto ?? '').trim();
  const limpio = original.replace(/[.\s-]/g, '').toUpperCase();

  if (/^\d{1,9}[\dK]$/.test(limpio)) {
    const cuerpo = limpio.slice(0, -1).replace(/^0+/, '') || '0';
    return `${cuerpo}-${limpio.slice(-1)}`;
  }
  return original;
}

// Dígito verificador (módulo 11) de la parte numérica del RUT.
export function calcularDv(cuerpo) {
  let suma = 0;
  let factor = 2;
  for (const digito of String(cuerpo).split('').reverse()) {
    suma += Number(digito) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

// true si el RUT tiene formato correcto y su dígito verificador coincide.
export function validarRut(texto) {
  const rut = normalizarRut(texto);
  if (!/^\d{1,9}-[\dK]$/.test(rut)) return false;
  const [cuerpo, dv] = rut.split('-');
  if (Number(cuerpo) === 0) return false;
  return calcularDv(cuerpo) === dv;
}