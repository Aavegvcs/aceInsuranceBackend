import { Client } from "@modules/client/entities/client.entity";
import { ClientDashboardStats } from "@modules/dashboard/entities/client-stats.entity";
import { FiveDaysDebitReport } from "@modules/report/entities/five-days-debit-report.entity";
import { HoldingsStatement } from "@modules/report/entities/holdings-statement.entity";
import { NetPositionReport } from "@modules/report/entities/net-position-report.entity";

export const ClientMailReport = (
  client: Client,
  stats: ClientDashboardStats,
  holdings: HoldingsStatement[],
  debit: FiveDaysDebitReport | null,
  netPositions: NetPositionReport[],
  yesterday: Date,
  chartImage: Buffer
): string => {
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
    return value != null ? Number(value).toFixed(decimals) : 'N/A';
  };

  const summaryItems = [
    ['Name', client.user?.firstName ?? 'N/A'],
    ['Ledger Balance', Number(stats.ledgerBalance ?? 0).toFixed(2)],
    ['Client Code', client.id ?? 'N/A'],
    ['Span Margin', Number(stats.spanMargin ?? 0).toFixed(2)],
    ['Bank Name', client.bankAccounts?.[0]?.bankName ?? 'N/A'],
    ['Total Cash Value', Number(stats.totalBalance ?? 0).toFixed(2)],
    ['A/c No.', client.bankAccounts?.[0]?.accountNumber ?? 'N/A'],
    ['Shares', Number(stats.equities ?? 0).toFixed(2)],
    ['DP ID', client.dpId ?? 'N/A'],
    ['Mutual Funds', Number(stats.mutualFunds ?? 0).toFixed(2)],
    ['Branch', client.branch?.id ?? 'N/A'],
    ['Total Holding', Number(stats.totalHolding ?? 0).toFixed(2)],
    ['A/c Since', formatDate(client.clientActivationDate)],
    ['Grand Total', Number(stats.portfolioValue ?? 0).toFixed(2)],
  ];

  const clientSummaryRows = summaryItems
    .map((item, idx) => {
      const isNewRow = idx % 2 === 0;
      const rowOpen = isNewRow ? `<tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fbfd'};">` : '';
      const rowClose = (idx % 2 === 1 || idx === summaryItems.length - 1) ? '</tr>' : '';
      return `${rowOpen}
        <td style="padding: 0.5rem; width: 15%; font-weight: 500; border: 1px solid #ddd;">${item[0]}</td>
        <td style="padding: 0.5rem; width: 25%; border: 1px solid #ddd;">${item[1]}</td>
      ${rowClose}`;
    })
    .join('');
    

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily Report - Acumen</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f4f6f8; color: #333;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f6f8;">
    <tr>
      <td align="center" style="padding: 2rem;">
        <table role="presentation" style="width: 100%; max-width: 1000px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #4DAA3F 0%, #0055A5 100%); padding: 2rem; text-align: center;">
              <img src="https://acumen-public.s3.ap-south-1.amazonaws.com/logo-white.png" alt="Acumen Logo" style="width: 10rem; height: 2.2rem; margin-bottom: 1rem;" />
              <h1 style="font-size: 1.75rem; color: #ffffff; margin: 0;">Daily Portfolio Snapshot</h1>
              <p style="font-size: 0.95rem; color: #ffffff;">As on ${formatDate(yesterday)}</p>
            </td>
          </tr>

          <!-- CLIENT DETAILS -->
          <tr>
            <td style="padding: 2rem;">
              <h2 style="font-size: 1.2rem; margin-bottom: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">Client Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                ${clientSummaryRows}
              </table>
            </td>
          </tr>

          <!-- TOP 10 HOLDINGS -->
          <tr>
            <td style="padding: 2rem;">
              <h2 style="font-size: 1.2rem; margin-bottom: 0.5rem;">Top 10 Holdings (Pie Chart)</h2>
              <p style="font-size: 0.9rem; color: #666;">This chart illustrates the percentage weight of your top holdings.</p>
              <img src="cid:top10chart" alt="Top Holdings Chart" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #ddd;" />
            </td>
          </tr>

          <!-- HOLDINGS TABLE -->
          <tr>
            <td style="padding: 2rem;">
              <h2 style="font-size: 1.2rem; margin-bottom: 1rem;">All Holdings</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead style="background-color: #f1f3f5;">
                  <tr>
                    <th style="text-align: left; padding: 0.75rem; border: 1px solid #ddd;">Scrip</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Qty</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Buy Avg</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Value</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">P&L</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Prev Close</th>
                  </tr>
                </thead>
                <tbody>
                  ${holdings.map((h, i) => {
                    const quantity = h.quantity;
                    const buyAvg = Number(h.buyAvg ?? 0);
                    const previousClosing = Number(h.previousClosing ?? 0);
                    const value = Number(h.value ?? 0);
                    const pnl = (previousClosing - buyAvg) * quantity;
                    return `
                    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fbfd'};">
                      <td style="text-align: left; padding: 0.65rem; border: 1px solid #ddd;">${h.scripName ?? 'Unknown'}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${quantity.toFixed(0)}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${buyAvg.toFixed(2)}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${value.toFixed(2)}</td>
                      <td style="text-align: right; padding: 0.65rem; color: ${pnl >= 0 ? '#28a745' : '#dc3545'}; border: 1px solid #ddd;">${pnl.toFixed(2)}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${previousClosing.toFixed(2)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- NET POSITION REPORT -->
          <tr>
            <td style="padding: 2rem;">
              <h2 style="font-size: 1.2rem; margin-bottom: 1rem;">Net Position Report</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead style="background-color: #f1f3f5;">
                  <tr>
                    <th style="text-align: left; padding: 0.75rem; border: 1px solid #ddd;">Scrip</th>
                    <th style="text-align: left; padding: 0.75rem; border: 1px solid #ddd;">Exchange</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Net Qty</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Net Rate</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Strike Price</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Closing Price</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Unrealized P&L</th>
                    <th style="text-align: right; padding: 0.75rem; border: 1px solid #ddd;">Outstanding Amt</th>
                  </tr>
                </thead>
                <tbody>
                  ${netPositions.map((np, i) => {
                    const notional = Number(np.notional ?? 0);
                    return `
                    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9fbfd'};">
                      <td style="padding: 0.65rem; border: 1px solid #ddd;">${np.scripName ?? 'N/A'}</td>
                      <td style="padding: 0.65rem; border: 1px solid #ddd;">${np.exchange ?? 'N/A'}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${np.netQuantity ?? 0}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${formatNumber(np.netRate)}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${formatNumber(np.strikePrice)}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${formatNumber(np.closingPrice)}</td>
                      <td style="text-align: right; padding: 0.65rem; color: ${notional >= 0 ? '#28a745' : '#dc3545'}; border: 1px solid #ddd;">${formatNumber(np.notional)}</td>
                      <td style="text-align: right; padding: 0.65rem; border: 1px solid #ddd;">${formatNumber(np.outstandingAmount)}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- DEBIT REPORT -->
          <tr>
            <td style="padding: 2rem;">
              <h2 style="font-size: 1.2rem; margin-bottom: 1rem;">Debit Report</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f1f3f5;">
                  <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Closing Balance</th>
                  <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">3 Days</th>
                  <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">7+ Days</th>
                </tr>
                <tr>
                  <td style="padding: 0.75rem; border: 1px solid #ddd;">${Number(debit?.closingBalance ?? 0).toFixed(2)}</td>
                  <td style="padding: 0.75rem; border: 1px solid #ddd;">${Number(debit?.threeDays ?? 0).toFixed(2)}</td>
                  <td style="padding: 0.75rem; border: 1px solid #ddd;">${Number(debit?.moreThanSevenDays ?? 0).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DISCLAIMER -->
          <tr>
            <td style="padding: 2rem; font-size: 0.85rem; color: #666;">
              <h2 style="font-size: 1rem; font-weight: 600;">Disclaimer</h2>
              <p style="line-height: 1.6;">
                The views expressed are based on public/internal data considered reliable. This is not an offer, solicitation, or guarantee of performance. Use your discretion in investment decisions. For queries, contact support.
              </p>
              <p style="font-size: 0.75rem; color: #999;">
                This message contains confidential information and is intended for ${client.user?.email ?? 'N/A'}. If you are not the intended recipient, please delete the message and notify us. Email delivery cannot be guaranteed to be secure or error-free.
              </p>
            </td>
          </tr>

          <!-- SEBI DETAILS -->
          <tr>
            <td style="padding: 1rem; text-align: center; font-size: 0.75rem; color: #999;">
              SEBI REGN. NO. BSE - INB010881432 | NSE - INB230881431 | RESEARCH ANALYST REG NO: INH200003026
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};