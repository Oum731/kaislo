import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_WHATSAPP, CONTACT_WHATSAPP_AFFICHE } from '../src/config.js';

test('le numéro WhatsApp affiché est celui du lien wa.me (chiffres seulement, sans +)', () => {
  assert.match(CONTACT_WHATSAPP, /^\d{8,15}$/);
  assert.equal(CONTACT_WHATSAPP_AFFICHE.replace(/\D/g, ''), CONTACT_WHATSAPP);
  assert.notEqual(CONTACT_WHATSAPP, '212600000000', 'le numéro de remplacement ne doit plus être publié');
});
