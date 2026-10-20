'use client';
// Bouton « Contacts » : choisit un client dans le répertoire du téléphone (voir lib/contacts.js).
// N'apparaît que si le téléphone sait le faire (Chrome Android) ; sinon la saisie à la main reste la seule option.
// Un contact avec plusieurs numéros : la vendeuse touche le bon.
import { useEffect, useState } from 'react';
import { Icone } from '@/components/ui';
import { contactsDisponibles, choisirContact } from '@/lib/contacts';
import { tr } from '@/lib/i18n';

export default function BoutonContacts({ surChoisir, avecNom = false }) {
  const [ok, setOk] = useState(false);
  const [choix, setChoix] = useState(null); // contact avec plusieurs numéros
  const [erreur, setErreur] = useState('');
  useEffect(() => { setOk(contactsDisponibles()); }, []);
  if (!ok) return null;

  const donner = (nom, numero) => { setChoix(null); surChoisir({ nom: avecNom ? nom : '', telephone: numero, nomContact: nom }); };
  const ouvrir = async () => {
    setErreur('');
    try {
      const c = await choisirContact();
      if (!c) return;
      if (!c.numeros.length) return setErreur(tr('Ce contact n’a pas de numéro de téléphone.'));
      if (c.numeros.length === 1) donner(c.nom, c.numeros[0]);
      else setChoix(c);
    } catch {
      setErreur(tr('Les contacts ne sont pas accessibles sur ce téléphone : tapez le numéro.'));
    }
  };

  return (
    <div className="bouton-contacts">
      <button type="button" className="btn secondaire petit" onClick={ouvrir}><Icone nom="clients" taille="sm" /> {tr('Choisir dans mes contacts')}</button>
      {erreur && <p className="tres-petit rouge-texte">{erreur}</p>}
      {choix && (
        <div className="pile" style={{ marginTop: 8 }}>
          <p className="petit"><b>{choix.nom || tr('Contact')}</b> · {tr('quel numéro ?')}</p>
          {choix.numeros.map((n) => <button key={n} type="button" className="btn secondaire" onClick={() => donner(choix.nom, n)}>{n}</button>)}
        </div>
      )}
    </div>
  );
}
