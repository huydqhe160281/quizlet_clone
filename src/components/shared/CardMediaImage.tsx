import Image from 'next/image';

type CardMediaImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export function CardMediaImage({ src, alt, className }: CardMediaImageProps) {
  return (
    <div
      className={
        className ?? 'relative mx-auto mt-3 h-40 w-full max-w-xs overflow-hidden rounded-lg'
      }
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        sizes="(max-width: 640px) 100vw, 320px"
      />
    </div>
  );
}
