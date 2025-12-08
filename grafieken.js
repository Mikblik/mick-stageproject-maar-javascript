// Deze variabele staat "buiten" de functie en onthoudt de grafiek

let mijnComboGrafiek = null;
let mijnKansenGrafiek = null;

function maakFlexibeleComboGrafiek(data, featureLinks, featureRechts) {

    // 1. OPRUIMEN
    if (mijnComboGrafiek) {
        mijnComboGrafiek.destroy();
    }

    // 2. DATA VOORBEREIDEN
    data.sort((a, b) => a.visit - b.visit);
    const labels = data.map(waarde => `${waarde.visit}`);

    // --- Helper functie om data te extraheren ---
    // Deze functie kijkt of het 'Ziektestadium' is of een gewone feature
    const getFeatureData = (featureNaam) => {
        if (featureNaam === 'Ziektestadium') {
            // Speciale behandeling voor L1, L2...
            return data.map(p => Number(p.ziektestadium.replace('L', '')));
        } else {
            // Gewone behandeling voor TJC, ESR, etc.
            return data.map(p => Number(p[featureNaam]));
        }
    };

    const dataLinks = getFeatureData(featureLinks);
    const dataRechts = getFeatureData(featureRechts);

    // 3. CANVAS ZOEKEN
    const ctx = document.getElementById('ComboGrafiek');
    if (!ctx) return;

    // 4. GRAFIEK BOUWEN
    mijnComboGrafiek = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: featureLinks, // Naam uit dropdown 1
                    data: dataLinks,
                    borderColor: 'rgb(54, 162, 235)', // BLAUW
                    backgroundColor: 'rgb(54, 162, 235)',
                    yAxisID: 'y-axis-left', // Koppel aan linker as
                    tension: 0.1
                },
                {
                    label: featureRechts, // Naam uit dropdown 2
                    data: dataRechts,
                    borderColor: 'rgb(255, 99, 132)', // ROOD
                    backgroundColor: 'rgb(255, 99, 132)',
                    yAxisID: 'y-axis-right', // Koppel aan rechter as
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    title: { display: true, text: 'Visites' }
                },
                // --- LINKER AS ---
                'y-axis-left': {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: featureLinks, color: 'rgb(54, 162, 235)' },
                    // Als het ziektestadium is, zet harde limieten 1-8
                    min: (featureLinks === 'Ziektestadium') ? 1 : undefined,
                    max: (featureLinks === 'Ziektestadium') ? 8 : undefined,
                },
                // --- RECHTER AS ---
                'y-axis-right': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: featureRechts, color: 'rgb(255, 99, 132)' },
                    grid: { drawOnChartArea: false }, // Geen rasterlijnen voor rechts (wordt rommelig)
                    min: (featureRechts === 'Ziektestadium') ? 1 : undefined,
                    max: (featureRechts === 'Ziektestadium') ? 8 : undefined,
                }
            }
        }
    });
}



function maakKansenGrafiek(patientData, gekozenVisiteNummer, type) {
    
    // 1. Zoek de data voor de specifieke visite
    // (Let op: visite in CSV is vaak string "1", dropdown is string "1", dus '==' is veilig)
    const visiteData = patientData.find(p => p.visit == gekozenVisiteNummer);

    if (!visiteData) {
        console.warn("Geen data gevonden voor visite", gekozenVisiteNummer);
        return;
    }

    // 2. Opruimen oude grafiek
    if (mijnKansenGrafiek) {
        mijnKansenGrafiek.destroy();
    }

    // 3. Bereid data voor op basis van Type (Stadium of Traject)
    let labels = [];
    let dataPercentages = [];
    let kleur = '';
    let labelNaam = '';

    if (type === 'Stadium') {
        // Check of we stadium kansen hebben (berekend in modellen.js)
        if (visiteData.stadiumKansen) {
            labels = Object.keys(visiteData.stadiumKansen).sort(); // L1, L2...
            dataPercentages = labels.map(k => visiteData.stadiumKansen[k] * 100);
            kleur = 'rgba(54, 162, 235, 0.8)'; // Blauw
            labelNaam = 'Kans op Ziektestadium (%)';
        }
    } else if (type === 'Traject') {
        // Check of we traject kansen hebben
        if (visiteData.trajectKansen) {
            labels = Object.keys(visiteData.trajectKansen).sort(); // TR1, TR2...
            dataPercentages = labels.map(k => visiteData.trajectKansen[k] * 100);
            kleur = 'rgba(75, 192, 192, 0.8)'; // Groen/Teal
            labelNaam = 'Kans op Traject (%)';
        }
    }

    // Als er geen data is (bv. traject model niet gerund), toon lege grafiek of niets
    if (labels.length === 0) {
        console.warn(`Geen kansen data gevonden voor type: ${type}`);
        // Optioneel: Teken een lege grafiek of return
    }

    // 4. Tekenen
    const ctx = document.getElementById('KansenGrafiek');
    if (!ctx) return;

    mijnKansenGrafiek = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: labelNaam,
                data: dataPercentages,
                backgroundColor: kleur,
                borderRadius: 4,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100, // Altijd tot 100%
                    title: { display: true, text: 'Zekerheid (%)' }
                }
            },
            plugins: {
                legend: { display: true }, // Laat zien wat we meten
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw.toFixed(1)}%`
                    }
                }
            }
        }
    });
}