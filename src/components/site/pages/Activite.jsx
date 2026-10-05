// Page « Gestion pour … » d'une activité (boutique, bar…), en français ou en anglais.
// Le contenu est dans src/components/site/activites.js ; la mise en page dans PageMetier.
import PageMetier from '@/components/site/PageMetier';
import { ACTIVITES } from '@/components/site/activites';
import { choisirLangue } from '@/lib/i18n';

export function meta(cle, lang) {
  choisirLangue(lang);
  return ACTIVITES()[cle].metadata(lang);
}

export default function Activite({ cle, lang }) {
  choisirLangue(lang);
  return <PageMetier c={ACTIVITES()[cle].contenu} lang={lang} />;
}
