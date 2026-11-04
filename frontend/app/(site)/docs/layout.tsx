import './docs.css';
import DocsNav from '../../../components/DocsNav';

export default function DocumentationLayout({children}:{children:React.ReactNode}) {
  return <div className="docs-layout"><DocsNav/><div className="docs-content">{children}</div></div>;
}
