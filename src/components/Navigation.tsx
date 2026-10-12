import React from 'react';
import { 
  Shield, 
  Bell, 
  Plus, 
  Smartphone, 
  Mic, 
  MapPin, 
  History, 
  Hourglass,
  ShieldCheck,
  Radio,
  QrCode
} from 'lucide-react';

interface NavigationProps {
  activeTab: 'map' | 'history' | 'zones' | 'screentime';
  setActiveTab: (tab: 'map' | 'history' | 'zones' | 'screentime') => void;
  onOpenAddMember: () => void;
  onOpenAlerts: () => void;
  onOpenAudioModal: () => void;
  onOpenChildSimulator: () => void;
  onOpenAndroidModal: () => void;
  onOpenQRPairing?: () => void;
  unreadAlertsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddMember,
  onOpenAlerts,
  onOpenAudioModal,
  onOpenChildSimulator,
  onOpenAndroidModal,
  onOpenQRPairing,
  unreadAlertsCount,
}) => {
  return (
    <>
      {/* Mobile Top App Bar (Native Header) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-md mx-auto px-3.5 h-14 flex items-center justify-between gap-2">
          {/* Brand & App Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Shield className="w-4 h-4 fill-indigo-600 stroke-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
              Guardião Familiar
            </span>
          </div>

          {/* Top Quick Actions (Mobile Touch Hitbox >= 44px) */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* QR Code Quick Pair Button */}
            {onOpenQRPairing && (
              <button
                onClick={onOpenQRPairing}
                className="w-9 h-9 flex items-center justify-center rounded-full text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                title="Parear celular via QR Code (Zero Instalação)"
                aria-label="Parear via QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}

            {/* Ambient Audio Check */}
            <button
              onClick={onOpenAudioModal}
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Checagem de áudio ambiente"
              aria-label="Ouvir áudio ambiente"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Android Native & PWA Button */}
            <button
              onClick={onOpenAndroidModal}
              className="w-9 h-9 flex items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-50 transition-colors"
              title="Instalar no Android ou ver código nativo"
              aria-label="Instalar no Android"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* Child Phone Simulator Button */}
            <button
              onClick={onOpenChildSimulator}
              className="w-9 h-9 flex items-center justify-center rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Ver celular do filho"
              aria-label="Ver celular do filho"
            >
              <Radio className="w-4 h-4" />
            </button>

            {/* Alerts Drawer Button */}
            <button
              onClick={onOpenAlerts}
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
              title="Alertas de segurança"
              aria-label="Alertas de segurança"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Bottom Tab Bar - Mobile Thumb Zone (Pattern 1) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center h-16 px-1">
          {/* Tab 1: Mapa */}
          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors ${
              activeTab === 'map' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'map' ? 'bg-indigo-50 text-indigo-600' : ''}`}>
              <MapPin className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Mapa</span>
          </button>

          {/* Tab 2: Histórico */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors ${
              activeTab === 'history' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600' : ''}`}>
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Histórico</span>
          </button>

          {/* Tab 3: Zonas */}
          <button
            onClick={() => setActiveTab('zones')}
            className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors ${
              activeTab === 'zones' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'zones' ? 'bg-indigo-50 text-indigo-600' : ''}`}>
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Zonas</span>
          </button>

          {/* Tab 4: Tempo de Tela */}
          <button
            onClick={() => setActiveTab('screentime')}
            className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors ${
              activeTab === 'screentime' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-full ${activeTab === 'screentime' ? 'bg-indigo-50 text-indigo-600' : ''}`}>
              <Hourglass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Tempo</span>
          </button>
        </div>
      </nav>
    </>
  );
};
