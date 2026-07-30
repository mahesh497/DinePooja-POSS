import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatINR } from "@/lib/tax";
import { BillTools } from "@/components/bill-tools";
import { orderSourceLabel, orderTypeLabel } from "@/lib/order-types";
import { can } from "@/lib/permissions";

export default async function BillPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await requirePermission("pos");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId },
    include: {
      items: { where: { voided: false } },
      payments: true,
      table: true,
      outlet: true,
    },
  });
  if (!order) notFound();

  const notes = await prisma.auditLog.findMany({
    where: {
      outletId: session.user.outletId,
      entity: "Order",
      entityId: order.id,
      action: { in: ["CREDIT_NOTE", "DEBIT_NOTE", "VOID_ORDER", "REFUND_ORDER"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const billNo = `${order.outlet.billPrefix}-${order.orderNumber}`;
  const taxTotal = order.cgstAmount + order.sgstAmount;
  const taxable =
    Math.max(0, order.subtotal - order.discountAmount) +
    order.packingCharge +
    order.deliveryCharge +
    order.serviceCharge +
    order.containerCharge;
  const upiPayload = `upi://pay?pa=spicegarden@upi&pn=${encodeURIComponent(order.outlet.name)}&am=${order.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(billNo)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiPayload)}`;
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(billNo)}&scale=2&height=10&includetext`;

  return (
    <div className="space-y-4">
      <BillTools
        orderId={order.id}
        status={order.status}
        canVoid={can(session.user.role, "void")}
      />

      <div className="print-bill mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-white p-6 font-mono text-sm">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Tax Invoice / GST Invoice</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {order.outlet.name}
          </p>
          {order.outlet.address ? <p>{order.outlet.address}</p> : null}
          {order.outlet.phone ? <p>{order.outlet.phone}</p> : null}
          {order.outlet.gstin ? <p>GSTIN: {order.outlet.gstin}</p> : null}
        </div>
        <hr className="my-3 border-dashed" />
        <p>Invoice: {billNo}</p>
        <p>Order: {order.orderNumber}</p>
        <p>Status: {order.status}</p>
        <p>
          Type: {orderTypeLabel(order.type)}
          {order.onlinePlatform ? ` (${order.onlinePlatform})` : ""}
        </p>
        <p>Source: {orderSourceLabel(order.source)}</p>
        <p>
          {order.table
            ? `Table: ${order.table.name}`
            : order.customerName
              ? `Guest: ${order.customerName}`
              : orderTypeLabel(order.type)}
        </p>
        {order.customerPhone ? <p>Phone: {order.customerPhone}</p> : null}
        {order.customerAddress ? <p>Address: {order.customerAddress}</p> : null}
        {order.driverName ? <p>Driver: {order.driverName}</p> : null}
        <p>{new Date(order.createdAt).toLocaleString("en-IN")}</p>
        <hr className="my-3 border-dashed" />
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th>Item</th>
              <th className="text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1 align-top">
                  {item.quantity}× {item.name}
                  {item.variantName ? ` (${item.variantName})` : ""}
                  {item.addonNames ? (
                    <div className="text-xs text-gray-600">+ {item.addonNames}</div>
                  ) : null}
                </td>
                <td className="py-1 text-right align-top">{formatINR(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="my-3 border-dashed" />
        <div className="space-y-1">
          <Line label="Subtotal" value={formatINR(order.subtotal)} />
          <Line label="Discount" value={`- ${formatINR(order.discountAmount)}`} />
          {order.serviceCharge > 0 ? (
            <Line label="Service charge" value={formatINR(order.serviceCharge)} />
          ) : null}
          {order.packingCharge > 0 ? (
            <Line label="Packing" value={formatINR(order.packingCharge)} />
          ) : null}
          {order.deliveryCharge > 0 ? (
            <Line label="Delivery" value={formatINR(order.deliveryCharge)} />
          ) : null}
          {order.containerCharge > 0 ? (
            <Line label="Container" value={formatINR(order.containerCharge)} />
          ) : null}
          <Line label="Taxable value" value={formatINR(taxable)} />
          <Line label={`CGST @ ${order.outlet.cgstPercent}%`} value={formatINR(order.cgstAmount)} />
          <Line label={`SGST @ ${order.outlet.sgstPercent}%`} value={formatINR(order.sgstAmount)} />
          <Line label="Tax summary" value={formatINR(taxTotal)} />
          {order.roundOff !== 0 ? (
            <Line label="Round off" value={formatINR(order.roundOff)} />
          ) : null}
          <Line label="Grand total" value={formatINR(order.total)} bold />
          <Line label="Paid" value={formatINR(order.paidAmount)} />
        </div>
        {order.payments.length ? (
          <>
            <hr className="my-3 border-dashed" />
            <p className="font-semibold">Payments</p>
            {order.payments.map((p) => (
              <Line
                key={p.id}
                label={`${p.method}${p.reference ? ` (${p.reference})` : ""}`}
                value={formatINR(p.amount)}
              />
            ))}
          </>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="UPI QR" width={140} height={140} className="rounded-lg border" />
          <div className="flex-1 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={barcodeUrl} alt={`Barcode ${billNo}`} className="mx-auto max-w-full" />
            <p className="mt-1 text-[10px]">{billNo}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-dashed pt-4">
          <p className="text-xs text-gray-500">Customer signature</p>
          <div className="mt-2 h-16 border-b border-gray-400" />
          <p className="mt-1 text-[10px] text-gray-500">I acknowledge receipt of goods/services</p>
        </div>

        <p className="mt-4 text-center">Thank you! Visit again.</p>
      </div>

      {notes.length ? (
        <div className="no-print mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-white p-4 text-sm">
          <p className="font-semibold">Billing notes</p>
          <ul className="mt-2 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-[var(--chip)] px-3 py-2">
                <p className="text-xs font-semibold uppercase">{n.action.replaceAll("_", " ")}</p>
                <p className="text-xs text-[var(--muted)]">{n.details}</p>
                <p className="text-[10px] text-[var(--muted)]">
                  {new Date(n.createdAt).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
