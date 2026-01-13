import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { CheckCircle, AlertTriangle, Lightbulb, HelpCircle, Shield, Layers, Zap, Edit3, Microscope, Target, Copy } from 'lucide-react';

interface AnalysisCardProps {
  result: AnalysisResult;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ result }) => {
  const [activeVariation, setActiveVariation] = useState<number>(0);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
    if (score >= 70) return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
    return 'text-red-400 border-red-500/50 bg-red-500/10';
  };

  // Safe accessors
  const criteriaScores = result.criteriaScores || {};
  const lineByLineCritique = result.lineByLineCritique || [];
  const keyIssues = result.keyIssues || [];
  const detailedSuggestions = result.detailedSuggestions || [];
  const probingQuestions = result.probingQuestions || [];
  const promptVariations = result.promptVariations || [];

  // Ensure active variation is within bounds if variations exist
  const safeActiveVariation = (promptVariations.length > 0 && activeVariation < promptVariations.length) 
    ? activeVariation 
    : 0;
    
  const currentVariation = promptVariations[safeActiveVariation];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      {/* 1. Executive Summary & Overall Score */}
      <div className="glass-panel rounded-2xl p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden border-t-4 border-indigo-500">
        <div className="flex-shrink-0 flex flex-col items-center justify-center space-y-2">
          <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.3)] ${getScoreColor(result.overallScore)}`}>
            <span className="text-5xl font-bold">{result.overallScore}</span>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Punteggio Globale</span>
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Microscope size={24} />
            <h2 className="text-2xl font-bold text-white">Report Analisi Profonda</h2>
          </div>
          <p className="text-slate-300 leading-relaxed text-lg">{result.summary}</p>
        </div>
      </div>

      {/* 2. Detailed 8-Criteria Scoring Grid */}
      {Object.keys(criteriaScores).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.entries(criteriaScores) as [string, number][]).map(([key, value]) => (
            <div key={key} className="glass-panel p-4 rounded-xl border border-slate-700/50 hover:border-indigo-500/50 transition-colors">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold uppercase text-slate-400">{key}</span>
                <span className={`font-mono font-bold ${value >= 80 ? 'text-emerald-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {value}/100
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Line-by-Line Surgical Analysis */}
      {lineByLineCritique.length > 0 && (
        <div className="glass-panel rounded-xl p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-6 text-blue-400">
            <Edit3 size={24} />
            <h3 className="text-xl font-bold">Critica Chirurgica Riga per Riga</h3>
          </div>
          <div className="space-y-4">
            {lineByLineCritique.map((item, idx) => (
              <div key={idx} className="group bg-slate-800/30 rounded-lg p-4 border border-slate-700 hover:border-blue-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-mono text-slate-300 mt-1">
                    {idx + 1}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="font-mono text-sm text-indigo-200 bg-indigo-900/20 p-2 rounded border-l-2 border-indigo-500">
                      "{item.line}"
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      <span className="text-blue-400 font-bold">Analisi: </span>
                      {item.analysis}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Key Issues (The Why) */}
      {keyIssues.length > 0 && (
        <div className="glass-panel rounded-xl p-6 border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-6 text-red-400">
            <AlertTriangle size={24} />
            <h3 className="text-xl font-bold">Problemi Strutturali Critici</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {keyIssues.map((item, idx) => (
              <div key={idx} className="bg-red-500/5 border border-red-500/20 p-5 rounded-xl">
                <h4 className="text-red-300 font-bold mb-2 text-lg">{item.issue}</h4>
                <p className="text-slate-400 text-sm">{item.whyItMatters}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Detailed Suggestions with Examples */}
      {detailedSuggestions.length > 0 && (
        <div className="glass-panel rounded-xl p-6 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3 mb-6 text-emerald-400">
            <Lightbulb size={24} />
            <h3 className="text-xl font-bold">Strategie di Ottimizzazione</h3>
          </div>
          <div className="space-y-6">
            {detailedSuggestions.map((item, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800">
                  <h4 className="font-bold text-white">{item.suggestion}</h4>
                </div>
                <div className="p-4 bg-slate-900/30">
                  <p className="text-xs font-bold uppercase text-slate-500 mb-3">Esempi Concreti:</p>
                  <ul className="space-y-2">
                    {(item.examples || []).map((ex, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2 items-start">
                        <CheckCircle size={14} className="text-emerald-500 mt-1 flex-shrink-0" />
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Probing Questions */}
      {probingQuestions.length > 0 && (
        <div className="glass-panel rounded-xl p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-6 text-purple-400">
            <HelpCircle size={24} />
            <h3 className="text-xl font-bold">Domande di Approfondimento</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {probingQuestions.map((q, idx) => (
              <div key={idx} className="flex gap-3 items-start p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span className="text-purple-400 font-bold">?</span>
                <p className="text-sm text-slate-200 italic">"{q}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Five Prompt Variations (Tabbed) */}
      {promptVariations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Layers size={24} />
            <h3 className="text-xl font-bold">Variazioni Prompt Ottimizzate</h3>
          </div>
          
          <div className="glass-panel rounded-xl overflow-hidden border border-indigo-500/30">
            <div className="flex overflow-x-auto border-b border-slate-700 bg-slate-800/50">
              {promptVariations.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveVariation(idx)}
                  className={`
                    px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2
                    ${safeActiveVariation === idx 
                      ? 'bg-indigo-600 text-white shadow-[inset_0_-2px_0_rgba(255,255,255,0.5)]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'}
                  `}
                >
                  {v.type === 'Minimalist' && <Zap size={14} />}
                  {v.type === 'Extended' && <Layers size={14} />}
                  {v.type === 'Specialized' && <Target size={14} />}
                  {v.type === 'Aggressive' && <Zap size={14} className="text-red-400" />}
                  {v.type === 'Defensive' && <Shield size={14} />}
                  {v.type}
                </button>
              ))}
            </div>

            <div className="p-6 bg-slate-900/50 min-h-[300px]">
              {currentVariation ? (
                <>
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-white mb-1">{currentVariation.type} Version</h4>
                    <p className="text-slate-400 text-sm">{currentVariation.explanation}</p>
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigator.clipboard.writeText(currentVariation.content)}
                        className="bg-slate-700 hover:bg-indigo-600 text-white p-2 rounded-lg shadow-lg transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <pre className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-sm text-indigo-100 whitespace-pre-wrap leading-relaxed">
                      {currentVariation.content}
                    </pre>
                  </div>
                </>
              ) : (
                 <div className="flex items-center justify-center h-full text-slate-500">
                   Nessuna variazione disponibile.
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AnalysisCard;