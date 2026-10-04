// Misma regla que App\Core\Tenancy\Domain\Ruc: prefijo, 11 dígitos y dígito verificador módulo 11.
const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function isValidRuc(ruc: string): boolean {
  if (!/^(10|15|17|20)\d{9}$/.test(ruc)) {
    return false;
  }

  const sum = WEIGHTS.reduce((total, weight, i) => total + Number(ruc[i]) * weight, 0);
  const check = (11 - (sum % 11)) % 10;

  return Number(ruc[10]) === check;
}

/** "La Casona de Jesús" → "la-casona-de-jesus" */
export function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}
