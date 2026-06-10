import { describe, it, expect } from 'vitest'
import { cn, formatNumber, formatPercentage, formatTimestamp, formatDate, formatDateTime, generateId } from './utils'

// ---------------------------------------------------------------------------
// cn (className merger)
// ---------------------------------------------------------------------------

describe('cn', () => {
  it('merges multiple class names', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toBe('px-2 py-1')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('handles conditional classes via clsx', () => {
    const isHidden = false as boolean
    const result = cn('base', isHidden && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })

  it('returns empty string for no inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles undefined and null values gracefully', () => {
    const result = cn('a', undefined, null, 'b')
    expect(result).toBe('a b')
  })

  it('handles array inputs', () => {
    const result = cn(['px-2', 'py-1'])
    expect(result).toBe('px-2 py-1')
  })
})

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------

describe('formatNumber', () => {
  it('formats a number with default 2 decimals', () => {
    const result = formatNumber(1234.5)
    // es-ES uses comma as decimal separator
    expect(result).toContain('1234')
    expect(result).toContain('50')
  })

  it('formats with custom decimal places', () => {
    const result = formatNumber(3.14159, 3)
    expect(result).toContain('142')
  })

  it('formats zero', () => {
    const result = formatNumber(0)
    expect(result).toContain('0')
  })

  it('formats negative numbers', () => {
    const result = formatNumber(-42.1, 1)
    expect(result).toContain('42')
    expect(result).toContain('1')
  })

  it('pads decimals to minimum (e.g. 5 -> 5,00)', () => {
    const result = formatNumber(5)
    // es-ES: "5,00"
    expect(result).toMatch(/5[,.]00/)
  })
})

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------

describe('formatPercentage', () => {
  it('appends % to the formatted number', () => {
    const result = formatPercentage(75.5)
    expect(result).toContain('%')
    expect(result).toContain('75')
  })

  it('uses 1 decimal place', () => {
    const result = formatPercentage(33.3333)
    // Should round to 1 decimal -> 33.3 or 33,3
    expect(result).toMatch(/33[,.]3%/)
  })

  it('handles 0%', () => {
    const result = formatPercentage(0)
    expect(result).toContain('0')
    expect(result).toContain('%')
  })

  it('handles 100%', () => {
    const result = formatPercentage(100)
    expect(result).toContain('100')
    expect(result).toContain('%')
  })
})

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------

describe('formatTimestamp', () => {
  it('returns a time string with hours, minutes, seconds', () => {
    // 2026-01-15T10:30:45Z in UTC
    const ts = new Date('2026-01-15T10:30:45Z').getTime()
    const result = formatTimestamp(ts)

    // Should contain colon-separated time parts
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/)
  })

  it('formats midnight timestamp', () => {
    const ts = new Date('2026-01-01T00:00:00Z').getTime()
    const result = formatTimestamp(ts)

    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/)
  })
})

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  it('returns a date string in dd/mm/yyyy format (es-ES)', () => {
    const ts = new Date('2026-03-15T12:00:00Z').getTime()
    const result = formatDate(ts)

    // es-ES format: 15/03/2026
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(result).toContain('2026')
  })
})

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe('formatDateTime', () => {
  it('combines date and time with a space', () => {
    const ts = new Date('2026-06-20T14:30:00Z').getTime()
    const result = formatDateTime(ts)

    // Should contain both date and time parts
    expect(result).toContain('2026')
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
    // The space separator
    expect(result).toMatch(/\d{4}\s+\d{1,2}:\d{2}/)
  })
})

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('returns a non-empty string', () => {
    const id = generateId()
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns alphanumeric characters only', () => {
    const id = generateId()
    expect(id).toMatch(/^[a-z0-9]+$/)
  })

  it('returns a 9-character string', () => {
    // substring(2, 11) = 9 chars
    const id = generateId()
    expect(id).toHaveLength(9)
  })

  it('generates unique ids on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()))
    // With 36^9 possible values, collisions are extremely unlikely
    expect(ids.size).toBe(50)
  })
})
