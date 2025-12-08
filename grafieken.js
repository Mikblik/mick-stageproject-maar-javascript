// Deze variabele staat "buiten" de functie en onthoudt de grafiek

let mijnComboGrafiek = null;

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



