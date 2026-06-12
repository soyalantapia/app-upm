import { describe, expect, it } from 'vitest'
import { COUNTRY_CODES, DOC_TYPES, RELEVANCES, TOPICS } from '../../src/types.js'
import { countryCode, docType, relevance, topic } from '../../src/db/schema.js'

// Guard de sincronía: schema.ts tiene los enums INLINE (limitación de
// drizzle-kit CJS) — este test falla si divergen del contrato en types.ts.
describe('enums schema ↔ types en sincronía', () => {
  it('country_code', () => expect(countryCode.enumValues).toEqual([...COUNTRY_CODES]))
  it('topic', () => expect(topic.enumValues).toEqual([...TOPICS]))
  it('doc_type', () => expect(docType.enumValues).toEqual([...DOC_TYPES]))
  it('relevance', () => expect(relevance.enumValues).toEqual([...RELEVANCES]))
})
