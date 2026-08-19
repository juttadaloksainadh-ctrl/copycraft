/**
 * CopyCraft Dynamic Pricing Calculation Engine
 * Formula:
 * Paper Cost + Printing Cost + Colour Charges + Binding Charges + Lamination + Cover Charges + Delivery Charges - Coupon - Referral Reward + Convenience Fee (2.6%) = Final Price
 */

export const PRICING_DEFAULTS = {
  paperBase: {
    A4: 1.0,
    Letter: 1.0,
    Legal: 1.5,
    A3: 2.5
  },
  printMode: {
    bw: 1.50, // ₹1.50 per paper side / sheet
    color: 6.00 // ₹6.00 per paper side / sheet
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
  gstRate: 0.0,
  convenienceFeeRate: 0.026 // 2.6% convenience fee
};

/**
 * Dynamically update local pricing rates matrix from backend admin settings.
 */
export function updateLocalPricingDefaults(newRates) {
  if (!newRates) return;
  if (newRates.printMode) Object.assign(PRICING_DEFAULTS.printMode, newRates.printMode);
  if (newRates.paperBase) Object.assign(PRICING_DEFAULTS.paperBase, newRates.paperBase);
  if (newRates.binding) Object.assign(PRICING_DEFAULTS.binding, newRates.binding);
  if (newRates.lamination) Object.assign(PRICING_DEFAULTS.lamination, newRates.lamination);
  if (newRates.coverSheet) Object.assign(PRICING_DEFAULTS.coverSheet, newRates.coverSheet);
  if (newRates.convenienceFeeRate !== undefined) PRICING_DEFAULTS.convenienceFeeRate = Number(newRates.convenienceFeeRate);
}

export function calculateOrderPrice(options) {
  const {
    pageCount = 1,
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

  // Single side = 1 sheet per page. Both sides (double) = 2 pages printed per 1 physical paper sheet (half the pages rounded up).
  const sheetCount = sideMode === 'double' ? Math.ceil(pageCount / 2) : pageCount;

  const sizeMultiplier = PRICING_DEFAULTS.paperBase[paperSize] || 1.0;
  const pagePrintRate = PRICING_DEFAULTS.printMode[printMode] || (printMode === 'color' ? 6.00 : 1.50);

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

  // Coupon Discount calculation
  let couponDiscount = 0;
  if (couponCode) {
    const codeUpper = couponCode.toUpperCase();
    if (codeUpper === 'WELCOME10') {
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

  // Convenience Fee: 2.6% of the net amount (after discounts)
  const convenienceFee = Math.round(netBeforeTax * (PRICING_DEFAULTS.convenienceFeeRate || 0.026) * 100) / 100;

  // Final Total = Net Amount + Convenience Fee
  const finalPrice = Math.round((netBeforeTax + convenienceFee) * 100) / 100;

  return {
    pageCount,
    sheetCount,
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

