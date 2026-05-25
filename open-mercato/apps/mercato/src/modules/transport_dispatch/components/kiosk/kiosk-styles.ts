/** Shared kiosk Tailwind class strings — supermarket / self-checkout density */
export const kiosk = {
  shell: 'min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900',
  header: 'sticky top-0 z-20 border-b bg-white/90 dark:bg-slate-950/90 backdrop-blur px-4 py-3',
  title: 'text-2xl sm:text-3xl font-bold tracking-tight',
  subtitle: 'text-sm text-muted-foreground',
  progress: 'text-lg font-semibold tabular-nums',
  grid3: 'grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4',
  grid2: 'grid grid-cols-2 gap-4',
  footer:
    'fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 dark:bg-slate-950/95 backdrop-blur p-4 flex gap-3 max-w-3xl mx-auto',
  btnPrimary:
    'flex-1 min-h-[56px] rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-[0.98] transition',
  btnSecondary:
    'min-h-[56px] px-6 rounded-2xl text-lg font-semibold border-2 bg-white dark:bg-slate-900 active:scale-[0.98] transition',
  tile:
    'rounded-2xl border-2 bg-white dark:bg-slate-900 p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] transition active:scale-[0.97]',
  tileActive: 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-md',
  tileIdle: 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
  yesNo:
    'min-h-[120px] rounded-2xl text-2xl font-bold border-2 flex items-center justify-center active:scale-[0.97] transition',
  statBig: 'text-5xl sm:text-6xl font-black tabular-nums leading-none',
  statLabel: 'text-sm uppercase tracking-wide text-muted-foreground font-medium',
  card:
    'block rounded-2xl border-2 bg-white dark:bg-slate-900 p-5 hover:border-emerald-400 hover:shadow-lg transition active:scale-[0.99]',
  badgeMixed: 'inline-flex px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-900',
}
