import React from 'react';
import { FamilyMember } from '../types';
import { Battery, BatteryCharging, BatteryWarning, Plus, Users, Edit2, QrCode } from 'lucide-react';

interface FamilyMemberSelectorProps {
  members: FamilyMember[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  onOpenAddMember: () => void;
  onOpenManageFamily: () => void;
  onOpenEditMember: (member: FamilyMember) => void;
  onOpenQRPairing?: () => void;
}

export const FamilyMemberSelector: React.FC<FamilyMemberSelectorProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenAddMember,
  onOpenManageFamily,
  onOpenEditMember,
  onOpenQRPairing,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
      {members.map((member) => {
        const isSelected = member.id === selectedMemberId;
        const isLowBattery = member.device.batteryLevel <= 20;

        return (
          <div
            key={member.id}
            className={`flex items-center gap-1.5 rounded-2xl border transition-all text-left shrink-0 ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
          >
            {/* Click to select member */}
            <button
              type="button"
              onClick={() => onSelectMember(member.id)}
              className="flex items-center gap-2.5 px-3 py-2 text-left shrink-0 active:scale-[0.98]"
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : `${member.avatarColor} text-white`
                }`}
              >
                {member.avatarInitials}
              </div>

              {/* Info */}
              <div className="min-w-0 pr-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs truncate max-w-[100px]">
                    {member.name.split(' ')[0]}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    · {member.relationship}
                  </span>
                </div>

                {/* Status & Battery */}
                <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                  <span className={`truncate max-w-[80px] font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {member.currentLocation.currentZoneName || 'Em trânsito'}
                  </span>
                  <span>·</span>
                  <span className={`flex items-center gap-0.5 font-mono tabular-nums font-semibold ${
                    isSelected ? 'text-white' : isLowBattery ? 'text-rose-600' : 'text-slate-600'
                  }`}>
                    {member.device.isCharging ? (
                      <BatteryCharging className="w-3 h-3 text-emerald-400" />
                    ) : isLowBattery ? (
                      <BatteryWarning className="w-3 h-3 text-rose-500" />
                    ) : (
                      <Battery className="w-3 h-3" />
                    )}
                    {member.device.batteryLevel}%
                  </span>
                </div>
              </div>
            </button>

            {/* Quick edit button for this member */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEditMember(member);
              }}
              className={`p-1.5 mr-1.5 rounded-lg transition-colors ${
                isSelected
                  ? 'text-indigo-200 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title={`Editar dados de ${member.name}`}
              aria-label={`Editar ${member.name}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      {/* Register New Member Button */}
      <button
        onClick={onOpenAddMember}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-dashed border-slate-300 bg-white/70 hover:bg-white text-slate-600 hover:text-indigo-600 transition-colors text-xs font-semibold shrink-0 min-h-[44px]"
      >
        <Plus className="w-4 h-4" />
        <span className="whitespace-nowrap">Novo Membro</span>
      </button>

      {/* QR Code Quick Pair Button */}
      {onOpenQRPairing && (
        <button
          onClick={onOpenQRPairing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 transition-colors text-xs font-semibold shrink-0 min-h-[44px]"
          title="Parear celular da criança apontando a câmera para o QR Code"
        >
          <QrCode className="w-4 h-4 text-emerald-600" />
          <span className="whitespace-nowrap">Parear por QR</span>
        </button>
      )}

      {/* Manage Family Button */}
      <button
        onClick={onOpenManageFamily}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 transition-colors text-xs font-semibold shrink-0 min-h-[44px]"
        title="Gerenciar, editar e excluir membros da família"
      >
        <Users className="w-4 h-4 text-indigo-600" />
        <span className="whitespace-nowrap">Gerenciar</span>
      </button>
    </div>
  );
};
