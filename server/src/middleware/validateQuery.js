import { z } from 'zod'

const SORT_FIELDS = new Set([
  'Name',
  '_ts',
  'FileExtension',
  'CreatedAt',
  'UpdatedAt',
  'OwnerAddress',
])

const numericString = (min, max, fallback) =>
  z
    .preprocess((v) => (v === undefined || v === '' ? fallback : Number(v)), z.number().int().min(min).max(max))

const sortFieldSchema = z
  .string()
  .optional()
  .refine((v) => v === undefined || SORT_FIELDS.has(v), {
    message: 'Unsupported sort field',
  })

const pathSchema = z
  .string()
  .min(1)
  .max(1024)
  .refine((v) => /^[A-Za-z0-9_\-./%() ]+$/.test(v), { message: 'Path contains invalid characters' })

export const listQuery = z
  .object({
    path: pathSchema,
    pageNumber: numericString(1, 10000, 1),
    pageSize: numericString(1, 100, 10),
    search: z.string().max(200).optional(),
    'sort[0][field]': sortFieldSchema,
    'sort[0][order]': z.enum(['asc', 'desc']).optional(),
  })
  .passthrough()

export const pathOnlyQuery = z.object({ path: pathSchema }).passthrough()

const md5Base64 = z.string().regex(/^[A-Za-z0-9+/]{22}==$/, 'Checksum must be base64-encoded MD5 (16 bytes)')

export const uploadBody = z.object({
  Name: z.string().min(1).max(255),
  FileExtension: z.string().min(1).max(32),
  Checksum: md5Base64,
  Description: z.string().max(2000).optional().default(''),
})

export const batchUploadBody = z.object({
  Files: z.array(uploadBody).min(1).max(50),
})

export const folderCreateBody = z.object({
  Name: z.string().min(1).max(255),
  Path: z.string().min(1).max(1024),
  FolderType: z.enum(['collection', 'directory']),
})

export const metadataPatchBody = z
  .object({
    NewDirectoryItemName: z.string().min(1).max(255).optional(),
    Description: z.string().max(2000).optional(),
  })
  .refine((v) => v.NewDirectoryItemName !== undefined || v.Description !== undefined, {
    message: 'At least one of NewDirectoryItemName or Description must be provided',
  })

export const restoreBody = z.object({
  DirectoryItemID: z.string().min(1),
  ArchivedID: z.string().min(1),
})

export function validateQuery(schema, source = 'query') {
  return (req, _res, next) => {
    const data = source === 'body' ? req.body : req.query
    const result = schema.safeParse(data)
    if (!result.success) {
      const err = new Error(result.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '))
      err.status = 400
      return next(err)
    }
    if (source === 'body') req.body = result.data
    else req.query = result.data
    next()
  }
}
