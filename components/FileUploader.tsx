
import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../types';
import { createChunks } from '../services/ragService';
import { Upload, FileText, FileCode, Trash2, FileType, Loader2, FolderArchive, ChevronRight, ChevronDown, Plus, FileQuestion, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
// @ts-ignore
import mammoth from 'mammoth';

// Configura il worker per PDF.js in modo sicuro
const initPdfWorker = () => {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
     pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
  }
};

interface FileUploaderProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  onFilesAdded: (newFiles: UploadedFile[]) => void;
  isCompact?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ files, setFiles, onFilesAdded, isCompact = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showFileList, setShowFileList] = useState(false);

  useEffect(() => {
     initPdfWorker();
  }, []);

  const isSupportedFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const textExtensions = [
      'txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'scss', 
      'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'rb', 'sql', 
      'yaml', 'yml', 'xml', 'env', 'gitignore', 'conf', 'sh', 'bat', 'ps1', 'dockerfile'
    ];
    const docExtensions = ['pdf', 'docx'];
    return ext && (textExtensions.includes(ext) || docExtensions.includes(ext));
  };

  const isBinaryDoc = (filename: string) => {
     const ext = filename.split('.').pop()?.toLowerCase();
     return ext === 'pdf' || ext === 'docx';
  };

  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      // Supporto per named export o default export a seconda del bundler/ambiente
      const getDoc = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;
      
      if (!getDoc) throw new Error("PDF.js non inizializzato correttamente.");

      const loadingTask = getDoc({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      return fullText;
    } catch (e: any) {
      console.error("PDF extraction failed", e);
      return `[ERRORE LETTURA PDF: ${e.message || 'Formato non supportato o corrotto'}]`;
    }
  };

  const extractDocxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      return result.value;
    } catch (e: any) {
       console.error("DOCX extraction failed", e);
       return `[ERRORE LETTURA DOCX: ${e.message}]`;
    }
  };

  const processZipFile = async (file: File): Promise<UploadedFile[]> => {
    try {
      setStatusMessage(`Decompressione ZIP...`);
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const extractedFiles: UploadedFile[] = [];

      for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
        const entry = zipEntry as any;
        if (entry.dir) continue;
        if (relativePath.includes('node_modules/') || relativePath.includes('.git/') || relativePath.includes('dist/') || relativePath.startsWith('__MACOSX')) continue;
        if (!isSupportedFile(relativePath)) continue;

        setStatusMessage(`Extracting: ${relativePath}`);
        
        let content = "";
        let type = 'code';

        if (isBinaryDoc(relativePath)) {
            const arrayBuffer = await entry.async("arraybuffer");
            if (relativePath.endsWith('.pdf')) {
                content = await extractPdfText(arrayBuffer);
                type = 'pdf';
            } else if (relativePath.endsWith('.docx')) {
                content = await extractDocxText(arrayBuffer);
                type = 'docx';
            }
        } else {
            content = await entry.async("string");
            if (relativePath.endsWith('.md') || relativePath.endsWith('.txt')) type = 'text';
            if (relativePath.endsWith('.json') || relativePath.endsWith('.yaml')) type = 'config';
        }

        const fileId = Math.random().toString(36).substr(2, 9);
        const chunks = createChunks(content, fileId, relativePath);

        extractedFiles.push({
          id: fileId,
          name: relativePath,
          type,
          size: content.length,
          content: `// FILE PATH: ${relativePath}\n${content}`,
          chunks: chunks
        });
      }
      return extractedFiles;
    } catch (error) {
      console.error("Error processing zip:", error);
      setStatusMessage("Errore ZIP");
      return [];
    }
  };

  const processFile = async (file: File): Promise<UploadedFile | UploadedFile[]> => {
    if (file.name.endsWith('.zip')) return await processZipFile(file);

    let content = "";
    let type = 'unknown';

    try {
        if (file.name.endsWith('.pdf')) {
            const arrayBuffer = await file.arrayBuffer();
            content = await extractPdfText(arrayBuffer);
            type = 'pdf';
        } else if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            content = await extractDocxText(arrayBuffer);
            type = 'docx';
        } else {
            content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string || "");
                reader.readAsText(file);
            });

            if (file.name.endsWith('.txt') || file.name.endsWith('.md')) type = 'text';
            else if (file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.json')) type = 'code';
        }
    } catch (e) {
        console.error("Critical file read error", e);
        content = "[ERRORE CRITICO LETTURA FILE]";
    }

    const fileId = Math.random().toString(36).substr(2, 9);
    // RAG CHUNKING STEP
    const chunks = createChunks(content, fileId, file.name);

    return {
        id: fileId,
        name: file.name,
        type,
        size: file.size,
        content,
        chunks: chunks
    };
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      setShowFileList(true);
      const selectedFiles: File[] = Array.from(e.target.files);
      const newFiles: UploadedFile[] = [];
      
      try {
          for (const file of selectedFiles) {
            setStatusMessage(`Reading ${file.name}...`);
            const result = await processFile(file);
            if (Array.isArray(result)) newFiles.push(...result);
            else newFiles.push(result);
          }
          setFiles(prev => [...prev, ...newFiles]);
          onFilesAdded(newFiles);
      } catch(e) {
          console.error("Batch upload error", e);
          setStatusMessage("Errore Caricamento");
      } finally {
          setIsProcessing(false);
          setStatusMessage('');
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getIcon = (type: string, name: string) => {
    if (name.endsWith('.zip')) return <FolderArchive size={16} className="text-orange-400" />;
    if (type === 'pdf') return <FileText size={16} className="text-red-400" />;
    if (type === 'docx') return <FileText size={16} className="text-blue-500" />;
    
    switch (type) {
      case 'text': return <FileText size={16} className="text-slate-300" />;
      case 'code': return <FileCode size={16} className="text-yellow-400" />;
      case 'config': return <FileType size={16} className="text-purple-400" />;
      default: return <FileQuestion size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-2">
      <div 
        onClick={() => setShowFileList(!showFileList)}
        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 cursor-pointer transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
             {isProcessing ? (
                <Loader2 className="animate-spin text-indigo-400" size={20} />
             ) : (
                <FileText className="text-indigo-400" size={20} />
             )}
             <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-500 text-[8px] text-white">
                {files.length}
             </span>
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold text-slate-200 truncate">Knowledge Base</h3>
            <p className="text-[10px] text-slate-500 truncate">
                {isProcessing ? statusMessage : (files.length > 0 ? `${files.length} file indicizzati` : "Trascina o clicca")}
            </p>
          </div>
        </div>
        {showFileList ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </div>

      {showFileList && (
        <div className="animate-in slide-in-from-top-2 duration-200 space-y-2">
           <label className={`
                flex items-center gap-2 w-full p-2 rounded border-2 border-dashed 
                ${isProcessing ? 'border-slate-700 bg-slate-800 opacity-50 cursor-not-allowed' : 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 cursor-pointer'}
                justify-center text-xs text-slate-400 hover:text-white transition-all
           `}>
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
              <span>{isProcessing ? 'Analisi in corso...' : 'Aggiungi File (PDF, Code, ZIP)'}</span>
              <input 
                type="file" 
                multiple 
                accept=".txt,.md,.json,.js,.ts,.tsx,.html,.css,.scss,.py,.pdf,.docx,.zip"
                onChange={handleFileInput} 
                className="hidden" 
                disabled={isProcessing}
              />
           </label>

           <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-2 rounded bg-slate-900/50 group border border-transparent hover:border-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                    {getIcon(file.type, file.name)}
                    <span className="text-xs text-slate-300 truncate font-mono max-w-[140px]" title={file.name}>{file.name}</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                    className="text-slate-600 hover:text-red-400"
                >
                    <Trash2 size={12} />
                </button>
                </div>
            ))}
            {files.length === 0 && !isProcessing && (
                <div className="p-2 text-center text-[10px] text-slate-600 italic">
                    Nessun file caricato. Il RAG è inattivo.
                </div>
            )}
           </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
