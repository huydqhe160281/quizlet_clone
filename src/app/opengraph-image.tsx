import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/seo/site-config';

// Statically rendered at build time. Copy is Vietnamese (the default locale); Inter is
// bundled because the built-in Satori font has no Vietnamese diacritics.
export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const asset = (rel: string) => readFile(path.join(process.cwd(), rel));

const FEATURES = ['Tạo bộ thẻ nhanh', 'Lặp lại ngắt quãng', '5 chế độ học'];

export default async function OpengraphImage() {
  const [interMedium, interExtraBold, iconSvg] = await Promise.all([
    asset('src/assets/fonts/Inter-Medium.ttf'),
    asset('src/assets/fonts/Inter-ExtraBold.ttf'),
    asset('src/app/icon.svg'),
  ]);
  const iconSrc = `data:image/svg+xml;base64,${iconSvg.toString('base64')}`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        padding: '72px 80px',
        fontFamily: 'Inter',
        color: '#fff',
        backgroundColor: '#5B2BEE',
        backgroundImage:
          'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.22), transparent 45%), linear-gradient(135deg, #7C5CFF 0%, #5B2BEE 55%, #4318C9 100%)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img
            src={iconSrc}
            width={72}
            height={72}
            alt=""
            style={{ borderRadius: 18, boxShadow: '0 0 0 3px rgba(255,255,255,0.35)' }}
          />
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{siteConfig.name}</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 56,
            fontSize: 80,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -2.5,
          }}
        >
          <span>Nhớ lâu hơn.</span>
          <span>Ôn thi nhẹ hơn.</span>
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Học flashcard & luyện thi trắc nghiệm miễn phí.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
          {FEATURES.map((feature) => (
            <div
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 48,
                padding: '0 22px',
                borderRadius: 999,
                fontSize: 22,
                fontWeight: 500,
                backgroundColor: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.28)',
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>

      {/* Flashcard stack illustration */}
      <div
        style={{
          position: 'absolute',
          right: 92,
          top: 118,
          width: 320,
          height: 400,
          display: 'flex',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -12,
            left: 40,
            width: 320,
            height: 400,
            borderRadius: 36,
            backgroundColor: 'rgba(255,255,255,0.3)',
            transform: 'rotate(10deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 320,
            height: 400,
            display: 'flex',
            flexDirection: 'column',
            padding: 36,
            borderRadius: 36,
            backgroundColor: '#fff',
            color: '#18181B',
            transform: 'rotate(-4deg)',
            boxShadow: '0 30px 60px rgba(30, 10, 90, 0.35)',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 500, color: '#71717A' }}>Thuật ngữ</div>
          <div style={{ marginTop: 8, fontSize: 52, fontWeight: 800, letterSpacing: -1.5 }}>
            Kiên trì
          </div>
          <div style={{ marginTop: 22, height: 2, width: '100%', backgroundColor: '#E4E4E7' }} />
          <div style={{ marginTop: 22, fontSize: 20, fontWeight: 500, color: '#71717A' }}>
            Định nghĩa
          </div>
          <div style={{ marginTop: 8, fontSize: 30, fontWeight: 500 }}>Perseverance</div>
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              alignSelf: 'flex-start',
              padding: '10px 18px',
              borderRadius: 999,
              backgroundColor: '#EDE9FE',
              color: '#5B2BEE',
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                stroke="#5B2BEE"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Đã nhớ
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interMedium, weight: 500, style: 'normal' },
        { name: 'Inter', data: interExtraBold, weight: 800, style: 'normal' },
      ],
    }
  );
}
