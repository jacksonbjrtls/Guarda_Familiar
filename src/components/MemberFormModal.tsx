import React, { useState, useEffect } from 'react';
import { FamilyMember, MemberRole } from '../types';
import { UserPlus, UserCheck, Smartphone, Shield, KeyRound, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';

interface MemberFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialMember?: FamilyMember | null;
  onClose: () => void;
  onSave: (memberData: FamilyMember) => void;
  onDelete?: (memberId: string) => void;
  totalMembersCount?: number;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  mode,
  initialMember,
  onClose,
  onSave,
  onDelete,
  totalMembersCount = 1,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('child');
  const [relationship, setRelationship] = useState('Filho');
  const [age, setAge] = useState<number>(10);
  const [deviceModel, setDeviceModel] = useState('Samsung Galaxy A15');
  const [phone, setPhone] = useState('');
  const [avatarColor, setAvatarColor] = useState('bg-indigo-600');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Generated unique 6-digit pairing code for new additions
  const [pairingCode] = useState(() => `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`);

  const avatarColorOptions = [
    { label: 'Índigo', class: 'bg-indigo-600' },
    { label: 'Esmeralda', class: 'bg-emerald-600' },
    { label: 'Âmbar', class: 'bg-amber-600' },
    { label: 'Roxo', class: 'bg-purple-600' },
    { label: 'Rosa', class: 'bg-rose-600' },
    { label: 'Azul Céu', class: 'bg-sky-600' },
    { label: 'Ardósia', class: 'bg-slate-700' },
  ];

  // Pre-fill fields when editing
  useEffect(() => {
    if (mode === 'edit' && initialMember) {
      setName(initialMember.name);
      setRole(initialMember.role);
      setRelationship(initialMember.relationship);
      setAge(initialMember.age ?? 10);
      setDeviceModel(initialMember.device?.model ?? 'Samsung Galaxy A15');
      setPhone(initialMember.phone ?? '');
      setAvatarColor(initialMember.avatarColor ?? 'bg-indigo-600');
    } else {
      setName('');
      setRole('child');
      setRelationship('Filho');
      setAge(10);
      setDeviceModel('Samsung Galaxy A15');
      setPhone('');
      setAvatarColor('bg-indigo-600');
    }
    setIsConfirmingDelete(false);
  }, [mode, initialMember, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');

    if (mode === 'edit' && initialMember) {
      const updatedMember: FamilyMember = {
        ...initialMember,
        name: name.trim(),
        role,
        relationship: role === 'child' ? relationship : (relationship.includes('Pai') || relationship.includes('Mãe') ? relationship : 'Responsável'),
        age: role === 'child' ? age : undefined,
        avatarColor,
        avatarInitials: initials || initialMember.avatarInitials,
        phone: phone.trim() || undefined,
        device: {
          ...initialMember.device,
          model: deviceModel.trim() || initialMember.device.model,
        },
      };
      onSave(updatedMember);
    } else {
      const newMember: FamilyMember = {
        id: `member-${Date.now()}`,
        name: name.trim(),
        role,
        relationship: role === 'child' ? relationship : 'Responsável (Co-administrador)',
        age: role === 'child' ? age : undefined,
        avatarColor,
        avatarInitials: initials || 'FM',
        phone: phone.trim() || undefined,
        device: {
          model: deviceModel.trim() || 'Smartphone Android',
          batteryLevel: 95,
          isCharging: false,
          networkType: '4G LTE',
          soundMode: 'Normal',
          gpsAccuracyMeters: 5,
          lastSync: 'Recém pareado',
          isDeviceLocked: false,
          screenTimeLockActive: false,
          powerSavingMode: false,
        },
        currentLocation: {
          lat: -23.5678 + (Math.random() - 0.5) * 0.02,
          lng: -46.6854 + (Math.random() - 0.5) * 0.02,
          address: 'Rua dos Pinheiros, São Paulo - SP',
          speedKmH: 0,
          statusText: 'Dispositivo conectado e monitorado',
          lastUpdated: 'Agora mesmo',
        },
        safeZones: [
          {
            id: `zone-${Date.now()}-home`,
            name: 'Casa da Família',
            address: 'Rua dos Pinheiros, 450, Pinheiros, SP',
            lat: -23.5678,
            lng: -46.6854,
            radiusMeters: 180,
            color: '#10B981',
            iconType: 'home',
            notifyOnEntry: true,
            notifyOnExit: true,
          },
        ],
        screenTime: {
          usedMinutesToday: 40,
          dailyLimitMinutes: 180,
          downtimeActive: false,
          downtimeStart: '21:30',
          downtimeEnd: '06:30',
          schoolModeActive: true,
          schoolStart: '07:30',
          schoolEnd: '12:30',
        },
        apps: [
          {
            id: `app-yt-${Date.now()}`,
            name: 'YouTube',
            category: 'Streaming',
            icon: 'Youtube',
            isBlocked: false,
            dailyLimitMinutes: 45,
            usedMinutesToday: 20,
          },
          {
            id: `app-games-${Date.now()}`,
            name: 'Jogos Gerais',
            category: 'Jogos',
            icon: 'Gamepad2',
            isBlocked: false,
            dailyLimitMinutes: 30,
            usedMinutesToday: 15,
          },
          {
            id: `app-wp-${Date.now()}`,
            name: 'WhatsApp',
            category: 'Mensagens',
            icon: 'MessageSquare',
            isBlocked: false,
            dailyLimitMinutes: 120,
            usedMinutesToday: 10,
            alwaysAllowed: true,
          },
        ],
        history: [
          {
            id: `hist-initial-${Date.now()}`,
            time: 'Hoje, Recente',
            timestamp: Date.now(),
            title: 'Primeiro pareamento concluído',
            address: 'Rua dos Pinheiros, São Paulo',
            lat: -23.5678,
            lng: -46.6854,
            durationMinutes: 10,
            type: 'stay',
          },
        ],
        audioLogs: [],
      };
      onSave(newMember);
    }

    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDeleteClick = () => {
    if (initialMember && onDelete) {
      onDelete(initialMember.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[92vh] overflow-y-auto pb-safe">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            {mode === 'edit' ? (
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <UserCheck className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <UserPlus className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {mode === 'edit' ? 'Editar Membro da Família' : 'Cadastrar Membro da Família'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === 'edit' ? `Atualize os dados de ${initialMember?.name}` : 'Adicione uma criança ou co-responsável'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {isConfirmingDelete ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl mb-4 text-xs text-rose-950">
            <div className="flex items-start gap-2.5 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-900 font-bold">Excluir este membro da família?</strong>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Tem certeza que deseja remover <strong>{initialMember?.name}</strong>? Todo o histórico de locais visitados, alertas e limites cadastrados serão excluídos.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Membro</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('child');
                  setRelationship('Filho');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  role === 'child'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Criança / Filho(a)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('parent');
                  setRelationship('Pai / Responsável');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  role === 'parent'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Pai / Responsável
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input
              type="text"
              placeholder="Ex: Matheus Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Relationship & Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Parentesco</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {role === 'child' ? (
                  <>
                    <option value="Filho">Filho</option>
                    <option value="Filha">Filha</option>
                    <option value="Sobrinho(a)">Sobrinho(a)</option>
                    <option value="Enteado(a)">Enteado(a)</option>
                  </>
                ) : (
                  <>
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó/Avô">Avó/Avô</option>
                    <option value="Tutor / Responsável">Tutor / Responsável</option>
                  </>
                )}
              </select>
            </div>

            {role === 'child' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Idade</label>
                <input
                  type="number"
                  min="2"
                  max="18"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono tabular-nums"
                />
              </div>
            )}
          </div>

          {/* Device Model & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo do Aparelho</label>
              <input
                type="text"
                placeholder="Ex: Galaxy A34, Moto G"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone (Opcional)</label>
              <input
                type="text"
                placeholder="(11) 99999-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cor do Ícone / Avatar</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {avatarColorOptions.map((opt) => (
                <button
                  key={opt.class}
                  type="button"
                  onClick={() => setAvatarColor(opt.class)}
                  className={`w-7 h-7 rounded-full ${opt.class} flex items-center justify-center text-white transition-transform ${
                    avatarColor === opt.class ? 'ring-3 ring-indigo-500/30 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={opt.label}
                >
                  {avatarColor === opt.class && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Pairing Code Card (Only when adding a new member) */}
          {mode === 'add' && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-indigo-900 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  Código de Pareamento com o Celular
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <div className="text-center py-1">
                <span className="text-xl font-bold font-mono tracking-widest text-indigo-700">
                  {pairingCode}
                </span>
              </div>
              <p className="text-[10px] text-indigo-600/90 text-center">
                Insira este código no aplicativo instalado no celular do filho para sincronizar.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (totalMembersCount <= 1) {
                    alert('Não é possível excluir o único membro da família.');
                    return;
                  }
                  setIsConfirmingDelete(true);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                {mode === 'edit' ? 'Salvar Alterações' : 'Concluir Cadastro'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
