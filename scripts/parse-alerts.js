const fs = require('fs');

// Lire le fichier JSON brut de l'API
const rawData = JSON.parse(fs.readFileSync('alerts-raw.json', 'utf8'));

// Fonction pour trouver les alertes pour Gironde (33)
function parseAlertsForGironde(data) {
  const result = {
    lastUpdate: new Date().toISOString(),
    alerteRougeDetectee: false,
    aujourd_hui: {
      date: new Date().toISOString().split('T')[0],
      niveau: 1,
      phenomenes: []
    },
    demain: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      niveau: 1,
      phenomenes: []
    }
  };

  // L'API retourne un objet avec les départements
  // Structure typique: { "33": { "phenomenes": [...] } }
  
  if (!data || !data['33']) {
    console.log('No data for Gironde (33)');
    return result;
  }

  const girondeData = data['33'];
  
  // Parser les phénomènes pour aujourd'hui et demain
  if (girondeData.phenomenes && Array.isArray(girondeData.phenomenes)) {
    girondeData.phenomenes.forEach(pheno => {
      const niveau = pheno.niveau_vigilance || 1;
      const phenomene = pheno.nom || 'Inconnu';
      const echeance = pheno.echeance || 'J'; // J = aujourd'hui, J1 = demain
      
      if (echeance === 'J') {
        result.aujourd_hui.niveau = Math.max(result.aujourd_hui.niveau, niveau);
        if (niveau >= 2) {
          result.aujourd_hui.phenomenes.push(phenomene);
        }
      } else if (echeance === 'J1') {
        result.demain.niveau = Math.max(result.demain.niveau, niveau);
        if (niveau >= 2) {
          result.demain.phenomenes.push(phenomene);
        }
      }
      
      // Détecter alerte rouge
      if (niveau === 4) {
        result.alerteRougeDetectee = true;
      }
    });
  }
  
  // Convertir les tableaux de phénomènes en strings
  result.aujourd_hui.phenomenes = result.aujourd_hui.phenomenes.join(', ') || 'Aucun';
  result.demain.phenomenes = result.demain.phenomenes.join(', ') || 'Aucun';
  
  return result;
}

// Parser et sauvegarder
try {
  const alerts = parseAlertsForGironde(rawData);
  fs.writeFileSync('alerts.json', JSON.stringify(alerts, null, 2));
  console.log('✅ Alerts updated successfully');
  console.log(JSON.stringify(alerts, null, 2));
} catch (error) {
  console.error('❌ Error parsing alerts:', error);
  // Créer un fichier par défaut en cas d'erreur
  const defaultAlerts = {
    lastUpdate: new Date().toISOString(),
    error: error.message,
    alerteRougeDetectee: false,
    aujourd_hui: { date: new Date().toISOString().split('T')[0], niveau: 1, phenomenes: 'Erreur' },
    demain: { date: new Date(Date.now() + 86400000).toISOString().split('T')[0], niveau: 1, phenomenes: 'Erreur' }
  };
  fs.writeFileSync('alerts.json', JSON.stringify(defaultAlerts, null, 2));
  process.exit(1);
}
