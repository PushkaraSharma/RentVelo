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

const formatDate = (date: any): string => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount && amount !== 0) return `${CURRENCY}0`;
    return `${CURRENCY}${Math.abs(amount).toLocaleString('en-IN')}`;
};

export const generateRentReceiptHTML = (data: ReceiptData): string => {
    const { property, unit, tenant, bill, payments, expenses, receiptConfig, period } = data;

    const monthName = MONTHS[(bill.month || 1) - 1];
    const yearNum = bill.year || new Date().getFullYear();
    const receiptNo = bill.bill_number || `RR-${bill.id}`;
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Totals
    const rentAmt = bill.rent_amount || 0;
    const electricityAmt = bill.electricity_amount || 0;
    const prevBalance = bill.previous_balance || 0;
    const totalExpenses = bill.total_expenses || 0;
    const totalAmt = bill.total_amount || 0;
    const paidAmt = bill.paid_amount || 0;
    const balanceAmt = bill.balance || 0;

    // Payment summary
    const paymentRows = payments.map(p => `
        <tr>
            <td style="padding:6px 10px; border-bottom:1px solid #eee;">${formatDate(p.payment_date || p.created_at)}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #eee;">${p.payment_method || 'Cash'}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #eee; text-align:right; font-weight:600;">${formatCurrency(p.amount)}</td>
            <td style="padding:6px 10px; border-bottom:1px solid #eee; color:#888;">${p.remarks || '—'}</td>
        </tr>
    `).join('');

    // Expense rows
    const expenseRows = expenses.filter(e => e.amount !== 0).map(e => `
        <tr>
            <td style="padding:4px 10px; border-bottom:1px solid #f0f0f0;">${e.label}</td>
            <td style="padding:4px 10px; border-bottom:1px solid #f0f0f0; text-align:right; color:${e.amount < 0 ? '#E53E3E' : '#333'}; font-weight:600;">
                ${e.amount < 0 ? '−' : '+'}${formatCurrency(Math.abs(e.amount))}
            </td>
        </tr>
    `).join('');

    // Payment info section (bank/UPI/wallet)
    let paymentInfoSection = '';
    if (receiptConfig) {
        const parts: string[] = [];
        if (receiptConfig.bank_name || receiptConfig.bank_acc_number) {
            parts.push(`
                <div style="margin-bottom:6px;">
                    <strong>🏦 Bank:</strong> ${receiptConfig.bank_name || ''} | 
                    A/C: ${receiptConfig.bank_acc_number || '—'} | 
                    IFSC: ${receiptConfig.bank_ifsc || '—'}
                </div>
            `);
        }
        if (receiptConfig.upi_id) {
            parts.push(`<div style="margin-bottom:6px;"><strong>💳 UPI:</strong> ${receiptConfig.upi_id}</div>`);
        }
        if (receiptConfig.wallet_type || receiptConfig.wallet_phone) {
            parts.push(`<div style="margin-bottom:6px;"><strong>📱 Wallet:</strong> ${receiptConfig.wallet_phone || ''} (${receiptConfig.wallet_type || ''})</div>`);
        }
        if (parts.length > 0) {
            paymentInfoSection = `
                <div style="background:#f8f8fc; border-radius:8px; padding:10px 14px; margin-top:12px; font-size:11px; color:#555;">
                    <div style="font-weight:700; color:#7C3AED; margin-bottom:4px;">Payment Details</div>
                    ${parts.join('')}
                </div>
            `;
        }
    }

    // Status badge
    const statusColor = bill.status === 'paid' || bill.status === 'overpaid' ? '#22C55E' : bill.status === 'partial' ? '#F59E0B' : '#E53E3E';
    const statusLabel = bill.status === 'paid' ? 'PAID' : bill.status === 'overpaid' ? 'OVERPAID' : bill.status === 'partial' ? 'PARTIALLY PAID' : 'PENDING';

    const displayPeriodStart = bill.period_start ? new Date(bill.period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : period.start;
    const displayPeriodEnd = bill.period_end ? new Date(bill.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : period.end;

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
            color: #333; 
            font-size: 12px; 
            line-height: 1.4;
        }
        .receipt {
            width: 100%;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 28px 32px;
            position: relative;
        }
    </style>
</head>
<body>
<div class="receipt">

    <!-- HEADER -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #7C3AED; padding-bottom:14px; margin-bottom:16px;">
        <div>
            ${receiptConfig?.logo_uri ? `<img src="${receiptConfig.logo_uri}" style="height:50px; margin-bottom:6px; display:block;" />` : ''}
            <div style="font-size:20px; font-weight:800; color:#7C3AED;">RENT RECEIPT</div>
            <div style="font-size:11px; color:#888; margin-top:2px;">${monthName} ${yearNum}</div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:11px; color:#888;">Receipt No.</div>
            <div style="font-size:14px; font-weight:700;">${receiptNo}</div>
            <div style="font-size:11px; color:#888; margin-top:4px;">Date: ${today}</div>
            <div style="display:inline-block; background:${statusColor}; color:#FFF; padding:3px 12px; border-radius:12px; font-size:10px; font-weight:700; margin-top:6px; letter-spacing:0.5px;">
                ${statusLabel}
            </div>
        </div>
    </div>

    <!-- LANDLORD & TENANT INFO -->
    <div style="display:flex; gap:16px; margin-bottom:14px;">
        <div style="flex:1; background:#f8f8fc; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#7C3AED; font-weight:700; margin-bottom:6px;">FROM (Landlord)</div>
            <div style="font-weight:700; font-size:13px;">${property?.owner_name || '—'}</div>
            <div style="font-size:11px; color:#666; margin-top:2px;">${property?.name || ''}</div>
            <div style="font-size:11px; color:#666;">${property?.address || '—'}</div>
            ${property?.owner_phone ? `<div style="font-size:11px; color:#666; margin-top:2px;">📞 ${property.owner_phone}</div>` : ''}
        </div>
        <div style="flex:1; background:#f8f8fc; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; color:#7C3AED; font-weight:700; margin-bottom:6px;">TO (Tenant)</div>
            <div style="font-weight:700; font-size:13px;">${tenant?.name || '—'}</div>
            <div style="font-size:11px; color:#666; margin-top:2px;">Room: ${unit?.name || '—'}</div>
            ${tenant?.phone ? `<div style="font-size:11px; color:#666; margin-top:2px;">📞 ${tenant.phone}</div>` : ''}
            ${tenant?.email ? `<div style="font-size:11px; color:#666;">✉ ${tenant.email}</div>` : ''}
        </div>
    </div>

    <!-- RENT PERIOD -->
    <div style="background:#7C3AED; color:#FFF; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div>
            <span style="font-size:11px; opacity:0.8;">Rent Period:</span>
            <strong style="margin-left:6px;">${displayPeriodStart} — ${displayPeriodEnd}, ${yearNum}</strong>
        </div>
        <div style="font-size:11px; opacity:0.8;">${period.days} Days</div>
    </div>

    <!-- BILL BREAKDOWN TABLE -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:14px;">
        <thead>
            <tr style="background:#f0f0f0;">
                <th style="padding:8px 12px; text-align:left; font-size:11px; color:#555; border-bottom:2px solid #ddd;">Description</th>
                <th style="padding:8px 12px; text-align:right; font-size:11px; color:#555; border-bottom:2px solid #ddd;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eee;">Monthly Rent</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:right; font-weight:600;">${formatCurrency(rentAmt)}</td>
            </tr>
            ${electricityAmt > 0 ? `
            <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eee;">Electricity${bill.prev_reading && bill.curr_reading ? ` (${bill.prev_reading} → ${bill.curr_reading})` : ''}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:right; font-weight:600;">${formatCurrency(electricityAmt)}</td>
            </tr>
            ` : ''}
            ${expenses.length > 0 ? `
            <tr><td colspan="2" style="padding:6px 12px; font-size:11px; color:#7C3AED; font-weight:700; background:#faf8ff;">Additional Charges / Discounts</td></tr>
            ${expenseRows}
            ` : ''}
            ${prevBalance !== 0 ? `
            <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; color:${prevBalance > 0 ? '#E53E3E' : '#22C55E'};">
                    ${prevBalance > 0 ? 'Previous Balance (Due)' : 'Previous Advance'}
                </td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; text-align:right; font-weight:600; color:${prevBalance > 0 ? '#E53E3E' : '#22C55E'};">
                    ${prevBalance > 0 ? '+' : '−'}${formatCurrency(Math.abs(prevBalance))}
                </td>
            </tr>
            ` : ''}
        </tbody>
        <tfoot>
            <tr style="background:#7C3AED;">
                <td style="padding:10px 12px; font-weight:700; color:#FFF; font-size:13px;">TOTAL</td>
                <td style="padding:10px 12px; font-weight:800; color:#FFF; font-size:15px; text-align:right;">${formatCurrency(totalAmt)}</td>
            </tr>
        </tfoot>
    </table>

    <!-- PAYMENTS RECEIVED -->
    ${payments.length > 0 ? `
    <div style="margin-bottom:14px;">
        <div style="font-size:12px; font-weight:700; color:#22C55E; margin-bottom:6px;">💰 Payments Received</div>
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="background:#f0fdf4;">
                    <th style="padding:6px 10px; text-align:left; font-size:10px; color:#666;">Date</th>
                    <th style="padding:6px 10px; text-align:left; font-size:10px; color:#666;">Method</th>
                    <th style="padding:6px 10px; text-align:right; font-size:10px; color:#666;">Amount</th>
                    <th style="padding:6px 10px; text-align:left; font-size:10px; color:#666;">Remarks</th>
                </tr>
            </thead>
            <tbody>
                ${paymentRows}
            </tbody>
            <tfoot>
                <tr style="background:#f0fdf4;">
                    <td colspan="2" style="padding:8px 10px; font-weight:700; color:#22C55E;">Total Paid</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:800; color:#22C55E; font-size:13px;">${formatCurrency(paidAmt)}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    </div>
    ` : ''}

    <!-- BALANCE DUE -->
    ${balanceAmt > 0 ? `
    <div style="background:#FEF2F2; border:1.5px solid #E53E3E; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div style="font-weight:700; color:#E53E3E;">Balance Due</div>
        <div style="font-size:18px; font-weight:800; color:#E53E3E;">${formatCurrency(balanceAmt)}</div>
    </div>
    ` : balanceAmt < 0 ? `
    <div style="background:#F0FDF4; border:1.5px solid #22C55E; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div style="font-weight:700; color:#22C55E;">Advance Credit</div>
        <div style="font-size:18px; font-weight:800; color:#22C55E;">${formatCurrency(Math.abs(balanceAmt))}</div>
    </div>
    ` : `
    <div style="background:#F0FDF4; border:1.5px solid #22C55E; border-radius:8px; padding:10px 14px; text-align:center; margin-bottom:14px;">
        <div style="font-weight:700; color:#22C55E; font-size:14px;">✅ FULLY PAID — No Balance Due</div>
    </div>
    `}

    ${paymentInfoSection}

    <!-- SIGNATURE AREA -->
    <div style="display:flex; justify-content:space-between; margin-top:${paymentInfoSection ? '16px' : '30px'}; padding-top:16px;">
        <div style="text-align:center;">
            ${receiptConfig?.signature_uri ? `<img src="${receiptConfig.signature_uri}" style="max-height:50px; margin-bottom:4px;" />` : '<div style="height:50px;"></div>'}
            <div style="width:150px; border-top:1px solid #333; padding-top:4px; font-size:11px;">Landlord's Signature</div>
            <div style="font-size:10px; color:#888;">${property?.owner_name || ''}</div>
        </div>
        <div style="text-align:center;">
            <div style="height:50px;"></div>
            <div style="width:150px; border-top:1px solid #333; padding-top:4px; font-size:11px;">Tenant's Signature</div>
            <div style="font-size:10px; color:#888;">${tenant?.name || ''}</div>
        </div>
    </div>

    <!-- FOOTER -->
    <div style="position:absolute; bottom:16px; left:32px; right:32px; text-align:center; font-size:9px; color:#aaa; border-top:2px solid #7C3AED; padding-top:6px;">
        Generated by RentVelo App • This is a computer-generated receipt
    </div>

</div>
</body>
</html>`;
};
