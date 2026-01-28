import { createContext, useContext, useState, type ReactNode } from 'react';

export interface KBArticle {
    id: string;
    title: string;
    content: string;
    tags: string[]; // For better search matching (e.g. 'swahili', 'greeting')
}

interface KnowledgeContextType {
    articles: KBArticle[];
    addArticle: (article: Omit<KBArticle, 'id'>) => void;
    deleteArticle: (id: string) => void;
    searchArticles: (query: string) => string | null;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

// Initial Seed Data from User Request
const SEED_ARTICLES: KBArticle[] = [
    {
        id: '1',
        title: 'Standard Greeting (Hello)',
        content: 'Hello! Please let us know how we can assist you today.',
        tags: ['greeting', 'hello', 'start', 'jambo']
    },
    {
        id: '2',
        title: 'Friendly Greeting',
        content: 'Hi there! How can we help you today?',
        tags: ['greeting', 'friendly', 'hi']
    },
    {
        id: '3',
        title: 'Pending Betslip (Postponed Game)',
        content: 'Pending betslips with postponed games are processed within 24 hours after the scheduled game end time. Once settled, the outcome will reflect automatically on your account.',
        tags: ['betslip', 'pending', 'postponed', 'game', 'bet']
    },
    {
        id: '4',
        title: 'High Empathy - Unpaid Won Betslip',
        content: 'We understand your concern and are here to help. Kindly share a bet slip screenshot, the Bet ID, and your registered phone number so we can investigate and resolve this promptly.',
        tags: ['unpaid', 'won', 'missing', 'money', 'empathy']
    },
    {
        id: '5',
        title: 'Withdrawal Assistance (Request Phone)',
        content: 'To assist with your withdrawal and complete the required referral verification, kindly share the phone number or account number registered on your Betfalme account.',
        tags: ['withdrawal', 'phone', 'account', 'number']
    },
    {
        id: '6',
        title: 'Account Deactivation',
        content: 'To deactivate your account, please visit https://betfalme.ke/account/delete, select Account Deactivation, and choose an exclusion period. Processing time is up to 48 hours. Ensure zero balance.',
        tags: ['close', 'delete', 'deactivate', 'account', 'stop']
    },
    {
        id: '7',
        title: 'Referral Bonus Not Received',
        content: 'To receive the referral bonus, please ensure the person you referred registered using your unique referral link and successfully verified their account using the verification code. Bonus is credited automatically upon verification.',
        tags: ['referral', 'bonus', 'missing', 'invite']
    },
    {
        id: '8',
        title: 'Failed Deposit (MPESA)',
        content: 'If your deposit was unsuccessful, kindly share the MPESA transaction message or code (e.g., UA58134GTJ). Mini-statements are not accepted.',
        tags: ['deposit', 'failed', 'mpesa', 'money', 'add']
    },
    {
        id: '9',
        title: 'Airtel Deposit Not Supported',
        content: 'Kindly note that we currently support Safaricom MPESA transactions only. Airtel Money deposits cannot be processed. Please contact Airtel Customer Care for reversal.',
        tags: ['airtel', 'deposit', 'unsupported']
    },
    {
        id: '10',
        title: '10% Cashback Explanation',
        content: 'Cashback is calculated as 10% of the difference between total deposits and withdrawals (Net Loss) made from 9:00 PM yesterday to 9:00 PM today. It is processed daily at 9:05 PM.',
        tags: ['cashback', 'bonus', '10%', 'loss', 'calculation']
    }
];

const STORAGE_KEY = 'falmebet_kb_v1';

export const KnowledgeProvider = ({ children }: { children: ReactNode }) => {
    const [articles, setArticles] = useState<KBArticle[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : SEED_ARTICLES;
    });

    const addArticle = (article: Omit<KBArticle, 'id'>) => {
        const newArticle = { ...article, id: Date.now().toString() };
        const updated = [newArticle, ...articles];
        setArticles(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const deleteArticle = (id: string) => {
        const updated = articles.filter(a => a.id !== id);
        setArticles(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    const searchArticles = (query: string): string | null => {
        const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);

        // Simple Scoring System
        let bestMatch: KBArticle | null = null;
        let maxScore = 0;

        for (const article of articles) {
            let score = 0;
            const contentLower = article.content.toLowerCase();
            const titleLower = article.title.toLowerCase();
            const tagsLower = article.tags.join(' ').toLowerCase();

            keywords.forEach(word => {
                if (titleLower.includes(word)) score += 5;
                if (tagsLower.includes(word)) score += 4;
                if (contentLower.includes(word)) score += 1;
            });

            if (score > maxScore) {
                maxScore = score;
                bestMatch = article;
            }
        }

        if (maxScore > 0 && bestMatch) {
            return `**${bestMatch.title}**\n\n${bestMatch.content}`;
        }
        return null;
    };

    return (
        <KnowledgeContext.Provider value={{ articles, addArticle, deleteArticle, searchArticles }}>
            {children}
        </KnowledgeContext.Provider>
    );
};

export const useKnowledge = () => {
    const context = useContext(KnowledgeContext);
    if (!context) throw new Error('useKnowledge must be used within a KnowledgeProvider');
    return context;
};
