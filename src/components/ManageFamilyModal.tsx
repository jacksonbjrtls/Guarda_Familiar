import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { Users, Plus, Edit2, Trash2, Smartphone, Battery, BatteryCharging, AlertTriangle, ShieldCheck, QrCode } from 'lucide-react';

interface ManageFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  onOpenAddMember: () => void;
  onOpenEditMember: (member: FamilyMember) => void;
  onDeleteMember: (id: string) => void;
  onOpenQRPairing?: () => void;
}

export const ManageFamilyModal: React.FC<ManageFamilyModalProps> = ({
  isOpen,
  onClose,
  members,
  selectedMemberId,
  onSelectMember,
  onOpenAddMember,
  onOpenEditMember,
  onDeleteMember,
  onOpenQRPairing,
}) => {
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);

  if (!isOpen) return null;

  const handleConfirmDelete = () => {
    if (memberToDelete) {
      onDeleteMember(memberToDelete.id);
      setMemberToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col pb-safe">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gerenciar Membros da Família</h3>
              <p className="text-[11px] text-slate-500">Cadastre, edite ou remova dependentes e responsáveis</p>
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
        {memberToDelete && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl mb-4 text-xs text-rose-950 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-900 font-bold">Excluir {memberToDelete.name}?</strong>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Os dados de localização, histórico e limites de aplicativo serão excluídos permanentemente.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 mb-4">
          {members.map((member) => {
            const isSelected = member.id === selectedMemberId;

            return (
              <div
                key={member.id}
                className={`p-3 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => {
                      onSelectMember(member.id);
                    }}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${member.avatarColor}`}
                    >
                      {member.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs truncate max-w-[140px]">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ({member.relationship}{member.age ? `, ${member.age} anos` : ''})
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded-md">
                            Ativo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                          {member.device.model}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 font-semibold text-slate-600">
                          {member.device.isCharging ? (
                            <BatteryCharging className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Battery className="w-3 h-3 text-slate-500" />
                          )}
                          {member.device.batteryLevel}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onOpenEditMember(member)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors"
                      title={`Editar dados de ${member.name}`}
                      aria-label={`Editar ${member.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    </button>

                    <button
                      onClick={() => {
                        if (members.length <= 1) {
                          alert('Não é possível excluir o único membro da família.');
                          return;
                        }
                        setMemberToDelete(member);
                      }}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                      title={`Excluir ${member.name}`}
                      aria-label={`Excluir ${member.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Add Member & QR Code Pairing */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {onOpenQRPairing && (
            <button
              onClick={() => {
                onClose();
                onOpenQRPairing();
              }}
              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Conectar Celular via QR Code (Sem Instalação)</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenAddMember();
            }}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Manualmente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
