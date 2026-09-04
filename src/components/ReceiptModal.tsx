import React from 'react';
import { CollectionRequest, PaymentRecord } from '../types';
import { CheckCircle2, Download, Printer, X, ShieldCheck, Truck, Sparkles } from 'lucide-react';

interface ReceiptModalProps {
  collection: CollectionRequest;
  payment?: PaymentRecord;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ collection, payment, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const receiptNo = payment?.receiptNumber || `REC-2026-${collection.id.slice(-5)}`;
  const dateFormatted = new Date(payment?.transactionDate || collection.timestamps.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-white text-lg">
              ♻️
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight">CLEANCollect</h3>
              <p className="text-xs text-emerald-200 uppercase tracking-widest font-semibold">Official Waste Collection Receipt</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-emerald-100 border-t border-emerald-700/50 pt-3">
            <span>Receipt #{receiptNo}</span>
            <span>{dateFormatted}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700">
          {/* Status banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900">Payment Verified & Settled</p>
              <p className="text-xs text-emerald-700">
                Via {payment?.provider || collection.paymentMethod?.toUpperCase() || 'MTN Mobile Money'} · Ref: {payment?.reference || collection.paymentReference || 'N/A'}
              </p>
            </div>
          </div>

          {/* Customer & Location */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block font-medium uppercase tracking-wider">Billed To</span>
              <p className="font-bold text-slate-900 mt-0.5">{collection.customerName}</p>
              <p className="text-slate-600">{collection.customerPhone}</p>
              <p className="text-slate-500">{collection.customerEmail}</p>
            </div>
            <div>
              <span className="text-slate-400 block font-medium uppercase tracking-wider">Pickup Location</span>
              <p className="font-bold text-slate-900 mt-0.5">{collection.location.area}</p>
              <p className="text-slate-600">{collection.location.address}</p>
              {collection.location.landmark && <p className="text-slate-500">Ref: {collection.location.landmark}</p>}
            </div>
          </div>

          {/* Itemized breakdown */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/70 px-4 py-2.5 text-xs font-bold text-slate-700 flex justify-between uppercase tracking-wider">
              <span>Service Details</span>
              <span>Amount (GH₵)</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="px-4 py-2.5 flex justify-between">
                <div>
                  <span className="font-semibold text-slate-800">
                    {collection.wasteType.toUpperCase()} Waste Collection
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Volume: {collection.quantity} {collection.quantityUnit} (~{collection.completedWeightKg || collection.estimatedWeightKg} kg)
                  </p>
                </div>
                <span className="font-medium text-slate-800">
                  GH₵ {collection.pricing.volumeFee.toFixed(2)}
                </span>
              </div>
              <div className="px-4 py-2 flex justify-between text-slate-600">
                <span>Standard Dispatch & Base Callout</span>
                <span>GH₵ {collection.pricing.baseFee.toFixed(2)}</span>
              </div>
              <div className="px-4 py-2 flex justify-between text-slate-600">
                <span>Distance Logistics Fee</span>
                <span>GH₵ {collection.pricing.distanceFee.toFixed(2)}</span>
              </div>
              {collection.pricing.urgencySurcharge > 0 && (
                <div className="px-4 py-2 flex justify-between text-amber-700 font-medium">
                  <span>Express Emergency Surcharge</span>
                  <span>GH₵ {collection.pricing.urgencySurcharge.toFixed(2)}</span>
                </div>
              )}
              <div className="px-4 py-2 flex justify-between text-slate-500">
                <span>VAT & Municipal Environmental Levies (5%)</span>
                <span>GH₵ {collection.pricing.tax.toFixed(2)}</span>
              </div>
              <div className="px-4 py-3 bg-slate-50 flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-200">
                <span>Total Amount Paid</span>
                <span className="text-emerald-700 text-base font-extrabold">
                  GH₵ {collection.pricing.totalGHS.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Driver details if assigned */}
          {collection.assignedDriverName && (
            <div className="flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
              <Truck className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold">Serviced by: {collection.assignedDriverName} ({collection.assignedDriverPhone})</p>
                <p className="text-blue-700">Truck Plate: {collection.assignedTruckPlate || 'GT-4821-22'}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>EPA Certified Waste Handling & Traceable Digital Manifest</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
