import './SkeletonGrid.css'

type Variant = 'crew' | 'club' | 'gallery' | 'generate'

function S({ w, h, r, style }: { w?: string | number; h?: number; r?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton-block"
      style={{ width: w ?? '100%', height: h ?? 14, borderRadius: r ?? 6, flexShrink: 0, ...style }}
    />
  )
}

// Crew card: name + badge | club | race row | category row | members dropdown | 3 buttons
function CrewCardSkeleton() {
  return (
    <div className="skeleton-crew-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <S h={20} w="58%" />
          <S h={13} w="38%" />
        </div>
        <S w={34} h={22} r={20} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <S w={38} h={12} />
          <S w="52%" h={13} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <S w={56} h={12} />
          <S w="38%" h={13} />
        </div>
      </div>

      {/* members dropdown */}
      <S h={36} r={8} style={{ marginTop: 4 }} />

      {/* action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <S w={58} h={32} r={8} />
        <S w={82} h={32} r={8} />
        <S w={68} h={32} r={8} />
      </div>
    </div>
  )
}

// Club card: logo square | name | PRIMARY/SECONDARY labels | swatches | hex codes | Edit/Delete
function ClubCardSkeleton() {
  return (
    <div className="skeleton-club-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <S w={52} h={52} r={8} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <S h={15} w="70%" />
          <S h={13} w="50%" />
        </div>
      </div>

      {/* PRIMARY / SECONDARY section */}
      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <S h={10} w={52} />
          <S h={44} r={8} />
          <S h={22} r={6} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <S h={10} w={64} />
          <S h={44} r={8} />
          <S h={22} r={6} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4, justifyContent: 'center' }}>
        <S w={60} h={32} r={8} />
        <S w={72} h={32} r={8} />
      </div>
    </div>
  )
}

// Gallery card: square image | title + badge | subtitle | date | buttons
function GalleryCardSkeleton() {
  return (
    <div className="skeleton-gallery-card">
      <div className="skeleton-block" style={{ width: '100%', aspectRatio: '1/1', borderRadius: 0 }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <S h={20} w="55%" />
          <S w={26} h={18} r={4} style={{ flexShrink: 0 }} />
        </div>
        <S h={13} w="78%" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <S w={88} h={32} r={8} />
          <S w={64} h={32} r={8} />
        </div>
      </div>
    </div>
  )
}

// Generate card: badge top-right | name | race | club
function GenerateCardSkeleton() {
  return (
    <div className="skeleton-generate-card" style={{ position: 'relative', padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <S w={30} h={20} r={4} />
      </div>
      <S h={16} w="55%" />
      <S h={12} w="80%" />
      <S h={12} w="62%" />
    </div>
  )
}

const CARD_MAP: Record<Variant, () => JSX.Element> = {
  crew:     CrewCardSkeleton,
  club:     ClubCardSkeleton,
  gallery:  GalleryCardSkeleton,
  generate: GenerateCardSkeleton,
}

const COUNT_MAP: Record<Variant, number> = {
  crew:     8,
  club:     6,
  gallery:  6,
  generate: 5,
}

interface SkeletonGridProps {
  variant: Variant
  count?: number
  className?: string
}

const GRID_CLASS_MAP: Record<Variant, string> = {
  crew:     'data-grid',
  club:     'data-grid clubs-grid',
  gallery:  'data-grid gallery-grid',
  generate: 'data-grid',
}

export function SkeletonGrid({ variant, count, className = '' }: SkeletonGridProps) {
  const Card = CARD_MAP[variant]
  const n = count ?? COUNT_MAP[variant]

  return (
    <div className={`${GRID_CLASS_MAP[variant]} ${className}`}>
      {Array.from({ length: n }).map((_, i) => <Card key={i} />)}
    </div>
  )
}
