import React, { useState, useEffect, useRef } from 'react';
import { FamilyMember, AudioSessionLog } from '../types';
import { 
  Mic, 
  MicOff, 
  Radio, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Info, 
  Clock, 
  FileAudio,
  Play,
  Square,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { AmbientSoundSimulator, playNotificationChime } from '../utils/audio';

interface AmbientAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: FamilyMember;
  onSaveAudioLog: (log: AudioSessionLog) => void;
}

export const AmbientAudioModal: React.FC<AmbientAudioModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onSaveAudioLog,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [decibels, setDecibels] = useState(42);
  const [useRealMic, setUseRealMic] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulatorRef = useRef<AmbientSoundSimulator | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const realMediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize audio simulator
  useEffect(() => {
    simulatorRef.current = new AmbientSoundSimulator();
    return () => {
      simulatorRef.current?.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      realMediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Handle start listening
  const startListening = async () => {
    setConnectionStatus('connecting');
    playNotificationChime();

    // Short artificial connection delay to simulate secure remote socket handshake
    setTimeout(async () => {
      setConnectionStatus('connected');
      setIsListening(true);
      setSessionSeconds(0);

      // Start timer
      timerIntervalRef.current = window.setInterval(() => {
        setSessionSeconds(prev => {
          if (prev >= 60) {
            stopListening();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      if (useRealMic && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          realMediaStreamRef.current = stream;
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;
          startCanvasVisualizer(analyser);
        } catch {
          // Fallback to simulated audio synthesis
          simulatorRef.current?.start(isMuted ? 0 : 0.12);
          startCanvasVisualizer(null);
        }
      } else {
        simulatorRef.current?.start(isMuted ? 0 : 0.12);
        startCanvasVisualizer(null);
      }
    }, 1200);
  };

  // Handle stop listening
  const stopListening = () => {
    if (!isListening && connectionStatus !== 'connecting') return;

    simulatorRef.current?.stop();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    realMediaStreamRef.current?.getTracks().forEach(t => t.stop());

    if (sessionSeconds > 3) {
      onSaveAudioLog({
        id: `audio-${Date.now()}`,
        timestamp: 'Agora mesmo',
        durationSeconds: sessionSeconds,
        decibelAvg: decibels,
        summary: decibels > 70 ? 'Ambiente agitado / Ruído urbano' : 'Ambiente tranquilo',
        notes: `Verificação de segurança realizada por 0:${sessionSeconds.toString().padStart(2, '0')}.`,
      });
    }

    setIsListening(false);
    setConnectionStatus('idle');
  };

  // Toggle speaker mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      simulatorRef.current?.start(0.12);
    } else {
      setIsMuted(true);
      simulatorRef.current?.stop();
    }
  };

  // Canvas visualizer animation
  const startCanvasVisualizer = (analyserNode: AnalyserNode | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserNode ? analyserNode.frequencyBinCount : 32);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Generate dynamic organic frequencies
        for (let i = 0; i < dataArray.length; i++) {
          const noise = Math.sin(Date.now() * 0.005 + i * 0.5) * 20 + 40;
          dataArray[i] = Math.max(10, Math.min(255, noise + Math.random() * 25));
        }
      }

      // Calculate decibel approximation
      const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
      const currentDb = Math.round(35 + (avg / 255) * 45);
      setDecibels(currentDb);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / dataArray.length) * 0.75;
      let x = 4;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height * 0.85);
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#4f46e5');
        gradient.addColorStop(1, '#818cf8');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 3);
        ctx.fill();

        x += barWidth + 3;
      }
    };

    render();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto pb-safe">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Checagem de Áudio Ambiente</h3>
              <p className="text-[11px] text-slate-500">Dispositivo: {currentMember.device.model}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Informative Note */}
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl mb-4 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Proteção Parental:</strong> Ouça discretamente o que está ao redor de {currentMember.name.split(' ')[0]} em situações de emergência ou quando ele não atender o telefone.
          </p>
        </div>

        {/* Visualizer & Spectrum Screen */}
        <div className="bg-slate-900 rounded-xl p-5 mb-4 border border-slate-800 text-white flex flex-col items-center justify-center min-h-[170px] relative overflow-hidden">
          {connectionStatus === 'connecting' && (
            <div className="flex flex-col items-center gap-2 z-10">
              <Radio className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-xs font-semibold text-slate-300">Conectando canal seguro de áudio...</span>
            </div>
          )}

          {connectionStatus === 'idle' && (
            <div className="flex flex-col items-center text-center gap-2 z-10">
              <MicOff className="w-8 h-8 text-slate-500" />
              <span className="text-xs font-medium text-slate-400">Microfone remoto em espera.</span>
              <span className="text-[11px] text-slate-500">Clique em &ldquo;Iniciar Escuta&rdquo; para conectar.</span>
            </div>
          )}

          {connectionStatus === 'connected' && (
            <div className="w-full flex flex-col items-center z-10">
              <div className="flex items-center justify-between w-full mb-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Transmissão ao Vivo
                </span>
                <span className="font-mono tabular-nums text-indigo-300 font-semibold">
                  0:{sessionSeconds.toString().padStart(2, '0')} / 1:00
                </span>
              </div>

              {/* Waveform Canvas */}
              <canvas
                ref={canvasRef}
                width={360}
                height={60}
                className="w-full h-15 rounded-md"
              />

              {/* Decibel Meter Indicator */}
              <div className="flex items-center justify-between w-full mt-3 text-xs border-t border-slate-800/80 pt-2 text-slate-300">
                <span className="text-[11px]">Nível Acústico:</span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  {decibels} dB {decibels < 50 ? '(Calmo)' : decibels < 75 ? '(Normal)' : '(Alto)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              disabled={!isListening}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              } disabled:opacity-50`}
              title="Mutar saída de áudio no seu fone/alto-falante"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? 'Mudo' : 'Ouvindo'}</span>
            </button>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useRealMic}
                onChange={(e) => setUseRealMic(e.target.checked)}
                className="rounded-sm text-indigo-600 focus:ring-indigo-500"
              />
              <span>Usar mic deste navegador (teste real)</span>
            </label>
          </div>

          <div>
            {!isListening ? (
              <button
                onClick={startListening}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Escuta</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Encerrar Escuta</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Logs History */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Últimas Verificações de Áudio</span>
          </h4>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {currentMember.audioLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum registro de áudio salvo ainda.</p>
            ) : (
              currentMember.audioLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{log.summary}</span>
                      <span className="text-slate-400 text-[11px] font-mono tabular-nums">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{log.notes}</p>
                  </div>
                  <span className="font-mono text-slate-600 font-semibold text-[11px] shrink-0">
                    {log.decibelAvg} dB
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
