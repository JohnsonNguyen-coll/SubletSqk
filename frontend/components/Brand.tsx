export default function Brand({hero = false}: {hero?: boolean}) {
  return <img src="/brand/veilhub-mark.svg" width={96} height={96} alt="VeilHub hamster key" className={hero?'brand-art':'brand-mark'}/>;
}
