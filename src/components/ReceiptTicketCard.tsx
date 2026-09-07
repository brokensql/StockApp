import React from 'react';
import { SaleTransaction } from '../types';
import { getPHTParts } from '../utils/philippineDate';
import { CheckCircleIcon, ConfettiExplosion } from './ui/ticket-confirmation-card';

interface ReceiptTicketCardProps {
  transaction: SaleTransaction;
  cashTendered?: number | string;
  changeAmount?: number;
  hideThankYou?: boolean;
  maxItems?: number;
}

export const ReceiptTicketCard: React.FC<ReceiptTicketCardProps> = ({
  transaction,
  cashTendered,
  changeAmount,
  hideThankYou = false,
  maxItems,
}) => {
  const [showConfetti, setShowConfetti] = React.useState(false);

  React.useEffect(() => {
    if (!hideThankYou) {
      const mountTimer = setTimeout(() => setShowConfetti(true), 100);
      const unmountTimer = setTimeout(() => setShowConfetti(false), 6000);
      return () => {
        clearTimeout(mountTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, [hideThankYou]);

  // Format currency strictly in Philippine Peso
  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date & time matching reference design (e.g., "22 Aug, 2025 | 13:29") in Philippine Time
  const formatReceiptDateTime = (timestamp?: number | string) => {
    const d = timestamp ? new Date(timestamp) : new Date();
    const valid = isNaN(d.getTime()) ? new Date() : d;
    const parts = getPHTParts(valid);
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthStr = months[parts.month - 1];
    const dayStr = String(parts.day).padStart(2, '0');
    const hourStr = String(parts.hour).padStart(2, '0');
    const minStr = String(parts.minute).padStart(2, '0');
    return `${dayStr} ${monthStr}, ${parts.year} | ${hourStr}:${minStr}`;
  };

  // Realistic numeric barcode derived from transaction
  const barcodeNumber = React.useMemo(() => {
    const numPart = transaction.transactionNumber.replace(/\D/g, '').padEnd(6, '0');
    const epochPart = String(transaction.createdAt || Date.now()).slice(-9);
    return `400600${numPart.slice(0, 6)}${epochPart}`;
  }, [transaction]);

  const parsedCash = typeof cashTendered === 'string' ? parseFloat(cashTendered) || 0 : (cashTendered || 0);
  const actualChange = changeAmount !== undefined ? changeAmount : Math.max(0, parsedCash - transaction.total);

  return (
    <>
      {showConfetti && <ConfettiExplosion />}
      <div
        className={
          hideThankYou
            ? 'w-full relative overflow-visible [clip-path:polygon(-100%_0px,200%_0px,200%_9999px,-100%_9999px)]'
            : 'w-full relative'
        }
      >
        <div
          id="receipt-ticket-card"
          className={`w-full relative flex flex-col ${
            hideThankYou
              ? 'min-h-[340px] drop-shadow-[0_12px_14px_rgba(37,40,37,0.09)]'
              : 'drop-shadow-[0_12px_28px_rgba(0,0,0,0.07)]'
          }`}
        >
        {/* Top Section: If hideThankYou is true, cut directly on the horizontal broken line so the semi-circle notches become quarter-circles */}
        {hideThankYou ? (
          <div className="flex items-stretch h-[18px] w-full select-none relative z-10 -mb-[1px]">
            {/* Left Quarter-Circle Notch: Exactly the lower quarter of the semi-circle cutout */}
            <svg
              width="16"
              height="18"
              viewBox="0 0 16 18"
              className="flex-shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M 16,0 A 16 16 0 0 1 0,16 L 0,18 L 16,18 Z"
                fill="#FFFFFF"
              />
            </svg>

            {/* Middle Broken / Dashed Cut Line along the top edge */}
            <div className="flex-1 bg-white border-t-2 border-dashed border-[#D5D9DE]" />

            {/* Right Quarter-Circle Notch: Exactly the lower quarter of the semi-circle cutout */}
            <svg
              width="16"
              height="18"
              viewBox="0 0 16 18"
              className="flex-shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M 0,0 A 16 16 0 0 0 16,16 L 16,18 L 0,18 Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
        ) : (
          <>
            {/* Top Header Section */}
            <div className="bg-white rounded-t-[28px] pt-8 px-6 pb-2 text-center">
              {/* Success Checkmark Icon */}
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center animate-in zoom-in-50 delay-300 duration-500 shadow-xs">
                <CheckCircleIcon className="w-10 h-10 text-emerald-600 animate-in zoom-in-75 delay-500 duration-500" />
              </div>

              {/* Heading */}
              <h2 className="text-[23px] font-bold text-[#1C1E21] tracking-tight">
                Thank you
              </h2>
              <p className="text-[13.5px] text-[#6E746F] mt-1 max-w-[260px] mx-auto leading-relaxed">
                Your payment has been processed successfully.
              </p>
            </div>

          {/* Perforated Divider with TRUE TRANSPARENT HOLES */}
          <div className="flex items-stretch h-8 select-none relative z-10">
            {/* Left Notch: 100% transparent cutout hole, seamlessly revealing the background */}
            <svg
              width="16"
              height="32"
              viewBox="0 0 16 32"
              className="flex-shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* White shape with concave semicircle arc carved out */}
              <path
                d="M 0,0 A 16 16 0 0 1 0,32 L 16,32 L 16,0 Z"
                fill="#FFFFFF"
              />
            </svg>

            {/* Middle Dashed Divider */}
            <div className="flex-1 bg-white flex items-center justify-center">
              <div className="w-full border-b-2 border-dashed border-[#D5D9DE]" />
            </div>

            {/* Right Notch: 100% transparent cutout hole, seamlessly revealing the background */}
            <svg
              width="16"
              height="32"
              viewBox="0 0 16 32"
              className="flex-shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* White shape with concave semicircle arc carved out */}
              <path
                d="M 16,0 A 16 16 0 0 0 16,32 L 0,32 L 0,0 Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
        </>
      )}

      {/* Bottom Section */}
      <div
        className={`bg-white px-5 sm:px-6 ${
          hideThankYou
            ? 'flex-1 flex flex-col justify-between pt-3 pb-2.5 space-y-2'
            : 'pt-4 pb-4 space-y-4'
        }`}
      >
        {/* Receipt ID & Amount Row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="block text-[11px] font-medium text-[#7A807B]">
              Receipt ID
            </span>
            <span className="text-[14px] font-bold text-[#252825] font-mono tracking-tight">
              {transaction.transactionNumber}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[11px] font-medium text-[#7A807B]">
              Amount
            </span>
            <span className="text-[15.5px] font-bold text-[#252825] tabular-nums">
              {formatCurrency(transaction.total)}
            </span>
          </div>
        </div>

        {/* Date & Time Row */}
        <div>
          <span className="block text-[11px] font-medium text-[#7A807B]">
            Date & time
          </span>
          <span className="text-[13px] font-bold text-[#252825] tabular-nums">
            {formatReceiptDateTime(transaction.createdAt || transaction.timestamp)}
          </span>
        </div>

        {/* Bought Products List */}
        <div className={hideThankYou ? 'pt-0.5' : 'pt-2'}>
          <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F2F4]">
            <span className="text-[11px] font-medium text-[#7A807B]">
              Bought products ({transaction.itemCount} {transaction.itemCount === 1 ? 'item' : 'items'})
            </span>
            <span className="text-[11px] font-medium text-[#7A807B]">
              Total
            </span>
          </div>

          <div className={`divide-y divide-[#F0F2F4] ${hideThankYou ? 'max-h-40 my-0.5' : 'max-h-52 my-1'} overflow-y-auto pr-1`}>
            {(maxItems && transaction.items.length > maxItems
              ? transaction.items.slice(0, maxItems)
              : transaction.items
            ).map((item, idx) => (
              <div key={idx} className={`${hideThankYou ? 'py-1.5' : 'py-2.5'} flex items-center justify-between text-[13px]`}>
                <div className="min-w-0 pr-3 flex-1">
                  <p className="font-semibold text-[#252825] truncate leading-snug">{item.name}</p>
                  <p className="text-[11.5px] text-[#6E746F] mt-0.5 tabular-nums">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <span className="font-bold text-[#252825] tabular-nums flex-shrink-0">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </span>
              </div>
            ))}

            {/* 3rd section: 3 dots indicating continuation if items exceed maxItems */}
            {maxItems && transaction.items.length > maxItems && (
              <div className="py-1 flex items-center justify-center select-none" aria-label="More items">
                <span className="text-[14px] font-black tracking-[0.35em] text-[#9EA39F] pl-1 leading-none">
                  •••
                </span>
              </div>
            )}
          </div>

          {/* Subtotal, Cash Received & Change Due Summary */}
          <div className={`${hideThankYou ? 'pt-1.5 space-y-1' : 'pt-3 space-y-1.5'} border-t border-[#EEF0F2] text-[12.5px]`}>
            <div className="flex justify-between text-[#6E746F]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#252825] tabular-nums">
                {formatCurrency(transaction.subtotal)}
              </span>
            </div>
            {parsedCash > 0 && (
              <>
                <div className="flex justify-between text-[#6E746F]">
                  <span>Cash received</span>
                  <span className="font-semibold text-[#252825] tabular-nums">
                    {formatCurrency(parsedCash)}
                  </span>
                </div>
                <div className="flex justify-between text-[#252825] font-semibold pt-1 border-t border-[#F0F2F4]">
                  <span>Change due</span>
                  <span className="font-bold text-[#252825] tabular-nums text-[13.5px]">
                    {formatCurrency(actualChange)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Horizontal Broken Line */}
        <div className={hideThankYou ? 'pt-0.5' : 'pt-2'}>
          <div className="w-full border-b-2 border-dashed border-[#D5D9DE]" />
        </div>

        {/* Barcode Section */}
        <div className={`flex flex-col items-center justify-center ${hideThankYou ? 'pt-1 pb-1' : 'pt-2 pb-2'}`}>
          <svg
            className={`w-56 sm:w-60 ${hideThankYou ? 'h-8 sm:h-9' : 'h-12'}`}
            viewBox="0 0 240 46"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="2" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="7" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="10" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="17" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="21" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="25" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="31" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="38" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="43" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="47" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="53" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="58" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="64" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="68" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="75" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="79" y="0" width="5" height="46" fill="#1C1E21" />
            <rect x="87" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="91" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="96" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="100" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="107" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="111" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="116" y="0" width="5" height="46" fill="#1C1E21" />
            <rect x="124" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="128" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="135" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="139" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="145" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="150" y="0" width="5" height="46" fill="#1C1E21" />
            <rect x="158" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="162" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="169" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="174" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="179" y="0" width="5" height="46" fill="#1C1E21" />
            <rect x="187" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="191" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="195" y="0" width="4" height="46" fill="#1C1E21" />
            <rect x="202" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="207" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="213" y="0" width="5" height="46" fill="#1C1E21" />
            <rect x="221" y="0" width="1" height="46" fill="#1C1E21" />
            <rect x="225" y="0" width="3" height="46" fill="#1C1E21" />
            <rect x="231" y="0" width="2" height="46" fill="#1C1E21" />
            <rect x="236" y="0" width="3" height="46" fill="#1C1E21" />
          </svg>
          <span className="text-[10px] tracking-[0.2em] font-mono text-[#252825] font-semibold mt-1">
            {barcodeNumber}
          </span>
        </div>
      </div>

      {/* Exactly 6 Semi-Circle Holes along the bottom edge with 100% transparent cutout background */}
      <div className="flex items-stretch h-[18px] w-full select-none -mt-[1px]">
        {/* Far left corner segment */}
        <div className="flex-1 bg-white rounded-bl-[24px]" />

        {Array.from({ length: 6 }).map((_, idx) => (
          <React.Fragment key={idx}>
            {/* Transparent Semi-Circle Hole Cutout SVG (Radius 16px, Diameter 32px) */}
            <svg
              width="32"
              height="18"
              viewBox="0 0 32 18"
              className="flex-shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* White shape that carves out an authentic empty transparent semi-circle hole */}
              <path
                d="M 0,0 L 32,0 L 32,18 A 16 16 0 0 0 0,18 L 0,0 Z"
                fill="#FFFFFF"
              />
            </svg>
            {/* White segment between holes */}
            <div
              className={`flex-1 bg-white ${
                idx === 5 ? 'rounded-br-[24px]' : ''
              }`}
            />
          </React.Fragment>
        ))}
        </div>
      </div>
    </div>
    </>
  );
};
