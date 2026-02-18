const puppeteer = require('puppeteer');
const fs = require('fs');

// Fonction helper pour attendre
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('🌐 Lancement du navigateur...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('📡 Chargement de la page...');
  await page.goto('https://cyrilfournier.github.io/alertesgironde/', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // Attendre que les données soient chargées
  console.log('⏳ Attente du chargement des données...');
  await sleep(5000);
  
  console.log('🔍 Extraction des données...');
  
  // Extraire les données depuis la page
  const alertData = await page.evaluate(() => {
    const result = {
      lastUpdate: new Date().toISOString(),
      alerteRougeDetectee: false,
      aujourd_hui: {
        date: new Date().toISOString().split('T')[0],
        niveau: 1,
        phenomenes: 'Aucun'
      },
      demain: {
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        niveau: 1,
        phenomenes: 'Aucun'
      }
    };
    
    // Obtenir tout le texte de la page
    const pageText = document.body.innerText;
    
    // Chercher "ALERTE ROUGE DÉTECTÉE"
    if (pageText.includes('ALERTE ROUGE DÉTECTÉE') || pageText.includes('🚨')) {
      result.alerteRougeDetectee = true;
    }
    
    // Parser AUJOURD'HUI
    // Format: "AUJOURD'HUI (): Niveau Rouge (4/4)" ou "Niveau Orange (3/4)" etc.
    const aujourdHuiMatch = pageText.match(/AUJOURD['']HUI\s*\([^)]*\):\s*Niveau\s+(Rouge|Orange|Jaune|Vert)\s*\((\d)\/4\)[^\n]*\n\s*Phénomènes en (?:rouge|orange|jaune):\s*([^\n]+)/i);
    
    if (aujourdHuiMatch) {
      const couleur = aujourdHuiMatch[1].toLowerCase();
      const niveau = parseInt(aujourdHuiMatch[2]);
      const phenomenes = aujourdHuiMatch[3].trim();
      
      result.aujourd_hui.niveau = niveau;
      result.aujourd_hui.phenomenes = phenomenes;
      
      if (niveau === 4) {
        result.alerteRougeDetectee = true;
      }
    }
    
    // Parser DEMAIN
    const demainMatch = pageText.match(/DEMAIN\s*\([^)]*\):\s*Niveau\s+(Rouge|Orange|Jaune|Vert)\s*\((\d)\/4\)[^\n]*\n\s*Phénomènes en (?:rouge|orange|jaune):\s*([^\n]+)/i);
    
    if (demainMatch) {
      const couleur = demainMatch[1].toLowerCase();
      const niveau = parseInt(demainMatch[2]);
      const phenomenes = demainMatch[3].trim();
      
      result.demain.niveau = niveau;
      result.demain.phenomenes = phenomenes;
      
      if (niveau === 4) {
        result.alerteRougeDetectee = true;
      }
    }
    
    return result;
  });
  
  console.log('✅ Données extraites:', JSON.stringify(alertData, null, 2));
  
  // Sauvegarder dans alerts.json
  fs.writeFileSync('alerts.json', JSON.stringify(alertData, null, 2));
  
  await browser.close();
  
  console.log('🎉 Scraping terminé avec succès !');
  
  // Afficher si alerte rouge détectée
  if (alertData.alerteRougeDetectee) {
    console.log('🚨 ALERTE ROUGE DÉTECTÉE ! 🚨');
    console.log(`📍 AUJOURD'HUI: Niveau ${alertData.aujourd_hui.niveau} - ${alertData.aujourd_hui.phenomenes}`);
    console.log(`📍 DEMAIN: Niveau ${alertData.demain.niveau} - ${alertData.demain.phenomenes}`);
  } else {
    console.log('✅ Pas d\'alerte rouge');
  }
})().catch(error => {
  console.error('❌ Erreur lors du scraping:', error);
  process.exit(1);
});
