import { useState, useEffect, useCallback } from 'react';
import { GeminiMusicService } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { generateStandaloneHtml } from './services/htmlExport';
import { Composition, GenerationState } from './types';
import Visualizer from './components/Visualizer';
import Paywall from './components/Paywall';
import { Play, Pause, Music, Wand2, Loader2, Volume2, RotateCcw, Download, FileAudio, FileMusic, FileCode } from 'lucide-react';

// Example Prompts
const SUGGESTIONS = [
  "A sad piano ballad in A minor",
  "Upbeat 80s synthwave for driving",
  "Lofi hip hop beat for studying",
  "Cyberpunk chase scene with heavy bass",
  "Dreamy ambient pad texture"
];

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<GenerationState>(GenerationState.IDLE);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Paywall / Export State
  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingExport, setPendingExport] = useState<'midi' | 'wav' | 'html' | null>(null);
  
  // Gemini Service Instance
  const [gemini] = useState(() => new GeminiMusicService());

  // Initialize Audio Context on first interaction
  const handleInteraction = async () => {
    await audioEngine.initialize();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    await handleInteraction();
    setStatus(GenerationState.THINKING);
    setError(null);
    setIsPlaying(false);
    audioEngine.stop();

    try {
      const result = await gemini.generateComposition(prompt);
      console.log("Generated:", result);
      setComposition(result);
      
      setStatus(GenerationState.COMPOSING);
      // Simulate loading time for "loading instruments" effect
      setTimeout(() => {
         audioEngine.loadComposition(result);
         setStatus(GenerationState.READY);
      }, 500);

    } catch (err: any) {
      setStatus(GenerationState.ERROR);
      setError(err.message || "Failed to compose music.");
    }
  };

  const togglePlayback = () => {
    if (!composition) return;
    const playing = audioEngine.play();
    setIsPlaying(playing);
  };

  const handleSuggestion = (text: string) => {
      setPrompt(text);
  };

  const handleExportRequest = (type: 'midi' | 'wav' | 'html') => {
    if (!composition) return;
    setPendingExport(type);
    setShowPaywall(true);
  };

  const executeExport = async () => {
    if (!composition || !pendingExport) return;

    setShowPaywall(false);
    setIsExporting(true);
    
    try {
      let blob: Blob;
      let filename = `${composition.title.replace(/\s+/g, '_')}_${Date.now()}`;

      if (pendingExport === 'midi') {
        blob = await audioEngine.exportMidi(composition);
        filename += '.mid';
      } else if (pendingExport === 'wav') {
        blob = await audioEngine.exportWav(composition);
        filename += '.wav';
      } else {
        blob = generateStandaloneHtml(composition);
        filename += '.html';
      }

      // Trigger Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Export failed", e);
      setError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setPendingExport(null);
    }
  };

  return (
    <div className="min-h-screen bg-synth-bg text-slate-200 font-sans selection:bg-synth-accent selection:text-white" onClick={handleInteraction}>
      
      {showPaywall && (
          <Paywall 
            onContinue={executeExport} 
            onClose={() => { setShowPaywall(false); setPendingExport(null); }} 
          />
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-synth-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-synth-accent to-purple-600 flex items-center justify-center shadow-lg shadow-synth-accent/20">
               <Music className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              SonicMind
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-500 border border-slate-800 px-2 py-1 rounded bg-synth-panel">
            POWERED BY GEMINI 2.5
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 pb-24">
        
        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Col: Controls & Input */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-synth-panel rounded-2xl p-6 border border-slate-800 shadow-xl">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Composer Prompt
              </h2>
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the music you want to hear..."
                className="w-full h-32 bg-[#0f0f13] border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-synth-accent focus:border-transparent outline-none resize-none text-white placeholder:text-slate-600 transition-all"
              />
              
              <div className="mt-4 flex justify-between items-center">
                 <span className="text-xs text-slate-500">
                   {status === GenerationState.THINKING ? "Analyzing acoustics..." : "Ready to synthesize"}
                 </span>
                 <button
                    onClick={handleGenerate}
                    disabled={status === GenerationState.THINKING || !prompt.trim()}
                    className={`
                      px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2
                      ${status === GenerationState.THINKING 
                        ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                        : 'bg-synth-accent hover:bg-indigo-500 text-white shadow-lg shadow-synth-accent/25 hover:shadow-synth-accent/40 active:scale-95'
                      }
                    `}
                 >
                    {status === GenerationState.THINKING ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Composing</>
                    ) : (
                        <>Generate Track</>
                    )}
                 </button>
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase px-1">Quick Ideas</p>
                <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSuggestion(s)}
                            className="text-xs bg-synth-panel border border-slate-800 hover:border-synth-accent/50 hover:text-synth-glow px-3 py-1.5 rounded-full transition-colors text-slate-400"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-900/20 border border-red-900/50 text-red-200 text-sm">
                    {error}
                </div>
            )}
          </div>

          {/* Right Col: Visualization & Player */}
          <div className="lg:col-span-7 space-y-6">
             
             {/* Visualizer Panel */}
             <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-synth-accent/10 to-transparent rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-black rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-900'}`}></div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Audio Output</span>
                    </div>
                    <Visualizer analyser={audioEngine.getAnalyser()} isPlaying={isPlaying} />
                </div>
             </div>

             {/* Track Info Card */}
             {composition ? (
                 <div className="bg-synth-panel rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{composition.title}</h2>
                            <p className="text-sm text-slate-400">{composition.description}</p>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="text-right">
                                <div className="text-2xl font-mono font-bold text-synth-glow">{composition.bpm} <span className="text-xs text-slate-600">BPM</span></div>
                                <div className="text-xs text-slate-500 uppercase tracking-wide">{composition.scale}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Tracks List */}
                    <div className="p-6 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                            <span>Instrument Layers</span>
                            <span>Status</span>
                        </div>
                        {composition.tracks.map((track, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-[#0f0f13] border border-slate-800/50">
                                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: `${track.color}20`, color: track.color }}>
                                    <Volume2 className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-200">{track.name}</div>
                                    <div className="text-xs text-slate-500 capitalize">{track.instrument}</div>
                                </div>
                                <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full w-full ${isPlaying ? 'animate-pulse-slow' : 'opacity-50'}`} style={{ backgroundColor: track.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Playback Controls */}
                    <div className="p-6 bg-[#0f0f13]/50 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Export Actions */}
                        <div className="flex items-center gap-2 order-2 md:order-1">
                            <button 
                                onClick={() => handleExportRequest('midi')} 
                                disabled={isExporting}
                                className="text-xs flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="Download MIDI"
                            >
                                {isExporting && pendingExport === 'midi' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileMusic className="w-3 h-3" />}
                                MIDI
                            </button>
                            <button 
                                onClick={() => handleExportRequest('wav')} 
                                disabled={isExporting}
                                className="text-xs flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="Download WAV (Audio)"
                            >
                                {isExporting && pendingExport === 'wav' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileAudio className="w-3 h-3" />}
                                WAV
                            </button>
                             <button 
                                onClick={() => handleExportRequest('html')} 
                                disabled={isExporting}
                                className="text-xs flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="Download Standalone Player"
                            >
                                {isExporting && pendingExport === 'html' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCode className="w-3 h-3" />}
                                HTML
                            </button>
                        </div>

                        <div className="flex items-center gap-6 order-1 md:order-2">
                            <button className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                               <RotateCcw className="w-5 h-5" onClick={() => { audioEngine.stop(); setIsPlaying(false); }} />
                            </button>
                            <button 
                                onClick={togglePlayback}
                                className="w-16 h-16 rounded-full bg-synth-accent hover:bg-indigo-500 text-white shadow-lg shadow-synth-accent/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                            >
                                {isPlaying ? (
                                    <Pause className="w-8 h-8 fill-current" />
                                ) : (
                                    <Play className="w-8 h-8 fill-current ml-1" />
                                )}
                            </button>
                        </div>
                        
                        {/* Spacer for alignment */}
                        <div className="w-20 hidden md:block order-3"></div>
                    </div>
                 </div>
             ) : (
                 <div className="h-64 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-4 bg-synth-panel/30">
                     <Music className="w-12 h-12 opacity-20" />
                     <p className="text-sm">Your composition will appear here</p>
                 </div>
             )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full border-t border-slate-800 bg-synth-bg/90 backdrop-blur text-slate-600 text-xs py-3 px-6 flex justify-between items-center">
         <span>Built with Gemini API & Tone.js</span>
         <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500/50"></span> System Online
         </span>
      </footer>
    </div>
  );
};

export default App;