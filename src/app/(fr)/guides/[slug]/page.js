import { Guide, metaGuide, slugsGuides } from '@/components/site/pages/Guides';

export const dynamicParams = false;
export const generateStaticParams = () => slugsGuides('fr');
export const generateMetadata = async ({ params }) => metaGuide('fr', (await params).slug);

export default async function Page({ params }) {
  return <Guide lang="fr" slug={(await params).slug} />;
}
