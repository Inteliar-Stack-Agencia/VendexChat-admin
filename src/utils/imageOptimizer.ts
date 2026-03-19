/**
 * Client-side image optimization: resize + convert to WebP before upload.
 * This reduces file sizes by 30-70% compared to raw PNG/JPEG uploads.
 */

const MAX_DIMENSION = 1200
const THUMBNAIL_MAX = 800
const QUALITY = 0.82

type ImagePreset = 'product' | 'logo' | 'banner' | 'slider'

const PRESETS: Record<ImagePreset, { maxWidth: number; maxHeight: number; quality: number }> = {
  product: { maxWidth: THUMBNAIL_MAX, maxHeight: THUMBNAIL_MAX, quality: QUALITY },
  logo: { maxWidth: 512, maxHeight: 512, quality: 0.9 },
  banner: { maxWidth: 1400, maxHeight: 500, quality: QUALITY },
  slider: { maxWidth: 1920, maxHeight: 800, quality: QUALITY },
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export async function optimizeImage(
  file: File,
  preset: ImagePreset = 'product'
): Promise<File> {
  // Skip if already WebP and small enough
  if (file.type === 'image/webp' && file.size < 200_000) {
    return file
  }

  // SVGs and GIFs should not be converted
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  const { maxWidth, maxHeight, quality } = PRESETS[preset]
  const img = await loadImage(file)

  let { width, height } = img

  // Scale down if exceeds max dimensions
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  URL.revokeObjectURL(img.src)

  // Try WebP first, fallback to JPEG
  const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg'
  const ext = supportsWebP ? 'webp' : 'jpg'

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to convert image'))),
      mimeType,
      quality
    )
  })

  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.${ext}`, { type: mimeType })
}

export async function optimizeImageFromUrl(
  imageUrl: string,
  preset: ImagePreset = 'product'
): Promise<Blob> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error('Failed to download image')
  const blob = await res.blob()
  const file = new File([blob], 'external.jpg', { type: blob.type })
  const optimized = await optimizeImage(file, preset)
  return optimized
}
