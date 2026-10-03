import type { FeePayment, FeeSummary } from '../services/api';
import logoSrc from '../assets/logo (1).png';

function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Only' : 'Only';
  return str.trim();
}

export const generateReceiptHtml = (payment: FeePayment, reportFee?: FeeSummary, payingFee?: FeeSummary) => {
  const receiptNo = `${payment.id?.toString().padStart(3, '0')}`;
  const dateObj = payment.created_at ? new Date(payment.created_at) : new Date();
  const date = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

  const studentName = reportFee?.student_name || payingFee?.student_name || '';
  const paidAmount = payment.amount || 0;
  const amountWords = numberToWords(paidAmount);
  const mode = payment.remark || 'Cash';

  let courseName = (reportFee as any)?.inquiry_for || (payingFee as any)?.inquiry_for || '';
  try {
    const payloadStr = reportFee?.payload_json || payingFee?.payload_json;
    if (payloadStr) {
      const payload = JSON.parse(payloadStr);
      if (payload.courses && Array.isArray(payload.courses) && payload.courses.length > 0) {
        courseName = payload.courses.map((c: any) => c.courseName).filter(Boolean).join(', ');
      }
    }
  } catch (e) { }

  const status = reportFee?.status || payingFee?.status || 'Pending';
  const fullOrPart = (status === 'Complete') ? 'Full' : 'Part';

  return `
    <html>
      <head>
        <title>Fee Receipt - ${receiptNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');
          
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            color: #000; 
            display: flex;
            justify-content: center;
          }
          .receipt-box { 
            width: 750px; 
            height: 480px;
            border: 2px solid #000; 
            padding: 0;
            position: relative;
            box-sizing: border-box;
          }
          .header-row {
            display: flex;
            border-bottom: 2px solid #000;
            height: 100px;
          }
          .logo-col {
            width: 25%;
            border-right: 2px solid #000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .logo-text {
            font-size: 32px;
            font-weight: bold;
            font-style: italic;
          }
          .logo-sub {
            font-size: 14px;
          }
          .title-col {
            width: 50%;
            border-right: 2px solid #000;
            text-align: center;
            padding: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .title-col h1 {
            margin: 0 0 5px 0;
            font-size: 32px;
          }
          .title-col p {
            margin: 0;
            font-size: 14px;
          }
          .meta-col {
            width: 25%;
            display: flex;
            flex-direction: column;
          }
          .meta-row {
            flex: 1;
            padding: 10px;
            display: flex;
            align-items: center;
          }
          .meta-row.top {
            border-bottom: 2px solid #000;
          }
          .meta-label {
            margin-right: 5px;
          }
          
          .receipt-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 15px 0 25px 0;
            text-decoration: underline;
          }
          
          .body-content {
            padding: 0 20px;
            font-size: 16px;
            line-height: 2.5;
          }
          
          .field-line {
            margin-bottom: 15px;
            line-height: 2;
          }
          
          .field-line.flex {
            display: flex;
            align-items: flex-end;
          }
          
          .label {
            white-space: nowrap;
            margin-right: 10px;
          }
          
          .value-underline {
            border-bottom: 1px solid #000;
            font-family: 'Caveat', cursive;
            font-size: 24px;
            padding: 0 10px;
            text-align: left;
          }
          
          .value-underline.flex-1 {
            flex: 1;
            position: relative;
            top: 5px;
          }
          
          .value-underline.short {
            display: inline-block;
            width: 150px;
            position: relative;
            top: 5px;
          }
          
          .value-underline.inline-wrap {
            display: inline;
            line-height: 1.2;
            word-break: break-word;
          }
          
          .footer-section {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          
          .amount-box-container {
            display: flex;
            align-items: center;
          }
          
          .amount-box {
            border: 2px solid #000;
            border-radius: 20px;
            padding: 5px 20px;
            display: flex;
            align-items: center;
            width: 200px;
          }
          
          .rs-symbol {
            background: #334155;
            color: #fff;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            margin-right: 15px;
          }
          
          .amount-value {
            font-size: 24px;
            font-weight: bold;
          }
          
          .amount-duplicate {
            font-family: 'Caveat', cursive;
            font-size: 24px;
            margin-left: 20px;
          }
          
          .cheque-note {
            font-size: 12px;
            margin-top: 15px;
          }
          
          .signature-box {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-right: 20px;
          }
          
          .signature-box-inner {
            width: 100px;
            height: 50px;
            border: 1px solid #000;
            margin: 10px 0;
          }
          
          @media print {
            body { padding: 0; margin: 0; display: block; }
            .receipt-box { width: 100%; height: auto; padding-bottom: 120px; border: none; }
            .logo-text, .title-col h1, .amount-value { color: #000; }
            .rs-symbol { background-color: #334155 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header-row">
            <div class="logo-col">
              <img src="${logoSrc}" alt="Logo" style="max-width: 120px; max-height: 80px; object-fit: contain;" />
            </div>
            <div class="title-col">
              <h1>Shiv Computers</h1>
              <p>209, Ajay Arcade, Jawahar Road,</p>
              <p>Surendranagar, Mo. 94269 75796</p>
            </div>
            <div class="meta-col">
              <div class="meta-row top">
                <span class="meta-label">No. :</span>
                <span style="font-family: 'Caveat', cursive; font-size: 20px;">${receiptNo}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Date :</span>
                <span style="font-family: 'Caveat', cursive; font-size: 20px;">${date}</span>
              </div>
            </div>
          </div>
          
          <div class="receipt-title">RECEIPT</div>
          
          <div class="body-content">
            <div class="field-line flex">
              <span class="label">Received From</span>
              <span class="value-underline flex-1">${studentName}</span>
            </div>
            <div class="field-line flex">
              <span class="label">by Cash / Chq. / Online</span>
              <span class="value-underline flex-1">${mode}</span>
            </div>
            <div class="field-line">
              <span class="label">Full / Part</span>
              <span class="value-underline short">${fullOrPart}</span>
              <span class="label" style="margin-left: 20px;">Payment of Course Name :</span>
              <span class="value-underline inline-wrap">${courseName}</span>
            </div>
            <div class="field-line flex">
              <span class="label">Rs. in words :</span>
              <span class="value-underline flex-1">${amountWords}</span>
            </div>
          </div>
          
          <div class="footer-section">
            <div>
              <div class="amount-box-container">
                <div class="amount-box">
                  <div class="rs-symbol">₹</div>
                  <div class="amount-value">${paidAmount}/-</div>
                </div>
                
              </div>
              <div class="cheque-note">Receipt Subject to realization of the cheque</div>
            </div>
            
            <div class="signature-box">
              <div style="font-weight: bold; font-size: 14px;">For, Shiv Computers</div>
              <div class="signature-box-inner"></div>
              <div style="font-weight: bold; font-size: 14px;">Sign.</div>
            </div>
          </div>
          
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              setTimeout(() => { window.close(); }, 100);
            }, 500);
          }
        </script>
      </body>
    </html>
  `;
};
