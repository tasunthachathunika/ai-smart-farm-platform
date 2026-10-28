/**
 * Responsible AI Safety Pre-Filter, Output Scanner, and Prompt Injection Defense
 * Strictly implements Rule 5 of AGENTS.md:
 * - AI may only summarize and organize records and suggest questions for an officer.
 * - AI must NEVER recommend pesticide/fertilizer products or dosages.
 * - AI must NEVER definitively diagnose crop diseases or make autonomous agronomic decisions.
 * - Refuse unsafe requests BEFORE calling the LLM whenever possible.
 */

export interface PreFilterResult {
  isSafe: boolean;
  reason?: string;
  matchedCategory?: 'dosage' | 'pesticide_recommendation' | 'fertilizer_brand' | 'diagnosis';
}

export interface OutputSafetyResult {
  isSafe: boolean;
  violations: string[];
}

// Banned chemical products / brand names
const BANNED_CHEMICAL_NAMES = [
  'roundup',
  'gramoxone',
  'carbofuran',
  'glyphosate',
  'paraquat',
  'chlorpyrifos',
  'malathion',
  'diazinon',
  'mancozeb',
  'imidacloprid',
  'monocrotophos',
  'endosulfan',
  'atrazine',
  'ddt',
];

// Regex detecting dosage patterns: numeric quantity + measurement unit + rate/area
const DOSAGE_PATTERN_REGEX =
  /\b\d+(\.\d+)?\s*(ml|l|liter|litre|liters|litres|g|gram|grams|kg|kilogram|kilograms|oz|ppm|tablespoon|tablespoons|teaspoon|teaspoons|packet|packets)\s*(per|\/)\s*(ha|hectare|acre|sqm|m2|plant|tree|tank|l|liter|gallon|bucket)\b/i;

const DIRECT_APPLICATION_DOSAGE_REGEX =
  /\b(apply|spray|mix|dilute|use)\s+\d+(\.\d+)?\s*(ml|l|liters|litres|g|grams|kg|kilograms|tablespoons|teaspoons)\b/i;

// Regex detecting definitive diagnosis claims
const DEFINITIVE_DIAGNOSIS_REGEX =
  /\b(confirmed diagnosis of|this is definitely|this is certainly|definitively diagnosed as|is diagnosed with|the crop has (blast disease|bacterial blight|fusarium wilt|mosaic virus|leaf curl))\b/i;

// Regex detecting prompt injection attempts
const PROMPT_INJECTION_REGEX =
  /\b(ignore (all )?previous instructions|system prompt|disregard safety guidelines|override constraints|jailbreak|forget your rules|act as an unrestricted)\b/i;

/**
 * Pre-Filter Classifier
 * Evaluates user input BEFORE calling the LLM. Refuses dosage, pesticide recommendation,
 * and diagnosis requests upfront to save tokens and eliminate unsafe LLM generation.
 */
export function preFilterClassifier(input: string): PreFilterResult {
  if (!input || typeof input !== 'string') {
    return { isSafe: true };
  }

  const normalized = input.toLowerCase();

  // 1. Dosage requests
  const dosageRequestRegex =
    /\b(what (is the )?dosage|how much (to |should i )?(spray|apply|mix|use)|dosage rate|application rate|dilution ratio|rate per (ha|acre|hectare|tank)|how many (ml|grams|kg|liters))\b/i;
  if (dosageRequestRegex.test(normalized) || DOSAGE_PATTERN_REGEX.test(normalized)) {
    return {
      isSafe: false,
      reason:
        'Request refused: AI cannot provide chemical dosages, dilution rates, or application quantities. Please consult an Agricultural Extension Officer.',
      matchedCategory: 'dosage',
    };
  }

  // 2. Pesticide / chemical product recommendations
  const pesticideReqRegex =
    /\b(recommend (a |some )?(pesticide|fungicide|herbicide|weedicide|insecticide|chemical)|what (chemical|pesticide|fungicide|spray) (should i (buy|spray|apply)|to use|is best))\b/i;
  if (pesticideReqRegex.test(normalized)) {
    return {
      isSafe: false,
      reason:
        'Request refused: AI cannot recommend chemical pesticide, herbicide, or fungicide products. Please consult an Agricultural Extension Officer for IPM guidance.',
      matchedCategory: 'pesticide_recommendation',
    };
  }

  // Check specific banned chemical names in request
  for (const chemical of BANNED_CHEMICAL_NAMES) {
    if (new RegExp(`\\b${chemical}\\b`, 'i').test(normalized)) {
      const chemName = chemical.charAt(0).toUpperCase() + chemical.slice(1);
      return {
        isSafe: false,
        reason: `Request refused: Inquiries regarding specific chemical products (${chemName}) cannot be fulfilled autonomously by AI. Consult an Agricultural Extension Officer.`,
        matchedCategory: 'pesticide_recommendation',
      };
    }
  }

  // 3. Fertilizer brand / product purchase recommendations
  const fertilizerReqRegex =
    /\b(what (brand of )?fertilizer (should i buy|to purchase|is best)|recommend (a |some )?fertilizer product)\b/i;
  if (fertilizerReqRegex.test(normalized)) {
    return {
      isSafe: false,
      reason:
        'Request refused: AI cannot recommend specific commercial fertilizer products or brands. Please consult an Agricultural Extension Officer.',
      matchedCategory: 'fertilizer_brand',
    };
  }

  // 4. Definitive diagnosis requests
  const diagnosisReqRegex =
    /\b(diagnose (this|the) (disease|pest|problem) definitively|tell me (what disease|the exact disease)|is it definitely (blast|blight|wilt|mosaic))\b/i;
  if (diagnosisReqRegex.test(normalized)) {
    return {
      isSafe: false,
      reason:
        'Request refused: AI cannot make definitive crop disease diagnoses. An in-person inspection by an Agricultural Extension Officer is required.',
      matchedCategory: 'diagnosis',
    };
  }

  return { isSafe: true };
}

/**
 * Checks for prompt injection indicators in untrusted farmer inputs.
 */
export function detectPromptInjection(input: string): boolean {
  if (!input) return false;
  return PROMPT_INJECTION_REGEX.test(input);
}

/**
 * Output Safety Filter
 * Validates generated LLM text for safety breaches: dosage claims, product recommendations,
 * or definitive disease diagnoses.
 */
export function outputSafetyFilter(text: string): OutputSafetyResult {
  const violations: string[] = [];

  if (!text) {
    return { isSafe: true, violations };
  }

  // 1. Check for dosage patterns in output
  if (DOSAGE_PATTERN_REGEX.test(text) || DIRECT_APPLICATION_DOSAGE_REGEX.test(text)) {
    violations.push('Prohibited chemical dosage pattern detected in output.');
  }

  // 2. Check for banned chemical products
  for (const chemical of BANNED_CHEMICAL_NAMES) {
    if (new RegExp(`\\b${chemical}\\b`, 'i').test(text)) {
      violations.push(`Prohibited chemical product mentioned in output: ${chemical}`);
    }
  }

  // 3. Check for definitive disease diagnosis claims
  if (DEFINITIVE_DIAGNOSIS_REGEX.test(text)) {
    violations.push('Definitive disease diagnosis claim detected in output.');
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

/**
 * Recursively scans all string properties of an object using outputSafetyFilter.
 */
export function scanObjectSafety(obj: unknown): OutputSafetyResult {
  const violations: string[] = [];

  function walk(val: unknown) {
    if (typeof val === 'string') {
      const res = outputSafetyFilter(val);
      if (!res.isSafe) {
        violations.push(...res.violations);
      }
    } else if (Array.isArray(val)) {
      for (const item of val) walk(item);
    } else if (val !== null && typeof val === 'object') {
      for (const key of Object.keys(val)) {
        walk((val as Record<string, unknown>)[key]);
      }
    }
  }

  walk(obj);

  return {
    isSafe: violations.length === 0,
    violations,
  };
}
