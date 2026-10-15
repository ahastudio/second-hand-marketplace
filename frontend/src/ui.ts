const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50'

export const ui = {
  btnPrimary: `${buttonBase} bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500`,
  btnSecondary: `${buttonBase} border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400`,
  btnDanger: `${buttonBase} border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 active:bg-rose-100 focus-visible:ring-rose-400`,
  btnGhost: `${buttonBase} text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400`,
  input:
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
  label: 'flex flex-col gap-1.5 text-sm font-medium text-slate-700',
  card: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  alert: 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700',
}
