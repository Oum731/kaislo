// Port libre pour le serveur PHP d'un test : plusieurs fichiers de test tournent en même temps, chacun avec son serveur.
// (Avant : port calculé avec le numéro de processus, ce qui pouvait tomber deux fois sur le même port.)
import net from 'node:net';

export function portLibre() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}
