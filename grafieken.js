// Deze variabele staat "buiten" de functie en onthoudt de grafiek
let mijnActieveGrafiek = null; 

function maakTijdlijnGrafiek(data) {

    // --- STAP 1 (NIEUW!): VERNIETIG DE OUDE GRAFIEK ---
    // Als er al een grafiek bestaat, vernietig die eerst.
    if (mijnActieveGrafiek) {
        mijnActieveGrafiek.destroy();
    }
    // --------------------------------------------------

    // --- STAP 2: DATA VOORBEREIDEN ---
    // (Dit blijft allemaal hetzelfde)
    data.sort((a, b) => a.visit - b.visit);
    const labels_x_as = data.map(waarde => "Visite " + waarde.visit);
    const data_y_as = data.map(waarde => {
        return Number(waarde.ziektestadium.replace('L', ''));
    });

    // --- STAP 3: GRAFIEK MAKEN ---
    const ctx = document.getElementById('Tijdlijn');
    if (!ctx) {
        console.error("Kan het <canvas> element 'Tijdlijn' niet vinden!");
        return;
    }

    // Maak de nieuwe grafiek EN sla 'm op in de variabele.
    // Dit vervangt de 'null' of de vorige grafiek.
    mijnActieveGrafiek = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels_x_as,
            datasets: [{
                label: 'Verloop Ziektestadium',
                data: data_y_as,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            // Voeg deze toe voor betere weergave in je div
            responsive: true,
            maintainAspectRatio: false, 
            scales: {
                x: {
                    title: { display: true, text: 'Visites' }
                },
                y: {
                    title: { display: true, text: 'Ziektestadium (1-8)' },
                    min: 1,
                    max: 8,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}