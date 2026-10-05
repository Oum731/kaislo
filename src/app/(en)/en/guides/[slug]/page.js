import { Guide, metaGuide, slugsGuides } from '@/components/site/pages/Guides';

export const dynamicParams = false;
export const generateStaticParams = () => slugsGuides('en');
export const generateMetadata = async ({ params }) => metaGuide('en', (await params).slug);

export default async function Page({ params }) {
  return <Guide lang="en" slug={(await params).slug} />;
}
