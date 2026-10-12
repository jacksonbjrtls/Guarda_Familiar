import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  Code2, 
  ShieldCheck, 
  Layers, 
  Copy, 
  Check, 
  Terminal, 
  Cpu, 
  Zap, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidNativeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidNativeModal: React.FC<AndroidNativeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [activeCodeTab, setActiveCodeTab] = useState<'manifest' | 'blocker' | 'gps' | 'admin' | 'apk'>('manifest');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const androidManifestCode = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.guardiao.familiar">

    <!-- Permissões de Localização em Primeiro e Segundo Plano -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

    <!-- Permissão de Áudio Ambiente e Microfone -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />

    <!-- Permissões para Bloqueio de Apps e Tempo de Tela -->
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:name=".GuardiaoApp"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="Guardião Familiar"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/Theme.Guardiao">

        <!-- Serviço de Acessibilidade: Bloqueio Imediato de Aplicativos -->
        <service
            android:name=".services.AppBlockerAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- Serviço Foreground de GPS 24/7 -->
        <service
            android:name=".services.LocationTrackerService"
            android:foregroundServiceType="location"
            android:exported="false" />

        <!-- Receptor de Administrador do Dispositivo (Trava de Tela Remota) -->
        <receiver
            android:name=".receivers.GuardiaoDeviceAdminReceiver"
            android:permission="android.permission.BIND_DEVICE_ADMIN"
            android:exported="true">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin_rules" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`;

  const appBlockerCode = `package com.guardiao.familiar.services

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import com.guardiao.familiar.ui.LockScreenActivity

class AppBlockerAccessibilityService : AccessibilityService() {

    // Lista de pacotes bloqueados recebida sincronizada da nuvem
    private val blockedPackages = setOf(
        "com.zhiliaoapp.musically", // TikTok
        "com.roblox.client",          // Roblox
        "com.supercell.brawlstars",   // Brawl Stars
        "com.instagram.android"       // Instagram
    )

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString() ?: return

            // Se a criança abrir um app restrito, redireciona para a tela de bloqueio
            if (blockedPackages.contains(packageName)) {
                val lockIntent = Intent(this, LockScreenActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    putExtra("BLOCKED_APP_PACKAGE", packageName)
                }
                startActivity(lockIntent)
            }
        }
    }

    override fun onInterrupt() {}
}`;

  const locationTrackerCode = `package com.guardiao.familiar.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*

class LocationTrackerService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        startForegroundNotification()

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY, 10000L // Intervalo de 10 segundos
        ).setMinUpdateIntervalMillis(5000L).build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                // Envia as coordenadas para o servidor em tempo real (Firebase / REST)
                sendLocationToParent(location.latitude, location.longitude, location.speed)
            }
        }

        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
    }

    private fun startForegroundNotification() {
        val channelId = "guardiao_location_channel"
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(channelId, "Rastreamento Familiar", NotificationManager.IMPORTANCE_LOW)
        )
        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Guardião Familiar")
            .setContentText("Localização protegida ativa em segundo plano")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .build()
        startForeground(101, notification)
    }

    private fun sendLocationToParent(lat: Double, lng: Double, speed: Float) {
        // Envio criptografado para o Dashboard dos Pais
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`;

  const deviceAdminCode = `package com.guardiao.familiar.receivers

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class GuardiaoDeviceAdminReceiver : DeviceAdminReceiver() {
    companion object {
        fun lockDeviceRemotely(context: Context) {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val adminComponent = ComponentName(context, GuardiaoDeviceAdminReceiver::class.java)
            
            if (dpm.isAdminActive(adminComponent)) {
                // Bloqueia a tela do aparelho imediatamente
                dpm.lockNow()
            }
        }
    }
}`;

  const apkBuildCode = `# OPÇÃO 1: INSTALAR AGORA MESMO NO ANDROID (PWA / WebAPK)
- No celular Android, abra este app no Google Chrome
- Toque nos 3 pontos (⋮) ou no botão "Instalar no Android" acima
- O app será instalado nativamente com ícone na gaveta de apps,
  tela cheia, sem barra de navegação e suporte offline!

# OPÇÃO 2: GERAR APK NATIVO COMPLETO VIA CAPACITOR
# No seu terminal:
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Guardião Familiar" com.guardiao.familiar --web-dir dist
npm run build
npx cap add android
npx cap open android
# O Android Studio abrirá com o projeto pronto para compilar o APK!

# OPÇÃO 3: BUILD COM ANDROID STUDIO (KOTLIN NATIVO)
# Basta criar um projeto Android com Empty Activity no Android Studio
# e colar os arquivos das abas acima no pacote com.guardiao.familiar`;

  const getCodeContent = () => {
    switch (activeCodeTab) {
      case 'manifest': return androidManifestCode;
      case 'blocker': return appBlockerCode;
      case 'gps': return locationTrackerCode;
      case 'admin': return deviceAdminCode;
      case 'apk': return apkBuildCode;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-5 shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col pb-safe">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">App Nativo do Android</h3>
              <p className="text-[11px] text-slate-500">
                Instale no celular ou veja o código Kotlin
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>

        {/* Quick Action: Install as Android App Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div>
            <span className="text-xs font-semibold text-indigo-300 block mb-0.5">
              Instalação Direta no Dispositivo (WebAPK / PWA)
            </span>
            <h4 className="font-bold text-sm text-white">Instalar no seu celular Android</h4>
            <p className="text-xs text-indigo-200 mt-0.5 max-w-md">
              Funciona exatamente como um app nativo: tela cheia, ícone na gaveta de apps, sem barra de URL e com notificações.
            </p>
          </div>

          <button
            onClick={() => {
              if (isInstallable) {
                install();
              } else {
                alert('No Android: Toque no menu (⋮) do Chrome e selecione "Adicionar à tela inicial" ou "Instalar aplicativo".');
              }
            }}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isInstalled ? 'App Já Instalado' : 'Instalar no Android'}</span>
          </button>
        </div>

        {/* Native Android Services Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-800 block flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              Accessibility Service
            </span>
            <p className="text-[11px] text-slate-500">
              Permite ao Android detectar quando o filho abre apps como TikTok ou Roblox e bloquear imediatamente.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-800 block flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Foreground GPS 24/7
            </span>
            <p className="text-[11px] text-slate-500">
              Usa FusedLocationProviderClient para rastrear continuamente mesmo em segundo plano ou com tela apagada.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="font-bold text-slate-800 block flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              Device Admin Policy
            </span>
            <p className="text-[11px] text-slate-500">
              Habilita trava de tela remota imediata e impede que o filho desinstale o app sem a senha dos pais.
            </p>
          </div>
        </div>

        {/* Code Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveCodeTab('manifest')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeCodeTab === 'manifest' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AndroidManifest.xml
            </button>
            <button
              onClick={() => setActiveCodeTab('blocker')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeCodeTab === 'blocker' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AppBlockerService.kt
            </button>
            <button
              onClick={() => setActiveCodeTab('gps')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeCodeTab === 'gps' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              LocationTrackerService.kt
            </button>
            <button
              onClick={() => setActiveCodeTab('admin')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeCodeTab === 'admin' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DeviceAdmin.kt
            </button>
            <button
              onClick={() => setActiveCodeTab('apk')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeCodeTab === 'apk' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gerar APK
            </button>
          </div>

          <button
            onClick={() => copyToClipboard(getCodeContent(), activeCodeTab)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0 p-1"
          >
            {copiedKey === activeCodeTab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === activeCodeTab ? 'Copiado!' : 'Copiar Código'}</span>
          </button>
        </div>

        {/* Code View Area */}
        <div className="flex-1 overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 border border-slate-800">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">
            {getCodeContent()}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
          <span>Compatível com Android 10, 11, 12, 13, 14 e 15 (API 29 a 35)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
