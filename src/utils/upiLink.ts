import { CURRENCY, UPI_PAY_PAGE_URL } from './Constants';

export type BuildUpiPayUrlParams = {
    pa: string;
    pn?: string | null;
    am: number;
    tn?: string | null;
};

const trimParam = (value?: string | null, maxLen?: number): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return maxLen ? trimmed.slice(0, maxLen) : trimmed;
};

/** Query string for UPI pay intent (without scheme). */
export const buildUpiPayQueryString = (params: BuildUpiPayUrlParams): string | null => {
    const pa = trimParam(params.pa);
    if (!pa) return null;

    const amount = Number(params.am);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const query: Record<string, string> = {
        pa,
        am: amount.toFixed(2),
        cu: 'INR',
    };

    const pn = trimParam(params.pn, 50);
    const tn = trimParam(params.tn, 80);
    if (pn) query.pn = pn;
    if (tn) query.tn = tn;

    return Object.entries(query)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
};

export const buildUpiPayUrl = (params: BuildUpiPayUrlParams): string | null => {
    const qs = buildUpiPayQueryString(params);
    return qs ? `upi://pay?${qs}` : null;
};

export const buildHttpsPayPageUrl = (params: BuildUpiPayUrlParams): string | null => {
    const qs = buildUpiPayQueryString(params);
    return qs ? `${UPI_PAY_PAGE_URL}?${qs}` : null;
};

export type ReminderUpiShareMessageParams = {
    tenantName?: string | null;
    periodLabel: string;
    balance: number;
    upiId?: string | null;
    payeeName?: string | null;
    transactionNote?: string | null;
};

export const buildReminderUpiShareMessage = (params: ReminderUpiShareMessageParams): string | null => {
    const balance = Number(params.balance);
    if (!Number.isFinite(balance) || balance <= 0) return null;

    const payParams: BuildUpiPayUrlParams = {
        pa: params.upiId || '',
        pn: params.payeeName,
        am: balance,
        tn: params.transactionNote,
    };

    const payPageUrl = buildHttpsPayPageUrl(payParams);
    if (!payPageUrl) return null;

    const upiId = trimParam(params.upiId);

    const greeting = params.tenantName?.trim()
        ? `Hi ${params.tenantName.trim()},`
        : 'Hi,';

    const amountStr = `${CURRENCY}${balance.toLocaleString('en-IN')}`;
    const period = params.periodLabel.trim() || 'this period';

    const manualLine = upiId ? `\n\nOr pay manually to UPI ID: ${upiId}` : '';

    return `${greeting}\n\nPayment reminder: ${amountStr} due for ${period}.\n\nTap to pay via UPI:\n${payPageUrl}${manualLine}`;
};
