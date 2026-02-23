// ==========================================================================
// HULPFUNCTIES VOOR MISSENDE DATA (UI MELDINGEN)
// ==========================================================================

function schrijfMeldingInCanvas(ctxId, tekst) {
    const canvas = document.getElementById(ctxId);
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "14px Arial";
    context.fillStyle = "#6b7280"; // Grijze tekst
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(tekst, canvas.width / 2, canvas.height / 2);
}

function schrijfMeldingInDiv(divId, tekst) {
    const container = document.getElementById(divId);
    if (!container) return;
    container.innerHTML = `<div class="flex items-center justify-center h-full w-full text-gray-500 text-sm text-center px-4">${tekst}</div>`;
}


// ==========================================================================
// INDIVIDUELE FIGUREN
// ==========================================================================

let mijnComboGrafiek = null;
let mijnKansenGrafiek = null;

function maakFlexibeleComboGrafiek(data, featureLinks, featureRechts) {
    if (mijnComboGrafiek) {
        mijnComboGrafiek.destroy();
    }

    data.sort((a, b) => a.visit - b.visit);
    const labels = data.map(waarde => `${waarde.visit}`);

    const getFeatureData = (featureNaam) => {
        if (featureNaam === 'Ziektestadium') {
            return data.map(p => {
                if (!p.ziektestadium || p.ziektestadium.startsWith("Onbekend")) return null;
                return Number(p.ziektestadium.replace('L', ''));
            });
        } else {
            return data.map(p => {
                if (p[featureNaam] === null || p[featureNaam] === undefined || p[featureNaam] === "") return null;
                return Number(p[featureNaam]);
            });
        }
    };

    const dataLinks = getFeatureData(featureLinks);
    const dataRechts = getFeatureData(featureRechts);

    const ctx = document.getElementById('ComboGrafiek');
    if (!ctx) return;

    // Officiële Chart.js logica om gaten (missende visites) te detecteren
    const spanGapsChecker = (ctx, stippelPatroon) => {
        // Veiligheidscheck of p0 en p1 bestaan
        if (!ctx.p0 || !ctx.p1) return undefined;
        
        // 1. Chart.js 'skip' flag (de officiële methode)
        // 2. Extra veiligheid: als het index-verschil groter is dan 1, ontbreekt er ook data
        if (ctx.p0.skip || ctx.p1.skip || (ctx.p1DataIndex - ctx.p0DataIndex > 1)) {
            return stippelPatroon;
        }
        return undefined; // Gewone vaste lijn
    };

    mijnComboGrafiek = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: featureLinks, 
                    data: dataLinks,
                    borderColor: 'rgb(54, 162, 235)', 
                    backgroundColor: 'rgb(54, 162, 235)',
                    yAxisID: 'y-axis-left', 
                    tension: 0.1,
                    spanGaps: true, // Overbrug missende data
                    segment: {
                        borderDash: ctx => spanGapsChecker(ctx, [5, 5])
                    }
                },
                {
                    label: featureRechts, 
                    data: dataRechts,
                    borderColor: 'rgb(255, 99, 132)', 
                    backgroundColor: 'rgb(255, 99, 132)',
                    yAxisID: 'y-axis-right', 
                    tension: 0.1,
                    spanGaps: true, // Overbrug missende data
                    segment: {
                        borderDash: ctx => spanGapsChecker(ctx, [5, 5])
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { title: { display: true, text: 'Visites' } },
                'y-axis-left': {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: featureLinks, color: 'rgb(54, 162, 235)' },
                    min: (featureLinks === 'Ziektestadium') ? 1 : undefined,
                    max: (featureLinks === 'Ziektestadium') ? 8 : undefined,
                },
                'y-axis-right': {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: featureRechts, color: 'rgb(255, 99, 132)' },
                    grid: { drawOnChartArea: false }, 
                    min: (featureRechts === 'Ziektestadium') ? 1 : undefined,
                    max: (featureRechts === 'Ziektestadium') ? 8 : undefined,
                }
            }
        }
    });
}

function maakKansenGrafiek(patientData, gekozenVisiteNummer, type) {
    if (mijnKansenGrafiek) {
        mijnKansenGrafiek.destroy();
    }

    const ctx = document.getElementById('KansenGrafiek');
    if (!ctx) return;

    const visiteData = patientData.find(p => p.visit == gekozenVisiteNummer);

    if (!visiteData) {
        schrijfMeldingInCanvas('KansenGrafiek', `Geen data gevonden voor visite ${gekozenVisiteNummer}`);
        return;
    }

    let labels = [];
    let dataPercentages = [];
    let kleur = '';
    let labelNaam = '';

    if (type === 'Stadium') {
        if (!visiteData.stadiumKansen) {
            schrijfMeldingInCanvas('KansenGrafiek', "Patiënt mist benodigde data voor Ziektestadia.");
            return;
        }
        labels = Object.keys(visiteData.stadiumKansen).sort(); 
        dataPercentages = labels.map(k => visiteData.stadiumKansen[k] * 100);
        kleur = 'rgba(54, 162, 235, 0.8)'; 
        labelNaam = 'Kans op Ziektestadium (%)';
        
    } else if (type === 'Traject') {
        if (!visiteData.trajectKansen) {
            schrijfMeldingInCanvas('KansenGrafiek', "Patiënt uitgesloten van trajectmodel wegens missende data.");
            return;
        }
        labels = Object.keys(visiteData.trajectKansen).sort();
        dataPercentages = labels.map(k => visiteData.trajectKansen[k] * 100);
        kleur = 'rgba(75, 192, 192, 0.8)';
        labelNaam = 'Kans op Traject (%)';
    }

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
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Zekerheid (%)' } } },
            plugins: {
                legend: { display: true }, 
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } }
            }
        }
    });
}


let mijnApexHeatmap = null;

function maakApexHeatmap(patientenLijst) {
    const chartContainer = document.querySelector("#heatmapChart");
    if (!chartContainer) return;

    if (mijnApexHeatmap) {
        mijnApexHeatmap.destroy();
    }
    chartContainer.innerHTML = ''; 

    const gesorteerdeLijst = [...patientenLijst].sort((a, b) => a.visit - b.visit);
    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const alleSeries = []; 

    const geldigeVisites = gesorteerdeLijst.filter(v => v.ziektestadium && REF_GEM_PER_STADIA[v.ziektestadium]);

    if (geldigeVisites.length === 0) {
        schrijfMeldingInDiv("heatmapChart", "Geen berekende ziektestadia beschikbaar wegens missende data.");
        return;
    }

    geldigeVisites.forEach(visiteData => {
        const stadium = visiteData.ziektestadium;
        const refWaardes = REF_GEM_PER_STADIA[stadium];
        const rowData = [];

        features.forEach(feat => {
            if (visiteData[feat] === null || visiteData[feat] === undefined) {
                rowData.push({ x: feat, y: null });
                return;
            }

            let patVal = Number(visiteData[feat]);
            let refVal = refWaardes[feat];

            if ((feat === 'HB' || feat === 'Thrombocytes' || feat === 'Leukocytes') && patVal === 0) {
                rowData.push({ x: feat, y: null });
                return; 
            }

            let ratio = patVal / (refVal || 1);
            
            rowData.push({
                x: feat,
                y: ratio.toFixed(2),
                goals: [{ value: patVal, strokeHeight: 0 }, { value: refVal }]
            });
        });

        alleSeries.push({
            name: `Visite ${visiteData.visit} (${stadium})`,
            data: rowData
        });
    });

    const options = {
        series: alleSeries.reverse(), 
        chart: { height: 350, type: 'heatmap', toolbar: { show: false } },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5, radius: 2,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Nul / Zeer laag' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lager' },
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'Normaal' },
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Hoger' }
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        title: { text: `Afwijking tegen ziektestadia referentie` },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white shadow border">Geen data ingevuld</div>';

                const patVal = data.goals && data.goals[0] ? data.goals[0].value.toFixed(1) : "?";
                const refVal = data.goals && data.goals[1] ? data.goals[1].value.toFixed(1) : "?";
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Patiënt: ${patVal} <br>
                            Referentie: ${refVal}
                        </div>
                    </div>
                `;
            }
        }
    };

    mijnApexHeatmap = new ApexCharts(chartContainer, options);
    mijnApexHeatmap.render();
}


let mijnTrajectHeatmap = null;

function maakTrajectHeatmap(patientenLijst) {
    const chartContainer = document.querySelector("#trajectHeatmapChart");
    if (!chartContainer) return;

    if (mijnTrajectHeatmap) {
        mijnTrajectHeatmap.destroy();
    }
    chartContainer.innerHTML = '';

    const gesorteerdeLijst = [...patientenLijst].sort((a, b) => a.visit - b.visit);
    const voorspeldTraject = gesorteerdeLijst[0].ziektetraject;

    if (!voorspeldTraject || !REF_TRAJECT_BASELINE[voorspeldTraject]) {
        schrijfMeldingInDiv("trajectHeatmapChart", "Patiënt uitgesloten van baseline model (ontbrekende data). Heatmap niet mogelijk.");
        return;
    }

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const alleSeries = []; 
    const refWaardes = REF_TRAJECT_BASELINE[voorspeldTraject];

    gesorteerdeLijst.forEach(visiteData => {
        const rowData = [];

        features.forEach(feat => {
            if (visiteData[feat] === null || visiteData[feat] === undefined) {
                rowData.push({ x: feat, y: null });
                return;
            }

            let patVal = Number(visiteData[feat]);
            let refVal = refWaardes[feat]; 

            if ((feat === 'HB' || feat === 'Thrombocytes' || feat === 'Leukocytes') && patVal === 0) {
                rowData.push({ x: feat, y: null });
                return; 
            }

            let ratio = patVal / (refVal || 1);
            
            rowData.push({
                x: feat,
                y: ratio.toFixed(2),
                goals: [{ value: patVal, strokeHeight: 0 }, { value: refVal }]
            });
        });

        alleSeries.push({ name: `Visite ${visiteData.visit}`, data: rowData });
    });

    const options = {
        series: alleSeries.reverse(), 
        chart: { height: 350, type: 'heatmap', toolbar: { show: false } },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5, radius: 2,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Nul' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lager dan baseline' }, 
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'Op baseline' },     
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Hoger dan baseline' } 
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        title: { text: `Afwijking heatmap ${voorspeldTraject}` },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white border">Geen data ingevuld</div>';
                
                const patVal = data.goals[0].value.toFixed(1);
                const refVal = data.goals[1].value.toFixed(1);
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Patiënt: ${patVal} <br>
                            Baseline (${voorspeldTraject}): ${refVal}
                        </div>
                    </div>
                `;
            }
        }
    };

    mijnTrajectHeatmap = new ApexCharts(chartContainer, options);
    mijnTrajectHeatmap.render();
}

function vulBurenTabel(patientenLijst) {
    const tabelBody = document.getElementById('burenTabelBody');
    const meldingVeld = document.getElementById('geenBurenMelding');
    
    tabelBody.innerHTML = '';
    meldingVeld.classList.add('hidden'); 
    meldingVeld.innerText = "";          

    const patient = patientenLijst[0];

    if (patient.knn_buren && patient.knn_buren.length > 0) {
        patient.knn_buren.forEach(buur => {
            const rij = document.createElement('tr');
            rij.className = "bg-white border-b hover:bg-gray-50";
            
            rij.innerHTML = `
                <td class="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">${buur.id}</td>
                <td class="px-4 py-2">
                    <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        ${buur.traject}
                    </span>
                </td>
                <td class="px-4 py-2">Afstand: ${buur.afstand.toFixed(2)}</td>
            `;
            tabelBody.appendChild(rij);
        });
    } else {
        meldingVeld.innerText = "Deze vergelijking is alleen beschikbaar wanneer de KWT/KNN Pipeline is gebruikt.";
        meldingVeld.classList.remove('hidden');
    }
}

function vulPatientSpecifiekeLegenda(patientLijst) {
    const trajectBody = document.getElementById('legendaTrajectBody');
    const stadiaBody = document.getElementById('legendaStadiaBody');

    if (!trajectBody || !stadiaBody || patientLijst.length === 0) return;

    trajectBody.innerHTML = '';
    stadiaBody.innerHTML = '';

    const trajectCode = patientLijst[0].ziektetraject;
    
    if (trajectCode && UITLEG_TRAJECTEN[trajectCode]) {
        const rij = document.createElement('tr');
        rij.className = "border-b border-gray-100";
        rij.innerHTML = `
            <td class="py-2 px-2 font-bold text-blue-600 w-16 align-top">${trajectCode}</td>
            <td class="py-2 px-2 text-gray-600 text-xs">${UITLEG_TRAJECTEN[trajectCode]}</td>
        `;
        trajectBody.appendChild(rij);
    } else {
        trajectBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs italic">Uitgesloten van trajectbepaling</td></tr>';
    }

    // Filter "Onbekend" eruit voor de legenda
    const uniekeStadia = new Set(patientLijst.map(p => p.ziektestadium).filter(s => s && !s.startsWith("Onbekend")));
    const gesorteerdeStadia = Array.from(uniekeStadia).sort();

    if (gesorteerdeStadia.length > 0) {
        gesorteerdeStadia.forEach(stadiumCode => {
            if (UITLEG_STADIA[stadiumCode]) {
                const rij = document.createElement('tr');
                rij.className = "border-b border-gray-100";
                rij.innerHTML = `
                    <td class="py-2 px-2 font-bold text-gray-800 w-16 align-top">${stadiumCode}</td>
                    <td class="py-2 px-2 text-gray-600 text-xs">${UITLEG_STADIA[stadiumCode]}</td>
                `;
                stadiaBody.appendChild(rij);
            }
        });
    } else {
        stadiaBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs italic">Geen berekende stadia beschikbaar</td></tr>';
    }
}


// ==========================================================================
// POPULATIE FIGUREN (DASHBOARD)
// ==========================================================================

let mijnTrajectTrendGrafiek = null;

function maakTrajectTrendGrafiek(gemiddeldeData, feature1, feature2) {
    let maxVisit = 0;
    Object.values(gemiddeldeData).forEach(lijst => {
        if (lijst) {
            lijst.forEach(punt => {
                if (punt.visit > maxVisit) maxVisit = punt.visit;
            });
        }
    });

    if (maxVisit === 0) {
        schrijfMeldingInCanvas('TrajectTrendGrafiek', "Geen bruikbare populatiedata voor deze trendgrafiek.");
        if (mijnTrajectTrendGrafiek) mijnTrajectTrendGrafiek.destroy();
        return;
    }

    const labels = [];
    for (let i = 1; i <= maxVisit; i++) { labels.push(`Visite ${i}`); }

    const trajectConfig = [
        { id: 'TR1', label: 'TR1', dash: [] },
        { id: 'TR2', label: 'TR2', dash: [5, 5] },
        { id: 'TR3', label: 'TR3', dash: [2, 2] },
        { id: 'TR4', label: 'TR4', dash: [10, 5, 2, 5] }
    ];

    let alleDatasets = [];

    trajectConfig.forEach(config => {
        const rawData = gemiddeldeData[config.id]; 
        const dataReeks1 = new Array(maxVisit).fill(null);
        const dataReeks2 = new Array(maxVisit).fill(null);
        let heeftData = false;

        if (rawData && rawData.length > 0) {
            rawData.forEach(punt => {
                const index = punt.visit - 1; 
                if (index >= 0 && index < maxVisit) {
                    dataReeks1[index] = punt[feature1];
                    dataReeks2[index] = punt[feature2];
                    heeftData = true;
                }
            });
        }

        if (heeftData) {
            alleDatasets.push({
                label: `${config.id}: ${feature1}`, data: dataReeks1, 
                borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgb(54, 162, 235)',
                borderDash: config.dash, borderWidth: 2, yAxisID: 'y-left',
                tension: 0.1, pointRadius: 6, pointHoverRadius: 8, spanGaps: true 
            });

            alleDatasets.push({
                label: `${config.id}: ${feature2}`, data: dataReeks2,
                borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgb(255, 99, 132)',
                borderDash: config.dash, borderWidth: 2, yAxisID: 'y-right',
                tension: 0.1, pointRadius: 6, pointHoverRadius: 8, spanGaps: true
            });
        }
    });

    const ctx = document.getElementById('TrajectTrendGrafiek');
    if (!ctx) return;

    if (mijnTrajectTrendGrafiek) mijnTrajectTrendGrafiek.destroy();

    mijnTrajectTrendGrafiek = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: alleDatasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                title: { display: true, text: `Vergelijking Trajecten: ${feature1} (Links) vs ${feature2} (Rechts)` },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.parsed.y;
                            if (val !== null && val !== undefined) return context.dataset.label + ': ' + val.toFixed(2);
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: { display: true, title: { display: true, text: 'Visites' } },
                'y-left': { type: 'linear', display: true, position: 'left', title: { display: true, text: feature1, color: 'rgb(54, 162, 235)' } },
                'y-right': { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: feature2, color: 'rgb(255, 99, 132)' } }
            }
        }
    });
}

// ==========================================================================
// POPULATIESCATTER (PCA) - PER VISITE MET Z-SCORE
// ==========================================================================

let mijnPopulatieScatter = null;

function maakPopulatieScatter(patientenLijst) {
    const ctx = document.getElementById('PopulatieScatter');
    if (!ctx) return;

    if (mijnPopulatieScatter) mijnPopulatieScatter.destroy();

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const dataMatrix = [];
    const patientInfos = []; 

    // 1. DATA VERZAMELEN
    patientenLijst.forEach(p => {
        if (!p.ziektetraject || p.ziektetraject.startsWith("Onbekend")) return;

        let mistData = false;
        const rij = [];

        for (const f of features) {
            if (p[f] === null || p[f] === undefined || p[f] === "") {
                mistData = true;
                break; 
            }
            rij.push(Number(p[f]));
        }

        if (!mistData) {
            dataMatrix.push(rij);
            patientInfos.push({ 
                id: p.patient_id, 
                visit: p.visit, 
                traject: p.ziektetraject 
            });
        }
    });

    // ====================================================================
    // DE HARDE GRENS: Minimaal 6 visites nodig (omdat we 6 features hebben)
    // ====================================================================
    if (dataMatrix.length < 6) {
        schrijfMeldingInCanvas('PopulatieScatter', `Te weinig data voor PCA. Minimaal 6 complete visites vereist (Gevonden: ${dataMatrix.length}).`);
        return; // Stop de functie hier: we tekenen géén figuur.
    }

    try {
        // 2. TRANSPONEREN
        const transpose = m => m[0].map((x,i) => m.map(x => x[i]));
        const dataVoorPCA = transpose(dataMatrix);

        // 3. Z-SCORE NORMALISATIE (Werkt nu altijd, want we hebben data > 6)
        const genormaliseerdeData = dataVoorPCA.map(featureRij => {
            const n = featureRij.length;

            // gemiddelde berekenenn
            const mean = featureRij.reduce((sum, val) => sum + val, 0) / n;

            // standaaardafwijking
            const variantie = featureRij.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
            const stdDev = Math.sqrt(variantie);

            // Z score 
            return featureRij.map(val => {
                if (stdDev === 0) return 0; 
                return (val - mean) / stdDev;
            });
        });

        // 4. DE WISKUNDE
        const vectors = PCA.getEigenVectors(genormaliseerdeData);
        
        if (!vectors || vectors.length < 2) {
            schrijfMeldingInCanvas('PopulatieScatter', "Data heeft niet genoeg variatie om een PCA grafiek te tekenen.");
            return;
        }

        const adData = PCA.computeAdjustedData(genormaliseerdeData, vectors[0], vectors[1]);

        // 5. DATA KOPPELEN AAN GRAFIEK
        const datasets = {
            'TR1': { label: 'TR1', data: [], backgroundColor: 'green' },
            'TR2': { label: 'TR2', data: [], backgroundColor: 'orange' },
            'TR3': { label: 'TR3', data: [], backgroundColor: 'red' },
            'TR4': { label: 'TR4', data: [], backgroundColor: 'purple' }
        };

        for (let i = 0; i < patientInfos.length; i++) {
            const x = adData.adjustedData[0][i];
            const y = adData.adjustedData[1][i];
            const info = patientInfos[i];
            
            if (info.traject && datasets[info.traject]) {
                datasets[info.traject].data.push({ 
                    x: x, 
                    y: y, 
                    patientId: info.id,
                    visitNummer: info.visit 
                });
            }
        }

        const actieveDatasets = Object.values(datasets).filter(ds => ds.data.length > 0);

        // 6. GRAFIEK TEKENEN
        mijnPopulatieScatter = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: actieveDatasets },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'PCA Clustering (Genormaliseerd met Z-score)' },
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const naam = context.raw.patientId;
                                const vis = context.raw.visitNummer;
                                return `Patiënt: ${naam} (Visite ${vis})`;
                            },
                            afterLabel: (context) => `(PC1: ${context.parsed.x.toFixed(2)}, PC2: ${context.parsed.y.toFixed(2)})`
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Principal Component 1' } },
                    y: { title: { display: true, text: 'Principal Component 2' } }
                }
            }
        });
        
    } catch (e) {
        console.error("PCA Fout:", e);
        schrijfMeldingInCanvas('PopulatieScatter', "Kan PCA niet berekenen door een wiskundige fout in de data.");
    }
}

// ==========================================================================
// POPULATIE HEATMAPS (ALLE PATIËNTEN)
// ==========================================================================

let mijnPopulatieStadiaHeatmap = null;

function maakPopulatieStadiaHeatmap(patientenLijst) {
    const chartContainer = document.querySelector("#populatieStadiaHeatmapChart");
    if (!chartContainer) return;

    if (mijnPopulatieStadiaHeatmap) {
        mijnPopulatieStadiaHeatmap.destroy();
    }
    chartContainer.innerHTML = '';

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const geaggregeerdeData = {};

    // 1. Data groeperen en optellen per stadium
    patientenLijst.forEach(p => {
        const stadium = p.ziektestadium;
        if (stadium && !stadium.startsWith("Onbekend") && REF_GEM_PER_STADIA[stadium]) {
            if (!geaggregeerdeData[stadium]) {
                geaggregeerdeData[stadium] = { counts: {}, sums: {} };
                features.forEach(f => { geaggregeerdeData[stadium].counts[f] = 0; geaggregeerdeData[stadium].sums[f] = 0; });
            }
            
            features.forEach(feat => {
                if (p[feat] !== null && p[feat] !== undefined && p[feat] !== "") {
                    geaggregeerdeData[stadium].sums[feat] += Number(p[feat]);
                    geaggregeerdeData[stadium].counts[feat]++;
                }
            });
        }
    });

    const gevondenStadia = Object.keys(geaggregeerdeData).sort(); // Bijv: L1, L2, L4

    if (gevondenStadia.length === 0) {
        schrijfMeldingInDiv("populatieStadiaHeatmapChart", "Geen geldige ziektestadia data gevonden voor de populatie heatmap.");
        return;
    }

    const alleSeries = [];

    // 2. Gemiddeldes berekenen en formatten voor ApexCharts
    gevondenStadia.forEach(stadium => {
        const refWaardes = REF_GEM_PER_STADIA[stadium];
        const rowData = [];

        features.forEach(feat => {
            const count = geaggregeerdeData[stadium].counts[feat];
            if (count === 0) {
                rowData.push({ x: feat, y: null });
                return;
            }

            const gemVal = geaggregeerdeData[stadium].sums[feat] / count;
            const refVal = refWaardes[feat];

            if ((feat === 'HB' || feat === 'Thrombocytes' || feat === 'Leukocytes') && gemVal === 0) {
                rowData.push({ x: feat, y: null });
                return; 
            }

            const ratio = gemVal / (refVal || 1);

            rowData.push({
                x: feat,
                y: ratio.toFixed(2),
                goals: [{ value: gemVal, strokeHeight: 0 }, { value: refVal }]
            });
        });

        alleSeries.push({ name: `Stadium ${stadium}`, data: rowData });
    });

    const options = {
        series: alleSeries.reverse(), // Reverse zorgt dat L1 bovenaan staat
        chart: { height: 350, type: 'heatmap', toolbar: { show: false } },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5, radius: 2,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Nul / Zeer laag' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lager' },
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'Normaal' },
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Hoger' }
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        title: { text: `Populatie: Gemiddelde per Stadium vs Referentie` },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white shadow border">Geen data ingevuld</div>';

                const patVal = data.goals && data.goals[0] ? data.goals[0].value.toFixed(1) : "?";
                const refVal = data.goals && data.goals[1] ? data.goals[1].value.toFixed(1) : "?";
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Populatie Gem.: ${patVal} <br>
                            Referentie: ${refVal}
                        </div>
                    </div>
                `;
            }
        }
    };

    mijnPopulatieStadiaHeatmap = new ApexCharts(chartContainer, options);
    mijnPopulatieStadiaHeatmap.render();
}


let mijnPopulatieTrajectHeatmap = null;

function maakPopulatieTrajectHeatmap(patientenLijst) {
    const chartContainer = document.querySelector("#populatieTrajectHeatmapChart");
    if (!chartContainer) return;

    if (mijnPopulatieTrajectHeatmap) {
        mijnPopulatieTrajectHeatmap.destroy();
    }
    chartContainer.innerHTML = '';

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const geaggregeerdeData = {};

    // 1. Data groeperen. Let op: Voor trajecten pakken we ALLEEN Visite 1 (Baseline)
    patientenLijst.forEach(p => {
        const traject = p.ziektetraject;
        if (traject && !traject.startsWith("Onbekend") && REF_TRAJECT_BASELINE[traject] && Number(p.visit) === 1) {
            if (!geaggregeerdeData[traject]) {
                geaggregeerdeData[traject] = { counts: {}, sums: {} };
                features.forEach(f => { geaggregeerdeData[traject].counts[f] = 0; geaggregeerdeData[traject].sums[f] = 0; });
            }
            
            features.forEach(feat => {
                if (p[feat] !== null && p[feat] !== undefined && p[feat] !== "") {
                    geaggregeerdeData[traject].sums[feat] += Number(p[feat]);
                    geaggregeerdeData[traject].counts[feat]++;
                }
            });
        }
    });

    const gevondenTrajecten = Object.keys(geaggregeerdeData).sort(); 

    if (gevondenTrajecten.length === 0) {
        schrijfMeldingInDiv("populatieTrajectHeatmapChart", "Geen Baseline (Visite 1) data gevonden om trajecten te groeperen.");
        return;
    }

    const alleSeries = [];

    gevondenTrajecten.forEach(traject => {
        const refWaardes = REF_TRAJECT_BASELINE[traject];
        const rowData = [];

        features.forEach(feat => {
            const count = geaggregeerdeData[traject].counts[feat];
            if (count === 0) {
                rowData.push({ x: feat, y: null });
                return;
            }

            const gemVal = geaggregeerdeData[traject].sums[feat] / count;
            const refVal = refWaardes[feat];

            if ((feat === 'HB' || feat === 'Thrombocytes' || feat === 'Leukocytes') && gemVal === 0) {
                rowData.push({ x: feat, y: null });
                return; 
            }

            const ratio = gemVal / (refVal || 1);

            rowData.push({
                x: feat,
                y: ratio.toFixed(2),
                goals: [{ value: gemVal, strokeHeight: 0 }, { value: refVal }]
            });
        });

        alleSeries.push({ name: `${traject} (Baseline)`, data: rowData });
    });

    const options = {
        series: alleSeries.reverse(), 
        chart: { height: 300, type: 'heatmap', toolbar: { show: false } },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5, radius: 2,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Nul' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lager' }, 
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'Normaal' },    
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Hoger' } 
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        title: { text: `Populatie: Traject Baseline vs Referentie` },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white border">Geen data ingevuld</div>';
                
                const patVal = data.goals[0].value.toFixed(1);
                const refVal = data.goals[1].value.toFixed(1);
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Populatie Gem.: ${patVal} <br>
                            Baseline Ref.: ${refVal}
                        </div>
                    </div>
                `;
            }
        }
    };

    mijnPopulatieTrajectHeatmap = new ApexCharts(chartContainer, options);
    mijnPopulatieTrajectHeatmap.render();
}