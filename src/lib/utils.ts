import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const symbols = '!@#$%'
  let pwd = ''
  for (let i = 0; i < 8; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  pwd += symbols[Math.floor(Math.random() * symbols.length)]
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

export const cargoLabel = (cargo: string): string => {
  const map: Record<string, string> = {
    root: 'Root',
    admin: 'Admin',
    gestor: 'Gestor',
    aprovador: 'Aprovador',
    analista: 'Analista',
    viewer: 'Viewer',
  }
  return map[cargo] ?? cargo
}

export const cargoBadgeClass = (cargo: string): string => {
  const map: Record<string, string> = {
    root: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-950 dark:border-slate-700',
    admin: 'bg-blue-900 text-white border-blue-900 dark:bg-blue-950 dark:border-blue-700',
    gestor: 'bg-blue-500 text-white border-blue-500',
    aprovador: 'bg-violet-600 text-white border-violet-600',
    analista: 'bg-emerald-500 text-white border-emerald-500',
    viewer: 'bg-slate-400 text-white border-slate-400',
  }
  return map[cargo] ?? 'bg-muted text-muted-foreground'
}

export const nivelFromCargo = (cargo: string): number => {
  const map: Record<string, number> = { root: 0, admin: 1, gestor: 2, aprovador: 2, analista: 3, viewer: 4 }
  return map[cargo] ?? 4
}
