import ContactForm from '@/components/ContactForm';
import { SITE } from '@/config';

export const metadata = { title: 'Contact' };

export default function Contact() {
  return (
    <div className="wrap page narrow">
      <h1>Nous contacter</h1>
      <p className="lead dark">Une question, une proposition de partenariat, une annonce à partager ? Écrivez-nous.</p>
      <p>Ou directement par e-mail : <a href={`mailto:${SITE.email}`}><b>{SITE.email}</b></a></p>
      <ContactForm />
    </div>
  );
}
