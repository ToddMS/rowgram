import { put } from '@vercel/blob'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const optimized = await sharp(buffer)
      .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer()

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const base64 = `data:image/webp;base64,${optimized.toString('base64')}`
      return Response.json({ success: true, logoUrl: base64 })
    }

    const filename = `club-logos/${uuidv4()}.webp`
    const blob = await put(filename, optimized, {
      access: 'public',
      contentType: 'image/webp',
    })

    return Response.json({ success: true, logoUrl: blob.url })
  } catch (error) {
    console.error('Logo upload error:', error)
    return Response.json(
      { error: 'Failed to upload logo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
