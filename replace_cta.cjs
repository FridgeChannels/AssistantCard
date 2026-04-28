const fs = require('fs');
const file = './src/components/briefing/MorningBriefing.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Glass wrapping for CTA buttons
content = content.replace(/<Glass variant="card" className="px-6 py-4">\s*(<button|<a)([\s\S]*?)className="w-full flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-\[0\.97\]"([\s\S]*?)>\s*<span className="text-base font-medium text-\[#010101\]">(.*?)<\/span>\s*(<\/button>|<\/a>)\s*<\/Glass>/g, 
  (match, tagStart, beforeClass, afterClass, spanText, tagEnd) => {
    return `${tagStart}${beforeClass}className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"${afterClass}>
        <span className="text-base font-bold text-[#010101]">${spanText}</span>
    ${tagEnd}`;
});

fs.writeFileSync(file, content);
console.log('CTA buttons updated successfully.');
