import MarketingHeader from '../../components/MarketingHeader';
import MarketingFooter from '../../components/MarketingFooter';
import LandingBackground from '../../components/LandingBackground';
import './marketing.css';
export default function SiteLayout({children}:{children:React.ReactNode}){return <div className="marketing-site"><LandingBackground/><a className="skip-link" href="#site-content">Skip to main content</a><MarketingHeader/><main id="site-content">{children}</main><MarketingFooter/></div>}
