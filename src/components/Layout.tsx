import { ReactNode } from 'react';
import { LayoutDashboard, BookOpen, CheckSquare, BarChart3, GraduationCap, FileText, ClipboardEdit } from 'lucide-react';
import { cn } from '../utils';
import { ClassGroup } from '../types';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  classes?: ClassGroup[];
}

export function Layout({ children, activeTab, setActiveTab, classes = [] }: LayoutProps) {
  const navItems = [
    { id: 'dashboard', label: '儀表板', icon: LayoutDashboard },
    { id: 'syllabus', label: '課程進度', icon: BookOpen },
    { id: 'templates', label: '預設進度', icon: FileText },
    { id: 'tasks', label: '待辦事項', icon: CheckSquare },
    { id: 'grading', label: '成績輸入', icon: ClipboardEdit },
    { id: 'performance', label: '學生表現', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-[#F9F6F2] text-[#4A443F] overflow-hidden font-sans selection:bg-[#E9E3DB] selection:text-[#3D3833]">
      {/* Desktop/iPad Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#E9E3DB] border-r border-[#D9CEC1] h-full shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#88968A] flex items-center justify-center text-white font-bold shadow-sm">
            HK
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold uppercase tracking-wider text-[#3D3833]">EduFlow</h1>
            <span className="text-[10px] opacity-70">香港中學教職員平台</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center w-full gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                  isActive 
                    ? "bg-[#D9CEC1] text-[#3D3833]" 
                    : "opacity-70 hover:opacity-100 hover:bg-[#D9CEC1]/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-[#88968A]" : "text-[#4A443F]")} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-6 border-t border-[#D9CEC1] max-h-[40%] overflow-y-auto">
          <p className="text-xs font-bold uppercase mb-4 opacity-50">活躍班級</p>
          <div className="space-y-3">
            {classes.length > 0 ? classes.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.name}</span>
                <span className={cn(
                  "text-[10px] text-white px-2 py-0.5 rounded",
                  i % 2 === 0 ? "bg-[#88968A]" : "bg-[#C59B83]"
                )}>活躍</span>
              </div>
            )) : (
              <div className="text-sm text-[#8E877F]">暫無班級</div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto pb-24 md:pb-0 relative">
        {/* Mobile Header (iPhone) */}
        <header className="md:hidden bg-[#E9E3DB]/90 backdrop-blur-md border-b border-[#D9CEC1] px-4 py-3 sticky top-0 z-30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#88968A] flex items-center justify-center text-white font-bold text-xs shadow-sm">
            HK
          </div>
          <h1 className="text-lg font-bold text-[#3D3833] tracking-tight font-serif">EduFlow</h1>
        </header>
        
        {/* Rendered Views */}
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile/iPhone Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#E9E3DB]/95 backdrop-blur-lg border-t border-[#D9CEC1] flex justify-around items-center pt-2 pb-6 px-2 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors",
                isActive ? "text-[#3D3833]" : "text-[#8E877F] hover:text-[#4A443F]"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-200", 
                isActive ? "bg-[#D9CEC1]" : "bg-transparent"
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-2")} />
              </div>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
