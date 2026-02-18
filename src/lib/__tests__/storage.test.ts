import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock AWS SDK before importing storage
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn().mockResolvedValue({})
  class MockS3Client {
    send = mockSend
    constructor() {}
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: class PutObjectCommand { constructor(public input: any) {} },
    GetObjectCommand: class GetObjectCommand { constructor(public input: any) {} },
    DeleteObjectCommand: class DeleteObjectCommand { constructor(public input: any) {} },
  }
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com/test'),
}))

// Set env vars before importing storage
process.env.S3_ENDPOINT = 'https://s3.example.com'
process.env.S3_ACCESS_KEY = 'test-access-key'
process.env.S3_SECRET_KEY = 'test-secret-key'
process.env.S3_BUCKET_NAME = 'test-bucket'
process.env.S3_REGION = 'us-east-1'

describe('storage', () => {
  let storage: typeof import('../storage').storage

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../storage')
    storage = mod.storage
  })

  it('exports uploadFile method', () => {
    expect(typeof storage.uploadFile).toBe('function')
  })

  it('exports getDownloadUrl method', () => {
    expect(typeof storage.getDownloadUrl).toBe('function')
  })

  it('exports getPublicUrl method', () => {
    expect(typeof storage.getPublicUrl).toBe('function')
  })

  it('exports deleteFile method', () => {
    expect(typeof storage.deleteFile).toBe('function')
  })

  it('does not export getUploadUrl (removed)', () => {
    expect((storage as any).getUploadUrl).toBeUndefined()
  })

  it('does not export ensureBucket (removed)', () => {
    expect((storage as any).ensureBucket).toBeUndefined()
  })

  it('getPublicUrl returns correct URL format', () => {
    const url = storage.getPublicUrl('uploads/test-file.pdf')
    expect(url).toBe('https://s3.example.com/test-bucket/uploads/test-file.pdf')
  })
})
