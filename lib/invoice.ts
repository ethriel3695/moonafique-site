import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateInvoicePdf({ session, lineItems }: any) {
  const doc = new PDFDocument();
  const stream = new PassThrough();
  doc.pipe(stream);

  doc.fontSize(20).text('Moonafique Invoice', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Order ID: ${session.id}`);
  doc.text(`Email: ${session.customer_details.email}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineItems.data.forEach((item: any) => {
    doc.text(
      `${item.description} x${item.quantity} - $${(item.amount_total / 100).toFixed(2)}`
    );
  });

  doc.end();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
