import { CURRENCY, AMENITIES } from './Constants';
import { DEFAULT_TERMS_AND_CONDITIONS, TERMS_DISCLAIMER } from './defaultTerms';
import { getTermsAndConditions } from '../screens/settings/TermsEditorScreen';

interface LedgerData {
    property: any;
    unit: any;
    tenant: any;
    payments: any[];
    receiptConfig: any;
    options: {
        includeIdProof: boolean;
        includeTransactions: boolean;
        transactionOrder: 'asc' | 'desc';
        includeAmenities: boolean;
        includeTerms: boolean;
        includeSignature: boolean;
    };
}

const formatDate = (date: any): string => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return `0 ${CURRENCY}`;
    return `${amount.toLocaleString('en-IN')} ${CURRENCY}`;
};

const getLeaseLabel = (type: string) => {
    switch (type) {
        case 'monthly': return 'Until Tenant Leaves';
        case 'yearly': return 'Yearly';
        case 'fixed': return 'Fixed Term';
        default: return type || '—';
    }
};

const pageStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; font-size: 13px; line-height: 1.5; }
    .page { padding: 30px; page-break-after: always; min-height: 100vh; position: relative; }
    .page:last-child { page-break-after: avoid; }
    
    .header { text-align: center; margin-bottom: 20px; position: relative; }
    .header .place { color: #7C3AED; font-size: 14px; font-weight: bold; }
    .header .title { font-size: 22px; font-weight: bold; margin-top: 4px; }
    .header .logo { position: absolute; right: 0; top: 0; width: 50px; height: 50px; object-fit: contain; }
    
    .section-title { color: #7C3AED; font-size: 14px; font-weight: bold; margin: 16px 0 8px; }
    
    .info-box { border: 1.5px solid #7C3AED; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    .info-row { display: flex; gap: 8px; margin-bottom: 4px; }
    .info-label { font-weight: bold; min-width: 120px; }
    .info-value { flex: 1; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    table.data-table td, table.data-table th { 
        border: 1px solid #ddd; padding: 8px 12px; text-align: left; 
    }
    table.data-table th { background: #666; color: #FFF; font-weight: bold; }
    
    .tenant-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; float: right; }
    
    .footer { 
        text-align: center; font-size: 10px; color: #999; 
        position: absolute; bottom: 10px; left: 30px; right: 30px;
        border-top: 2px solid #7C3AED; padding-top: 4px;
    }
    
    .signature-area { display: flex; justify-content: space-between; margin-top: 60px; }
    .signature-block { text-align: center; }
    .signature-block .line { width: 150px; border-top: 1px solid #333; margin-bottom: 4px; }
    .signature-block img { max-height: 60px; margin-bottom: 4px; }
    
    .empty-state { text-align: center; padding: 60px 20px; color: #999; }
    .empty-state .icon { font-size: 48px; margin-bottom: 12px; }
    
    .transaction-month { background: #666; color: #FFF; padding: 8px 12px; font-weight: bold; border-radius: 4px 4px 0 0; }
    .transaction-table { margin-bottom: 20px; }
    .transaction-table td { border: 1px solid #ddd; padding: 6px 10px; }
    .highlight { background: #F0FFF4; }
    .danger { color: #E53E3E; }
    
    .payment-info { margin-top: 16px; }
    .payment-info-box { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
    .payment-info-title { font-weight: bold; color: #7C3AED; margin-bottom: 6px; }
    
    .terms-text { font-size: 12px; line-height: 1.8; text-align: justify; }
    .terms-text p { margin-bottom: 10px; }
    
    .disclaimer { font-size: 10px; color: #999; text-align: center; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
`;

const renderHeader = (property: any, receiptConfig: any) => `
    <div class="header">
        <div class="place">Place : ${property?.name || '—'}</div>
        ${receiptConfig?.logo_uri ? `<img class="logo" src="${receiptConfig.logo_uri}" />` : ''}
    </div>
`;

const renderFooter = () => `
    <div class="footer">Made By : RentVelo App</div>
`;

// --- PAGE 1: Property-Tenant Summary ---
const renderSummaryPage = (data: LedgerData) => {
    const { property, unit, tenant, receiptConfig } = data;
    return `
    <div class="page">
        ${renderHeader(property, receiptConfig)}
        <div class="title" style="text-align:center; font-size:22px; font-weight:bold; margin-bottom:20px;">Property-Tenant Summary</div>
        
        <div class="section-title" style="color:#666;">Room/Property Details</div>
        <div class="info-box">
            <table style="width:100%; border:none;">
                <tr>
                    <td><strong>Name/No :</strong> ${unit?.name || property?.name || '—'}</td>
                    <td><strong>Rent :</strong> ${formatCurrency(unit?.rent || 0)}</td>
                    <td><strong>Type :</strong> ${unit?.type || property?.type || '—'}</td>
                </tr>
                <tr>
                    <td colspan="3"><strong>Address :</strong> ${property?.address || '—'}</td>
                </tr>
                <tr>
                    <td><strong>Electricity Type :</strong> ${unit?.electricity_type || '—'}</td>
                    <td><strong>Meter No :</strong> ${unit?.meter_number || '—'}</td>
                    <td><strong>Per Unit Cost :</strong> ${unit?.per_unit_cost || '—'} ${CURRENCY}</td>
                </tr>
                <tr>
                    <td colspan="3"><strong>Water Cost :</strong> ${unit?.water_cost ? formatCurrency(unit.water_cost) : 'No Cost'}</td>
                </tr>
            </table>
        </div>
        
        <div class="section-title" style="color:#E53E3E;">Owner / Company Details :</div>
        <div class="info-box" style="border-color:#E53E3E;">
            <table style="width:100%; border:none;">
                <tr>
                    <td><strong>Name :</strong> ${property?.owner_name || '—'}</td>
                    <td><strong>Mobile No :</strong> ${property?.owner_phone || '—'}</td>
                </tr>
                <tr>
                    <td><strong>Email :</strong> ${property?.owner_email || '—'}</td>
                    <td><strong>WebSite :</strong> ${property?.website || '—'}</td>
                </tr>
            </table>
        </div>
        
        <div style="margin-top:20px;">
            <div class="section-title">Tenant Details</div>
            <div class="info-box">
                ${tenant?.photo_uri ? `<img class="tenant-photo" src="${tenant.photo_uri}" />` : ''}
                <table style="width:100%; border:none;">
                    <tr><td colspan="2"><strong>Name :</strong> ${tenant?.name || '—'}</td></tr>
                    <tr>
                        <td><strong>Profession :</strong> ${tenant?.profession || '—'}</td>
                        <td><strong>No Of People :</strong> ${tenant?.guest_count || '1'}</td>
                    </tr>
                    <tr>
                        <td><strong>Mobile No :</strong> ${tenant?.phone || '—'}</td>
                        <td><strong>Email ID :</strong> ${tenant?.email || '—'}</td>
                    </tr>
                </table>
            </div>
        </div>
        
        <div class="section-title" style="color:#E53E3E;">Important Info / Dates :</div>
        <div class="info-box" style="border-color:#E53E3E;">
            <table style="width:100%; border:none;">
                <tr><td><strong>Deposit Amt :</strong> ${formatCurrency(tenant?.security_deposit)}</td></tr>
                <tr>
                    <td><strong>Move In Date :</strong> ${formatDate(tenant?.move_in_date)}</td>
                    <td><strong>Rent Start Date :</strong> ${formatDate(tenant?.rent_start_date)}</td>
                </tr>
                <tr><td colspan="2"><strong>Lease Type :</strong> ${getLeaseLabel(tenant?.lease_type)}</td></tr>
            </table>
        </div>
        
        ${renderFooter()}
    </div>`;
};

// --- PAGE 2: ID Proofs ---
const renderIdProofPage = (data: LedgerData) => {
    const { tenant, receiptConfig, property } = data;
    const hasProofs = tenant?.aadhaar_front_uri || tenant?.aadhaar_back_uri || tenant?.pan_uri;

    return `
    <div class="page">
        ${renderHeader(property, receiptConfig)}
        <div class="title" style="text-align:center; font-size:22px; font-weight:bold; margin-bottom:20px;">ID Proofs</div>
        
        ${hasProofs ? `
            <div style="display:flex; flex-wrap:wrap; gap:16px; justify-content:center;">
                ${tenant.aadhaar_front_uri ? `
                    <div style="text-align:center;">
                        <p style="font-weight:bold; margin-bottom:8px;">Aadhaar Front</p>
                        <img src="${tenant.aadhaar_front_uri}" style="max-width:280px; border:1px solid #ddd; border-radius:8px;" />
                    </div>
                ` : ''}
                ${tenant.aadhaar_back_uri ? `
                    <div style="text-align:center;">
                        <p style="font-weight:bold; margin-bottom:8px;">Aadhaar Back</p>
                        <img src="${tenant.aadhaar_back_uri}" style="max-width:280px; border:1px solid #ddd; border-radius:8px;" />
                    </div>
                ` : ''}
                ${tenant.pan_uri ? `
                    <div style="text-align:center;">
                        <p style="font-weight:bold; margin-bottom:8px;">PAN Card</p>
                        <img src="${tenant.pan_uri}" style="max-width:280px; border:1px solid #ddd; border-radius:8px;" />
                    </div>
                ` : ''}
            </div>
        ` : `
            <div class="empty-state">
                <div class="icon">🪪❌</div>
                <p style="font-size:18px; font-weight:bold;">No ID Proof Exists</p>
            </div>
        `}
        
        ${renderFooter()}
    </div>`;
};

// --- PAGE 3: Rent Transactions ---
const renderTransactionsPage = (data: LedgerData) => {
    const { payments, receiptConfig, property, options } = data;

    const sortedPayments = [...payments].sort((a, b) => {
        const dateA = new Date(a.payment_date || a.created_at).getTime();
        const dateB = new Date(b.payment_date || b.created_at).getTime();
        return options.transactionOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // Group by month
    const grouped: Record<string, any[]> = {};
    sortedPayments.forEach(p => {
        const d = new Date(p.payment_date || p.created_at);
        const key = `${d.toLocaleString('en-IN', { month: 'long' })}, ${d.getFullYear()}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
    });

    const monthKeys = Object.keys(grouped);
    const partCount = Math.ceil(monthKeys.length / 6) || 1;
    const pages: string[] = [];

    for (let part = 0; part < partCount; part++) {
        const slice = monthKeys.slice(part * 6, (part + 1) * 6);
        pages.push(`
        <div class="page">
            ${renderHeader(property, receiptConfig)}
            <div class="title" style="text-align:center; font-size:22px; font-weight:bold; margin-bottom:20px;">
                Rent Transactions : Part (${part + 1}/${partCount})
            </div>
            
            ${slice.length > 0 ? slice.map(month => `
                <div class="transaction-table">
                    <div class="transaction-month">${month}</div>
                    <table class="data-table">
                        <tr>
                            <td><strong>Rent :</strong> ${formatCurrency(grouped[month][0]?.rent_amount)}</td>
                            <td><strong>Electricity & Water :</strong> ${formatCurrency(grouped[month][0]?.utility_amount || 0)}</td>
                        </tr>
                        <tr>
                            <td><strong>Expense (+) :</strong> ${formatCurrency(grouped[month][0]?.extra_charges || 0)}</td>
                            <td><strong>Prev Balance :</strong> ${formatCurrency(grouped[month][0]?.previous_balance || 0)}</td>
                            <td><strong>Grand Total :</strong> ${formatCurrency(grouped[month][0]?.total_amount || 0)}</td>
                        </tr>
                        <tr>
                            <td><strong>Amt Paid :</strong> ${formatCurrency(grouped[month][0]?.amount_paid || 0)}</td>
                            <td><strong>Paid Date :</strong> ${grouped[month][0]?.payment_date ? formatDate(grouped[month][0].payment_date) : 'Not Paid'}</td>
                            <td class="${(grouped[month][0]?.balance_left || 0) > 0 ? 'highlight danger' : 'highlight'}">
                                <strong>Balance Left :</strong> ${formatCurrency(grouped[month][0]?.balance_left || 0)}
                            </td>
                        </tr>
                    </table>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <p style="font-size:16px;">No payment transactions recorded yet.</p>
                </div>
            `}
            
            ${renderFooter()}
        </div>`);
    }

    return pages.join('');
};

// --- PAGE 4: Terms & Conditions ---
const renderTermsPage = (data: LedgerData) => {
    const { property, tenant, receiptConfig, options } = data;
    const terms = getTermsAndConditions();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return `
    <div class="page">
        ${renderHeader(property, receiptConfig)}
        <div class="title" style="text-align:center; font-size:22px; font-weight:bold; margin-bottom:24px;">Terms & Conditions</div>
        
        <div class="terms-text">
            ${terms.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('')}
        </div>
        
        ${options.includeSignature ? `
            <div class="signature-area">
                <div class="signature-block">
                    ${receiptConfig?.signature_uri ? `<img src="${receiptConfig.signature_uri}" />` : ''}
                    <div class="line"></div>
                    <p>[ Landlord's Signature ]</p>
                    <p>Name : ${property?.owner_name || '—'}</p>
                    <p>Date : ${today}</p>
                </div>
                <div class="signature-block">
                    <div style="height:64px;"></div>
                    <div class="line"></div>
                    <p>[ Tenant's Signature ]</p>
                    <p>Name : ${tenant?.name || '—'}</p>
                    <p>Date : ________</p>
                </div>
            </div>
        ` : ''}
        
        <div class="disclaimer">${TERMS_DISCLAIMER}</div>
        ${renderFooter()}
    </div>`;
};

// --- PAGE 5: Payment Info (Bank / Wallet / UPI / QR) ---
const renderPaymentInfoPage = (data: LedgerData) => {
    const { property, receiptConfig } = data;
    if (!receiptConfig) return '';

    const hasBank = receiptConfig.bank_name || receiptConfig.bank_acc_number;
    const hasWallet = receiptConfig.wallet_type || receiptConfig.wallet_phone;
    const hasUpi = receiptConfig.upi_id;
    const hasQr = receiptConfig.payment_qr_uri;

    if (!hasBank && !hasWallet && !hasUpi && !hasQr) return '';

    const walletLabels: Record<string, string> = {
        google_pay: 'Google Pay',
        paytm: 'Paytm',
        phonepe: 'PhonePe',
        amazon_pay: 'Amazon Pay',
        other: 'Other',
    };

    return `
    <div class="page">
        ${renderHeader(property, receiptConfig)}
        <div class="title" style="text-align:center; font-size:22px; font-weight:bold; margin-bottom:24px;">Payment Details</div>
        
        <div class="payment-info">
            ${hasBank ? `
                <div class="payment-info-box">
                    <div class="payment-info-title">🏦 Bank Transfer</div>
                    <table style="width:100%; border:none;">
                        <tr><td><strong>Bank Name:</strong> ${receiptConfig.bank_name || '—'}</td></tr>
                        <tr><td><strong>Account Number:</strong> ${receiptConfig.bank_acc_number || '—'}</td></tr>
                        <tr><td><strong>IFSC Code:</strong> ${receiptConfig.bank_ifsc || '—'}</td></tr>
                        <tr><td><strong>Account Holder:</strong> ${receiptConfig.bank_acc_holder || '—'}</td></tr>
                    </table>
                </div>
            ` : ''}
            
            ${hasWallet ? `
                <div class="payment-info-box">
                    <div class="payment-info-title">📱 ${walletLabels[receiptConfig.wallet_type] || 'Wallet'}</div>
                    <table style="width:100%; border:none;">
                        <tr><td><strong>Phone:</strong> ${receiptConfig.wallet_phone || '—'}</td></tr>
                        <tr><td><strong>Name:</strong> ${receiptConfig.wallet_name || '—'}</td></tr>
                    </table>
                </div>
            ` : ''}
            
            ${hasUpi ? `
                <div class="payment-info-box">
                    <div class="payment-info-title">💳 UPI</div>
                    <p><strong>UPI ID:</strong> ${receiptConfig.upi_id}</p>
                </div>
            ` : ''}
            
            ${hasQr ? `
                <div class="payment-info-box" style="text-align:center;">
                    <div class="payment-info-title">📷 Payment QR Code</div>
                    <img src="${receiptConfig.payment_qr_uri}" style="max-width:200px; margin:12px auto;" />
                </div>
            ` : ''}
        </div>
        
        ${renderFooter()}
    </div>`;
};

// --- MAIN EXPORT ---
export const generateRentLedgerHTML = (data: LedgerData): string => {
    const { options } = data;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${pageStyles}</style>
    </head>
    <body>
        ${renderSummaryPage(data)}
        ${options.includeIdProof ? renderIdProofPage(data) : ''}
        ${options.includeTransactions ? renderTransactionsPage(data) : ''}
        ${renderPaymentInfoPage(data)}
        ${options.includeTerms ? renderTermsPage(data) : ''}
    </body>
    </html>`;

    return html;
};
