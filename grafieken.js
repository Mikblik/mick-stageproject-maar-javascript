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
            return data.map(p => Number(p.ziektestadium.replace('L', '')));
        } else {
            return data.map(p => Number(p[featureNaam]));
        }
    };

    const dataLinks = getFeatureData(featureLinks);
    const dataRechts = getFeatureData(featureRechts);

    const ctx = document.getElementById('ComboGrafiek');
    if (!ctx) return;

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
                    tension: 0.1
                },
                {
                    label: featureRechts, 
                    data: dataRechts,
                    borderColor: 'rgb(255, 99, 132)', 
                    backgroundColor: 'rgb(255, 99, 132)',
                    yAxisID: 'y-axis-right', 
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
                'y-axis-left': {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: featureLinks, color: 'rgb(54, 162, 235)' },
                    min: (featureLinks === 'Ziektestadium') ? 1 : undefined,
                    max: (featureLinks === 'Ziektestadium') ? 8 : undefined,
                },
                'y-axis-right': {
                    type: 'linear',
                    display: true,
                    position: 'right',
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
    
    const visiteData = patientData.find(p => p.visit == gekozenVisiteNummer);

    if (!visiteData) {
        console.warn("Geen data gevonden voor visite", gekozenVisiteNummer);
        return;
    }

    if (mijnKansenGrafiek) {
        mijnKansenGrafiek.destroy();
    }

    let labels = [];
    let dataPercentages = [];
    let kleur = '';
    let labelNaam = '';

    if (type === 'Stadium') {
        if (visiteData.stadiumKansen) {
            labels = Object.keys(visiteData.stadiumKansen).sort(); 
            dataPercentages = labels.map(k => visiteData.stadiumKansen[k] * 100);
            kleur = 'rgba(54, 162, 235, 0.8)'; 
            labelNaam = 'Kans op Ziektestadium (%)';
        }
    } else if (type === 'Traject') {
        if (visiteData.trajectKansen) {
            labels = Object.keys(visiteData.trajectKansen).sort();
            dataPercentages = labels.map(k => visiteData.trajectKansen[k] * 100);
            kleur = 'rgba(75, 192, 192, 0.8)';
            labelNaam = 'Kans op Traject (%)';
        }
    }

    if (labels.length === 0) {
        console.warn(`Geen kansen data gevonden voor type: ${type}`);
    }

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
                    max: 100, 
                    title: { display: true, text: 'Zekerheid (%)' }
                }
            },
            plugins: {
                legend: { display: true }, 
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw.toFixed(1)}%`
                    }
                }
            }
        }
    });
}

// ALLE PATIENT FIGUREN

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
        console.warn("Geen visites gevonden voor trendgrafiek.");
        if (mijnTrajectTrendGrafiek) mijnTrajectTrendGrafiek.destroy();
        return;
    }

    const labels = [];
    for (let i = 1; i <= maxVisit; i++) {
        labels.push(`Visite ${i}`);
    }

    const trajectConfig = [
        { id: 'TR1', label: 'TR1', dash: [] },              // Vast
        { id: 'TR2', label: 'TR2', dash: [5, 5] },          // Streepjes
        { id: 'TR3', label: 'TR3', dash: [2, 2] },          // Stippels
        { id: 'TR4', label: 'TR4', dash: [10, 5, 2, 5] }    // Streep Punt
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
                label: `${config.id}: ${feature1}`,
                data: dataReeks1, 
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgb(54, 162, 235)',
                borderDash: config.dash,
                borderWidth: 2,
                yAxisID: 'y-left',
                tension: 0.1,
                pointRadius: 6, // GROTER PUNTJE: Zodat je enkele punten goed ziet
                pointHoverRadius: 8,
                spanGaps: true 
            });

            alleDatasets.push({
                label: `${config.id}: ${feature2}`,
                data: dataReeks2,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgb(255, 99, 132)',
                borderDash: config.dash,
                borderWidth: 2,
                yAxisID: 'y-right',
                tension: 0.1,
                pointRadius: 6,
                pointHoverRadius: 8,
                spanGaps: true
            });
        }
    });

    const ctx = document.getElementById('TrajectTrendGrafiek');
    if (!ctx) return;

    if (mijnTrajectTrendGrafiek) {
        mijnTrajectTrendGrafiek.destroy();
    }

    mijnTrajectTrendGrafiek = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, 
            datasets: alleDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: `Vergelijking Trajecten: ${feature1} (Links) vs ${feature2} (Rechts)`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.parsed.y;
                            if (val !== null && val !== undefined) {
                                return context.dataset.label + ': ' + val.toFixed(2);
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: { display: true, text: 'Visites' }
                },
                'y-left': {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: feature1, color: 'rgb(54, 162, 235)' }
                },
                'y-right': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: feature2, color: 'rgb(255, 99, 132)' }
                }
            }
        }
    });
}


let mijnApexHeatmap = null;

function maakApexHeatmap(patientenLijst) {
    
    const gesorteerdeLijst = [...patientenLijst].sort((a, b) => a.visit - b.visit);

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const alleSeries = []; 

    gesorteerdeLijst.forEach(visiteData => {
        const stadium = visiteData.ziektestadium;
        
        if (!stadium || !REF_GEM_PER_STADIA[stadium]) return;

        const refWaardes = REF_GEM_PER_STADIA[stadium];
        const rowData = [];

        features.forEach(feat => {
            let patVal = Number(visiteData[feat]);
            let refVal = refWaardes[feat];

            if ((feat === 'HB' || feat === 'Thrombocytes' || feat === 'Leukocytes') && patVal === 0) {
                rowData.push({
                    x: feat,
                    y: null 
                });
                return; 
            }

            let ratio = patVal / (refVal || 1);
            
            rowData.push({
                x: feat,
                y: ratio.toFixed(2),
                goals: [{
                    value: patVal, 
                    strokeHeight: 0 
                }, {
                    value: refVal // De referentiewaarde
                }]
            });
        });

        alleSeries.push({
            name: `Visite ${visiteData.visit} (${stadium})`,
            data: rowData
        });
    });

    // Grafiek Opties
    const options = {
        series: alleSeries.reverse(), // Visite 1 boven, Visite 2 onder
        chart: {
            height: 350,
            type: 'heatmap',
            toolbar: { show: false }
        },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5,
                radius: 2, // Iets rondere hoekjes
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
        dataLabels: {
            enabled: true,
            style: { colors: ['#000'] } 
        },
        title: {
            text: `Afwijking tegen ziektestadia referentie`
        },
        xaxis: {
            position: 'bottom', 
            tooltip: { enabled: false }
        },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                
                if (ratio === null) return '<div class="p-2 text-xs">Geen data</div>';

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

    if (mijnApexHeatmap) {
        mijnApexHeatmap.destroy();
    }

    const chartContainer = document.querySelector("#heatmapChart");
    if(chartContainer) {
        mijnApexHeatmap = new ApexCharts(chartContainer, options);
        mijnApexHeatmap.render();
    }
}

// Traject heatmap individu pagiina.
let mijnTrajectHeatmap = null;

function maakTrajectHeatmap(patientenLijst) {
    const gesorteerdeLijst = [...patientenLijst].sort((a, b) => a.visit - b.visit);
    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const alleSeries = []; 


    const voorspeldTraject = gesorteerdeLijst[0].ziektetraject;

    if (!voorspeldTraject || !REF_TRAJECT_BASELINE[voorspeldTraject]) {
        console.warn("Geen referentiedata voor traject:", voorspeldTraject);
        if (mijnTrajectHeatmap) mijnTrajectHeatmap.destroy();
        return;
    }

    const refWaardes = REF_TRAJECT_BASELINE[voorspeldTraject];

    gesorteerdeLijst.forEach(visiteData => {
        const rowData = [];

        features.forEach(feat => {
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
                goals: [{ 
                    value: patVal, 
                    strokeHeight: 0 
                }, { 
                    value: refVal 
                }]
            });
        });

        alleSeries.push({
            name: `Visite ${visiteData.visit}`, 
            data: rowData
        });
    });

    const options = {
        series: alleSeries.reverse(), 
        chart: {
            height: 350,
            type: 'heatmap',
            toolbar: { show: false }
        },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5,
                radius: 2,
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
        title: {
            text: `Afwijking heatmap ${voorspeldTraject}`
        },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs">Geen data</div>';
                
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

    if (mijnTrajectHeatmap) {
        mijnTrajectHeatmap.destroy();
    }

    const chartContainer = document.querySelector("#trajectHeatmapChart");
    if(chartContainer) {
        mijnTrajectHeatmap = new ApexCharts(chartContainer, options);
        mijnTrajectHeatmap.render();
    }
}

// top 5 buren tabel individupaigna
function vulBurenTabel(patientenLijst) {
    const tabelBody = document.getElementById('burenTabelBody');
    const meldingVeld = document.getElementById('geenBurenMelding');
    
    tabelBody.innerHTML = '';
    meldingVeld.classList.add('hidden'); 
    meldingVeld.innerText = "";          

    const patient = patientenLijst[0];

    if (patient.knn_buren && patient.knn_buren.length > 0) {
        console.log("Buren tabel: KNN data gevonden.");

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
                <td class="px-4 py-2">
                    Afstand: ${buur.afstand.toFixed(2)}
                </td>
            `;
            tabelBody.appendChild(rij);
        });

    } else {
        console.log("Buren tabel: Geen KNN data. Toon melding.");
        
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
        trajectBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs">Geen traject bekend</td></tr>';
    }

    const uniekeStadia = new Set(patientLijst.map(p => p.ziektestadium));
    
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
        stadiaBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs">Geen stadia data</td></tr>';
    }
}

let mijnPopulatieScatter = null;

function maakPopulatieScatter(patientenLijst) {
    const ctx = document.getElementById('PopulatieScatter');
    if (!ctx) return;

    if (mijnPopulatieScatter) mijnPopulatieScatter.destroy();

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const uniekePatienten = {};
    
    patientenLijst.forEach(p => {
        if (!uniekePatienten[p.patient_id]) {
            uniekePatienten[p.patient_id] = { 
                id: p.patient_id, 
                traject: p.ziektetraject,
                count: 0,
                sums: { TJC:0, SJC:0, ESR:0, Leukocytes:0, HB:0, Thrombocytes:0 }
            };
        }
        features.forEach(f => {
            uniekePatienten[p.patient_id].sums[f] += Number(p[f] || 0);
        });
        uniekePatienten[p.patient_id].count++;
    });

    const dataMatrix = [];
    const patientInfos = []; 

    Object.values(uniekePatienten).forEach(p => {
        const rij = features.map(f => p.sums[f] / p.count);
        dataMatrix.push(rij);
        patientInfos.push({ traject: p.traject, id: p.id });
    });

    if (dataMatrix.length < 2) return;

    const transpose = m => m[0].map((x,i) => m.map(x => x[i]));
    const dataVoorPCA = transpose(dataMatrix);

    const vectors = PCA.getEigenVectors(dataVoorPCA);
    const adData = PCA.computeAdjustedData(dataVoorPCA, vectors[0], vectors[1]);

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
                patientId: info.id 
            });
        }
    }

    mijnPopulatieScatter = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: Object.values(datasets) },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'PCA Clustering (PC1 vs PC2)' },
                legend: { position: 'top' },
                
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const naam = context.raw.patientId;
                            return `Patiënt: ${naam}`;
                        },
                        afterLabel: (context) => {
                            return `(PC1: ${context.parsed.x.toFixed(1)}, PC2: ${context.parsed.y.toFixed(1)})`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Principal Component 1' } },
                y: { title: { display: true, text: 'Principal Component 2' } }
            }
        }
    });
}