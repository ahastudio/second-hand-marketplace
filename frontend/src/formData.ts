export function readText(form: FormData, fieldName: string): string {
  return String(form.get(fieldName))
}
