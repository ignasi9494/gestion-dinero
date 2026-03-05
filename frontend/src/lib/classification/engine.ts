export interface ClassificationRule {
  id: string
  pattern: string
  matchType: 'exact' | 'starts_with' | 'contains' | 'regex'
  categoryId: string
  priority: number
}

export interface ClassificationResult {
  categoryId: string
  ruleId: string
}

/**
 * Classify a single transaction concept against an ordered list of rules.
 * Rules should be pre-sorted by priority DESC (highest priority first).
 * Returns the first matching rule's category, or null if no match.
 */
export function classifyTransaction(
  concept: string,
  rules: ClassificationRule[]
): ClassificationResult | null {
  const normalized = concept.toUpperCase().trim()

  for (const rule of rules) {
    const pattern = rule.pattern.toUpperCase()
    let match = false

    switch (rule.matchType) {
      case 'exact':
        match = normalized === pattern
        break
      case 'starts_with':
        match = normalized.startsWith(pattern)
        break
      case 'contains':
        match = normalized.includes(pattern)
        break
      case 'regex':
        try {
          match = new RegExp(pattern, 'i').test(normalized)
        } catch {
          match = false
        }
        break
    }

    if (match) {
      return { categoryId: rule.categoryId, ruleId: rule.id }
    }
  }

  return null
}

/**
 * Sort rules by priority descending so the highest-priority rule matches first.
 */
export function sortRulesByPriority(rules: ClassificationRule[]): ClassificationRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority)
}

/**
 * Convert database classification_rules rows into the engine format.
 */
export function mapDatabaseRules(
  dbRules: Array<{
    id: string
    pattern: string
    match_type: 'exact' | 'starts_with' | 'contains' | 'regex'
    category_id: string
    priority: number
  }>
): ClassificationRule[] {
  return dbRules.map((r) => ({
    id: r.id,
    pattern: r.pattern,
    matchType: r.match_type,
    categoryId: r.category_id,
    priority: r.priority,
  }))
}
