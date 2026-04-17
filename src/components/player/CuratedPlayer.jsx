import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { SingleLineMarqueeTitle } from '../SingleLineMarqueeTitle';

export function CuratedPlayer({ stage }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    // Mock content based on stage
    const content = {
        title: "Understanding Closing Costs",
        duration: "45s",
        videoUrl: "https://videos.pexels.com/video-files/3129671/3129671-sd_960_540_30fps.mp4", // Free stock video placeholder
        thumbnail: "https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    };

    const togglePlay = () => {
        const video = document.getElementById('curated-video');
        if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        const video = document.getElementById('curated-video');
        video.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    return (
        <div className="w-full px-4 pt-4 pb-2">
            <motion.div
                layout
                className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
                onClick={togglePlay}
            >
                <video
                    id="curated-video"
                    src={content.videoUrl}
                    poster={content.thumbnail}
                    className="w-full h-full object-cover"
                    playsInline
                    muted={isMuted}
                    loop
                />

                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity duration-300">

                    <div className="flex items-center justify-between gap-3 text-white">
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium opacity-80 uppercase tracking-widest mb-1">Today's Insight</span>
                            <SingleLineMarqueeTitle as="h3" className="text-lg font-semibold leading-tight">
                                {content.title}
                            </SingleLineMarqueeTitle>
                        </div>

                        <button
                            onClick={toggleMute}
                            className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <AnimatePresence>
                            {!isPlaying && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.2, opacity: 0 }}
                                    className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center pl-1"
                                >
                                    <Play className="w-8 h-8 text-white fill-current" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Captions placeholder */}
                {isPlaying && (
                    <div className="absolute bottom-16 left-0 right-0 text-center px-8 pointer-events-none">
                        <span className="bg-black/60 text-white text-sm px-2 py-1 rounded leading-relaxed">
                            This is a simulated subtitle for the video content explaining the current topic.
                        </span>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
