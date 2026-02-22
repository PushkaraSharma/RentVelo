import { CURRENCY } from './Constants';

interface ReminderData {
    property: any;
    unit: any;
    tenant: any;
    bill: any;
    expenses: any[];
    receiptConfig: any;
    period: { start: string; end: string; days: number };
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount && amount !== 0) return `${CURRENCY}0`;
    return `${CURRENCY}${Math.abs(amount).toLocaleString('en-IN')}`;
};

export const generateRentReminderHTML = (data: ReminderData): string => {
    const { property, unit, tenant, bill, expenses, receiptConfig, period } = data;

    const monthName = MONTHS[(bill.month || 1) - 1];
    const yearNum = bill.year || new Date().getFullYear();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const totalDue = bill.total_amount || 0;

    // Expense rows
    const expenseRows = expenses.filter(e => e.amount !== 0).map(e => `
        <tr>
            <td style="padding:6px 14px; border-bottom:1px solid #f0f0f0;">${e.label}</td>
            <td style="padding:6px 14px; border-bottom:1px solid #f0f0f0; text-align:right; font-weight:600;">
                ${e.amount < 0 ? '−' : '+'}${formatCurrency(Math.abs(e.amount))}
            </td>
        </tr>
    `).join('');

    // Payment info
    let paymentMethods = '';
    if (receiptConfig) {
        const parts: string[] = [];
        if (receiptConfig.bank_name || receiptConfig.bank_acc_number) {
            parts.push(`
                <div style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:14px; margin-bottom:8px;">
                    <div style="font-weight:700; color:#7C3AED; margin-bottom:6px; font-size:13px;">🏦 Bank Transfer</div>
                    <table style="width:100%; font-size:12px;">
                        <tr><td style="padding:2px 0; color:#888;">Bank</td><td style="padding:2px 0;">${receiptConfig.bank_name || '—'}</td></tr>
                        <tr><td style="padding:2px 0; color:#888;">Account No</td><td style="padding:2px 0;">${receiptConfig.bank_acc_number || '—'}</td></tr>
                        <tr><td style="padding:2px 0; color:#888;">IFSC</td><td style="padding:2px 0;">${receiptConfig.bank_ifsc || '—'}</td></tr>
                        <tr><td style="padding:2px 0; color:#888;">Holder</td><td style="padding:2px 0;">${receiptConfig.bank_acc_holder || '—'}</td></tr>
                    </table>
                </div>
            `);
        }
        if (receiptConfig.upi_id) {
            parts.push(`
                <div style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:14px; margin-bottom:8px;">
                    <div style="font-weight:700; color:#7C3AED; margin-bottom:4px; font-size:13px;">💳 UPI</div>
                    <div style="font-size:14px; font-weight:600;">${receiptConfig.upi_id}</div>
                </div>
            `);
        }
        if (receiptConfig.wallet_phone) {
            const walletLabels: Record<string, string> = { google_pay: 'Google Pay', paytm: 'Paytm', phonepe: 'PhonePe', amazon_pay: 'Amazon Pay', other: 'Other' };
            parts.push(`
                <div style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:14px; margin-bottom:8px;">
                    <div style="font-weight:700; color:#7C3AED; margin-bottom:4px; font-size:13px;">📱 ${walletLabels[receiptConfig.wallet_type] || 'Wallet'}</div>
                    <div style="font-size:14px;">${receiptConfig.wallet_phone} ${receiptConfig.wallet_name ? `(${receiptConfig.wallet_name})` : ''}</div>
                </div>
            `);
        }
        if (receiptConfig.payment_qr_uri) {
            parts.push(`
                <div style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:14px; text-align:center; margin-bottom:8px;">
                    <div style="font-weight:700; color:#7C3AED; margin-bottom:8px; font-size:13px;">📷 Scan to Pay</div>
                    <img src="${receiptConfig.payment_qr_uri}" style="max-width:160px;" />
                </div>
            `);
        }
        if (parts.length > 0) {
            paymentMethods = `
                <div style="margin-top:16px;">
                    <div style="font-size:14px; font-weight:700; color:#333; margin-bottom:8px;">Payment Methods</div>
                    ${parts.join('')}
                </div>
            `;
        }
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; font-size: 12px; line-height: 1.4; }
        .page { width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 28px 32px; position: relative; }
    </style>
</head>
<body>
<div class="page">

    <!-- HEADER -->
    <div style="text-align:center; border-bottom:3px solid #E53E3E; padding-bottom:16px; margin-bottom:20px;">
        ${receiptConfig?.logo_uri ? `<img src="${receiptConfig.logo_uri}" style="height:50px; margin-bottom:8px;" />` : ''}
        <div style="font-size:24px; font-weight:800; color:#E53E3E; letter-spacing:1px;">PAYMENT REMINDER</div>
        <div style="font-size:12px; color:#888; margin-top:4px;">For ${monthName} ${yearNum} • Generated on ${today}</div>
    </div>

    <!-- GREETING -->
    <div style="background:#FEF2F2; border-left:4px solid #E53E3E; border-radius:0 8px 8px 0; padding:14px 18px; margin-bottom:20px;">
        <div style="font-size:14px;">Dear <strong>${tenant?.name || 'Tenant'}</strong>,</div>
        <div style="font-size:13px; color:#555; margin-top:6px;">
            This is a gentle reminder that your rent for <strong>${monthName} ${yearNum}</strong> is pending. 
            Please find the details below and make the payment at your earliest convenience.
        </div>
    </div>

    <!-- PROPERTY & TENANT INFO -->
    <div style="display:flex; gap:16px; margin-bottom:16px;">
        <div style="flex:1; background:#f8f8fc; border-radius:8px; padding:12px 14px;">
            <div style="font-size:10px; color:#7C3AED; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Property</div>
            <div style="font-weight:700; font-size:13px;">${property?.name || '—'}</div>
            <div style="font-size:11px; color:#666;">${property?.address || ''}</div>
            <div style="font-size:11px; color:#666; margin-top:2px;">Owner: ${property?.owner_name || '—'}</div>
            ${property?.owner_phone ? `<div style="font-size:11px; color:#666;">📞 ${property.owner_phone}</div>` : ''}
        </div>
        <div style="flex:1; background:#f8f8fc; border-radius:8px; padding:12px 14px;">
            <div style="font-size:10px; color:#7C3AED; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Tenant</div>
            <div style="font-weight:700; font-size:13px;">${tenant?.name || '—'}</div>
            <div style="font-size:11px; color:#666;">Room: ${unit?.name || '—'}</div>
            ${tenant?.phone ? `<div style="font-size:11px; color:#666; margin-top:2px;">📞 ${tenant.phone}</div>` : ''}
        </div>
    </div>

    <!-- RENT PERIOD -->
    <div style="background:#E53E3E; color:#FFF; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
            <span style="font-size:11px; opacity:0.8;">Rent Period:</span>
            <strong style="margin-left:6px;">${period.start} — ${period.end}, ${yearNum}</strong>
        </div>
        <div style="font-size:11px; opacity:0.8;">${period.days} Days</div>
    </div>

    <!-- BILL BREAKDOWN -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <thead>
            <tr style="background:#f0f0f0;">
                <th style="padding:8px 14px; text-align:left; font-size:11px; color:#555;">Description</th>
                <th style="padding:8px 14px; text-align:right; font-size:11px; color:#555;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #eee;">Monthly Rent</td>
                <td style="padding:8px 14px; border-bottom:1px solid #eee; text-align:right; font-weight:600;">${formatCurrency(bill.rent_amount)}</td>
            </tr>
            ${(bill.electricity_amount || 0) > 0 ? `
            <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #eee;">Electricity${bill.prev_reading && bill.curr_reading ? ` (${bill.prev_reading} → ${bill.curr_reading})` : ''}</td>
                <td style="padding:8px 14px; border-bottom:1px solid #eee; text-align:right; font-weight:600;">${formatCurrency(bill.electricity_amount)}</td>
            </tr>
            ` : ''}
            ${expenses.length > 0 ? `
            <tr><td colspan="2" style="padding:6px 14px; font-size:11px; color:#7C3AED; font-weight:700; background:#faf8ff;">Additional Charges / Discounts</td></tr>
            ${expenseRows}
            ` : ''}
            ${(bill.previous_balance || 0) !== 0 ? `
            <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #eee; color:${bill.previous_balance > 0 ? '#E53E3E' : '#22C55E'};">
                    ${bill.previous_balance > 0 ? 'Previous Balance (Due)' : 'Previous Advance'}
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #eee; text-align:right; font-weight:600; color:${bill.previous_balance > 0 ? '#E53E3E' : '#22C55E'};">
                    ${bill.previous_balance > 0 ? '+' : '−'}${formatCurrency(Math.abs(bill.previous_balance))}
                </td>
            </tr>
            ` : ''}
        </tbody>
    </table>

    <!-- TOTAL DUE BOX -->
    <div style="background:#E53E3E; border-radius:10px; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div style="color:#FFF; font-size:16px; font-weight:700;">TOTAL AMOUNT DUE</div>
        <div style="color:#FFF; font-size:26px; font-weight:800;">${formatCurrency(totalDue)}</div>
    </div>

    ${paymentMethods}

    <!-- NOTE -->
    <div style="margin-top:20px; padding:12px 16px; background:#FFFBEB; border:1px solid #F59E0B; border-radius:8px; font-size:11px; color:#92400E;">
        <strong>Note:</strong> Please make the payment at your earliest convenience. If you have already made the payment, kindly disregard this reminder. For any queries, contact the landlord at the details mentioned above.
    </div>

    <!-- FOOTER -->
    <div style="position:absolute; bottom:16px; left:32px; right:32px; text-align:center; font-size:9px; color:#aaa; border-top:2px solid #E53E3E; padding-top:6px;">
        Generated by RentVelo App • This is a computer-generated reminder
    </div>

</div>
</body>
</html>`;
};
