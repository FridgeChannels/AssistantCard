import React from 'react';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Glass } from '../layout/Glass';

export function History({ onBack }) {
    const todaySessions = [
        {
            id: 1,
            title: "Morning Briefing",
            status: "Finished",
            time: "8:00 AM",
            duration: "12m",
            icon: "morning",
            iconColor: "green"
        },
        {
            id: 2,
            title: "Tech News Daily",
            status: "Finished",
            time: "10:30 AM",
            duration: "5m",
            icon: "tech",
            iconColor: "purple"
        }
    ];

    const yesterdaySessions = [
        {
            id: 3,
            title: "Evening Summary",
            status: "Broadcast",
            time: "6:15 PM",
            duration: "8m",
            icon: "evening",
            iconColor: "blue"
        }
    ];

    const getIcon = (iconType, color) => {
        const iconClasses = {
            morning: "bg-gradient-to-br from-green-500 to-green-700",
            tech: "bg-gradient-to-br from-purple-500 to-purple-700",
            evening: "bg-gradient-to-br from-blue-500 to-blue-700",
            market: "bg-gradient-to-br from-green-500 to-green-700",
            weather: "bg-gradient-to-br from-gray-400 to-gray-600"
        };

        return (
            <div className={`w-12 h-12 rounded-xl ${iconClasses[iconType] || iconClasses.weather} flex items-center justify-center shadow-sm`}>
                {iconType === 'morning' && (
                    <div className="relative w-7 h-7">
                        <div className="absolute inset-0 bg-gray-800 rounded-sm transform rotate-45"></div>
                        <div className="absolute inset-0 bg-green-400 rounded-sm transform -rotate-12"></div>
                    </div>
                )}
                {iconType === 'tech' && (
                    <div className="flex items-end gap-0.5 h-5">
                        <div className="w-0.5 h-2 bg-white rounded-full"></div>
                        <div className="w-0.5 h-3 bg-white rounded-full"></div>
                        <div className="w-0.5 h-4 bg-white rounded-full"></div>
                        <div className="w-0.5 h-2 bg-white rounded-full"></div>
                    </div>
                )}
                {iconType === 'evening' && (
                    <div className="relative w-6 h-6">
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-white rounded-full"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-2 border-white rounded-full"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-2 border-white rounded-full"></div>
                    </div>
                )}
                {iconType === 'market' && (
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                )}
                {iconType === 'weather' && (
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                )}
            </div>
        );
    };

    const getYesterdayDate = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[yesterday.getMonth()]} ${yesterday.getDate()}`;
    };

    return (
        <div className="flex-1 flex flex-col bg-white w-full h-full overflow-hidden">
            {/* Header */}
            <header className="px-5 py-4 bg-white flex-none border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-900" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">History</h1>
                    </div>
                    <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <SlidersHorizontal className="w-5 h-5 text-gray-900" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* TODAY Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">TODAY</h2>
                        <span className="text-xs text-gray-300">{todaySessions.length} sessions</span>
                    </div>
                    <div className="space-y-3">
                        {todaySessions.map((session) => (
                            <Glass key={session.id} variant="card" className="p-4 flex items-center gap-4 hover:opacity-90 transition-opacity">
                                {getIcon(session.icon, session.iconColor)}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-base">{session.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-blue-600">{session.status}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-sm text-gray-400">{session.time}</span>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-400">{session.duration}</span>
                            </Glass>
                        ))}
                    </div>
                </div>

                {/* YESTERDAY Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">YESTERDAY</h2>
                        <span className="text-xs text-gray-300">{getYesterdayDate()}</span>
                    </div>
                    <div className="space-y-3">
                        {yesterdaySessions.map((session) => (
                            <Glass key={session.id} variant="card" className="p-4 flex items-center gap-4 hover:opacity-90 transition-opacity">
                                {getIcon(session.icon, session.iconColor)}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-base">{session.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-gray-400">{session.status}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-sm text-gray-400">{session.time}</span>
                                    </div>
                                </div>
                                <span className="text-sm text-gray-400">{session.duration}</span>
                            </Glass>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
