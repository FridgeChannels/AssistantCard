export const MOCK_KB = [
    {
        keywords: ["tour", "sign", "agreement"],
        answer: {
            text: "You don't need to sign a long-term contract just to see a home. We can use a 'showing-specific' agreement.",
            meaning: "Limits our relationship to just this one property for today.",
            risk: "Don't sign a 6-month Buyer Agency Agreement just for a first tour.",
            actionLabel: "Ask for Showing Agreement",
            nextMove: "If you're touring, we'll keep options open—short, limited agreement is normal.",
            relatedQuestions: [
                "What if I want to offer later?",
                "Do I pay you for the tour?",
                "Can I bring my parents?"
            ]
        }
    },
    {
        keywords: ["appraisal", "low", "value"],
        answer: {
            text: "If the appraisal is low, you have 3 options: negotiate the price down, cover the gap in cash, or walk away.",
            meaning: "The bank only lends based on the appraised value, not your offer price.",
            risk: "If you waived the appraisal contingency, you must cover the gap.",
            actionLabel: "Review Appraisal Contingency",
            nextMove: "Low appraisal? You have leverage unless you waived the contingency.",
            relatedQuestions: [
                "What is an appraisal gap clause?",
                "Can we challenge the appraisal?",
                "Does the seller have to lower the price?"
            ]
        }
    },
    {
        keywords: ["wire", "funds", "money", "deposit"],
        answer: {
            text: "Never wire funds based on an email instruction. Fraud is real. Always call the title company to verify.",
            meaning: "Hackers clone emails to divert your closing funds.",
            risk: "Once wired to a wrong account, money is often unrecoverable.",
            actionLabel: "Call Title Company",
            nextMove: "Before wiring: always verify by calling via a trusted number.",
            relatedQuestions: [
                "When is the wire due?",
                "Can I bring a cashier's check instead?",
                "Is my earnest money refundable?"
            ]
        }
    },
    {
        keywords: ["closing costs", "cost", "fees"],
        answer: {
            text: "Closing costs are typically 2-5% of purchase price, separate from your down payment.",
            meaning: "Includes taxes, title insurance, and lender fees.",
            risk: "Don't forget to budget these liquid funds—they can't be borrowed.",
            actionLabel: "Estimate My Closing Costs",
            nextMove: "Budget 2-5% extra for closing costs on top of your down payment.",
            relatedQuestions: [
                "Can the seller pay my closing costs?",
                "Are closing costs tax deductible?",
                "When do I pay them?"
            ]
        }
    }
];

export const QUICK_QUESTIONS_POOLS = [
    ["Do I have to sign before touring?", "What happens if appraisal is low?", "When should I wire funds?"],
    ["What are closing costs?", "Can I back out after inspection?", "How much for earnest money?"],
    ["Do I need a final walkthrough?", "What is title insurance?", "Who pays the agent?"]
];

export function findAnswer(query) {
    const lowerQ = query.toLowerCase();
    const hit = MOCK_KB.find(item => item.keywords.some(k => lowerQ.includes(k)));

    if (hit) return { ...hit.answer, type: 'result' };

    // Fallback
    return {
        type: 'fallback',
        text: "It depends heavily on the specific terms of your contract and local regulations.",
        isFallback: true,
        actionLabel: "Text Agent",
        nextMove: "This specific question needs your agent's confirmation.",
        relatedQuestions: [
            "How do I terminate the contract?",
            "What are the standard contingencies?",
            "Can I switch lenders now?"
        ]
    };
}
