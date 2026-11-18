import { Header, Footer } from '@/components/site/Chrome';

export default function SiteLayout({ children }) {
  return (<><Header /><main>{children}</main><Footer /></>);
}
