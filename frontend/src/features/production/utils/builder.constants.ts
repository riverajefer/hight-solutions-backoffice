import {
  FileText,
  Printer,
  Package,
  Palette,
  Sparkles,
  Scissors,
  Settings as Cog,
  CheckCircle,
  PenTool as Wrench, // Using PenTool as Wrench equivalent from standard lucide
  BoxSelect,
  Layers,
  LucideIcon
} from 'lucide-react';

export const STEP_CATEGORIES = [
  { id: '1', name: 'Materiales', types: ['PAPEL', 'PLANCHAS', 'CARTON'] },
  { id: '2', name: 'Procesos', types: ['MUESTRA_COLOR', 'PLASTIFICADO', 'CORTE'] },
  { id: '3', name: 'Especiales', types: ['TROQUEL'] },
  { id: '4', name: 'Control', types: ['REVISION'] },
  { id: '5', name: 'Ensamble', types: ['ARMADO'] },
  { id: '6', name: 'Despacho', types: ['EMPAQUE'] },
];

export const STEP_CATEGORY_STYLES: Record<string, { lightBg: string; lightText: string; lightBgColor: string; darkBg: string; darkText: string; darkBgColor: string; icon: LucideIcon }> = {
  PAPEL:          { lightBg: 'rgba(20, 184, 166, 0.1)', lightText: '#0f766e', lightBgColor: '#f0fdfa', darkBg: 'rgba(20, 184, 166, 0.2)', darkText: '#5eead4', darkBgColor: 'rgba(20, 184, 166, 0.3)', icon: FileText },
  PLANCHAS:       { lightBg: 'rgba(20, 184, 166, 0.1)', lightText: '#0f766e', lightBgColor: '#f0fdfa', darkBg: 'rgba(20, 184, 166, 0.2)', darkText: '#5eead4', darkBgColor: 'rgba(20, 184, 166, 0.3)', icon: Printer },
  CARTON:         { lightBg: 'rgba(20, 184, 166, 0.1)', lightText: '#0f766e', lightBgColor: '#f0fdfa', darkBg: 'rgba(20, 184, 166, 0.2)', darkText: '#5eead4', darkBgColor: 'rgba(20, 184, 166, 0.3)', icon: Package },
  MUESTRA_COLOR:  { lightBg: 'rgba(139, 92, 246, 0.1)', lightText: '#6d28d9', lightBgColor: '#f5f3ff', darkBg: 'rgba(139, 92, 246, 0.2)', darkText: '#c4b5fd', darkBgColor: 'rgba(139, 92, 246, 0.3)', icon: Palette },
  PLASTIFICADO:   { lightBg: 'rgba(139, 92, 246, 0.1)', lightText: '#6d28d9', lightBgColor: '#f5f3ff', darkBg: 'rgba(139, 92, 246, 0.2)', darkText: '#c4b5fd', darkBgColor: 'rgba(139, 92, 246, 0.3)', icon: Sparkles },
  CORTE:          { lightBg: 'rgba(139, 92, 246, 0.1)', lightText: '#6d28d9', lightBgColor: '#f5f3ff', darkBg: 'rgba(139, 92, 246, 0.2)', darkText: '#c4b5fd', darkBgColor: 'rgba(139, 92, 246, 0.3)', icon: Scissors },
  TROQUEL:        { lightBg: 'rgba(249, 115, 22, 0.1)', lightText: '#c2410c', lightBgColor: '#fff7ed', darkBg: 'rgba(249, 115, 22, 0.2)', darkText: '#fdba74', darkBgColor: 'rgba(249, 115, 22, 0.3)', icon: Cog },
  REVISION:       { lightBg: 'rgba(245, 158, 11, 0.1)', lightText: '#b45309', lightBgColor: '#fffbeb', darkBg: 'rgba(245, 158, 11, 0.2)', darkText: '#fcd34d', darkBgColor: 'rgba(245, 158, 11, 0.3)', icon: CheckCircle },
  ARMADO:         { lightBg: 'rgba(59, 130, 246, 0.1)', lightText: '#1d4ed8', lightBgColor: '#eff6ff', darkBg: 'rgba(59, 130, 246, 0.2)', darkText: '#93c5fd', darkBgColor: 'rgba(59, 130, 246, 0.3)', icon: Wrench },
  EMPAQUE:        { lightBg: 'rgba(34, 197, 94, 0.1)',  lightText: '#15803d', lightBgColor: '#f0fdf4', darkBg: 'rgba(34, 197, 94, 0.2)', darkText: '#86efac', darkBgColor: 'rgba(34, 197, 94, 0.3)', icon: BoxSelect },
  // Fallback for custom / unknown step types
  _DEFAULT:       { lightBg: 'rgba(100, 116, 139, 0.1)', lightText: '#475569', lightBgColor: '#f8fafc', darkBg: 'rgba(100, 116, 139, 0.2)', darkText: '#94a3b8', darkBgColor: 'rgba(100, 116, 139, 0.3)', icon: Layers },
};
