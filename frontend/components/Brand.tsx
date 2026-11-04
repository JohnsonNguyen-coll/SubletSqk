export default function Brand({hero = false}: {hero?: boolean}) {
  return <img src="/brand/subletsqk-mark.svg" width={96} height={96} alt="SubletSqk hamster key" className={hero?'brand-art':'brand-mark'}/>;
}
