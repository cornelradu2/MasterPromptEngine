
import React, { useState, useEffect } from 'react';
import { Save, X, Folder, Plus, Trash2, BrainCircuit, Crown } from 'lucide-react';

interface MemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memories: string[]) => void;
  initialMemories?: string[];
  title?: string;
  description?: string;
  isDivine?: boolean;
}

const MemoriesModal: React.FC<MemoriesModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialMemories, 
    title = "Memorie Sacre",
    description = "Regole immutabili che l'agente deve apprendere e rispettare.",
    isDivine = false
}) => {
  const [memories, setMemories] = useState<string[]>([]);
  const [newMemory, setNewMemory] = useState('');

  useEffect(() => {
    if (initialMemories) {
      setMemories(initialMemories);
    } else {
      setMemories([]);
    }
  }, [initialMemories, isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (newMemory.trim()) {
      setMemories([...memories, newMemory.trim()]);
      setNewMemory('');
    }
  };

  const handleDelete = (index: number) => {
    setMemories(memories.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(memories);
    onClose();
  };

  const themeColor = isDivine ? 'text-amber-400' : 'text-pink-400';
  const borderColor = isDivine ? 'border-amber-500/20' : 'border-pink-500/20';
  const bgColor = isDivine ? 'bg-amber-500/10' : 'bg-pink-500/10';
  const focusBorder = isDivine ? 'focus:border-amber-500' : 'focus:border-pink-500';
  const hoverBorder = isDivine ? 'hover:border-amber-500/30' : 'hover:border-pink-500/30';
  const buttonBg = isDivine ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg border ${bgColor} ${borderColor}`}>
                {isDivine ? <Crown className={themeColor} size={24} /> : <Folder className={themeColor} size={24} />}
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-xs text-slate-400">{description}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Input Area */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <label className={`text-xs font-bold ${themeColor} uppercase tracking-wider mb-2 block`}>
                Nuova Regola / Entità
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Es: Usa sempre React 19; Il modello target è Qwen3 4B..."
                    className={`flex-1 bg-slate-800 text-white border border-slate-600 rounded-lg px-4 py-2 focus:outline-none ${focusBorder} text-sm`}
                />
                <button 
                    onClick={handleAdd}
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <BrainCircuit size={12} />
                {isDivine ? "Queste memorie saranno presenti in OGNI chat." : "Se inserisci tecnologie sconosciute, l'agente le cercherà automaticamente."}
            </p>
          </div>

          {/* List */}
          <div className="space-y-2">
            {memories.length === 0 ? (
                <div className="text-center py-8 text-slate-600 italic text-sm">
                    Nessuna memoria salvata.
                </div>
            ) : (
                memories.map((mem, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700 rounded-lg group ${hoverBorder} transition-all`}>
                        <span className="text-sm text-slate-200 font-mono">{mem}</span>
                        <button 
                            onClick={() => handleDelete(idx)}
                            className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            Annulla
          </button>
          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg shadow-lg transition-all font-bold text-sm ${buttonBg}`}
          >
            <Save size={16} />
            Memorizza
          </button>
        </div>

      </div>
    </div>
  );
};

export default MemoriesModal;
