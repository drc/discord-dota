export const toast = $state({
  text: '',
  kind: 'success' as 'success' | 'error',
  visible: false,
});

let timer: ReturnType<typeof setTimeout> | undefined = undefined;

export function showToast(text: string, kind: 'success' | 'error'): void {
  toast.text = text;
  toast.kind = kind;
  toast.visible = true;
  clearTimeout(timer);
  timer = setTimeout(() => (toast.visible = false), 3000);
}
