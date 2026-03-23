import { describe, expect, it } from 'vitest'
import { buildYoudaoSignInput } from '../../../src/modules/translation/youdaoClient'

describe('buildYoudaoSignInput', () => {
  it('returns original text when query length is less than or equal to 20', () => {
    expect(buildYoudaoSignInput('short text')).toBe('short text')
  })

  it('truncates long text according to youdao v3 signing rules', () => {
    const query = 'abcdefghijklmnopqrstuvwxyz'
    expect(buildYoudaoSignInput(query)).toBe('abcdefghij26qrstuvwxyz')
  })
})