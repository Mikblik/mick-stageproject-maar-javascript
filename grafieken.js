// Deze variabele staat "buiten" de functie en onthoudt de grafiek
let mijnActieveGrafiek = null; 
let mijnFeatureGrafiek = null;

function maakTijdlijnGrafiek(data) {

    if (mijnActieveGrafiek) {
        mijnActieveGrafiek.destroy();
    }
    // --------------------------------------------------

    data.sort((a, b) => a.visit - b.visit);
    const labels_x_as = data.map(waarde => waarde.visit);
    const data_y_as = data.map(waarde => {
        return Number(waarde.ziektestadium.replace('L', ''));
    });

    const ctx = document.getElementById('Tijdlijn');
    if (!ctx) {
        console.error("Kan het <canvas> element 'Tijdlijn' niet vinden!");
        return;
    }

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

function maakfeaturetijdlijn(data, feature) {

    if (mijnFeatureGrafiek) {
        mijnFeatureGrafiek.destroy();
    }

    data.sort((a, b) => a.visit - b.visit);
    const labels_x_as = data.map(waarde => waarde.visit);
    const data_y_as = data.map(waarde => {
        return Number(waarde[feature]);
    });

    const ctx = document.getElementById('FeatureTijdlijn');
    if (!ctx) {
        console.error("Kan het <canvas> element 'Tijdlijn' niet vinden!");
        return;
    }

    mijnFeatureGrafiek = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels_x_as,
            datasets: [{
                label: 'Verloop ' + feature,
                data: data_y_as,
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            scales: {
                x: {
                    title: { display: true, text: 'Visites' }
                },
                y: {
                    title: { display: true, text: feature },
                }
            }
        }
    });


}