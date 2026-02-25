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

const fmtCur = (amount: number | null | undefined): string => {
    if (amount === undefined || amount === null) return `${CURRENCY}0`;
    return `${CURRENCY}${Math.abs(amount).toLocaleString('en-IN')}`;
};

export const generateRentReminderHTML = (data: ReminderData): string => {
    const { property, unit, tenant, bill, expenses, receiptConfig, period } = data;

    const monthName = MONTHS[(bill.month || 1) - 1];
    const yearNum = bill.year || new Date().getFullYear();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const totalDue = bill.total_amount || 0;
    const paidAmt = bill.paid_amount || 0;
    const balanceAmt = bill.balance || 0;

    // Rent Period
    const startObj = bill.period_start ? new Date(bill.period_start) : new Date(period.start);
    const endObj = bill.period_end ? new Date(bill.period_end) : new Date(period.end);
    const startStr = isNaN(startObj.getTime())
        ? new Date(bill.year, bill.month - 1, 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : startObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const endStr = isNaN(endObj.getTime())
        ? new Date(bill.year, bill.month, 0).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : endObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // Expense rows
    const filteredExpenses = expenses.filter(e => e.amount !== 0);
    const expenseRows = filteredExpenses.map(e => `
        <tr>
            <td style="padding:3px 8px; border-bottom:1px solid #F0F0F0; font-size:9px;">${e.label}</td>
            <td style="padding:3px 8px; border-bottom:1px solid #F0F0F0; text-align:right; font-weight:600; color:${e.amount < 0 ? '#EF4444' : '#111'}; font-size:9px;">
                ${e.amount < 0 ? '−' : '+'}${fmtCur(Math.abs(e.amount))}
            </td>
        </tr>
    `).join('');

    // Payment methods (3 columns: Bank | UPI/Wallet | QR)
    const hasBank = !!(receiptConfig?.bank_name || receiptConfig?.bank_acc_number);
    const hasUpi = !!receiptConfig?.upi_id;
    const hasWallet = !!receiptConfig?.wallet_phone;
    const hasQr = !!receiptConfig?.payment_qr_uri;
    const hasPaymentMethods = hasBank || hasUpi || hasWallet || hasQr;

    const walletLabels: Record<string, string> = { google_pay: 'Google Pay', paytm: 'Paytm', phonepe: 'PhonePe', amazon_pay: 'Amazon Pay', other: 'Wallet' };

    const bankCol = hasBank ? `
        <td style="padding:0 5px 0 0; vertical-align:top; width:${hasQr ? '38%' : '50%'};">
            <div style="background:#FFF0F0; border-radius:6px; padding:6px 8px;">
                <div style="font-size:9px; font-weight:700; color:#E53E3E; margin-bottom:3px;">🏦 Bank Transfer</div>
                <div style="font-size:8.5px; color:#333; line-height:1.5;">${receiptConfig.bank_name || ''}<br/>A/C: <strong>${receiptConfig.bank_acc_number || '—'}</strong><br/>IFSC: ${receiptConfig.bank_ifsc || '—'}${receiptConfig.bank_acc_holder ? `<br/>Name: ${receiptConfig.bank_acc_holder}` : ''}</div>
            </div>
        </td>
    ` : '';

    const upiOrWalletCol = (hasUpi || hasWallet) ? `
        <td style="padding:0 5px; vertical-align:top; width:${hasQr ? '30%' : '50%'};">
            ${hasUpi ? `
            <div style="background:#FFF0F0; border-radius:6px; padding:6px 8px; margin-bottom:${hasWallet ? '4px' : '0'};">
                <div style="font-size:9px; font-weight:700; color:#E53E3E; margin-bottom:2px;">💳 UPI</div>
                <div style="font-size:8.5px; font-weight:600; color:#333; word-break:break-all;">${receiptConfig.upi_id}</div>
            </div>` : ''}
            ${hasWallet ? `
            <div style="background:#FFF0F0; border-radius:6px; padding:6px 8px;">
                <div style="font-size:9px; font-weight:700; color:#E53E3E; margin-bottom:2px;">📱 ${walletLabels[receiptConfig.wallet_type] || 'Wallet'}</div>
                <div style="font-size:8.5px; color:#333;">${receiptConfig.wallet_phone}${receiptConfig.wallet_name ? ` (${receiptConfig.wallet_name})` : ''}</div>
            </div>` : ''}
        </td>
    ` : '';

    const qrCol = hasQr ? `
        <td style="padding:0 0 0 5px; vertical-align:top; width:32%; text-align:center;">
            <div style="background:#FFF0F0; border-radius:6px; padding:6px 8px; display:inline-block; width:100%;">
                <img src="${receiptConfig.payment_qr_uri}" style="width:68px; height:68px; display:block; margin:0 auto;" />
                <div style="font-size:8px; font-weight:700; color:#E53E3E; margin-top:3px;">Scan to Pay</div>
            </div>
        </td>
    ` : '';

    const paymentMethodsSection = hasPaymentMethods ? `
        <div style="margin-top:10px;">
            <div style="font-size:8.5px; font-weight:700; color:#555; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Pay Via</div>
            <table style="width:100%; border-collapse:collapse;">
                <tr>
                    ${bankCol}
                    ${upiOrWalletCol}
                    ${qrCol}
                </tr>
            </table>
        </div>
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #111;
            font-size: 10px;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
        }
        .page {
            width: 794px;
            min-height: 1123px;
            max-height: 1123px;
            overflow: hidden;
            margin: 0 auto;
            padding: 20px 28px 60px 28px;
            position: relative;
            background: #fff;
        }
        .section-label {
            font-size: 8px;
            font-weight: 700;
            color: #CC0000;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 4px;
        }
    </style>
</head>
<body>
<div class="page">

    <!-- ═══ HEADER ═══ -->
    <div style="text-align:center; border-bottom:2.5px solid #E53E3E; padding-bottom:8px; margin-bottom:10px;">
        ${receiptConfig?.logo_uri ? `<img src="${receiptConfig.logo_uri}" style="height:36px; width:auto; margin-bottom:4px; display:block; margin-left:auto; margin-right:auto;" />` : ''}
        <div style="font-size:22px; font-weight:900; color:#E53E3E; letter-spacing:1.5px; line-height:1;">PAYMENT REMINDER</div>
        <div style="font-size:9px; color:#444; margin-top:3px;">For <strong>${monthName} ${yearNum}</strong> &nbsp;|&nbsp; Generated: ${today}</div>
    </div>

    <!-- ═══ GREETING ═══ -->
    <div style="background:#FEF2F2; border-left:3px solid #E53E3E; border-radius:0 6px 6px 0; padding:7px 12px; margin-bottom:10px;">
        <div style="font-size:10px;">Dear <strong>${tenant?.name || 'Tenant'}</strong>,</div>
        <div style="font-size:9px; color:#333; margin-top:3px;">
            This is a friendly reminder that your rent for <strong>${monthName} ${yearNum}</strong> is pending.
            Please review the details and make payment at your earliest convenience.
        </div>
    </div>

    <!-- ═══ PARTIES ═══ -->
    <div style="display:flex; gap:10px; margin-bottom:8px;">
        <div style="flex:1; background:#FAFAFA; border:1px solid #E5E7EB; border-radius:6px; padding:7px 10px;">
            <div class="section-label">From — Landlord</div>
            <div style="font-weight:700; font-size:10.5px;">${property?.owner_name || '—'}</div>
            <div style="font-size:9px; color:#444; margin-top:1px;">${property?.name || ''}</div>
            <div style="font-size:9px; color:#555;">${property?.address || ''}</div>
            ${property?.owner_phone ? `<div style="font-size:9px; color:#555; margin-top:1px;">📞 ${property.owner_phone}</div>` : ''}
        </div>
        <div style="flex:1; background:#FAFAFA; border:1px solid #E5E7EB; border-radius:6px; padding:7px 10px;">
            <div class="section-label">To — Tenant</div>
            <div style="font-weight:700; font-size:10.5px;">${tenant?.name || '—'}</div>
            <div style="font-size:9px; color:#444; margin-top:1px;">Room: <strong>${unit?.name || '—'}</strong></div>
            ${tenant?.phone ? `<div style="font-size:9px; color:#555; margin-top:1px;">📞 ${tenant.phone}</div>` : ''}
        </div>
    </div>

    <!-- ═══ RENT PERIOD ═══ -->
    <div style="background:#E53E3E; border-radius:6px; padding:5px 12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="color:#FECACA; font-size:8.5px;">Rent Period</div>
        <div style="color:#FFF; font-weight:700; font-size:10px;">${startStr} — ${endStr}</div>
        <div style="color:#FECACA; font-size:8.5px;">${period.days} Days</div>
    </div>

    <!-- ═══ BILL BREAKDOWN ═══ -->
    <div style="margin-bottom:8px;">
        <div class="section-label">Bill Breakdown</div>
        <table style="width:100%; border-collapse:collapse; font-size:9.5px;">
            <thead>
                <tr style="background:#F3F4F6;">
                    <th style="padding:4px 8px; text-align:left; font-weight:600; color:#555; font-size:8.5px;">Description</th>
                    <th style="padding:4px 8px; text-align:right; font-weight:600; color:#555; font-size:8.5px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0;">Monthly Rent</td>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; text-align:right; font-weight:700; font-size:11px;">${fmtCur(bill.rent_amount)}</td>
                </tr>
                ${(bill.electricity_amount || 0) > 0 ? `
                <tr>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0;">
                        Electricity${bill.prev_reading != null && bill.curr_reading != null ? ` <span style="color:#888;">(${bill.prev_reading} → ${bill.curr_reading})</span>` : ''}
                    </td>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; text-align:right; font-weight:700; font-size:11px;">${fmtCur(bill.electricity_amount)}</td>
                </tr>
                ` : ''}
                ${filteredExpenses.length > 0 ? `
                <tr><td colspan="2" style="padding:3px 8px; font-size:8.5px; color:#E53E3E; font-weight:700; background:#FFF5F5;">Additional Charges / Discounts</td></tr>
                ${expenseRows}
                ` : ''}
                ${(bill.previous_balance || 0) !== 0 ? `
                <tr>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; color:${bill.previous_balance > 0 ? '#EF4444' : '#10B981'};">
                        ${bill.previous_balance > 0 ? 'Previous Balance (Due)' : 'Previous Advance'}
                    </td>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; text-align:right; font-weight:700; color:${bill.previous_balance > 0 ? '#EF4444' : '#10B981'}; font-size:11px;">
                        ${bill.previous_balance > 0 ? '+' : '−'}${fmtCur(Math.abs(bill.previous_balance))}
                    </td>
                </tr>
                ` : ''}
            </tbody>
        </table>
    </div>

    <!-- ═══ TOTAL DUE / BALANCE ═══ -->
    ${paidAmt > 0 ? `
    <div style="background:#FEE2E2; border:1.5px solid #E53E3E; border-radius:6px; padding:6px 12px; margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:9px; color:#555;">Bill Total</div>
            <div style="font-size:10px; font-weight:700; color:#333;">${fmtCur(totalDue)}</div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:9px; color:#555;">Amount Paid</div>
            <div style="font-size:10px; font-weight:700; color:#10B981;">− ${fmtCur(paidAmt)}</div>
        </div>
        <div style="border-top:1px solid #FCA5A5; padding-top:4px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:10px; font-weight:700; color:#B91C1C;">REMAINING BALANCE DUE</div>
            <div style="font-size:16px; font-weight:900; color:#B91C1C;">${fmtCur(balanceAmt)}</div>
        </div>
    </div>
    ` : `
    <div style="background:#FEE2E2; border:1.5px solid #E53E3E; border-radius:6px; padding:6px 12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-size:11px; font-weight:700; color:#B91C1C;">TOTAL AMOUNT DUE</div>
        <div style="font-size:18px; font-weight:900; color:#B91C1C;">${fmtCur(totalDue)}</div>
    </div>
    `}

    <!-- ═══ PAY VIA (3-column) ═══ -->
    ${paymentMethodsSection}

    <!-- ═══ NOTE ═══ -->
    <div style="margin-top:10px; padding:6px 10px; background:#FFFBEB; border:1px solid #F59E0B; border-radius:6px; font-size:8.5px; color:#78350F;">
        <strong>Note:</strong> If you have already made the payment, please disregard this reminder. For queries, contact the landlord directly.
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div style="position:absolute; bottom:12px; left:20px; right:20px; border-top:1px solid #FEE2E2; padding-top:5px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:8px; color:#555; font-weight:600;">RentVelo</div>
        <div style="font-size:8px; color:#555;">This is a computer-generated reminder</div>
        <div style="font-size:8px; color:#555;">${today}</div>
    </div>

</div>
</body>
</html>`;
};
