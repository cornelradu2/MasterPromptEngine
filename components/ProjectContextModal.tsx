
import React, { useState, useEffect } from 'react';
import { ProjectContext } from '../types';
import { Save, X, AlertTriangle, FileText } from 'lucide-react';

interface ProjectContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (context: ProjectContext) => void;
  initialContext?: ProjectContext;
}

const ProjectContextModal: React.FC<ProjectContextModalProps> = ({ isOpen, onClose, onSave, initialContext }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (initialContext) {
      setContent(initialContext.content || '');
    } else {
      setContent('');
    }
  }, [initialContext, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      content,
      isSet: !!content.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <FileText className="text-indigo-400" size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Project Knowledge Dump</h2>
                <p className="text-xs text-slate-400">Incolla qui analisi, stack, vincoli o appunti sparsi. L'AI strutturerà tutto.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-0 relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="// Incolla qui la tua analisi del progetto, lo stack tecnologico, o qualsiasi appunto..."
            className="w-full h-full bg-[#0f172a] text-slate-300 p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed custom-scrollbar"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-yellow-500/80">
            <AlertTriangle size={14} />
            <span>Questo contenuto verrà impresso nella memoria a lungo termine della sessione.</span>
          </div>
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
                Annulla
            </button>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/20 transition-all font-bold text-sm"
            >
                <Save size={16} />
                Imprimi nel Core
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProjectContextModal;
