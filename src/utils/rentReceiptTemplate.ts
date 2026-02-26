import { CURRENCY } from './Constants';

interface ReceiptData {
    property: any;
    unit: any;
    tenant: any;
    bill: any;
    payments: any[];
    expenses: any[];
    receiptConfig: any;
    period: { start: string; end: string; days: number };
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const fmtDate = (date: any): string => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtCur = (amount: number | null | undefined): string => {
    if (amount === undefined || amount === null) return `${CURRENCY}0`;
    return `${CURRENCY}${Math.abs(amount).toLocaleString('en-IN')}`;
};

export const generateRentReceiptHTML = (data: ReceiptData): string => {
    const { property, unit, tenant, bill, payments, expenses, receiptConfig, period } = data;

    const monthName = MONTHS[(bill.month || 1) - 1];
    const yearNum = bill.year || new Date().getFullYear();
    const receiptNo = bill.bill_number || `RR-${bill.id}`;
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Amounts
    const rentAmt = bill.rent_amount || 0;
    const electricityAmt = bill.electricity_amount || 0;
    const prevBalance = bill.previous_balance || 0;
    const totalAmt = bill.total_amount || 0;
    const paidAmt = bill.paid_amount || 0;
    const balanceAmt = bill.balance || 0;

    // Status
    const isPaid = bill.status === 'paid' || bill.status === 'overpaid';
    const isPartial = bill.status === 'partial';
    const statusBg = isPaid ? '#10B981' : isPartial ? '#F59E0B' : '#EF4444';
    const statusLabel = isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING';

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
            <td style="padding:3px 8px; border-bottom:1px solid #f0f0f0; font-size:9px;">${e.label}</td>
            <td style="padding:3px 8px; border-bottom:1px solid #f0f0f0; text-align:right; font-weight:600; color:${e.amount < 0 ? '#EF4444' : '#111'}; font-size:9px;">
                ${e.amount < 0 ? '−' : '+'}${fmtCur(Math.abs(e.amount))}
            </td>
        </tr>
    `).join('');

    // Payment rows
    const paymentRows = payments.map(p => `
        <tr>
            <td style="padding:3px 8px; border-bottom:1px solid #e5f5ed; font-size:9px;">${fmtDate(p.payment_date || p.created_at)}</td>
            <td style="padding:3px 8px; border-bottom:1px solid #e5f5ed; font-size:9px;">${p.payment_method || 'Cash'}</td>
            <td style="padding:3px 8px; border-bottom:1px solid #e5f5ed; text-align:right; font-weight:700; font-size:9px; color:#10B981;">${fmtCur(p.amount)}</td>
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
        <td style="padding:0 6px 0 0; vertical-align:top; width:${hasQr ? '38%' : '50%'};">
            <div style="background:#F5F3FF; border-radius:6px; padding:6px 8px; height:100%;">
                <div style="font-size:9px; font-weight:700; color:#7C3AED; margin-bottom:3px;">🏦 Bank Transfer</div>
                <div style="font-size:8.5px; color:#333; line-height:1.5;">${receiptConfig.bank_name || ''}<br/>A/C: <strong>${receiptConfig.bank_acc_number || '—'}</strong><br/>IFSC: ${receiptConfig.bank_ifsc || '—'}${receiptConfig.bank_acc_holder ? `<br/>Name: ${receiptConfig.bank_acc_holder}` : ''}</div>
            </div>
        </td>
    ` : '';

    const upiOrWalletCol = (hasUpi || hasWallet) ? `
        <td style="padding:0 6px; vertical-align:top; width:${hasQr ? '30%' : '50%'};">
            ${hasUpi ? `
            <div style="background:#F5F3FF; border-radius:6px; padding:6px 8px; margin-bottom:${hasWallet ? '4px' : '0'};">
                <div style="font-size:9px; font-weight:700; color:#7C3AED; margin-bottom:2px;">💳 UPI</div>
                <div style="font-size:8.5px; font-weight:600; color:#333; word-break:break-all;">${receiptConfig.upi_id}</div>
            </div>` : ''}
            ${hasWallet ? `
            <div style="background:#F5F3FF; border-radius:6px; padding:6px 8px;">
                <div style="font-size:9px; font-weight:700; color:#7C3AED; margin-bottom:2px;">📱 ${walletLabels[receiptConfig.wallet_type] || 'Wallet'}</div>
                <div style="font-size:8.5px; color:#333;">${receiptConfig.wallet_phone}${receiptConfig.wallet_name ? ` (${receiptConfig.wallet_name})` : ''}</div>
            </div>` : ''}
        </td>
    ` : '';

    const qrCol = hasQr ? `
        <td style="padding:0 0 0 6px; vertical-align:top; width:${hasBank || hasUpi || hasWallet ? '32%' : '100%'}; text-align:center;">
            <div style="background:#F5F3FF; border-radius:6px; padding:6px 8px; display:inline-block; width:100%;">
                <img src="${receiptConfig.payment_qr_uri}" style="width:70px; height:70px; display:block; margin:0 auto;" />
                <div style="font-size:8px; font-weight:700; color:#7C3AED; margin-top:3px;">Scan to Pay</div>
            </div>
        </td>
    ` : '';

    const paymentMethodsSection = hasPaymentMethods ? `
        <div style="margin-top:8px;">
            <div style="font-size:9px; font-weight:700; color:#555; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Pay Via</div>
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
        .divider { border: none; border-top: 1px solid #E5E7EB; margin: 8px 0; }
        .section-label {
            font-size: 8px;
            font-weight: 700;
            color: #7C3AED;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 4px;
        }
    </style>
</head>
<body>
<div class="page">

    <!-- ═══ HEADER ═══ -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
            ${receiptConfig?.logo_uri ? `<img src="${receiptConfig.logo_uri}" style="height:36px; width:auto;" />` : ''}
            <div>
                <div style="font-size:20px; font-weight:900; color:#7C3AED; letter-spacing:1px; line-height:1;">RENT RECEIPT</div>
                <div style="font-size:9px; color:#555; margin-top:1px;">${monthName} ${yearNum} &nbsp;|&nbsp; ${period.days} Days</div>
            </div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:8px; color:#888; margin-bottom:1px;">RECEIPT NO.</div>
            <div style="font-size:13px; font-weight:800; color:#111;">${receiptNo}</div>
            <div style="font-size:8px; color:#666; margin-top:2px;">Date: ${today}</div>
            <div style="display:inline-block; background:${statusBg}; color:#FFF; padding:2px 10px; border-radius:10px; font-size:8px; font-weight:700; margin-top:4px; letter-spacing:0.5px;">${statusLabel}</div>
        </div>
    </div>
    <div style="border-top:2.5px solid #7C3AED; margin-bottom:8px;"></div>

    <!-- ═══ PARTIES ═══ -->
    <div style="display:flex; gap:10px; margin-bottom:8px;">
        <div style="flex:1; background:#FAFAFA; border:1px solid #E5E7EB; border-radius:6px; padding:7px 10px;">
            <div class="section-label">From — Landlord</div>
            <div style="font-weight:700; font-size:10.5px;">${property?.owner_name || '—'}</div>
            <div style="font-size:9px; color:#444; margin-top:2px;">${property?.name || ''}</div>
            <div style="font-size:9px; color:#555;">${property?.address || ''}</div>
            ${property?.owner_phone ? `<div style="font-size:9px; color:#555; margin-top:1px;">📞 ${property.owner_phone}</div>` : ''}
        </div>
        <div style="flex:1; background:#FAFAFA; border:1px solid #E5E7EB; border-radius:6px; padding:7px 10px;">
            <div class="section-label">To — Tenant</div>
            <div style="font-weight:700; font-size:10.5px;">${tenant?.name || '—'}</div>
            <div style="font-size:9px; color:#444; margin-top:2px;">Room: <strong>${unit?.name || '—'}</strong></div>
            ${tenant?.phone ? `<div style="font-size:9px; color:#555; margin-top:1px;">📞 ${tenant.phone}</div>` : ''}
            ${tenant?.email ? `<div style="font-size:9px; color:#555;">✉ ${tenant.email}</div>` : ''}
        </div>
    </div>

    <!-- ═══ RENT PERIOD BAR ═══ -->
    <div style="background:#7C3AED; border-radius:6px; padding:5px 12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="color:#EDE9FE; font-size:8.5px;">Rent Period</div>
        <div style="color:#FFF; font-weight:700; font-size:10px;">${startStr} — ${endStr}</div>
        <div style="color:#EDE9FE; font-size:8.5px;">${period.days} Days</div>
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
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; text-align:right; font-weight:700; font-size:11px;">${fmtCur(rentAmt)}</td>
                </tr>
                ${electricityAmt > 0 ? `
                <tr>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0;">
                        Electricity${bill.prev_reading != null && bill.curr_reading != null ? ` <span style="color:#888;">(${bill.prev_reading} → ${bill.curr_reading} units × ${CURRENCY}${unit.electricity_rate || 0})</span>` : ''}
                    </td>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; text-align:right; font-weight:700; font-size:11px;">${fmtCur(electricityAmt)}</td>
                </tr>
                ` : ''}
                ${filteredExpenses.length > 0 ? `
                <tr><td colspan="2" style="padding:3px 8px; font-size:8.5px; color:#7C3AED; font-weight:700; background:#F8F5FF;">Additional Charges / Discounts</td></tr>
                ${expenseRows}
                ` : ''}
                ${prevBalance !== 0 ? `
                <tr>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; color:${prevBalance > 0 ? '#EF4444' : '#10B981'};">
                        ${prevBalance > 0 ? 'Previous Balance (Due)' : 'Previous Advance'}
                    </td>
                    <td style="padding:4px 8px; border-bottom:1px solid #F0F0F0; text-align:right; font-weight:700; color:${prevBalance > 0 ? '#EF4444' : '#10B981'}; font-size:11px;">
                        ${prevBalance > 0 ? '+' : '−'}${fmtCur(Math.abs(prevBalance))}
                    </td>
                </tr>
                ` : ''}
            </tbody>
            <tfoot>
                <tr style="background:#7C3AED;">
                    <td style="padding:5px 8px; font-weight:700; color:#FFF; font-size:10px;">TOTAL</td>
                    <td style="padding:5px 8px; text-align:right; font-weight:800; color:#FFF; font-size:12px;">${fmtCur(totalAmt)}</td>
                </tr>
            </tfoot>
        </table>
    </div>

    <!-- ═══ PAYMENTS RECEIVED ═══ -->
    ${payments.length > 0 ? `
    <div style="margin-bottom:8px;">
        <div class="section-label">💰 Payments Received</div>
        <table style="width:100%; border-collapse:collapse; background:#F0FDF4; border-radius:6px; overflow:hidden;">
            <thead>
                <tr style="background:#D1FAE5;">
                    <th style="padding:4px 8px; text-align:left; font-size:8.5px; font-weight:600; color:#065F46;">Date</th>
                    <th style="padding:4px 8px; text-align:left; font-size:8.5px; font-weight:600; color:#065F46;">Method</th>
                    <th style="padding:4px 8px; text-align:right; font-size:8.5px; font-weight:600; color:#065F46;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${paymentRows}
            </tbody>
            <tfoot>
                <tr style="background:#D1FAE5;">
                    <td colspan="2" style="padding:4px 8px; font-weight:700; color:#065F46; font-size:9px;">Total Paid</td>
                    <td style="padding:4px 8px; text-align:right; font-weight:800; color:#10B981; font-size:11px;">${fmtCur(paidAmt)}</td>
                </tr>
            </tfoot>
        </table>
    </div>
    ` : ''}

    <!-- ═══ BALANCE STATUS ═══ -->
    ${balanceAmt > 0 ? `
    <div style="background:#FEF2F2; border:1.5px solid #FCA5A5; border-radius:6px; padding:5px 12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-weight:700; color:#B91C1C; font-size:9.5px;">⚠ Remaining Balance Due</div>
        <div style="font-size:14px; font-weight:800; color:#B91C1C;">${fmtCur(balanceAmt)}</div>
    </div>
    ` : balanceAmt < 0 ? `
    <div style="background:#ECFDF5; border:1.5px solid #10B981; border-radius:6px; padding:5px 12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-weight:700; color:#10B981; font-size:9.5px;">✓ Advance / Credit</div>
        <div style="font-size:14px; font-weight:800; color:#10B981;">${fmtCur(Math.abs(balanceAmt))}</div>
    </div>
    ` : `
    <div style="background:#ECFDF5; border:1.5px solid #10B981; border-radius:6px; padding:5px 12px; text-align:center; margin-bottom:8px;">
        <div style="font-weight:700; color:#10B981; font-size:9.5px;">✅ FULLY PAID — No Balance Due</div>
    </div>
    `}

    <!-- ═══ PAY VIA (3-column) ═══ -->
    ${paymentMethodsSection}

    <!-- ═══ SIGNATURE ═══ -->
    <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:8px;">
        <div style="text-align:center;">
            ${receiptConfig?.signature_uri ? `<img src="${receiptConfig.signature_uri}" style="max-height:42px; margin-bottom:3px; display:block; margin-left:auto; margin-right:auto;" />` : '<div style="height:42px;"></div>'}
            <div style="width:140px; border-top:1px solid #333; padding-top:3px; font-size:9px; color:#444;">Landlord's Signature</div>
            <div style="font-size:8px; color:#777;">${property?.owner_name || ''}</div>
        </div>
        <div style="text-align:center;">
            <div style="height:42px;"></div>
            <div style="width:140px; border-top:1px solid #333; padding-top:3px; font-size:9px; color:#444;">Tenant's Signature</div>
            <div style="font-size:8px; color:#777;">${tenant?.name || ''}</div>
        </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div style="position:absolute; bottom:12px; left:20px; right:20px; border-top:1px solid #DDD6FE; padding-top:5px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:8px; color:#555; font-weight:600;">RentVelo</div>
        <div style="font-size:8px; color:#555;">This is a computer-generated receipt</div>
        <div style="font-size:8px; color:#555;">${today}</div>
    </div>

</div>
</body>
</html>`;
};
