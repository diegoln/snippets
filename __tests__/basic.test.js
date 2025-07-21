/**
 * Basic Test Suite
 * 
 * Simple tests to verify Jest setup is working correctly.
 */

describe('Basic Test Suite', () => {
  test('should run basic tests', () => {
    expect(true).toBe(true)
  })

  test('should handle numbers', () => {
    expect(2 + 2).toBe(4)
  })

  test('should handle strings', () => {
    expect('hello world').toContain('world')
  })

  test('should handle arrays', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
  })

  test('should handle objects', () => {
    const obj = { name: 'test', value: 42 }
    expect(obj).toHaveProperty('name')
    expect(obj.value).toBe(42)
  })
})