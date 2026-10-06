import '@/lib/i18n/charge-en';
import Guides, { metaIndex } from '@/components/site/pages/Guides';

export const metadata = metaIndex('en');

export default function Page() {
  return <Guides lang="en" />;
}
