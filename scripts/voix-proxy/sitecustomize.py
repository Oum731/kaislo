# Utilisé seulement dans l'environnement cloud, où un proxy réencrypte le TLS : edge-tts (qui utilise la liste « certifi »)
# doit alors faire confiance à l'autorité du proxy. La vérification TLS n'est JAMAIS désactivée.
# Activé automatiquement par scripts/videos-demo.mjs quand /root/.ccr/ca-bundle.crt existe ; sans effet ailleurs.
import os
try:
    import certifi
    _bundle = os.environ.get('SSL_CERT_FILE') or '/root/.ccr/ca-bundle.crt'
    if os.path.exists(_bundle):
        certifi.where = lambda: _bundle
except Exception:
    pass
