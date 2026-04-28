const fs = require('fs');
const file = './src/components/briefing/MorningBriefing.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
  "import { Mic, Play, Pause, AlertCircle, Phone, Mail, MessageSquare } from 'lucide-react';",
  "import { Mic, Play, Pause, AlertCircle, Phone, Mail, MessageSquare, SkipBack, SkipForward } from 'lucide-react';"
);

// 2. State
content = content.replace(
  "const [showContactOptions, setShowContactOptions] = useState(false);",
  `const [showContactOptions, setShowContactOptions] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);`
);

// 3. Audio Effect and Helpers
const helpersCode = `    // 组件卸载时的清理
    useEffect(() => {
        if (!audioElement) return;
        const onTimeUpdate = () => setCurrentTime(audioElement.currentTime);
        const onDurationChange = () => {
            if (!Number.isNaN(audioElement.duration)) setDuration(audioElement.duration);
        };
        setCurrentTime(audioElement.currentTime);
        if (audioElement.readyState > 0 && !Number.isNaN(audioElement.duration)) {
            setDuration(audioElement.duration);
        }
        audioElement.addEventListener('timeupdate', onTimeUpdate);
        audioElement.addEventListener('durationchange', onDurationChange);
        audioElement.addEventListener('loadedmetadata', onDurationChange);
        return () => {
            audioElement.removeEventListener('timeupdate', onTimeUpdate);
            audioElement.removeEventListener('durationchange', onDurationChange);
            audioElement.removeEventListener('loadedmetadata', onDurationChange);
        };
    }, [audioElement]);

    const formatTime = (timeInSeconds) => {
        if (Number.isNaN(timeInSeconds)) return "0:00";
        const totalSeconds = Math.floor(timeInSeconds);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return \`\${minutes}:\${seconds.toString().padStart(2, '0')}\`;
    };

    const handleSeek = (e) => {
        if (!audioElement) return;
        const newTime = Number(e.target.value);
        audioElement.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const skipBackward = () => {
        if (!audioElement) return;
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
    };

    const skipForward = () => {
        if (!audioElement) return;
        audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 15);
    };

    // 组件卸载时的清理（保留原有的清理）
    useEffect(() => {`;

content = content.replace(
  "    // 组件卸载时的清理\n    useEffect(() => {",
  helpersCode
);

// 4. Content Card UI
const oldContentCardStart = `<Glass
                                    variant="panel"
                                    className="p-8 flex flex-col justify-between"
                                    tintOpacity={0.05}
                                    borderOpacity={0.05}
                                    highlightEnabled={false}
                                >`;
const oldContentCardEnd = `                                        </div>
                                    )}
                                </Glass>`;

const newContentCardUI = `<div className="px-6 flex flex-col w-full">
                                    <div className="flex flex-col items-start mb-6">
                                        <SingleLineMarqueeTitle
                                            as="h2"
                                            className="text-[28px] font-bold text-white mb-1 leading-tight w-full"
                                        >
                                            {magnetContext?.assistant_prompt_label || 'Daily Briefing'}
                                        </SingleLineMarqueeTitle>

                                        <p className="text-base text-white/80">
                                            {dateString}
                                        </p>
                                    </div>

                                    {/* Audio Player */}
                                    {!showOnboarding && (
                                        <div className="flex flex-col w-full">
                                            {/* Progress Bar */}
                                            <div className="flex flex-col w-full mb-6">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={duration || 100}
                                                    value={currentTime || 0}
                                                    onChange={handleSeek}
                                                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                                />
                                                <div className="flex justify-between items-center mt-2 text-xs font-medium text-white/90 font-mono tracking-wider">
                                                    <span>{formatTime(currentTime)}</span>
                                                    <span>{formatTime(duration)}</span>
                                                </div>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex items-center justify-center gap-8">
                                                <button onClick={skipBackward} className="text-white hover:opacity-80 transition-opacity">
                                                    <SkipBack className="w-6 h-6" fill="currentColor" />
                                                </button>
                                                
                                                <button
                                                    onClick={handlePlay}
                                                    disabled={!audioElement}
                                                    className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isPlaying ? (
                                                        <Pause className="w-6 h-6 text-white" fill="currentColor" />
                                                    ) : (
                                                        <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                                                    )}
                                                </button>

                                                <button onClick={skipForward} className="text-white hover:opacity-80 transition-opacity">
                                                    <SkipForward className="w-6 h-6" fill="currentColor" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>`;

const startIndex = content.indexOf(oldContentCardStart);
const endIndex = content.indexOf(oldContentCardEnd, startIndex) + oldContentCardEnd.length;
if (startIndex !== -1 && endIndex > startIndex) {
  content = content.substring(0, startIndex) + newContentCardUI + content.substring(endIndex);
}

// 5. CTA UI updates
// Remove Glass wrapper and style buttons directly
content = content.replace(/<Glass variant="card" className="px-6 py-4">\s*(<button|<a)([\s\S]*?)className="w-full flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-\[0\.97\]"([\s\S]*?)>\s*<span className="text-base font-medium text-\[#010101\]">(.*?)<\/span>\s*(<\/button>|<\/a>)\s*<\/Glass>/g, 
  (match, tagStart, beforeClass, afterClass, spanText, tagEnd) => {
    return \`\${tagStart}\${beforeClass}className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"\${afterClass}>
        <span className="text-base font-bold text-[#010101]">\${spanText}</span>
    \${tagEnd}\`;
});

fs.writeFileSync(file, content);
console.log('Update complete.');
