/* ============================================================
   QUOTE ENGINE — pricing calculator driven entirely by config
   ============================================================
   This file is service-agnostic. It does not know what "home
   cleaning" or "roof" is. It only knows how to apply pricing
   rules that you define in config.json.

   Pricing rule types supported:
     - "flat":    one fixed price if the service is selected
     - "per_unit": price = rate * quantity  (e.g., $0.25/sqft)
     - "tiered":  price based on which range a number falls into
     - "matrix":  price based on combining 2+ dropdown + a size range
                  (this replaces the giant if/else chain in the
                  original script — see README for how it works)
   ============================================================ */

export class QuoteEngine {
  constructor(config) {
    this.config = config;
  }

  /**
   * Calculate a quote given user selections.
   * @param {Object} selections - { serviceId: { selected: bool, inputs: {...} } }
   * @returns {Object} { lineItems, subtotal, discountPct, discountAmount, total }
   */
  calculate(selections) {
    const lineItems = [];
    let subtotal = 0;
    let selectedCount = 0;

    for (const service of this.config.services) {
      const sel = selections[service.id];
      if (!sel || !sel.selected) continue;
      selectedCount++;

      const price = this._priceForService(service, sel.inputs || {});
      if (price > 0) {
        lineItems.push({
          id: service.id,
          label: service.label,
          price: price
        });
        subtotal += price;
      }
    }

    // Discounts based on number of services selected
    const discountPct = this._discountFor(selectedCount);
    const discountAmount = subtotal * discountPct;
    const total = subtotal - discountAmount;

    return {
      lineItems,
      subtotal,
      selectedCount,
      discountPct,
      discountAmount,
      total
    };
  }

  _discountFor(count) {
    const rules = this.config.discounts || [];
    // rules are like [{ minServices: 2, pct: 0.05 }, ...]
    // find the highest matching rule
    let best = 0;
    for (const rule of rules) {
      if (count >= rule.minServices && rule.pct > best) {
        best = rule.pct;
      }
    }
    return best;
  }

  _priceForService(service, inputs) {
    switch (service.pricing.type) {
      case 'flat':
        return service.pricing.amount;

      case 'per_unit':
        return this._perUnit(service.pricing, inputs);

      case 'tiered':
        return this._tiered(service.pricing, inputs);

      case 'matrix':
        return this._matrix(service.pricing, inputs);

      default:
        console.warn(`Unknown pricing type: ${service.pricing.type}`);
        return 0;
    }
  }

  _perUnit(pricing, inputs) {
    // pricing: { type, inputField, rate,
    //            multipliers: [{field, values: {val: mult}}],
    //            extras: [{field, rate}] }
    const qty = parseFloat(inputs[pricing.inputField]) || 0;
    if (qty <= 0) return 0;

    let price = qty * pricing.rate;

    // Optional: multiply by a dropdown value (e.g., fence sides: 1x or 2x)
    if (pricing.multipliers) {
      for (const m of pricing.multipliers) {
        const val = inputs[m.field];
        if (val != null && m.values[val] != null) {
          price *= m.values[val];
        }
      }
    }

    // Optional: add extras (e.g., deck railing at $2.50/linear ft)
    if (pricing.extras) {
      for (const ex of pricing.extras) {
        const n = parseFloat(inputs[ex.field]) || 0;
        price += n * ex.rate;
      }
    }

    return price;
  }

  _tiered(pricing, inputs) {
    // pricing: { type, inputField, tiers: [{max, price}, ...] }
    const qty = parseFloat(inputs[pricing.inputField]) || 0;
    if (qty <= 0) return 0;

    for (const tier of pricing.tiers) {
      if (qty <= tier.max) return tier.price;
    }
    // Above the highest tier: use the last tier's price (or return 0)
    return pricing.tiers[pricing.tiers.length - 1]?.price || 0;
  }

  _matrix(pricing, inputs) {
    /* MATRIX pricing — the clean replacement for the nightmare
       if/else chain in the original code.

       Instead of 26 branches that combine (floors × material × size),
       you define the matrix as a lookup table:

         pricing: {
           type: 'matrix',
           dimensions: [
             { field: 'floors', values: ['1','2','3'] },
             { field: 'material', values: ['vinyl','stucco','wood'] },
             { field: 'size', type: 'range',
               ranges: [{max:1000,key:'s'},{max:2000,key:'m'},...] }
           ],
           prices: {
             '1|vinyl|s': 150,
             '2|vinyl|s': 175,
             ...
           }
         }

       We build the lookup key from the user's inputs, then look
       up the price. If nothing matches, fallback is 0.
    */
    const keyParts = [];
    for (const dim of pricing.dimensions) {
      const raw = inputs[dim.field];
      if (dim.type === 'range') {
        const n = parseFloat(raw) || 0;
        let found = null;
        for (const r of dim.ranges) {
          if (n <= r.max) { found = r.key; break; }
        }
        if (!found) {
          if (pricing.clampToLastRange === false) return 0;
          found = dim.ranges[dim.ranges.length - 1].key;
        }
        keyParts.push(found);
      } else {
        // Apply alias if the config groups several values together
        // (e.g., vinyl/concrete/aluminum all priced the same)
        const alias = (pricing.aliases && pricing.aliases[raw]) || raw;
        keyParts.push(alias);
      }
    }
    const key = keyParts.join('|');
    return pricing.prices[key] || 0;
  }
}
