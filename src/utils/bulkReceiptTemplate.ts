import { CURRENCY } from './Constants';

export type BulkReceiptMode = 'all' | 'rent' | 'reminder';
export type BulkReceiptDocumentType = 'receipt' | 'reminder';

export interface BulkReceiptItem {
    unit: any;
    tenant: any;
    bill: any;
    documentType: BulkReceiptDocumentType;
}

interface BulkReceiptData {
    property: any;
    items: BulkReceiptItem[];
    period: { start: string; end: string; days: number };
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const monthAbbrMap: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
};

const escapeHtml = (value: any): string => {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const fmtCur = (amount: number | null | undefined): string => {
    if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return `${CURRENCY}0`;
    return `${CURRENCY}${Math.abs(Number(amount)).toLocaleString('en-IN')}`;
};

const fmtSignedCur = (amount: number | null | undefined): string => {
    const numeric = Number(amount || 0);
    if (numeric === 0) return `${CURRENCY}0`;
    return `${numeric > 0 ? '+' : '-'}${fmtCur(numeric)}`;
};

const getDisplayMonth = (bill: any, period: { start: string; end: string; days: number }) => {
    const periodEndParts = period.end.split(' ');
    const periodMonthAbbr = periodEndParts.length >= 2 ? periodEndParts[1] : '';
    const periodYear = periodEndParts.length >= 3 ? parseInt(periodEndParts[2], 10) : (bill.year || new Date().getFullYear());
    const month = monthAbbrMap[periodMonthAbbr] || (bill.month || 1);
    const year = periodYear || (bill.year || new Date().getFullYear());
    return { month, year, label: `${MONTHS[month - 1].toUpperCase()}, ${year}` };
};

const getBillPeriod = (bill: any, displayMonth: number, displayYear: number) => {
    const startObj = bill.period_start ? new Date(bill.period_start) : new Date(displayYear, displayMonth - 1, 1);
    const endObj = bill.period_end ? new Date(bill.period_end) : new Date(displayYear, displayMonth, 0);
    return {
        short: `${startObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        full: `${startObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    };
};

const getUtilityLine = (bill: any, unit: any) => {
    const lines: string[] = [];

    if ((bill.electricity_amount || 0) > 0) {
        const unitsUsed = bill.prev_reading != null && bill.curr_reading != null
            ? Number((bill.curr_reading - bill.prev_reading).toFixed(2))
            : null;
        lines.push(`Electricity${unitsUsed !== null ? ` (${unitsUsed} units)` : ''}: ${fmtCur(bill.electricity_amount)}`);
    }

    if ((bill.water_amount || 0) > 0) {
        const unitsUsed = bill.water_prev_reading != null && bill.water_curr_reading != null
            ? Number((bill.water_curr_reading - bill.water_prev_reading).toFixed(2))
            : null;
        lines.push(`Water${unitsUsed !== null ? ` (${unitsUsed} units)` : ''}: ${fmtCur(bill.water_amount)}`);
    }

    if (lines.length === 0 && (unit.electricity_rate || unit.water_rate || unit.electricity_fixed_amount || unit.water_fixed_amount)) {
        return 'Utilities: -';
    }

    return lines.join(' | ');
};

const renderCard = (property: any, item: BulkReceiptItem, period: { start: string; end: string; days: number }) => {
    const { unit, tenant, bill, documentType } = item;
    const { month, year, label: monthLabel } = getDisplayMonth(bill, period);
    const billPeriod = getBillPeriod(bill, month, year);
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const title = documentType === 'receipt' ? 'RECEIPT' : 'REMINDER';
    const receiptNo = bill.bill_number || `RR-${bill.id}`;
    const utilityLine = getUtilityLine(bill, unit);
    const isReminder = documentType === 'reminder';
    const balance = bill.balance || 0;
    const statusLabel = isReminder ? 'PENDING' : ((bill.status || '').toUpperCase() || 'RECEIPT');

    return `
        <div class="receipt-card ${isReminder ? 'reminder' : 'receipt'}">
            <div class="watermark">${escapeHtml(property?.name || 'RentVelo')}</div>
            <div class="top-line">
                <div class="tiny strong">${escapeHtml(property?.owner_name || property?.name || 'Landlord')}</div>
                <div class="tiny">${property?.owner_phone ? `Phone: ${escapeHtml(property.owner_phone)}` : escapeHtml(today)}</div>
            </div>

            <div class="title-row">
                <div class="title">${title}</div>
                <div class="status">${statusLabel}</div>
            </div>

            <div class="property-name">${escapeHtml(property?.name || '')}</div>
            <div class="address">${escapeHtml(property?.address || '')}</div>

            <div class="meta-row">
                <div>
                    <div class="label">Receipt No.</div>
                    <div class="value">${escapeHtml(receiptNo)}</div>
                </div>
                <div class="date-box">${escapeHtml(today)}</div>
            </div>

            <div class="month-pill">${escapeHtml(monthLabel)}</div>

            <div class="room-row">
                <div>
                    <div class="label">Room No.</div>
                    <div class="value">${escapeHtml(unit?.room_group || unit?.name || '-')}</div>
                </div>
                <div>
                    <div class="label">Tenant</div>
                    <div class="value">${escapeHtml(tenant?.name || '-')}</div>
                </div>
            </div>

            <div class="utility-line">${escapeHtml(utilityLine || 'Utilities: -')}</div>

            <div class="section-title">Payment Details</div>
            <div class="payment-grid">
                <div>
                    <span>Rent</span>
                    <strong>${fmtCur(bill.rent_amount)}</strong>
                    <small>${escapeHtml(billPeriod.short)}</small>
                </div>
                <div>
                    <span>Old Balance</span>
                    <strong>${fmtSignedCur(bill.previous_balance)}</strong>
                </div>
                <div>
                    <span>Utility</span>
                    <strong>${fmtCur((bill.electricity_amount || 0) + (bill.water_amount || 0))}</strong>
                </div>
                <div>
                    <span>Expense</span>
                    <strong>${fmtSignedCur(bill.total_expenses)}</strong>
                </div>
            </div>

            <div class="summary-row">
                <div>
                    <span>Grand Total</span>
                    <strong>${fmtCur(bill.total_amount)}</strong>
                </div>
                <div>
                    <span>Amt Paid</span>
                    <strong>${fmtCur(bill.paid_amount)}</strong>
                </div>
                <div class="${balance > 0 ? 'balance-due' : 'balance-ok'}">
                    <span>Balance</span>
                    <strong>${fmtCur(balance)}</strong>
                </div>
            </div>

            <div class="footer-row">
                <span>${escapeHtml(billPeriod.full)}</span>
                <span>RentVelo</span>
            </div>
        </div>
    `;
};

export const generateBulkReceiptHTML = ({ property, items, period }: BulkReceiptData): string => {
    const pages: BulkReceiptItem[][] = [];
    for (let i = 0; i < items.length; i += 6) {
        pages.push(items.slice(i, i + 6));
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=794">
    <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Helvetica, Arial, sans-serif;
            color: #111;
            background: #fff;
            -webkit-print-color-adjust: exact;
        }
        .page {
            width: 794px;
            height: 1123px;
            padding: 18px;
            background: #fff;
            page-break-after: always;
        }
        .page:last-child { page-break-after: auto; }
        .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: 353px;
            gap: 12px;
            height: 100%;
        }
        .receipt-card {
            position: relative;
            overflow: hidden;
            border: 1.5px solid #6B7280;
            border-radius: 12px;
            padding: 8px 10px;
            background: #fff;
        }
        .receipt-card.reminder { border-color: #B91C1C; }
        .watermark {
            position: absolute;
            inset: 92px 18px auto 18px;
            text-align: center;
            font-size: 78px;
            line-height: 1;
            font-weight: 900;
            color: rgba(17, 24, 39, 0.045);
            transform: rotate(-18deg);
            pointer-events: none;
            white-space: nowrap;
        }
        .top-line, .meta-row, .room-row, .footer-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            position: relative;
            z-index: 1;
        }
        .tiny { font-size: 8px; line-height: 1.2; }
        .strong { font-weight: 800; }
        .title-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: -1px;
            position: relative;
            z-index: 1;
        }
        .title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.4px;
        }
        .status {
            position: absolute;
            right: 0;
            top: 1px;
            font-size: 7px;
            font-weight: 900;
            padding: 2px 5px;
            border-radius: 7px;
            background: #111827;
            color: #fff;
        }
        .reminder .status { background: #B91C1C; }
        .property-name {
            text-align: center;
            font-size: 19px;
            line-height: 1;
            font-weight: 900;
            position: relative;
            z-index: 1;
        }
        .address {
            text-align: center;
            font-size: 9px;
            height: 13px;
            overflow: hidden;
            color: #333;
            position: relative;
            z-index: 1;
        }
        .meta-row {
            align-items: flex-end;
            border-bottom: 1px dashed #4B5563;
            padding-bottom: 6px;
            margin-top: 4px;
        }
        .date-box {
            font-size: 8px;
            font-weight: 800;
            color: #111;
        }
        .label {
            font-size: 7px;
            color: #111;
            font-weight: 800;
        }
        .value {
            font-size: 11px;
            font-weight: 900;
            line-height: 1.15;
        }
        .month-pill {
            width: 132px;
            margin: -9px auto 7px auto;
            padding: 3px 8px;
            border-radius: 9px;
            background: #2F3136;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            text-align: center;
            position: relative;
            z-index: 2;
        }
        .room-row {
            border: 1px solid #8B8B8B;
            padding: 5px 7px;
            margin-bottom: 5px;
        }
        .room-row > div { width: 50%; }
        .utility-line {
            font-size: 8px;
            font-weight: 800;
            margin-bottom: 5px;
            height: 11px;
            overflow: hidden;
            position: relative;
            z-index: 1;
        }
        .section-title {
            font-size: 8px;
            font-weight: 900;
            margin-bottom: 3px;
            position: relative;
            z-index: 1;
        }
        .payment-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border: 1px solid #8B8B8B;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
        }
        .payment-grid > div {
            min-height: 43px;
            padding: 5px 4px;
            border-right: 1px solid #D1D5DB;
            text-align: center;
        }
        .payment-grid > div:last-child { border-right: none; }
        .payment-grid span, .summary-row span {
            display: block;
            font-size: 8px;
            font-weight: 800;
            color: #111;
            line-height: 1.1;
        }
        .payment-grid strong {
            display: block;
            margin-top: 4px;
            font-size: 11px;
            font-weight: 900;
            line-height: 1.1;
        }
        .payment-grid small {
            display: block;
            margin-top: 3px;
            font-size: 6px;
            color: #555;
            white-space: nowrap;
        }
        .summary-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            position: relative;
            z-index: 1;
        }
        .summary-row > div {
            border: 1px solid #8B8B8B;
            border-radius: 5px;
            min-height: 45px;
            padding: 7px 6px;
            text-align: center;
            background: #fff;
        }
        .summary-row strong {
            display: block;
            margin-top: 4px;
            font-size: 16px;
            line-height: 1;
            font-weight: 900;
        }
        .summary-row .balance-due {
            background: #2F3136;
            border-color: #2F3136;
        }
        .summary-row .balance-due span,
        .summary-row .balance-due strong {
            color: #fff;
        }
        .summary-row .balance-ok {
            background: #ECFDF5;
            border-color: #10B981;
        }
        .footer-row {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 6px;
            font-size: 7px;
            color: #6B7280;
            font-weight: 700;
        }
    </style>
</head>
<body>
    ${pages.map(pageItems => `
        <div class="page">
            <div class="grid">
                ${pageItems.map(item => renderCard(property, item, period)).join('')}
            </div>
        </div>
    `).join('')}
</body>
</html>`;
};
