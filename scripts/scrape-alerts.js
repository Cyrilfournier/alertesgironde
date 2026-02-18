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
  await sleep(5000); // Attendre 5 secondes pour que le JS charge les données
  
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
    
    // Chercher le texte "ALERTE ROUGE DÉTECTÉE"
    const pageText = document.body.innerText;
    
    console.log('Page text preview:', pageText.substring(0, 500));
    
    if (pageText.includes('ALERTE ROUGE DÉTECTÉE') || pageText.includes('🚨')) {
      result.alerteRougeDetectee = true;
    }
    
    // Chercher "AUJOURD'HUI" et extraire les infos
    const aujourdHuiMatch = pageText.match(/AUJOURD['']HUI[^\n]*Niveau\s+(\w+)[^\n]*Phénomènes[^\n]*:\s*([^\n]+)/i);
    if (aujourdHuiMatch) {
      const niveauText = aujourdHuiMatch[1].toLowerCase();
      if (niveauText.includes('rouge') || niveauText === '4') {
        result.aujourd_hui.niveau = 4;
        result.alerteRougeDetectee = true;
      } else if (niveauText.includes('orange') || niveauText === '3') {
        result.aujourd_hui.niveau = 3;
      } else if (niveauText.includes('jaune') || niveauText === '2') {
        result.aujourd_hui.niveau = 2;
      }
      result.aujourd_hui.phenomenes = aujourdHuiMatch[2].trim();
    }
    
    // Chercher "DEMAIN" et extraire les infos
    const demainMatch = pageText.match(/DEMAIN[^\n]*Niveau\s+(\w+)[^\n]*Phénomènes[^\n]*:\s*([^\n]+)/i);
    if (demainMatch) {
      const niveauText = demainMatch[1].toLowerCase();
      if (niveauText.includes('rouge') || niveauText === '4') {
        result.demain.niveau = 4;
        result.alerteRougeDetectee = true;
      } else if (niveauText.includes('orange') || niveauText === '3') {
        result.demain.niveau = 3;
      } else if (niveauText.includes('jaune') || niveauText === '2') {
        result.demain.niveau = 2;
      }
      result.demain.phenomenes = demainMatch[2].trim();
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
  }
})().catch(error => {
  console.error('❌ Erreur lors du scraping:', error);
  process.exit(1);
});
