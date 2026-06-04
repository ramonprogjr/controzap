/** Remove BOM, trim e caracteres fora de ISO-8859-1 (headers HTTP no browser). */
export function toHeaderSafeLatin1(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[^\u0000-\u00FF]/g, "");
}
