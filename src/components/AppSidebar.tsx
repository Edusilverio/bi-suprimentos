import { useAuthStore } from '@/stores/useAuthStore';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { PAGINAS_SISTEMA, PAGINAS_ADMIN } from '@/config/paginas';
import {
  ClipboardList, ShoppingCart, FileText, BarChart3, Building2,
  LogOut, ChevronLeft, Menu, User, Table2, Lock, Palmtree, TrendingUp, Leaf,
  ClipboardEdit, ScrollText, ClipboardCheck, ChevronDown, ChevronRight, CalendarRange,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cargoLabel, cargoBadgeClass, cn } from '@/lib/utils';
import atlasLogo from '@/assets/atlas-logo.png';
import atlasLogoDark from '@/assets/atlas-logo-dark.png';

const iconMap: Record<string, any> = {
  'concorrencias': ClipboardList,
  'pedidos': ShoppingCart,
  'contratos': FileText,
  'creq': CalendarRange,
  'one-page': BarChart3,
  'gestao-fornecedores': Building2,
  'planilhas': Table2,
  'admin-acessos': Lock,
  'gestao-obras': Building2,
  'indicadores-mercado': TrendingUp,
  'indicadores-sustentabilidade': Leaf,
  'lancamento-sustentabilidade': ClipboardEdit,
  'aprovacao-sustentabilidade': ClipboardCheck,
  'logs': ScrollText,
};

// Filhos que serão agrupados (removidos do menu plano)
const SUSTENTABILIDADE_KEYS = ['indicadores-sustentabilidade', 'lancamento-sustentabilidade', 'aprovacao-sustentabilidade'];
const GESTAO_KEYS = ['gestao-obras', 'admin-acessos', 'logs'];

const SUSTENTABILIDADE_CHILDREN = [
  { key: 'indicadores-sustentabilidade', label: 'Sustentabilidade', rota: '/indicadores-sustentabilidade' },
  { key: 'lancamento-sustentabilidade', label: 'Lançamento Sustentabilidade', rota: '/lancamento-sustentabilidade' },
  { key: 'aprovacao-sustentabilidade', label: 'Aprovações Sustentabilidade', rota: '/aprovacao-sustentabilidade' },
];

const GESTAO_CHILDREN = [
  { key: 'gestao-obras', label: 'Gestão de Obras', rota: '/gestao-obras' },
  { key: 'admin-acessos', label: 'Gestão de Acessos', rota: '/admin/acessos' },
  { key: 'logs', label: 'Logs', rota: '/logs' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const visibleItems = useMemo(
    () => user ? PAGINAS_SISTEMA.filter(p => user.paginas_habilitadas.includes(p.key)) : [],
    [user],
  );
  const adminItems = useMemo(() => {
    if (!user) return [];
    if (user.nivel <= 1) return [...PAGINAS_ADMIN];
    if (user.cargo === 'aprovador') return PAGINAS_ADMIN.filter(p => p.key === 'aprovacao-sustentabilidade');
    return [];
  }, [user]);

  const allowedKeys = useMemo(
    () => new Set<string>([...visibleItems.map(i => i.key), ...adminItems.map(i => i.key)]),
    [visibleItems, adminItems],
  );

  const sustentabilidadeChildren = SUSTENTABILIDADE_CHILDREN.filter(c => allowedKeys.has(c.key));
  const gestaoChildren = GESTAO_CHILDREN.filter(c => allowedKeys.has(c.key));

  const flatItems = [...visibleItems, ...adminItems].filter(
    it => !SUSTENTABILIDADE_KEYS.includes(it.key) && !GESTAO_KEYS.includes(it.key),
  );

  const sustentabilidadeActive = sustentabilidadeChildren.some(c => pathname === c.rota);
  const gestaoActive = gestaoChildren.some(c => pathname === c.rota);

  const [openSust, setOpenSust] = useState(sustentabilidadeActive);
  const [openGestao, setOpenGestao] = useState(gestaoActive);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderChild = (child: { key: string; label: string; rota: string }) => {
    const Icon = iconMap[child.key] ?? ClipboardList;
    return (
      <NavLink
        key={child.rota}
        to={child.rota}
        className={({ isActive }) =>
          `flex items-center gap-3 ${collapsed ? 'px-3' : 'pl-9 pr-3'} py-2 rounded-lg text-sm transition-colors ${
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-border/30'
          }`
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="text-xs">{child.label}</span>}
      </NavLink>
    );
  };

  const renderGroup = (
    label: string,
    GroupIcon: any,
    children: { key: string; label: string; rota: string }[],
    open: boolean,
    setOpen: (v: boolean) => void,
    isActive: boolean,
  ) => {
    if (children.length === 0) return null;
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            isActive
              ? 'text-sidebar-foreground font-medium'
              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-border/30'
          }`}
        >
          <GroupIcon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs flex-1 text-left">{label}</span>
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </>
          )}
        </button>
        {open && (
          <div className="mt-1 space-y-1">
            {children.map(renderChild)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
      <div className="flex items-center justify-between gap-2 p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center min-w-0 flex-1">
            <img src={atlasLogo} alt="Atlas Engenharia" className="h-14 w-auto max-w-full object-contain block dark:hidden" />
            <img src={atlasLogoDark} alt="Atlas Engenharia" className="h-14 w-auto max-w-full object-contain hidden dark:block" />
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-sidebar-border/50 transition-colors">
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {flatItems.map(item => {
          const Icon = iconMap[item.key] ?? ClipboardList;
          return (
            <NavLink
              key={item.rota}
              to={item.rota}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-border/30'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-xs">{item.label}</span>}
            </NavLink>
          );
        })}

        {renderGroup('Sustentabilidade', Leaf, sustentabilidadeChildren, openSust || sustentabilidadeActive, setOpenSust, sustentabilidadeActive)}
        {renderGroup('Gestão', Building2, gestaoChildren, openGestao || gestaoActive, setOpenGestao, gestaoActive)}
      </nav>

      <div className="mx-3 border-t border-sidebar-border" />

      <div className="p-3 space-y-2">
        {!collapsed ? (
          <div className="flex items-start gap-2">
            <div className="h-9 w-9 rounded-full bg-sidebar-border flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-sidebar-foreground/80">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-medium truncate text-sidebar-foreground">{user.name}</p>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge className={cn('text-[9px] px-1.5 py-0 h-4 rounded font-medium', cargoBadgeClass(user.cargo))}>
                  {cargoLabel(user.cargo)}
                </Badge>
                {user.modo_ferias && (
                  <Badge className="text-[9px] px-1.5 py-0 h-4 rounded bg-amber-400 text-amber-950 border-amber-400">
                    <Palmtree className="h-2.5 w-2.5 mr-0.5" /> Férias
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-sidebar-border flex items-center justify-center">
              <User className="h-4 w-4 text-sidebar-foreground/70" />
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs hover:bg-sidebar-border/30 text-sidebar-foreground/60 transition-colors">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
