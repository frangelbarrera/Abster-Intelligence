import React, { useState, useMemo } from 'react';
import { useAbsterStore } from '../store/absterStore';
import { 
  X, Search, Filter, Download, Trash2, FileText, Image as ImageIcon, 
  FileCode, File, HardDrive, Calendar, HardDrive as SizeIcon, Tag,
  Grid, List as ListIcon, Clock, ArrowUpDown, Eye
} from 'lucide-react';

export default function AbsterReports({ onClose }: { onClose: () => void }) {
  const { vaultFiles, activeCaseId, removeVaultFile } = useAbsterStore();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Viewer State
  const [viewingFile, setViewingFile] = useState<any | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const caseFiles = useMemo(() => {
    return vaultFiles.filter(f => f.chatId === activeCaseId || true); // Assuming vault files are linked to the case via chat or directly
  }, [vaultFiles, activeCaseId]);

  const filteredAndSortedFiles = useMemo(() => {
    let result = caseFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'size') comparison = a.size - b.size;
      else if (sortBy === 'type') comparison = a.type.localeCompare(b.type);
      else if (sortBy === 'date') comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [caseFiles, search, sortBy, sortOrder]);

  const getFileIcon = (type: string, size = 24) => {
    if (type === 'image') return <ImageIcon size={size} className="text-pink-400" />;
    if (type === 'document') return <FileText size={size} className="text-blue-400" />;
    if (type === 'video') return <FileCode size={size} className="text-orange-400" />;
    return <File size={size} className="text-zinc-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleViewFile = async (file: any) => {
    setViewingFile(file);
    setTextContent(null);

    // Some files might have a full MIME type in file.data.type, or just our custom string in file.type
    const actualMime = file.data?.type?.toLowerCase() || "";
    const isText = actualMime.startsWith('text/') || actualMime === 'application/json' || actualMime === 'application/xml' || actualMime === 'application/javascript' || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.md') || file.name.endsWith('.csv');

    if (isText) {
      if (file.data) {
        try {
          const text = await file.data.text();
          setTextContent(text);
        } catch (err) {
          setTextContent("Error reading text file.");
        }
      } else if (file.url) {
         try {
           const res = await fetch(file.url);
           const text = await res.text();
           setTextContent(text);
         } catch (err) {
           setTextContent("Error loading text file.");
         }
      }
    }
  };

  const renderFileContent = (file: any) => {
    if (!file.url && !file.data) return <div className="text-zinc-500">File not available</div>;

    const typeStr = file.type.toLowerCase(); // our custom type ('image', 'document', etc)
    const actualMime = file.data?.type?.toLowerCase() || "";
    const isText = actualMime.startsWith('text/') || actualMime === 'application/json' || actualMime === 'application/xml' || actualMime === 'application/javascript' || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.md') || file.name.endsWith('.csv');
    const isPdf = actualMime === 'application/pdf' || file.name.endsWith('.pdf');

    if (typeStr === 'image' || actualMime.startsWith('image/')) {
      return <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />;
    }
    if (typeStr === 'video' || actualMime.startsWith('video/')) {
      return <video src={file.url} controls className="max-w-full max-h-full rounded-lg shadow-2xl" />;
    }
    if (typeStr === 'audio' || actualMime.startsWith('audio/')) {
      return <audio src={file.url} controls className="w-full max-w-md" />;
    }
    if (isPdf) {
      return <iframe src={file.url} className="w-full h-full rounded-lg bg-white" title={file.name} />;
    }
    if (isText) {
      return (
        <div className="w-full h-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-auto custom-scrollbar">
          {textContent === null ? (
            <div className="text-zinc-500 animate-pulse flex items-center justify-center h-full">Loading content...</div>
          ) : (
            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">{textContent}</pre>
          )}
        </div>
      );
    }

    // Fallback
    return (
      <div className="flex flex-col items-center gap-4 text-zinc-500">
        <File size={64} className="opacity-20" />
        <p>Preview not available for this format ({file.name.split('.').pop() || typeStr})</p>
        {file.url && (
          <a href={file.url} download={file.name} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-md transition-colors flex items-center gap-2 text-sm">
            <Download size={16} /> Download File
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] text-zinc-100 flex flex-col font-mono animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500">
            <HardDrive size={16} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase">Reports & Evidence Center</h1>
            <div className="text-[10px] text-zinc-500 tracking-wider">
              {caseFiles.length} FILES · {formatSize(caseFiles.reduce((a, b) => a + b.size, 0))} TOTAL
            </div>
          </div>
        </div>
        
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between gap-4 shrink-0">
        <div className="relative w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search evidence by name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-pink-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Grid size={14} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ListIcon size={14} />
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-2" />

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-pink-500/50"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>
            <button 
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <ArrowUpDown size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0a0a0a]">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <HardDrive size={48} className="mb-4 opacity-20" />
            <p className="text-sm tracking-widest uppercase">No evidence matches the search</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAndSortedFiles.map(f => (
              <div key={f.id} className="group bg-zinc-900/50 border border-zinc-800 hover:border-pink-500/50 rounded-xl overflow-hidden transition-all hover:shadow-[0_0_15px_rgba(236,72,153,0.1)] flex flex-col">
                <div 
                  className="h-32 bg-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-800/50 cursor-pointer"
                  onClick={() => handleViewFile(f)}
                >
                  {f.type === 'image' && f.url ? (
                    <img src={f.url} alt={f.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    getFileIcon(f.type, 32)
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleViewFile(f)} className="p-2 bg-zinc-800 hover:bg-pink-500/20 hover:text-pink-400 rounded-lg transition-colors text-white" title="View file">
                      <Eye size={16} />
                    </button>
                    {f.url && (
                      <a href={f.url} download={f.name} className="p-2 bg-zinc-800 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg transition-colors text-white" title="Download">
                        <Download size={16} />
                      </a>
                    )}
                    <button onClick={() => removeVaultFile(f.id)} className="p-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors text-white" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-1 cursor-pointer" onClick={() => handleViewFile(f)}>
                  <div className="text-xs font-bold text-zinc-200 truncate" title={f.name}>{f.name}</div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase">
                    <span className="flex items-center gap-1"><Tag size={10} /> {f.type}</span>
                    <span className="flex items-center gap-1"><SizeIcon size={10} /> {formatSize(f.size)}</span>
                  </div>
                  <div className="text-[9px] text-zinc-600 mt-1 flex items-center gap-1">
                    <Clock size={10} /> {formatDate(f.uploadedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredAndSortedFiles.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-800/30 transition-colors group cursor-pointer" onClick={() => handleViewFile(f)}>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {f.type === 'image' && f.url ? (
                          <img src={f.url} alt="" className="w-full h-full object-cover opacity-70" />
                        ) : getFileIcon(f.type, 14)}
                      </div>
                      <span className="font-bold text-zinc-200 truncate max-w-[300px]">{f.name}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 uppercase text-[10px] tracking-wider">{f.type}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatSize(f.size)}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatDate(f.uploadedAt)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleViewFile(f)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-pink-400 transition-colors" title="View file">
                          <Eye size={14} />
                        </button>
                        {f.url && (
                          <a href={f.url} download={f.name} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-400 transition-colors" title="Download">
                            <Download size={14} />
                          </a>
                        )}
                        <button onClick={() => removeVaultFile(f.id)} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col backdrop-blur-md animate-in fade-in duration-200">
          <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 bg-zinc-950/80">
            <div className="flex items-center gap-3">
              {getFileIcon(viewingFile.type, 20)}
              <span className="font-bold text-sm text-zinc-200">{viewingFile.name}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">{formatSize(viewingFile.size)}</span>
            </div>
            <div className="flex items-center gap-2">
              {viewingFile.url && (
                <a href={viewingFile.url} download={viewingFile.name} className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-blue-400" title="Download original">
                  <Download size={18} />
                </a>
              )}
              <button onClick={() => { setViewingFile(null); setTextContent(null); }} className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white" title="Close viewer">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex items-center justify-center p-6 relative">
            {renderFileContent(viewingFile)}
          </div>
        </div>
      )}
    </div>
  );
}
