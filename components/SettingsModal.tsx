
import React, { useState, useEffect } from 'react';
import { AISettings } from '../types';
import { Settings, X, Save, Server, Cpu, Activity, CheckCircle2, AlertTriangle, Loader2, Trash2, Archive } from 'lucide-react';
import { testOllamaConnection } from '../services/ollamaService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
  initialSettings: AISettings;
  onDeleteAllChats?: () => void;
  onShowArchived?: () => void;
  totalChatCount?: number;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialSettings, 
  onDeleteAllChats, 
  onShowArchived,
  totalChatCount = 0
}) => {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:7860');
  const [ollamaModel, setOllamaModel] = useState('qwen3-8b-64k-custom:latest');
  const [temperature, setTemperature] = useState(0.25);
  const [enableMaker, setEnableMaker] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Test Connection State
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (initialSettings) {
      setOllamaUrl(initialSettings.ollamaUrl || 'http://localhost:7860');
      setOllamaModel(initialSettings.ollamaModel || 'qwen3-8b-64k-custom:latest');
      setTemperature(initialSettings.temperature);
      setEnableMaker(initialSettings.enableMaker ?? false);
      setReasoningEffort(initialSettings.reasoningEffort || 'medium');
    }
  }, [initialSettings, isOpen]);

  // Reset test status when inputs change
  useEffect(() => {
    setTestStatus('idle');
    setTestMessage('');
  }, [ollamaUrl, ollamaModel]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      provider: 'ollama',
      ollamaUrl,
      ollamaModel,
      temperature,
      enableMaker,
      reasoningEffort
    });
    onClose();
  };

  const runOllamaTest = async () => {
    setTestStatus('loading');
    setTestMessage('Tentativo di connessione...');
    
    const result = await testOllamaConnection({
        provider: 'ollama',
        ollamaUrl,
        ollamaModel,
        temperature,
        enableMaker
    });

    setTestStatus(result.success ? 'success' : 'error');
    setTestMessage(result.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-700/50 rounded-lg border border-slate-600">
                <Settings className="text-slate-300" size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Configurazione AI</h2>
                <p className="text-xs text-slate-400">Scegli il cervello della tua Intelligence.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* ===== SEZIONE 1: MODELLO AI ===== */}
          <div className="space-y-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
              <Server size={16} className="text-orange-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Modello AI</h3>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-xs text-orange-300 flex items-center gap-2">
              <Server size={14} />
              <span>Provider: <strong>Ollama Local</strong>. Tutto il traffico è locale, nessuna chiamata cloud.</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Ollama Endpoint</label>
              <input 
                type="text" 
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://host.docker.internal:7860"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-orange-500 focus:outline-none font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Nome Modello</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="qwen3-8b-64k-custom:latest"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-orange-500 focus:outline-none font-mono"
                />
                <button 
                  onClick={runOllamaTest}
                  disabled={testStatus === 'loading'}
                  className="px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors flex items-center justify-center"
                  title="Test Connessione"
                >
                  {testStatus === 'loading' ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
                </button>
              </div>
              
              {testStatus !== 'idle' && (
                <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-2 ${testStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {testStatus === 'success' ? <CheckCircle2 size={14} className="mt-0.5" /> : <AlertTriangle size={14} className="mt-0.5" />}
                  <span>{testMessage}</span>
                </div>
              )}

              <p className="text-[10px] text-slate-500">
                Assicurati di aver fatto <code>ollama pull {ollamaModel || 'nome-modello'}</code> nel terminale.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Temperature</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-white font-mono bg-slate-900 px-3 py-1 rounded border border-slate-700">{temperature.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-slate-500">0.25 = Deterministico | 0.7 = Creativo</p>
            </div>
          </div>

          {/* ===== SEZIONE 2: MAKER MODE ===== */}
          <div className="space-y-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
              <Cpu size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Maker Mode</h3>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700">
              <div>
                <span className="text-sm text-slate-300 block font-bold">Attiva l'Architetto (Maker)</span>
                <span className="text-xs text-slate-500">Switch da Pair Programmer (Standard) a System Architect (Pipeline).</span>
              </div>
              <button 
                onClick={() => setEnableMaker(!enableMaker)}
                className={`w-12 h-6 rounded-full transition-colors relative ${enableMaker ? 'bg-purple-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${enableMaker ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg text-xs text-purple-300">
              <strong>Pipeline 4-Stage:</strong> Architect → Engineer → Guardian → Perfectionist
            </div>
          </div>

          {/* ===== SEZIONE 3: GESTIONE CHAT ===== */}
          <div className="space-y-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
              <Archive size={16} className="text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Gestione Chat</h3>
            </div>
            
            <div className="space-y-2">
              {onShowArchived && (
                <button 
                  onClick={() => {
                    onShowArchived();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors text-left"
                >
                  <div>
                    <span className="text-sm text-slate-300 block font-bold">Mostra Chat Archiviate</span>
                    <span className="text-xs text-slate-500">Visualizza conversazioni salvate</span>
                  </div>
                  <Archive size={18} className="text-slate-400" />
                </button>
              )}
              
              {onDeleteAllChats && (
                <div>
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-left"
                    >
                      <div>
                        <span className="text-sm text-red-400 block font-bold">Elimina Tutte le Chat</span>
                        <span className="text-xs text-red-400/70">{totalChatCount} conversazioni totali</span>
                      </div>
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 space-y-2">
                      <div className="flex items-center gap-2 text-red-300 text-xs font-bold">
                        <AlertTriangle size={14} />
                        <span>CONFERMA: Eliminare {totalChatCount} chat? Azione irreversibile!</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
                        >
                          Annulla
                        </button>
                        <button 
                          onClick={() => {
                            onDeleteAllChats();
                            setShowDeleteConfirm(false);
                            onClose();
                          }}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-bold transition-colors"
                        >
                          Sì, Elimina Tutto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== FOOTER: AZIONI ===== */}
          <div className="pt-4 border-t border-slate-700/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">Annulla</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-lg font-bold text-sm transition-all shadow-lg">
              <Save size={16} /> Salva Configurazione
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
