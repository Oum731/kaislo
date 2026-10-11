// Traductions : en, fr, es, pt, de. Une ligne = [clé, en, fr, es, pt, de]. Repli sur l'anglais.
export const LANGS = [
  { id: 'en', name: 'English' }, { id: 'fr', name: 'Français' }, { id: 'es', name: 'Español' },
  { id: 'pt', name: 'Português' }, { id: 'de', name: 'Deutsch' },
];
const ROWS = [
  // ----- menu -----
  ['menu.mode', 'Mode', 'Mode', 'Modo', 'Modo', 'Modus'],
  ['mode.race', 'Quick race', 'Course rapide', 'Carrera rápida', 'Corrida rápida', 'Schnelles Rennen'],
  ['mode.cup', 'Championship', 'Championnat', 'Campeonato', 'Campeonato', 'Meisterschaft'],
  ['mode.trial', 'Time trial', 'Contre-la-montre', 'Contrarreloj', 'Contra o relógio', 'Zeitfahren'],
  ['menu.track', 'Track', 'Piste', 'Pista', 'Pista', 'Strecke'],
  ['menu.diff', 'Level', 'Niveau', 'Nivel', 'Nível', 'Stufe'],
  ['diff.0', 'Easy', 'Facile', 'Fácil', 'Fácil', 'Leicht'],
  ['diff.1', 'Normal', 'Normal', 'Normal', 'Normal', 'Normal'],
  ['diff.2', 'Hard', 'Difficile', 'Difícil', 'Difícil', 'Schwer'],
  ['menu.bike', 'Bike', 'Moto', 'Moto', 'Moto', 'Motorrad'],
  ['menu.play', 'PLAY', 'JOUER', 'JUGAR', 'JOGAR', 'SPIELEN'],
  ['menu.locked', '🔒 LOCKED', '🔒 VERROUILLÉE', '🔒 BLOQUEADA', '🔒 BLOQUEADA', '🔒 GESPERRT'],
  ['menu.garage', '🔧 GARAGE', '🔧 GARAGE', '🔧 GARAJE', '🔧 GARAGEM', '🔧 GARAGE'],
  ['menu.help',
    '↑/W gas · ↓/S brake · ←→/AD steer · Shift nitro · R restart · M sound · N music<br><b>In the air</b>: ↑ front flip · ↓ back flip · ←→ whip — land straight to earn nitro!',
    '↑/W gaz · ↓/S frein · ←→/AD tourner · Shift nitro · R recommencer · M son · N musique<br><b>En l\'air</b> : ↑ front flip · ↓ back flip · ←→ whip — atterrissez droit pour gagner du nitro !',
    '↑/W gas · ↓/S freno · ←→/AD girar · Shift nitro · R reiniciar · M sonido · N música<br><b>En el aire</b>: ↑ front flip · ↓ back flip · ←→ whip — ¡aterriza recto para ganar nitro!',
    '↑/W acelerar · ↓/S frear · ←→/AD virar · Shift nitro · R reiniciar · M som · N música<br><b>No ar</b>: ↑ front flip · ↓ back flip · ←→ whip — aterrisse reto para ganhar nitro!',
    '↑/W Gas · ↓/S Bremse · ←→/AD Lenken · Shift Nitro · R Neustart · M Ton · N Musik<br><b>In der Luft</b>: ↑ Frontflip · ↓ Backflip · ←→ Whip — gerade landen für Nitro!'],
  ['menu.level', 'Level {n}', 'Niveau {n}', 'Nivel {n}', 'Nível {n}', 'Level {n}'],
  ['menu.goalBike', 'Next goal: unlock {name}', 'Prochain objectif : débloquer {name}', 'Próximo objetivo: desbloquear {name}', 'Próximo objetivo: desbloquear {name}', 'Nächstes Ziel: {name} freischalten'],
  ['menu.goalUpg', 'Next goal: upgrade your bike', 'Prochain objectif : améliorer votre moto', 'Próximo objetivo: mejora tu moto', 'Próximo objetivo: melhore sua moto', 'Nächstes Ziel: Motorrad verbessern'],
  ['menu.goalAll', 'Chase the 3 stars on every track!', 'Décrochez les 3 étoiles sur chaque piste !', '¡Consigue las 3 estrellas en cada pista!', 'Conquiste as 3 estrelas em cada pista!', 'Hol dir die 3 Sterne auf jeder Strecke!'],
  ['menu.cupInfo', 'Round {a}/{b} · {p} pts', 'Manche {a}/{b} · {p} pts', 'Carrera {a}/{b} · {p} pts', 'Etapa {a}/{b} · {p} pts', 'Lauf {a}/{b} · {p} Pkt'],
  ['menu.cup', 'Cup', 'Coupe', 'Copa', 'Copa', 'Cup'],
  ['menu.cupStart', '{tracks}: 3 races, points for every place!', '{tracks} : 3 courses, des points à chaque place !', '{tracks}: ¡3 carreras con puntos por puesto!', '{tracks}: 3 corridas, pontos por posição!', '{tracks}: 3 Rennen, Punkte für jeden Platz!'],
  ['cup.name.0', 'Kaislo Cup', 'Coupe Kaislo', 'Copa Kaislo', 'Copa Kaislo', 'Kaislo-Cup'],
  ['cup.name.1', 'Inferno Cup', 'Coupe Inferno', 'Copa Inferno', 'Copa Inferno', 'Inferno-Cup'],
  ['toast.cupLocked', '🔒 Inferno Cup: finish top 3 on Alpine Glacier to unlock it', '🔒 Coupe Inferno : finissez top 3 sur le Glacier Alpin pour la débloquer', '🔒 Copa Inferno: termina en el top 3 del Glaciar Alpino para desbloquearla', '🔒 Copa Inferno: termine no top 3 da Geleira Alpina para desbloquear', '🔒 Inferno-Cup: Top 3 auf dem Alpengletscher zum Freischalten'],
  ['menu.trialInfo', 'Race your own ghost!', 'Affrontez votre propre fantôme !', '¡Compite contra tu propio fantasma!', 'Corra contra o seu próprio fantasma!', 'Fahre gegen deinen eigenen Geist!'],
  ['menu.noStars', 'Stars count on Normal or Hard only', 'Les étoiles comptent en Normal ou Difficile', 'Las estrellas cuentan en Normal o Difícil', 'As estrelas contam em Normal ou Difícil', 'Sterne zählen nur bei Normal oder Schwer'],
  ['menu.achv', '🏆 Achievements', '🏆 Succès', '🏆 Logros', '🏆 Conquistas', '🏆 Erfolge'],
  ['menu.settings', '⚙ Settings', '⚙ Réglages', '⚙ Ajustes', '⚙ Opções', '⚙ Einstellungen'],
  ['rider.you', 'You', 'Vous', 'Tú', 'Você', 'Du'],
  // ----- pistes -----
  ['track.forest', 'Kaislo Forest', 'Forêt de Kaislo', 'Bosque de Kaislo', 'Floresta de Kaislo', 'Kaislo-Wald'],
  ['track.desert', 'Desert Canyon', 'Canyon du Désert', 'Cañón del Desierto', 'Cânion do Deserto', 'Wüstenschlucht'],
  ['track.snow', 'Alpine Glacier', 'Glacier Alpin', 'Glaciar Alpino', 'Geleira Alpina', 'Alpengletscher'],
  ['track.volcano', 'Volcano Run', 'Course du Volcan', 'Ruta del Volcán', 'Rota do Vulcão', 'Vulkanrennen'],
  ['track.night', 'Neon Night', 'Nuit Néon', 'Noche de Neón', 'Noite de Neon', 'Neon-Nacht'],
  ['track.tropic', 'Tropic Island', 'Île Tropicale', 'Isla Tropical', 'Ilha Tropical', 'Tropeninsel'],
  // ----- objectifs -----
  ['obj.title', 'Objectives', 'Objectifs', 'Objetivos', 'Objetivos', 'Ziele'],
  ['obj.place', 'Finish top {n}', 'Finir dans le top {n}', 'Terminar en el top {n}', 'Terminar no top {n}', 'Unter die Top {n} kommen'],
  ['obj.win', 'Win the race', 'Gagner la course', 'Ganar la carrera', 'Vencer a corrida', 'Das Rennen gewinnen'],
  ['obj.coins', 'Collect {n} 🪙 in one race', 'Ramasser {n} 🪙 en une course', 'Recoger {n} 🪙 en una carrera', 'Coletar {n} 🪙 em uma corrida', '{n} 🪙 in einem Rennen sammeln'],
  ['obj.tricks', 'Land {n} tricks', 'Réussir {n} figures', 'Aterrizar {n} trucos', 'Acertar {n} manobras', '{n} Tricks landen'],
  ['obj.nocrash', 'Finish without crashing', 'Finir sans chuter', 'Terminar sin caerte', 'Terminar sem cair', 'Ohne Sturz ins Ziel'],
  // ----- motos / garage -----
  ['bike.0', 'Easy to handle', 'Facile à prendre en main', 'Fácil de manejar', 'Fácil de pilotar', 'Einfach zu fahren'],
  ['bike.1', 'Very agile', 'Très maniable', 'Muy ágil', 'Muito ágil', 'Sehr wendig'],
  ['bike.2', 'Powerful and balanced', 'Puissante et équilibrée', 'Potente y equilibrada', 'Potente e equilibrada', 'Stark und ausgewogen'],
  ['bike.3', 'Top speed, hard to tame', 'Vitesse max, difficile à tenir', 'Máxima velocidad, difícil de controlar', 'Velocidade máxima, difícil de controlar', 'Höchstgeschwindigkeit, schwer zu zähmen'],
  ['bike.4', 'Explosive acceleration', 'Accélération explosive', 'Aceleración explosiva', 'Aceleração explosiva', 'Explosive Beschleunigung'],
  ['bike.5', 'Agile and precise', 'Agile et précise', 'Ágil y precisa', 'Ágil e precisa', 'Wendig und präzise'],
  ['bike.6', 'Raw power', 'Puissance brute', 'Potencia bruta', 'Potência bruta', 'Rohe Kraft'],
  ['bike.7', 'The legend', 'La légende', 'La leyenda', 'A lenda', 'Die Legende'],
  ['garage.equipped', '✔ Equipped', '✔ Équipée', '✔ Equipada', '✔ Equipada', '✔ Ausgerüstet'],
  ['garage.owned', 'Owned', 'Possédée', 'En propiedad', 'Sua', 'Im Besitz'],
  ['garage.buy', 'BUY 🪙 {n}', 'ACHETER 🪙 {n}', 'COMPRAR 🪙 {n}', 'COMPRAR 🪙 {n}', 'KAUFEN 🪙 {n}'],
  ['garage.equip', 'EQUIP', 'ÉQUIPER', 'EQUIPAR', 'EQUIPAR', 'AUSRÜSTEN'],
  ['garage.equippedBtn', 'EQUIPPED', 'ÉQUIPÉE', 'EQUIPADA', 'EQUIPADA', 'AUSGERÜSTET'],
  ['garage.max', 'MAX', 'MAX', 'MAX', 'MAX', 'MAX'],
  ['garage.paint', 'Paint', 'Peinture', 'Pintura', 'Pintura', 'Lackierung'],
  ['common.back', 'BACK', 'RETOUR', 'VOLVER', 'VOLTAR', 'ZURÜCK'],
  ['stat.speed', 'Speed', 'Vitesse', 'Velocidad', 'Velocidade', 'Tempo'],
  ['stat.acc', 'Acceleration', 'Accélération', 'Aceleración', 'Aceleração', 'Beschleunigung'],
  ['stat.handling', 'Handling', 'Maniabilité', 'Manejo', 'Manobrabilidade', 'Handling'],
  ['stat.nitro', 'Nitro', 'Nitro', 'Nitro', 'Nitro', 'Nitro'],
  ['upg.eng', 'Engine', 'Moteur', 'Motor', 'Motor', 'Motor'],
  ['upg.eng.d', 'Top speed + acceleration', 'Vitesse max + accélération', 'Velocidad máx. + aceleración', 'Velocidade máx. + aceleração', 'Höchsttempo + Beschleunigung'],
  ['upg.han', 'Suspension', 'Suspension', 'Suspensión', 'Suspensão', 'Fahrwerk'],
  ['upg.han.d', 'Handling', 'Maniabilité', 'Manejo', 'Manobrabilidade', 'Handling'],
  ['upg.nit', 'Nitro', 'Nitro', 'Nitro', 'Nitro', 'Nitro'],
  ['upg.nit.d', 'Power and recharge', 'Puissance et recharge', 'Potencia y recarga', 'Potência e recarga', 'Leistung und Aufladung'],
  // ----- course / HUD -----
  ['hud.pos', 'Position {a}/{b}', 'Position {a}/{b}', 'Posición {a}/{b}', 'Posição {a}/{b}', 'Platz {a}/{b}'],
  ['hud.lap', 'Lap {a}/{b}', 'Tour {a}/{b}', 'Vuelta {a}/{b}', 'Volta {a}/{b}', 'Runde {a}/{b}'],
  ['hud.record', 'Record {t}', 'Record {t}', 'Récord {t}', 'Recorde {t}', 'Rekord {t}'],
  ['hud.nitro', 'NITRO', 'NITRO', 'NITRO', 'NITRO', 'NITRO'],
  ['hud.go', 'GO!', 'GO !', '¡YA!', 'VAI!', 'LOS!'],
  ['hud.finalLap', 'FINAL LAP!', 'DERNIER TOUR !', '¡ÚLTIMA VUELTA!', 'ÚLTIMA VOLTA!', 'LETZTE RUNDE!'],
  ['hud.lapN', 'LAP {n}', 'TOUR {n}', 'VUELTA {n}', 'VOLTA {n}', 'RUNDE {n}'],
  ['hud.overtake', 'Overtake! P{n}', 'Dépassement ! P{n}', '¡Adelantamiento! P{n}', 'Ultrapassagem! P{n}', 'Überholt! P{n}'],
  ['hud.ghost', '👻 Ghost', '👻 Fantôme', '👻 Fantasma', '👻 Fantasma', '👻 Geist'],
  ['hint.pc', '↑ gas · ← → steer · Shift nitro · In the air: ↑ ↓ flips', '↑ gaz · ← → tourner · Shift nitro · En l\'air : ↑ ↓ flips', '↑ gas · ← → girar · Shift nitro · En el aire: ↑ ↓ flips', '↑ acelerar · ← → virar · Shift nitro · No ar: ↑ ↓ flips', '↑ Gas · ← → Lenken · Shift Nitro · In der Luft: ↑ ↓ Flips'],
  ['hint.mobile', '▲ gas · ◀ ▶ steer · N nitro · In the air: ▲ ▼ flips', '▲ gaz · ◀ ▶ tourner · N nitro · En l\'air : ▲ ▼ flips', '▲ gas · ◀ ▶ girar · N nitro · En el aire: ▲ ▼ flips', '▲ acelerar · ◀ ▶ virar · N nitro · No ar: ▲ ▼ flips', '▲ Gas · ◀ ▶ Lenken · N Nitro · In der Luft: ▲ ▼ Flips'],
  ['trick.front', 'FRONT FLIP', 'FRONT FLIP', 'FRONT FLIP', 'FRONT FLIP', 'FRONTFLIP'],
  ['trick.back', 'BACK FLIP', 'BACK FLIP', 'BACK FLIP', 'BACK FLIP', 'BACKFLIP'],
  ['trick.whip', 'WHIP', 'WHIP', 'WHIP', 'WHIP', 'WHIP'],
  ['trick.crash', 'CRASH!', 'CHUTE !', '¡CAÍDA!', 'QUEDA!', 'STURZ!'],
  ['trick.combo', 'COMBO x{n}', 'COMBO x{n}', '¡COMBO x{n}!', 'COMBO x{n}', 'COMBO x{n}'],
  // ----- fin de course -----
  ['end.win', '🏆 VICTORY!', '🏆 VICTOIRE !', '🏆 ¡VICTORIA!', '🏆 VITÓRIA!', '🏆 SIEG!'],
  ['end.place', '{p} place', '{p} place', '{p} puesto', '{p} lugar', '{p} Platz'],
  ['end.time', 'Time: {t}', 'Temps : {t}', 'Tiempo: {t}', 'Tempo: {t}', 'Zeit: {t}'],
  ['end.newrecord', ' — New record!', ' — Nouveau record !', ' — ¡Nuevo récord!', ' — Novo recorde!', ' — Neuer Rekord!'],
  ['earn.place', 'Position', 'Position', 'Posición', 'Posição', 'Platzierung'],
  ['earn.coins', 'Coins collected', 'Pièces ramassées', 'Monedas recogidas', 'Moedas coletadas', 'Gesammelte Münzen'],
  ['earn.tricks', 'Tricks ({n})', 'Figures ({n})', 'Trucos ({n})', 'Manobras ({n})', 'Tricks ({n})'],
  ['earn.total', 'Total', 'Total', 'Total', 'Total', 'Gesamt'],
  ['earn.balance', 'Balance', 'Solde', 'Saldo', 'Saldo', 'Guthaben'],
  ['end.unlock', '🔓 New track unlocked: {name}!', '🔓 Nouvelle piste débloquée : {name} !', '🔓 ¡Nueva pista desbloqueada: {name}!', '🔓 Nova pista desbloqueada: {name}!', '🔓 Neue Strecke freigeschaltet: {name}!'],
  ['end.star', '⭐ Objective complete: {text} (+{n} 🪙)', '⭐ Objectif réussi : {text} (+{n} 🪙)', '⭐ Objetivo cumplido: {text} (+{n} 🪙)', '⭐ Objetivo cumprido: {text} (+{n} 🪙)', '⭐ Ziel erreicht: {text} (+{n} 🪙)'],
  ['end.levelup', '⬆ LEVEL UP! Level {n} reached (+{c} 🪙)', '⬆ NIVEAU SUPÉRIEUR ! Niveau {n} atteint (+{c} 🪙)', '⬆ ¡SUBES DE NIVEL! Nivel {n} (+{c} 🪙)', '⬆ NOVO NÍVEL! Nível {n} (+{c} 🪙)', '⬆ LEVEL-UP! Level {n} erreicht (+{c} 🪙)'],
  ['end.achv', '🏅 {name} (+{n} 🪙)', '🏅 {name} (+{n} 🪙)', '🏅 {name} (+{n} 🪙)', '🏅 {name} (+{n} 🪙)', '🏅 {name} (+{n} 🪙)'],
  ['end.xp', '+{n} XP', '+{n} XP', '+{n} XP', '+{n} XP', '+{n} XP'],
  ['end.again', 'PLAY AGAIN', 'REJOUER', 'JUGAR DE NUEVO', 'JOGAR NOVAMENTE', 'NOCHMAL'],
  ['end.menu', 'MENU', 'MENU', 'MENÚ', 'MENU', 'MENÜ'],
  ['end.next', 'NEXT RACE ▶', 'COURSE SUIVANTE ▶', 'SIGUIENTE CARRERA ▶', 'PRÓXIMA CORRIDA ▶', 'NÄCHSTES RENNEN ▶'],
  ['cup.standings', 'Standings', 'Classement', 'Clasificación', 'Classificação', 'Gesamtwertung'],
  ['cup.round', 'Round {a}/{b}', 'Manche {a}/{b}', 'Carrera {a}/{b}', 'Etapa {a}/{b}', 'Lauf {a}/{b}'],
  ['cup.pts', '{n} pts', '{n} pts', '{n} pts', '{n} pts', '{n} Pkt'],
  ['cup.champion', '🏆 CHAMPION!', '🏆 CHAMPION !', '🏆 ¡CAMPEÓN!', '🏆 CAMPEÃO!', '🏆 MEISTER!'],
  ['cup.final', '{p} overall', '{p} au général', '{p} en la general', '{p} na geral', '{p} in der Gesamtwertung'],
  ['cup.reward', 'Championship reward: +{n} 🪙', 'Récompense du championnat : +{n} 🪙', 'Premio del campeonato: +{n} 🪙', 'Prêmio do campeonato: +{n} 🪙', 'Meisterschaftsprämie: +{n} 🪙'],
  ['cup.new', 'NEW CHAMPIONSHIP', 'NOUVEAU CHAMPIONNAT', 'NUEVO CAMPEONATO', 'NOVO CAMPEONATO', 'NEUE MEISTERSCHAFT'],
  ['trial.beat', '👻 You beat your ghost! New best saved.', '👻 Vous avez battu votre fantôme ! Nouveau record enregistré.', '👻 ¡Has superado a tu fantasma! Nuevo récord guardado.', '👻 Você venceu seu fantasma! Novo recorde salvo.', '👻 Du hast deinen Geist geschlagen! Neuer Rekord gespeichert.'],
  ['trial.first', '👻 Your run is saved as a ghost. Beat it!', '👻 Votre course est enregistrée comme fantôme. Battez-la !', '👻 Tu carrera se guarda como fantasma. ¡Supérala!', '👻 Sua corrida foi salva como fantasma. Supere-a!', '👻 Dein Lauf wurde als Geist gespeichert. Schlage ihn!'],
  ['trial.slower', '👻 The ghost was faster: {t}', '👻 Le fantôme était plus rapide : {t}', '👻 El fantasma fue más rápido: {t}', '👻 O fantasma foi mais rápido: {t}', '👻 Der Geist war schneller: {t}'],
  // ----- messages -----
  ['toast.daily', '🎁 Daily bonus: +{n} 🪙 (streak: {s})', '🎁 Bonus quotidien : +{n} 🪙 (série : {s})', '🎁 Bono diario: +{n} 🪙 (racha: {s})', '🎁 Bônus diário: +{n} 🪙 (sequência: {s})', '🎁 Tagesbonus: +{n} 🪙 (Serie: {s})'],
  ['toast.locked', '🔒 Locked track: finish top 3 on the previous one', '🔒 Piste verrouillée : finissez top 3 sur la précédente', '🔒 Pista bloqueada: termina en el top 3 de la anterior', '🔒 Pista bloqueada: termine no top 3 da anterior', '🔒 Strecke gesperrt: Top 3 auf der vorherigen schaffen'],
  ['toast.achv', '🏅 Achievement: {name} (+{n} 🪙)', '🏅 Succès : {name} (+{n} 🪙)', '🏅 Logro: {name} (+{n} 🪙)', '🏅 Conquista: {name} (+{n} 🪙)', '🏅 Erfolg: {name} (+{n} 🪙)'],
  // ----- succès -----
  ['achv.title', 'Achievements', 'Succès', 'Logros', 'Conquistas', 'Erfolge'],
  ['achv.firstWin.n', 'First victory', 'Première victoire', 'Primera victoria', 'Primeira vitória', 'Erster Sieg'],
  ['achv.firstWin.d', 'Win a race', 'Gagner une course', 'Gana una carrera', 'Vença uma corrida', 'Gewinne ein Rennen'],
  ['achv.wins10.n', 'Winner', 'Vainqueur', 'Ganador', 'Vencedor', 'Gewinner'],
  ['achv.wins10.d', 'Win 10 races', 'Gagner 10 courses', 'Gana 10 carreras', 'Vença 10 corridas', 'Gewinne 10 Rennen'],
  ['achv.races25.n', 'Regular', 'Habitué', 'Habitual', 'Frequentador', 'Stammgast'],
  ['achv.races25.d', 'Complete 25 races', 'Terminer 25 courses', 'Completa 25 carreras', 'Complete 25 corridas', 'Beende 25 Rennen'],
  ['achv.tricks50.n', 'Acrobat', 'Acrobate', 'Acróbata', 'Acrobata', 'Akrobat'],
  ['achv.tricks50.d', 'Land 50 tricks', 'Réussir 50 figures', 'Aterriza 50 trucos', 'Acerte 50 manobras', 'Lande 50 Tricks'],
  ['achv.flip3.n', 'Triple flip', 'Triple saut', 'Triple voltereta', 'Tripla pirueta', 'Dreifach-Flip'],
  ['achv.flip3.d', 'Land a 3-rotation trick', 'Réussir une figure à 3 rotations', 'Aterriza un truco de 3 giros', 'Acerte uma manobra de 3 giros', 'Lande einen Trick mit 3 Drehungen'],
  ['achv.flawless.n', 'Flawless', 'Sans faute', 'Impecable', 'Impecável', 'Makellos'],
  ['achv.flawless.d', 'Win without crashing', 'Gagner sans chuter', 'Gana sin caerte', 'Vença sem cair', 'Gewinne ohne Sturz'],
  ['achv.coins1k.n', 'Saver', 'Épargnant', 'Ahorrador', 'Poupador', 'Sparer'],
  ['achv.coins1k.d', 'Earn 1,000 🪙 in total', 'Gagner 1 000 🪙 au total', 'Gana 1.000 🪙 en total', 'Ganhe 1.000 🪙 no total', 'Verdiene insgesamt 1.000 🪙'],
  ['achv.coins10k.n', 'Tycoon', 'Magnat', 'Magnate', 'Magnata', 'Magnat'],
  ['achv.coins10k.d', 'Earn 10,000 🪙 in total', 'Gagner 10 000 🪙 au total', 'Gana 10.000 🪙 en total', 'Ganhe 10.000 🪙 no total', 'Verdiene insgesamt 10.000 🪙'],
  ['achv.bike2.n', 'Collector', 'Collectionneur', 'Coleccionista', 'Colecionador', 'Sammler'],
  ['achv.bike2.d', 'Own 2 bikes', 'Posséder 2 motos', 'Ten 2 motos', 'Tenha 2 motos', 'Besitze 2 Motorräder'],
  ['achv.allbikes.n', 'Full garage', 'Garage complet', 'Garaje completo', 'Garagem completa', 'Volle Garage'],
  ['achv.allbikes.d', 'Own all {n} bikes', 'Posséder les {n} motos', 'Ten las {n} motos', 'Tenha as {n} motos', 'Besitze alle {n} Motorräder'],
  ['achv.maxUpg.n', 'Tuner', 'Préparateur', 'Preparador', 'Preparador', 'Tuner'],
  ['achv.maxUpg.d', 'Max out an upgrade', 'Pousser une amélioration au maximum', 'Lleva una mejora al máximo', 'Leve uma melhoria ao máximo', 'Maxe ein Upgrade aus'],
  ['achv.stars3.n', 'Perfect track', 'Piste parfaite', 'Pista perfecta', 'Pista perfeita', 'Perfekte Strecke'],
  ['achv.stars3.d', 'Earn 3 stars on one track', 'Obtenir 3 étoiles sur une piste', 'Consigue 3 estrellas en una pista', 'Conquiste 3 estrelas em uma pista', 'Hole 3 Sterne auf einer Strecke'],
  ['achv.allStars.n', 'Superstar', 'Superstar', 'Superestrella', 'Superestrela', 'Superstar'],
  ['achv.allStars.d', 'Earn all {n} stars', 'Obtenir les {n} étoiles', 'Consigue las {n} estrellas', 'Conquiste as {n} estrelas', 'Hole alle {n} Sterne'],
  ['achv.champion.n', 'Champion', 'Champion', 'Campeón', 'Campeão', 'Meister'],
  ['achv.champion.d', 'Win a championship', 'Gagner un championnat', 'Gana un campeonato', 'Vença um campeonato', 'Gewinne eine Meisterschaft'],
  ['achv.champion2.n', 'Inferno champion', 'Champion Inferno', 'Campeón Inferno', 'Campeão Inferno', 'Inferno-Meister'],
  ['achv.champion2.d', 'Win the Inferno Cup', 'Gagner la Coupe Inferno', 'Gana la Copa Inferno', 'Vença a Copa Inferno', 'Gewinne den Inferno-Cup'],
  ['achv.level5.n', 'Rising star', 'Étoile montante', 'Estrella emergente', 'Estrela em ascensão', 'Aufsteiger'],
  ['achv.level5.d', 'Reach level 5', 'Atteindre le niveau 5', 'Alcanza el nivel 5', 'Alcance o nível 5', 'Erreiche Level 5'],
  ['achv.streak3.n', 'Dedicated', 'Assidu', 'Constante', 'Dedicado', 'Treu'],
  ['achv.streak3.d', 'Play 3 days in a row', 'Jouer 3 jours de suite', 'Juega 3 días seguidos', 'Jogue 3 dias seguidos', 'Spiele 3 Tage in Folge'],
  // ----- défi quotidien -----
  ['mode.daily', 'Daily challenge', 'Défi quotidien', 'Desafío diario', 'Desafio diário', 'Tagesherausforderung'],
  ['daily.title', 'Daily challenge', 'Défi quotidien', 'Desafío diario', 'Desafio diário', 'Tagesherausforderung'],
  ['daily.today', '{track} · {mod}', '{track} · {mod}', '{track} · {mod}', '{track} · {mod}', '{track} · {mod}'],
  ['daily.same', 'Same bike for everyone — only skill counts! ({laps} laps)', 'Même moto pour tous : seul le pilotage compte ! ({laps} tours)', '¡La misma moto para todos: solo cuenta la habilidad! ({laps} vueltas)', 'A mesma moto para todos: só a habilidade conta! ({laps} voltas)', 'Gleiches Motorrad für alle — nur Können zählt! ({laps} Runden)'],
  ['daily.next', 'Next challenge in {t}', 'Prochain défi dans {t}', 'Próximo desafío en {t}', 'Próximo desafio em {t}', 'Nächste Herausforderung in {t}'],
  ['daily.best', 'Your best today: {t}', 'Votre meilleur temps aujourd\'hui : {t}', 'Tu mejor tiempo hoy: {t}', 'Seu melhor tempo hoje: {t}', 'Deine Bestzeit heute: {t}'],
  ['daily.todo', '🎯 Not done yet — {n} 🪙 reward!', '🎯 Pas encore fait — {n} 🪙 à gagner !', '🎯 ¡Aún no lo has hecho: {n} 🪙 de premio!', '🎯 Ainda não fez — {n} 🪙 de prêmio!', '🎯 Noch nicht gespielt — {n} 🪙 Belohnung!'],
  ['daily.targets', '🥇 {g} · 🥈 {s} · 🥉 {b}', '🥇 {g} · 🥈 {s} · 🥉 {b}', '🥇 {g} · 🥈 {s} · 🥉 {b}', '🥇 {g} · 🥈 {s} · 🥉 {b}', '🥇 {g} · 🥈 {s} · 🥉 {b}'],
  ['daily.ready', '🎯 New daily challenge ready!', '🎯 Nouveau défi quotidien disponible !', '🎯 ¡Nuevo desafío diario disponible!', '🎯 Novo desafio diário disponível!', '🎯 Neue Tagesherausforderung bereit!'],
  ['mod.classic', 'Classic', 'Classique', 'Clásico', 'Clássico', 'Klassisch'],
  ['mod.lowgrav', 'Moon gravity', 'Gravité lunaire', 'Gravedad lunar', 'Gravidade lunar', 'Mondgravitation'],
  ['mod.slick', 'Slippery track', 'Piste glissante', 'Pista resbaladiza', 'Pista escorregadia', 'Rutschige Strecke'],
  ['mod.turbo', 'Turbo nitro', 'Nitro turbo', 'Nitro turbo', 'Nitro turbo', 'Turbo-Nitro'],
  ['mod.swift', 'Speed freak', 'Fou de vitesse', 'Velocista', 'Velocidade total', 'Tempo-Rausch'],
  ['mod.classic.d', 'No twist — pure racing', 'Sans modificateur : pur pilotage', 'Sin modificadores: pilotaje puro', 'Sem modificadores: pilotagem pura', 'Kein Twist — pures Fahren'],
  ['mod.lowgrav.d', 'Low gravity: huge jumps', 'Gravité réduite : sauts géants', 'Gravedad reducida: saltos enormes', 'Gravidade reduzida: saltos enormes', 'Wenig Schwerkraft: riesige Sprünge'],
  ['mod.slick.d', 'Less grip in corners', 'Moins d\'adhérence dans les virages', 'Menos agarre en las curvas', 'Menos aderência nas curvas', 'Weniger Grip in Kurven'],
  ['mod.turbo.d', 'Nitro recharges 4x faster', 'Le nitro se recharge 4x plus vite', 'El nitro se recarga 4 veces más rápido', 'O nitro recarrega 4x mais rápido', 'Nitro lädt 4x schneller'],
  ['mod.swift.d', 'Faster bike, harder to control', 'Moto plus rapide, plus dure à contrôler', 'Moto más rápida, más difícil de controlar', 'Moto mais rápida, mais difícil de controlar', 'Schnelleres Bike, schwerer zu kontrollieren'],
  ['medal.0', 'No medal', 'Aucune médaille', 'Sin medalla', 'Sem medalha', 'Keine Medaille'],
  ['medal.1', '🥉 Bronze medal', '🥉 Médaille de bronze', '🥉 Medalla de bronce', '🥉 Medalha de bronze', '🥉 Bronzemedaille'],
  ['medal.2', '🥈 Silver medal', '🥈 Médaille d\'argent', '🥈 Medalla de plata', '🥈 Medalha de prata', '🥈 Silbermedaille'],
  ['medal.3', '🥇 Gold medal', '🥇 Médaille d\'or', '🥇 Medalla de oro', '🥇 Medalha de ouro', '🥇 Goldmedaille'],
  ['end.retry', 'TRY AGAIN', 'RÉESSAYER', 'REINTENTAR', 'TENTAR DE NOVO', 'NOCHMAL VERSUCHEN'],
  ['end.dailyReward', 'Daily reward: +{n} 🪙', 'Récompense du jour : +{n} 🪙', 'Premio del día: +{n} 🪙', 'Prêmio do dia: +{n} 🪙', 'Tagesbelohnung: +{n} 🪙'],
  ['end.medalBonus', 'Medal bonus: +{n} 🪙', 'Bonus de médaille : +{n} 🪙', 'Bono de medalla: +{n} 🪙', 'Bônus de medalha: +{n} 🪙', 'Medaillenbonus: +{n} 🪙'],
  ['end.dailyStreak', '🔥 {n}-day challenge streak!', '🔥 {n} jours de défi d\'affilée !', '🔥 ¡{n} días seguidos de desafío!', '🔥 {n} dias seguidos de desafio!', '🔥 {n} Tage in Folge!'],
  ['lb.title', 'Leaderboard', 'Classement', 'Clasificación', 'Classificação', 'Bestenliste'],
  ['menu.leaderboard', '🏅 Ranking', '🏅 Classement', '🏅 Clasificación', '🏅 Ranking', '🏅 Rangliste'],
  ['lb.rank', 'Rank #{r} of {t}', 'Rang n°{r} sur {t}', 'Puesto {r} de {t}', 'Posição {r} de {t}', 'Platz {r} von {t}'],
  ['lb.you', 'You', 'Vous', 'Tú', 'Você', 'Du'],
  ['lb.empty', 'No scores yet — be the first!', 'Aucun temps pour l\'instant — soyez le premier !', 'Aún no hay tiempos: ¡sé el primero!', 'Nenhum tempo ainda — seja o primeiro!', 'Noch keine Zeiten — sei der Erste!'],
  ['lb.offline', 'Online ranking is not available — your results are saved on this device.', 'Classement en ligne indisponible : vos résultats sont enregistrés sur cet appareil.', 'Clasificación en línea no disponible: tus resultados se guardan en este dispositivo.', 'Ranking online indisponível: seus resultados ficam salvos neste dispositivo.', 'Online-Rangliste nicht verfügbar — deine Ergebnisse werden auf diesem Gerät gespeichert.'],
  ['lb.unreachable', 'Could not reach the ranking server. Your result is kept and will be sent later.', 'Serveur de classement injoignable. Votre résultat est gardé et sera envoyé plus tard.', 'No se pudo contactar con el servidor. Tu resultado se guarda y se enviará más tarde.', 'Não foi possível contatar o servidor. Seu resultado foi guardado e será enviado depois.', 'Server nicht erreichbar. Dein Ergebnis wird gespeichert und später gesendet.'],
  ['lb.history', 'Your last days', 'Vos derniers jours', 'Tus últimos días', 'Seus últimos dias', 'Deine letzten Tage'],
  ['lb.player', 'Player', 'Pilote', 'Piloto', 'Piloto', 'Fahrer'],
  ['lb.name', 'Your name', 'Votre pseudo', 'Tu nombre', 'Seu apelido', 'Dein Name'],
  ['lb.nameHint', 'Choose a name for the leaderboard (2–14 characters)', 'Choisissez un pseudo pour le classement (2 à 14 caractères)', 'Elige un nombre para la clasificación (2–14 caracteres)', 'Escolha um apelido para o ranking (2 a 14 caracteres)', 'Wähle einen Namen für die Rangliste (2–14 Zeichen)'],
  ['lb.badName', 'This name is not allowed. Try another one.', 'Ce pseudo n\'est pas autorisé. Essayez-en un autre.', 'Ese nombre no está permitido. Prueba otro.', 'Esse apelido não é permitido. Tente outro.', 'Dieser Name ist nicht erlaubt. Versuche einen anderen.'],
  ['lb.save', 'OK', 'OK', 'OK', 'OK', 'OK'],
  ['lb.sent', '✔ Score sent', '✔ Temps envoyé', '✔ Tiempo enviado', '✔ Tempo enviado', '✔ Zeit gesendet'],
  ['lb.loading', 'Loading…', 'Chargement…', 'Cargando…', 'Carregando…', 'Lädt…'],
  ['lb.col.time', 'Time', 'Temps', 'Tiempo', 'Tempo', 'Zeit'],
  ['achv.daily1.n', 'Daily rider', 'Pilote du jour', 'Piloto del día', 'Piloto do dia', 'Tagesfahrer'],
  ['achv.daily1.d', 'Complete a daily challenge', 'Terminer un défi quotidien', 'Completa un desafío diario', 'Complete um desafio diário', 'Schließe eine Tagesherausforderung ab'],
  ['achv.daily7.n', 'Week warrior', 'Guerrier de la semaine', 'Guerrero semanal', 'Guerreiro da semana', 'Wochenkrieger'],
  ['achv.daily7.d', 'Complete daily challenges 7 days in a row', 'Terminer le défi 7 jours de suite', 'Completa el desafío 7 días seguidos', 'Complete o desafio 7 dias seguidos', 'Schließe 7 Tage in Folge ab'],
  ['achv.dailyGold.n', 'Daily gold', 'Or du jour', 'Oro del día', 'Ouro do dia', 'Tagesgold'],
  ['achv.dailyGold.d', 'Earn a gold medal in a daily challenge', 'Décrocher une médaille d\'or au défi quotidien', 'Consigue una medalla de oro en el desafío diario', 'Conquiste uma medalha de ouro no desafio diário', 'Hole Gold bei einer Tagesherausforderung'],
  // ----- réglages -----
  ['set.title', 'Settings', 'Réglages', 'Ajustes', 'Opções', 'Einstellungen'],
  ['set.lang', 'Language', 'Langue', 'Idioma', 'Idioma', 'Sprache'],
  ['set.quality', 'Quality', 'Qualité', 'Calidad', 'Qualidade', 'Grafik'],
  ['q.auto', 'Auto ({l})', 'Auto ({l})', 'Auto ({l})', 'Auto ({l})', 'Auto ({l})'],
  ['q.0', 'Low', 'Bas', 'Baja', 'Baixa', 'Niedrig'],
  ['q.1', 'Medium', 'Moyen', 'Media', 'Média', 'Mittel'],
  ['q.2', 'High', 'Élevé', 'Alta', 'Alta', 'Hoch'],
  ['set.music', 'Music', 'Musique', 'Música', 'Música', 'Musik'],
  ['set.sound', 'Sound effects', 'Effets sonores', 'Efectos de sonido', 'Efeitos sonoros', 'Soundeffekte'],
  ['set.on', 'ON', 'OUI', 'SÍ', 'SIM', 'AN'],
  ['set.off', 'OFF', 'NON', 'NO', 'NÃO', 'AUS'],
  ['set.reset', 'Reset progress', 'Réinitialiser la progression', 'Reiniciar progreso', 'Reiniciar progresso', 'Fortschritt zurücksetzen'],
  ['set.resetConfirm', 'Erase ALL progress? This cannot be undone.', 'Effacer TOUTE la progression ? Action irréversible.', '¿Borrar TODO el progreso? No se puede deshacer.', 'Apagar TODO o progresso? Não é possível desfazer.', 'GESAMTEN Fortschritt löschen? Das lässt sich nicht rückgängig machen.'],
];
const IDX = { en: 1, fr: 2, es: 3, pt: 4, de: 5 };
const DICT = { en: {}, fr: {}, es: {}, pt: {}, de: {} };
for (const row of ROWS) for (const l in IDX) DICT[l][row[0]] = row[IDX[l]];

let lang = 'en';
const listeners = [];
export const getLang = () => lang;
export function detect(saved) {
  if (saved && DICT[saved]) return saved;
  for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language])) {
    const c = String(l || '').slice(0, 2).toLowerCase(); if (DICT[c]) return c;
  }
  return 'en';
}
export function t(key, vars) {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}
// Rang ordinal : 1st / 1re / 1.º / 1.º / 1.
export function ord(n) {
  switch (lang) {
    case 'fr': return n === 1 ? '1re' : `${n}e`;
    case 'es': case 'pt': return `${n}.º`;
    case 'de': return `${n}.`;
    default: return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
  }
}
export function applyDOM() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
}
export function setLang(l) {
  lang = DICT[l] ? l : 'en';
  document.documentElement.lang = lang;
  applyDOM();
  listeners.forEach((f) => f(lang));
}
export const onLang = (f) => listeners.push(f);
