/**
 * Comprehensive 120+ vibrant, high-aesthetic color palette for store products.
 * Includes the exact coral, sky blue, purple, mint, royal blue, and golden amber
 * from the design reference, followed by carefully spaced, high-contrast hues.
 */
export const PRODUCT_PALETTE: string[] = [
  '#FF6B72', // 0: Coral / Salmon Pink (Reference)
  '#52B6F6', // 1: Sky Blue (Reference)
  '#9465FF', // 2: Purple / Violet (Reference)
  '#36E289', // 3: Mint / Neon Green (Reference)
  '#5377FE', // 4: Royal Blue (Reference)
  '#F6BA3D', // 5: Warm Golden Yellow (Reference)
  '#20C997', // 6: Vibrant Teal
  '#FD7E14', // 7: Tangerine Orange
  '#E83E8C', // 8: Hot Pink
  '#00C9A7', // 9: Jade Green
  '#845EC2', // 10: Deep Orchid
  '#D65DB1', // 11: Magenta
  '#FF6F91', // 12: Rose Pink
  '#FF9671', // 13: Peach Coral
  '#FFC75F', // 14: Sunflower Yellow
  '#2C73D2', // 15: Ocean Blue
  '#0089BA', // 16: Cerulean
  '#008E9B', // 17: Deep Cyan
  '#008170', // 18: Pine Teal
  '#C34A36', // 19: Rust Coral
  '#059669', // 20: Emerald Green
  '#7C3AED', // 21: Electric Violet
  '#DB2777', // 22: Crimson Rose
  '#EA580C', // 23: Deep Amber
  '#2563EB', // 24: Cobalt Blue
  '#0D9488', // 25: Dark Cyan
  '#65A30D', // 26: Fresh Lime
  '#CA8A04', // 27: Antique Gold
  '#9333EA', // 28: Purple Orchid
  '#E11D48', // 29: Ruby Red
  '#0284C7', // 30: Sky Azure
  '#16A34A', // 31: Leaf Green
  '#C026D3', // 32: Bright Fuchsia
  '#D97706', // 33: Rich Ochre
  '#4F46E5', // 34: Indigo
  '#06B6D4', // 35: Electric Cyan
  '#10B981', // 36: Spring Mint
  '#F43F5E', // 37: Strawberry
  '#8B5CF6', // 38: Lavender Blue
  '#F59E0B', // 39: Marigold
  '#EC4899', // 40: Bubblegum Pink
  '#3B82F6', // 41: Crisp Blue
  '#14B8A6', // 42: Caribbean Teal
  '#84CC16', // 43: Chartreuse
  '#EAB308', // 44: Canary Yellow
  '#A855F7', // 45: Bright Amethyst
  '#FB7185', // 46: Salmon Rose
  '#60A5FA', // 47: Periwinkle Blue
  '#34D399', // 48: Mint Frost
  '#FBBF24', // 49: Sun Amber
  '#F472B6', // 50: Flaming Pink
  '#818CF8', // 51: Soft Iris
  '#2DD4BF', // 52: Turquoise
  '#A3E635', // 53: Lime Twist
  '#FDE047', // 54: Lemon
  '#C084FC', // 55: Lilac
  '#FDA4AF', // 56: Blushing Coral
  '#93C5FD', // 57: Ice Blue
  '#6EE7B7', // 58: Seafoam
  '#FCD34D', // 59: Topaz Yellow
  '#F9A8D4', // 60: Petal Pink
  '#A5B4FC', // 61: Light Indigo
  '#5EEAD4', // 62: Aqua Marine
  '#BEF264', // 63: Electric Apple
  '#FEF08A', // 64: Pastel Gold
  '#DDD6FE', // 65: Pale Purple
  '#FECDD3', // 66: Pale Coral
  '#BAE6FD', // 67: Sky Tint
  '#A7F3D0', // 68: Pale Mint
  '#FF5722', // 69: Deep Orange
  '#4CAF50', // 70: Forest Mint
  '#2196F3', // 71: Dodged Blue
  '#9C27B0', // 72: Purple Grape
  '#FF9800', // 73: Citrus Orange
  '#00BCD4', // 74: Cyan Wave
  '#8BC34A', // 75: Meadow Green
  '#E91E63', // 76: Berry Pink
  '#3F51B5', // 77: Classic Indigo
  '#009688', // 78: Deep Teal
  '#FFC107', // 79: Bright Gold
  '#673AB7', // 80: Midnight Purple
  '#03A9F4', // 81: Light Sky
  '#CDDC39', // 82: Spring Lime
  '#FF7043', // 83: Terra Cotta
  '#26A69A', // 84: Persian Green
  '#42A5F5', // 85: Summer Sky
  '#AB47BC', // 86: Medium Orchid
  '#FFA726', // 87: Orange Blossom
  '#26C6DA', // 88: Turquoise Surf
  '#9CCC65', // 89: Light Olive
  '#EC407A', // 90: Cerise
  '#5C6BC0', // 91: Wild Blue
  '#80CBC4', // 92: Celadon
  '#FFE082', // 93: Sandy Gold
  '#7E57C2', // 94: Deep Lavender
  '#29B6F6', // 95: Blue Jean
  '#C0CA33', // 96: Pear
  '#FF8A65', // 97: Coral Reef
  '#4DB6AC', // 98: Sea Mist
  '#64B5F6', // 99: Cornflower
  '#BA68C8', // 100: Lilac Purple
  '#FFB74D', // 101: Cantaloupe
  '#4DD0E1', // 102: Robins Egg
  '#AED581', // 103: Pistachio
  '#F06292', // 104: Carnation
  '#7986CB', // 105: Vista Blue
  '#B2DFDB', // 106: Frozen Mint
  '#FFD54F', // 107: Yellow Daisy
  '#9575CD', // 108: Wisteria
  '#4FC3F7', // 109: Maldivian Blue
  '#DCE775', // 110: Key Lime
  '#FF7A59', // 111: Vibrant Coral
  '#30BF8F', // 112: Emerald Mint
  '#4986FF', // 113: Brilliant Royal
  '#B44AFF', // 114: Vivid Violet
  '#FF9F1C', // 115: Bright Amber
  '#2EC4B6', // 116: Light Sea Green
  '#E71D36', // 117: Bright Rose
  '#011627', // 118: Navy Accent
  '#4361EE', // 119: Ultramarine
  '#3A0CA3', // 120: Persian Indigo
];

/**
 * Returns a consistent, unique color for any product based on its index
 * in the inventory catalog or by deterministic string hashing.
 * 
 * Ensures that even with 100+ products added, each product has its own
 * distinctive, harmonious color that persists before and after sales are added.
 */
export function getProductColor(
  productIdentifier: string,
  allProducts?: { id?: string; name: string }[]
): string {
  if (!productIdentifier) return PRODUCT_PALETTE[0];

  // 1. If catalog list is provided, map based on catalog index
  if (allProducts && allProducts.length > 0) {
    const cleanId = productIdentifier.toLowerCase().trim();
    const idx = allProducts.findIndex(
      (p) =>
        (p.id && p.id.toLowerCase().trim() === cleanId) ||
        p.name.toLowerCase().trim() === cleanId
    );
    if (idx !== -1) {
      if (idx < PRODUCT_PALETTE.length) {
        return PRODUCT_PALETTE[idx];
      }
      // Beyond curated palette, mathematically step via golden ratio
      const goldenHue = Math.round((idx * 137.508) % 360);
      return `hsl(${goldenHue}, 82%, 56%)`;
    }
  }

  // 2. Deterministic string hash fallback
  let hash = 0;
  for (let i = 0; i < productIdentifier.length; i++) {
    hash = (hash << 5) - hash + productIdentifier.charCodeAt(i);
    hash |= 0;
  }
  const positiveIndex = Math.abs(hash);
  return PRODUCT_PALETTE[positiveIndex % PRODUCT_PALETTE.length];
}
