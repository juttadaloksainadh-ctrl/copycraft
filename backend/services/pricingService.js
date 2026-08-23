import { db } from '../models/dbStore.js';

/**
 * CopyCraft Dynamic Pricing Calculation Engine
 * Formula:
 * Paper Cost + Printing Cost + Colour Charges + Binding Charges + Lamination + Cover Charges + Delivery Charges + GST - Coupon - Referral Reward = Final Price
 */

export const PRICING_DEFAULTS = {
  paperBase: {
    A4: 1.0,
    Letter: 1.0,
    Legal: 1.5,
    A3: 2.5
  },
  printMode: {
    bw: 1.50, // ₹1.50 per page side
    color: 6.00 // ₹6.00 per page side
  },
  sideMode: {
    single: 1.0,
    double: 0.85 // 15% discount on paper when duplex printing
  },
  binding: {
    none: 0,
    staple: 5,
    spiral: 35,
    softcover: 65,
    hardcover: 130
  },
  lamination: {
    none: 0,
    front: 15,
    both: 25,
    full: 45
  },
  coverSheet: {
    none: 0,
    transparent: 12,
    cardboard: 18
  },
  deliveryBaseFee: 0,
  freeDeliveryThreshold: 0,
  gstRate: 0.0
};

export function getPricingRates() {
  return PRICING_DEFAULTS;
}

export function applyPricingDefaults(customRates) {
  if (!customRates) return PRICING_DEFAULTS;
  if (customRates.printMode) Object.assign(PRICING_DEFAULTS.printMode, customRates.printMode);
  if (customRates.paperBase) Object.assign(PRICING_DEFAULTS.paperBase, customRates.paperBase);
  if (customRates.sideMode) Object.assign(PRICING_DEFAULTS.sideMode, customRates.sideMode);
  if (customRates.binding) Object.assign(PRICING_DEFAULTS.binding, customRates.binding);
  if (customRates.lamination) Object.assign(PRICING_DEFAULTS.lamination, customRates.lamination);
  if (customRates.coverSheet) Object.assign(PRICING_DEFAULTS.coverSheet, customRates.coverSheet);
  if (customRates.convenienceFeeRate !== undefined) {
    PRICING_DEFAULTS.convenienceFeeRate = Number(customRates.convenienceFeeRate);
  }
  return PRICING_DEFAULTS;
}

export function calculateOrderPrice(options) {
  const {
    pageCount = 0,
    quantity = 1,
    paperSize = 'A4',
    printMode = 'bw', // 'bw' | 'color'
    sideMode = 'double', // 'single' | 'double'
    binding = 'none',
    lamination = 'none',
    coverSheet = 'none',
    couponCode = null,
    referralDiscount = 0,
    collegeId = null
  } = options;

  // If no pages are uploaded / requested, total is strictly 0
  if (!pageCount || pageCount <= 0) {
    return {
      pageCount: 0,
      quantity,
      paperSize,
      printMode,
      sideMode,
      binding,
      lamination,
      coverSheet,
      breakdown: {
        printCost: 0,
        addonCost: 0,
        subtotal: 0,
        deliveryFee: 0,
        couponDiscount: 0,
        referralDiscount: 0,
        taxableAmount: 0,
        gstAmount: 0,
        convenienceFee: 0,
        finalPrice: 0
      }
    };
  }

  // Single side = 1 sheet per page. Both sides (double) = 2 pages printed per 1 physical paper sheet (half the pages rounded up).
  const sheetCount = sideMode === 'double' ? Math.ceil(pageCount / 2) : pageCount;

  const sizeMultiplier = PRICING_DEFAULTS.paperBase[paperSize] || 1.0;
  const pagePrintRate = PRICING_DEFAULTS.printMode[printMode] !== undefined
    ? PRICING_DEFAULTS.printMode[printMode]
    : (printMode === 'color' ? 6.00 : 1.50);

  // Total raw print & paper cost per document
  const rawPrintPerDoc = sheetCount * pagePrintRate * sizeMultiplier;
  const totalPrintCost = Math.round(rawPrintPerDoc * quantity * 100) / 100;

  // Addons per document
  const bindingCostPerDoc = PRICING_DEFAULTS.binding[binding] || 0;
  const laminationCostPerDoc = PRICING_DEFAULTS.lamination[lamination] || 0;
  const coverCostPerDoc = PRICING_DEFAULTS.coverSheet[coverSheet] || 0;

  const totalAddonCost = (bindingCostPerDoc + laminationCostPerDoc + coverCostPerDoc) * quantity;

  const subtotalBeforeDelivery = totalPrintCost + totalAddonCost;

  // Delivery fee calculation (No delivery charge)
  const deliveryFee = 0;

  // Coupon Discount calculation - dynamically check against db.coupons + built-in fallback
  let couponDiscount = 0;
  if (couponCode) {
    const codeUpper = couponCode.toUpperCase();
    const matchedDbCoupon = db.coupons?.find(c => c.code === codeUpper && c.active);
    
    if (matchedDbCoupon) {
      if (subtotalBeforeDelivery >= (matchedDbCoupon.minOrderValue || 0)) {
        const rawDiscount = (subtotalBeforeDelivery * matchedDbCoupon.discountPercentage) / 100;
        couponDiscount = Math.min(matchedDbCoupon.maxDiscount || Infinity, Math.round(rawDiscount));
      }
    } else if (codeUpper === 'WELCOME10') {
      couponDiscount = Math.round(subtotalBeforeDelivery * 0.10);
    } else if (codeUpper === 'EXAM50') {
      couponDiscount = Math.min(50, subtotalBeforeDelivery * 0.20);
    } else if (codeUpper === 'FREEDEL') {
      couponDiscount = 0;
    } else if (codeUpper === 'STUDENT20') {
      couponDiscount = Math.round(subtotalBeforeDelivery * 0.20);
    }
  }

  const netBeforeTax = Math.max(0, subtotalBeforeDelivery - couponDiscount - referralDiscount);

  // GST Calculation (No GST)
  const gstAmount = 0;

  // Convenience Fee: 2.6% of the net amount (or admin configured rate)
  const feeRate = PRICING_DEFAULTS.convenienceFeeRate !== undefined ? PRICING_DEFAULTS.convenienceFeeRate : 0.026;
  const convenienceFee = Math.round(netBeforeTax * feeRate * 100) / 100;

  // Final Total = Net Amount + Convenience Fee
  const finalPrice = Math.round((netBeforeTax + convenienceFee) * 100) / 100;

  return {
    pageCount,
    quantity,
    paperSize,
    printMode,
    sideMode,
    binding,
    lamination,
    coverSheet,
    breakdown: {
      printCost: totalPrintCost,
      addonCost: totalAddonCost,
      subtotal: subtotalBeforeDelivery,
      deliveryFee,
      couponDiscount,
      referralDiscount,
      taxableAmount: netBeforeTax,
      gstAmount,
      convenienceFee,
      finalPrice
    }
  };
}
