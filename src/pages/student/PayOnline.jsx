import { useState } from 'react';
import { post, get, download } from '../../api/client.js';
import { Badge, Button, Modal, fmtMoney, fmtDate, useAction } from '../../components/ui.jsx';

const S = '/api/student';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error('The payment window could not be loaded. Check your internet connection and try again.'));
    document.body.appendChild(s);
  });
}

/**
 * Pay fees online. Choose the dues, then pay: in test mode a pretend bank window appears (no money moves); otherwise Razorpay's own window opens.
 * Either way the same server steps run afterwards: verify the signed result, issue the normal receipt.
 */
export default function PayOnline({ fees, onClose, onPaid }) {
  const dues = fees.charges.filter((c) => c.outstanding > 0);
  const [picked, setPicked] = useState(() => new Set(dues.map((c) => c.id)));
  const [order, setOrder] = useState(null);
  const [step, setStep] = useState({ kind: 'choose' }); // choose | test | wait | paid | failed | review
  const [run, busy] = useAction();
  const total = dues.filter((c) => picked.has(c.id)).reduce((n, c) => n + c.outstanding, 0);
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const finish = (o) => {
    if (o.status === 'paid') { setStep({ kind: 'paid', o }); onPaid(); }
    else if (o.status === 'needs_review') setStep({ kind: 'review', o });
    else setStep({ kind: 'failed', reason: o.failureReason || 'The payment was not completed.' });
  };
  /** The browser's signed result: send it to the server, which checks the signature before believing it. */
  const confirm = async (r) => {
    setStep({ kind: 'wait', text: 'Confirming your payment…' });
    try { finish(await post(`${S}/fees/pay/verify`, { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature })); }
    catch (e) { setStep({ kind: 'failed', reason: e.message }); }
  };
  /** The gateway told the server by itself: wait for that to show up. */
  const waitForServer = async (id) => {
    setStep({ kind: 'wait', text: 'Waiting for the bank to confirm…' });
    for (let i = 0; i < 20; i++) {
      await sleep(700);
      const o = await get(`${S}/fees/orders/${id}`);
      if (o.status !== 'created' && o.status !== 'processing') return finish(o);
    }
    setStep({ kind: 'failed', reason: 'We have not heard back from the bank yet. If money was deducted, it will show here within a few minutes.' });
  };

  const start = async () => {
    const o = await run(() => post(`${S}/fees/pay`, { chargeIds: [...picked] }));
    if (!o) return;
    setOrder(o);
    if (o.provider === 'mock') return setStep({ kind: 'test' });
    try {
      const Razorpay = await loadRazorpay();
      const rz = new Razorpay({
        key: o.keyId, amount: o.amountPaise, currency: o.currency, name: o.schoolName || 'School fees', description: 'School fees', order_id: o.providerOrderId,
        prefill: { name: o.studentName }, handler: confirm, modal: { ondismiss: () => setStep((s) => (s.kind === 'wait' ? s : { kind: 'choose' })) },
      });
      rz.on('payment.failed', (r) => setStep({ kind: 'failed', reason: r?.error?.description || 'The payment failed.' }));
      rz.open();
    } catch (e) { setStep({ kind: 'failed', reason: e.message }); }
  };

  const testPay = async (outcome) => {
    const r = await run(() => post(`${S}/fees/orders/${order.orderId}/test-pay`, { outcome }));
    if (!r) return;
    if (r.failed) return setStep({ kind: 'failed', reason: r.reason });
    if (r.delivered) return waitForServer(order.orderId);
    return confirm(r);
  };

  const k = step.kind;
  const footer = k === 'choose' ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!picked.size || total <= 0 || total > fees.online.maxAmount} onClick={start}>Pay {fmtMoney(total)}</Button></>
    : k === 'paid' ? <><Button onClick={() => run(() => download(`${S}/fees/receipts/${step.o.paymentId}.pdf`, `receipt-${step.o.receiptNo}.pdf`))}>Download receipt</Button><Button variant="primary" onClick={onClose}>Done</Button></>
    : k === 'failed' ? <><Button onClick={onClose}>Close</Button><Button variant="primary" onClick={() => { setStep({ kind: 'choose' }); setOrder(null); }}>Try again</Button></>
    : k === 'review' ? <Button variant="primary" onClick={onClose}>Close</Button> : null;

  return (
    <Modal title="Pay fees online" onClose={onClose} footer={footer}>
      {fees.online.testMode && <div className="alert" role="note"><b>Test mode.</b> No real money is charged. This is a practice run of the payment steps.</div>}
      {k === 'choose' && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="muted small">Choose what to pay now. The amount comes from your school's records.</p>
          {dues.map((c) => (
            <label key={c.id} className="row between" style={{ gap: 12, cursor: 'pointer' }}>
              <span className="row" style={{ gap: 8 }}><input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Pay ${c.label}`} /> {c.label} {c.overdue && <Badge tone="red">Overdue</Badge>}</span>
              <b>{fmtMoney(c.outstanding)}</b>
            </label>
          ))}
          <div className="row between" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}><b>Total</b><b>{fmtMoney(total)}</b></div>
          {total > fees.online.maxAmount && <div className="alert">Online payments are limited to {fmtMoney(fees.online.maxAmount)} at a time. Choose fewer dues.</div>}
        </div>
      )}
      {k === 'test' && order && (
        <div className="stack" style={{ gap: 10 }} aria-label="Test payment window">
          <div className="muted small">Pretend bank window for order <code>{order.providerOrderId}</code></div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{fmtMoney(order.amount)}</div>
          <p className="small">Choose what the bank does:</p>
          <Button variant="primary" loading={busy} onClick={() => testPay('success')}>Pay successfully</Button>
          <Button loading={busy} onClick={() => testPay('failure')}>Payment fails (card declined)</Button>
          <Button loading={busy} onClick={() => testPay('webhook_only')}>Pay, then the browser closes (only the bank's message arrives)</Button>
        </div>
      )}
      {k === 'wait' && <p role="status" aria-live="polite">{step.text}</p>}
      {k === 'paid' && <div className="stack" style={{ gap: 6 }}><div className="alert ok"><b>Payment received.</b> {fmtMoney(step.o.amount)} on {fmtDate(step.o.paidAt, true)}.</div><p>Your receipt number is <b>{step.o.receiptNo}</b>. It is also in your payment history.</p></div>}
      {k === 'failed' && <div className="alert" role="alert"><b>The payment did not go through.</b> {step.reason} No money was taken for this attempt.</div>}
      {k === 'review' && <div className="alert" role="alert"><b>We received your payment, but it needs a check.</b> The school office will match it to your account and contact you. You do not need to pay again.</div>}
    </Modal>
  );
}
