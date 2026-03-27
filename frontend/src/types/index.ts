export interface Participant {
    id: string;
    userId?: string;
    name: string;
    avatar?: string; // URL to avatar image
    amountOwed: number;
    amountPaid?: number;
    amountDue?: number;
    status: 'paid' | 'pending' | 'partial';
    isCurrentUser?: boolean;
    walletAddress?: string;
    email?: string;
}

export interface Item {
    id?: string;
    name: string;
    price: number;
    quantity?: number;
    unitPrice?: number;
    confidence?: number;
    assignedToIds?: string[];
}

export interface Split {
    id: string;
    title: string;
    totalAmount: number;
    amountPaid?: number;
    currency: string;
    date: string;
    status: 'active' | 'completed' | 'partial';
    receiptUrl?: string;
    creatorWalletAddress?: string;
    preferredCurrency?: string;
    participants: Participant[];
    items?: Item[];
}
