/*
 * ============================================================================
 * BESTAND: grafieken.js
 * BESCHRIJVING: 
 * Dit script bevat alle logica voor het genereren van de Chart.js grafieken.
 * Het leest de voorspellingen uit de patiëntdata en tekent de trendlijnen,
 * spreidingsdiagrammen (PCA) en bar-charts (Zekerheid/Kansen).
 * ============================================================================
 */

// ==========================================================================
// 1. HELPERS (UI berichten voor missing data bericht)
// ==========================================================================

function schrijfMeldingInCanvas(ctxId, tekst) {
    const canvas = document.getElementById(ctxId);
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "14px Arial";
    context.fillStyle = "#6b7280"; // Gray text
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
// 2. individuele patiënt grafieken
// ==========================================================================

let mijnComboGrafiek = null;
let mijnKansenGrafiek = null;

// ==========================================================================
// 2a. feature trendlijn
// ==========================================================================
function maakFlexibeleComboGrafiek(data, featureLinks, featureRechts) {
    if (mijnComboGrafiek) {
        mijnComboGrafiek.destroy();
    }

    const gesorteerdedata = [...data].sort((a, b) => a.visit - b.visit);
    const labels = gesorteerdedata.map(waarde => `${waarde.visit}`);

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

    // verander naar de bijhorende feature namen 
    const displayLabelLinks = (featureLinks === 'Ziektestadium') ? 'Disease Stage' : featureLinks;
    const displayLabelRechts = (featureRechts === 'Ziektestadium') ? 'Disease Stage' : featureRechts;

    const dataLinks = getFeatureData(featureLinks);
    const dataRechts = getFeatureData(featureRechts);

    const ctx = document.getElementById('ComboGrafiek');
    if (!ctx) return;

    const spanGapsChecker = (ctx, stippelPatroon) => {
        if (!ctx.p0 || !ctx.p1) return undefined;
        
        if (ctx.p0.skip || ctx.p1.skip || (ctx.p1DataIndex - ctx.p0DataIndex > 1)) {
            return stippelPatroon;
        }
        return undefined;
    };

    mijnComboGrafiek = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: displayLabelLinks, 
                    data: dataLinks,
                    borderColor: 'rgb(54, 162, 235)', 
                    backgroundColor: 'rgb(54, 162, 235)',
                    yAxisID: 'y-axis-left', 
                    tension: 0.1,
                    spanGaps: true,
                    segment: {
                        borderDash: ctx => spanGapsChecker(ctx, [5, 5])
                    }
                },
                {
                    label: displayLabelRechts, 
                    data: dataRechts,
                    borderColor: 'rgb(255, 99, 132)', 
                    backgroundColor: 'rgb(255, 99, 132)',
                    yAxisID: 'y-axis-right', 
                    tension: 0.1,
                    spanGaps: true,
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
                x: { title: { display: true, text: 'Visits' } },
                'y-axis-left': {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: displayLabelLinks, color: 'rgb(54, 162, 235)' },
                    min: (featureLinks === 'Ziektestadium') ? 1 : undefined,
                    max: (featureLinks === 'Ziektestadium') ? 8 : undefined,
                },
                'y-axis-right': {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: displayLabelRechts, color: 'rgb(255, 99, 132)' },
                    grid: { drawOnChartArea: false }, 
                    min: (featureRechts === 'Ziektestadium') ? 1 : undefined,
                    max: (featureRechts === 'Ziektestadium') ? 8 : undefined,
                }
            }
        }
    });
}

// ==========================================================================
// 2b. kans model ziektestadium/ziektetraject staafdiagram
// ==========================================================================
function maakKansenGrafiek(patientData, gekozenVisiteNummer, type) {
    if (mijnKansenGrafiek) {
        mijnKansenGrafiek.destroy();
    }

    const ctx = document.getElementById('KansenGrafiek');
    if (!ctx) return;

    const visiteData = patientData.find(p => p.visit == gekozenVisiteNummer);

    if (!visiteData) {
        schrijfMeldingInCanvas('KansenGrafiek', `No data found for visit ${gekozenVisiteNummer}`);
        return;
    }

    let labels = [];
    let dataPercentages = [];
    let kleur = '';
    let labelNaam = '';

    if (type === 'Stadium') {
        if (!visiteData.stadiumKansen) {
            schrijfMeldingInCanvas('KansenGrafiek', "Patient is missing required data for Disease Stage prediction.");
            return;
        }
        labels = Object.keys(visiteData.stadiumKansen).sort(); 
        dataPercentages = labels.map(k => visiteData.stadiumKansen[k] * 100);
        kleur = 'rgba(54, 162, 235, 0.8)'; 
        labelNaam = 'Probability of Disease Stage (%)';
        
    } else if (type === 'Traject') {
        if (!visiteData.trajectKansen) {
            schrijfMeldingInCanvas('KansenGrafiek', "Patient excluded from trajectory model due to missing data.");
            return;
        }
        labels = Object.keys(visiteData.trajectKansen).sort();
        dataPercentages = labels.map(k => visiteData.trajectKansen[k] * 100);
        kleur = 'rgba(75, 192, 192, 0.8)';
        labelNaam = 'Probability of Trajectory (%)';
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
            scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Confidence (%)' } } },
            plugins: {
                legend: { display: true }, 
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toFixed(1)}%` } }
            }
        }
    });
}


// ==========================================================================
// 2c. HEATMAP: ziektestadia vs referentie
// ==========================================================================
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

    // Alleen visites met een geldig ziektestadium filteren
    const geldigeVisites = gesorteerdeLijst.filter(v => v.ziektestadium && REF_GEM_PER_STADIA[v.ziektestadium]);

    if (geldigeVisites.length === 0) {
        schrijfMeldingInDiv("heatmapChart", "No calculated disease stages available due to missing data.");
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
            name: `Visit ${visiteData.visit} (${stadium})`,
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
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Zero / Very Low' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lower' },
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'Normal' },
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Higher' }
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white shadow border">No data entered</div>';

                const patVal = data.goals && data.goals[0] ? data.goals[0].value.toFixed(1) : "?";
                const refVal = data.goals && data.goals[1] ? data.goals[1].value.toFixed(1) : "?";
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Patient: ${patVal} <br>
                            Reference: ${refVal}
                        </div>
                    </div>
                `;
            }
        }
    };

    mijnApexHeatmap = new ApexCharts(chartContainer, options);
    mijnApexHeatmap.render();
}


// ==========================================================================
// 2d. HEATMAP: ziektetraject vs referentie
// ==========================================================================
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
        schrijfMeldingInDiv("trajectHeatmapChart", "Patient excluded from baseline model (missing data). Heatmap not possible.");
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

        alleSeries.push({ name: `Visit ${visiteData.visit}`, data: rowData });
    });

    const options = {
        series: alleSeries.reverse(), 
        chart: { height: 350, type: 'heatmap', toolbar: { show: false } },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5, radius: 2,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Zero' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lower than baseline' }, 
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'At baseline' },     
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Higher than baseline' } 
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white border">No data entered</div>';
                
                const patVal = data.goals[0].value.toFixed(1);
                const refVal = data.goals[1].value.toFixed(1);
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Patient: ${patVal} <br>
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

// ==========================================================================
// 2E. top 5 buren uit de pipeline tabel 
// ==========================================================================

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
                <td class="px-4 py-2">Distance: ${buur.afstand.toFixed(2)}</td>
            `;
            tabelBody.appendChild(rij);
        });
    } else {
        meldingVeld.innerText = "This comparison is only available when the KWT/KNN Pipeline is used.";
        meldingVeld.classList.remove('hidden');
    }
}

// ==========================================================================
// 2F. Graph projection voor individuele patiënt
// ==========================================================================

let individualNetwork = null;

function maakIndividualGraphProjection(patientenLijst, gekozenTrajectRef) {
    const container = document.getElementById('graphProjectionNetwork');
    if (!container) return;

    if (individualNetwork) {
        individualNetwork.destroy();
    }
    container.innerHTML = '';

    if (typeof vis === 'undefined') {
        schrijfMeldingInDiv("graphProjectionNetwork", "Vis.js library not loaded.");
        return;
    }
    if (typeof REF_GRAPH_PER_TRAJECT === 'undefined') {
        schrijfMeldingInDiv("graphProjectionNetwork", "No reference graph data found in referentiewaardes.js.");
        return;
    }

    const trajectRef = REF_GRAPH_PER_TRAJECT[gekozenTrajectRef];
    if (!trajectRef) {
        schrijfMeldingInDiv("graphProjectionNetwork", `No data available for reference ${gekozenTrajectRef}.`);
        return;
    }

    const gesorteerdeLijst = [...patientenLijst].sort((a, b) => a.visit - b.visit);
    const patiëntFilm = gesorteerdeLijst.map(p => p.ziektestadium).filter(s => s && !s.startsWith("Onbekend"));

    const uniekeStadia = Object.keys(trajectRef.nodes);
    const nodeData = uniekeStadia.map(stadiumCode => {
        const isPatiëntInDitStadium = patiëntFilm.includes(stadiumCode);
        return {
            id: stadiumCode,
            label: stadiumCode,
            shape: 'dot',
            size: 10 + (trajectRef.nodes[stadiumCode] * 0.2), 
            
            color: {
                background: isPatiëntInDitStadium ? '#2563EB' : '#E5E7EB', 
                border: isPatiëntInDitStadium ? '#1D4ED8' : '#D1D5DB' 
            },
            
            font: { 
                color: '#111827', 
                face: 'Arial, sans-serif', 
                size: isPatiëntInDitStadium ? 16 : 14, 
                bold: isPatiëntInDitStadium
            }
        };
    });

    const edgeData = trajectRef.edges.map(overgang => {
        let isPatiëntOvergang = false;
        for (let i = 0; i < patiëntFilm.length - 1; i++) {
            if (patiëntFilm[i] === overgang.from && patiëntFilm[i+1] === overgang.to) {
                isPatiëntOvergang = true; break;
            }
        }
        return {
            from: overgang.from, 
            to: overgang.to, 
            
            arrows: { 
                to: { enabled: true, scaleFactor: isPatiëntOvergang ? 1.5 : 0.5 } 
            },
            
            color: isPatiëntOvergang ? '#2563EB' : '#D1D5DB', 
            width: isPatiëntOvergang ? 4 : (1 + (overgang.gewicht * 0.05)),
            dashes: isPatiëntOvergang ? false : true, 
            smooth: { type: 'curvedCW', roundness: 0.2 } 
        };
    });

    for (let i = 0; i < patiëntFilm.length - 1; i++) {
        const fromNode = patiëntFilm[i];
        const toNode = patiëntFilm[i+1];

        if (fromNode === toNode) continue; 

        const routeBestaat = edgeData.find(e => e.from === fromNode && e.to === toNode);

        if (!routeBestaat) {
            edgeData.push({
                from: fromNode, 
                to: toNode, 
                
                arrows: { to: { enabled: true, scaleFactor: 1.5 } },
                
                color: '#EF4444', 
                width: 4, 
                dashes: [10, 5], 
                smooth: { type: 'curvedCW', roundness: 0.4 },
                
                font: { align: 'top', color: '#EF4444', size: 12, bold: true, background: 'white' }
            });
        }
    }

    const data = { nodes: new vis.DataSet(nodeData), edges: new vis.DataSet(edgeData) };
    const options = {
        layout: { hierarchical: { direction: 'LR', sortMethod: 'directed', nodeSpacing: 100, levelSeparation: 150 } },
        interaction: { dragNodes: true, dragView: true, zoomView: true },
        physics: { hierarchicalRepulsion: { nodeDistance: 120 } }
    };

    individualNetwork = new vis.Network(container, data, options);
}

// ==========================================================================
// 2G. Uitleg tabel voor de gevonden ziektestadia en traject
// ==========================================================================

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
        trajectBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs italic">Excluded from trajectory determination</td></tr>';
    }

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
        stadiaBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs italic">No calculated stages available</td></tr>';
    }
}

// ==========================================================================
// 2f. GLOBALE MODEL DATA INLADEN VANUIT modellen.csv
// Zorgt dat de coëfficiënten beschikbaar zijn voor de Explainable AI tabel.
// ==========================================================================
let GLOBALE_MODEL_DATA = [];

async function laadModellenCSV() {
    try {
        // Zorg dat 'modellen.csv' in dezelfde map staat
        const response = await fetch('modellen.csv'); 
        
        if (!response.ok) {
            throw new Error(`Bestand niet gevonden (HTTP Status: ${response.status})`);
        }
        
        const csvTekst = await response.text();

        // PapaParse zet de ruwe tekst dynamisch om in een array met objecten
        Papa.parse(csvTekst, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                GLOBALE_MODEL_DATA = results.data;
                console.log("modellen.csv succesvol ingeladen:", GLOBALE_MODEL_DATA);
                document.dispatchEvent(new Event('modellenKlaar'));
            }
        });
    } catch (error) {
        console.error(" Fout bij laden modellen.csv. Let op: Je moet een lokale server (zoals Live Server) gebruiken om bestanden in te laden via fetch!", error);
    }
}

// Roep de functie direct aan zodat hij begint met laden zodra het script start
laadModellenCSV();

// ==========================================================================
// 2g. FEATURE IMPACT TABEL (Explainable AI)
// Laat zien hoeveel impact elke feature had op de voorspelling.
// - Ziektestadium: Haalt dynamisch de coëfficiënten uit het CSV-geheugen.
// - Traject (Baseline): Gebruikt de vaste, hardcoded coëfficiënten.
// ==========================================================================

// De vaste coëfficiënten van jouw Baseline model (Trajecten)
const BASELINE_COEFFICIENTS = {
    "TR1": { TJC: 0.777, SJC: -1.032, ESR: 0, Leukocytes: 0, HB: 0, Thrombocytes: 0 },
    "TR2": { TJC: 0.595, SJC: -0.699, ESR: 0, Leukocytes: 0, HB: 0, Thrombocytes: 0 },
    "TR3": { TJC: 0.597, SJC: -0.808, ESR: 0, Leukocytes: 0, HB: 0, Thrombocytes: 0 },
    "TR4": { TJC: 0.619, SJC: -0.359, ESR: 0, Leukocytes: 0, HB: 0, Thrombocytes: 0 }
};

function maakImpactTabel(patientData, typeToon) {
    const tabelBody = document.getElementById('impactTabelBody');
    const meldingVeld = document.getElementById('impactTabelMelding');
    
    if (!tabelBody || !meldingVeld) return;

    tabelBody.innerHTML = '';
    meldingVeld.classList.add('hidden');

    // ========================================================================
    // 1. BEPAAL EN FILTER DE WEERGAVE (Stadium vs Traject)
    // ========================================================================
    const globaleVoorkeur = sessionStorage.getItem('model_voorkeur'); 
    const patientModelInfo = patientData[0]?.gebruiktTrajectModel || patientData[0]?.modelGebruikt || "";
    const isBaselineGebruikt = globaleVoorkeur === 'baseline' || patientModelInfo.toLowerCase().includes('baseline');

    let dataOmTeTonen = [...patientData].sort((a, b) => a.visit - b.visit);

    if (typeToon === "Traject") {
        if (!isBaselineGebruikt) {
            meldingVeld.innerText = "Trajectory impact is only available when the Baseline model is used.";
            meldingVeld.classList.remove('hidden');
            return;
        }
        // Baseline kijkt alleen naar visite 1
        dataOmTeTonen = dataOmTeTonen.filter(p => Number(p.visit) === 1);
    }

    if (dataOmTeTonen.length === 0) {
        meldingVeld.innerText = "No data available to display impact.";
        meldingVeld.classList.remove('hidden');
        return;
    }

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];

    // ========================================================================
    // 2. HAAL DE GLOBALE DYNAMISCHE STADIUM DATA OP
    // ========================================================================
    let alleModelCoefficients = [];
    
    if (typeToon === "Stadium") {
        alleModelCoefficients = GLOBALE_MODEL_DATA;

        // Check of de fetch() de data al succesvol heeft binnengehaald
        if (!alleModelCoefficients || alleModelCoefficients.length === 0) {
            meldingVeld.innerText = "Loading coefficients from modellen.csv, or file not found (see console).";
            meldingVeld.classList.remove('hidden');
            console.error("Impact Tabel: Kon de coëfficiënten voor het stadium niet inladen uit GLOBALE_MODEL_DATA.");
            return;
        }
    }

    // ========================================================================
    // 3. BEREKEN DE IMPACT PER VISITE
    // ========================================================================
    let maxAbsoluteImpact = 0;
    
    const impactDataMatrix = dataOmTeTonen.map(p => {
        const rowImpacts = {};
        
        let coeffObject = null;
        let modelNaam = "";
        let targetResultaat = "";

        if (typeToon === "Traject") {
            // -- TRAJECT LOGICA (Hardcoded uit Baseline) --
            modelNaam = "Baseline";
            targetResultaat = p.ziektetraject;
            coeffObject = BASELINE_COEFFICIENTS[targetResultaat];

        } else {
            // -- STADIUM LOGICA (Dynamisch uit ingeladen CSV) --
            modelNaam = p.stadiumModelGebruikt || p.modelGebruikt || "Goud (Alles)";
            targetResultaat = p.ziektestadium;

            const coeffRij = alleModelCoefficients.find(row => {
                if (!row.ModelNaam || !row.Target) return false;
                return String(row.ModelNaam).trim().toLowerCase() === String(modelNaam).trim().toLowerCase() &&
                       String(row.Target).trim().toLowerCase() === String(targetResultaat).trim().toLowerCase();
            });

            if (coeffRij) {
                coeffObject = coeffRij;
            } else {
                console.warn(`Impact Tabel Waarschuwing: Geen coëfficiënten gevonden voor Model: '${modelNaam}' en Target: '${targetResultaat}'. Staan deze exact zo in de CSV?`);
            }
        }

        // Berekeningen uitvoeren
        features.forEach(f => {
            const val = p[f];
            
            // Als er geen patiëntdata is óf geen coëfficiënt
            if (val === null || val === undefined || val === "" || !coeffObject || coeffObject[f] === "" || coeffObject[f] === undefined) {
                rowImpacts[f] = null;
            } else {
                const coeff = Number(coeffObject[f]);
                const impact = Number(val) * coeff;
                
                // Als de coëfficiënt 0 is (zoals ESR in het traject model), slaan we de impact als nul op, niet als null.
                rowImpacts[f] = impact; 
                
                if (Math.abs(impact) > maxAbsoluteImpact) {
                    maxAbsoluteImpact = Math.abs(impact);
                }
            }
        });
        
        return { visit: p.visit, impacts: rowImpacts, raw: p, model: modelNaam, target: targetResultaat };
    });

    if (maxAbsoluteImpact === 0) maxAbsoluteImpact = 1;

    // ========================================================================
    // 4. TABEL OPBOUWEN EN CELLEN KLEUREN
    // ========================================================================
    impactDataMatrix.forEach(rijData => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 hover:bg-gray-50";

        // Visite Kolom (Met handige tooltip voor debugging/inzicht!)
        const tdVisite = document.createElement('td');
        tdVisite.className = "px-4 py-3 font-bold border-r bg-gray-50 cursor-help";
        tdVisite.title = `Model: ${rijData.model}\nTarget: ${rijData.target}`;
        tdVisite.innerText = `Visit ${rijData.visit}`;
        tr.appendChild(tdVisite);

        features.forEach(f => {
            const td = document.createElement('td');
            td.className = "px-4 py-3 border-r border-white font-medium transition-colors duration-200";
            
            const impactScore = rijData.impacts[f];

            if (impactScore === null) {
                td.innerHTML = `<span class="text-gray-300">-</span>`;
            } else if (impactScore === 0) {
                // Voor features met weging 0 (zoals HB bij Traject baseline)
                td.innerHTML = `
                    <div>${Number(rijData.raw[f]).toFixed(1)}</div>
                    <div class="text-[10px] text-gray-400 mt-1 font-bold">0.00</div>
                `;
            } else {
                const isPositief = impactScore > 0;
                const formattedScore = (isPositief ? "+" : "") + impactScore.toFixed(2);
                
                const intensiteit = Math.min((Math.abs(impactScore) / maxAbsoluteImpact) * 0.85, 0.85);

                if (isPositief) {
                    td.style.backgroundColor = `rgba(239, 68, 68, ${intensiteit})`; // Rood
                    td.style.color = intensiteit > 0.5 ? "white" : "black"; 
                } else {
                    td.style.backgroundColor = `rgba(59, 130, 246, ${intensiteit})`; // Blauw
                    td.style.color = intensiteit > 0.5 ? "white" : "black";
                }

                td.innerHTML = `
                    <div>${Number(rijData.raw[f]).toFixed(1)}</div>
                    <div class="text-[10px] opacity-75 mt-1 font-bold tracking-wider">${formattedScore}</div>
                `;
            }
            tr.appendChild(td);
        });

        tabelBody.appendChild(tr);
    });
}

// ==========================================================================
// 3. 'Alle' patiënten grafieken 
// ==========================================================================

let mijnTrajectTrendGrafiek = null;

// ==========================================================================
// 3a. gemmiddelde waarden van patiënten per ziektetraject trendlijn figuur
// ==========================================================================
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
        schrijfMeldingInCanvas('TrajectTrendGrafiek', "No usable population data available for this trend chart.");
        if (mijnTrajectTrendGrafiek) mijnTrajectTrendGrafiek.destroy();
        return;
    }

    const labels = [];
    for (let i = 1; i <= maxVisit; i++) { labels.push(`Visit ${i}`); }

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
                title: { display: true, text: `Trajectory Comparison: ${feature1} (Left) vs ${feature2} (Right)` },
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
                x: { display: true, title: { display: true, text: 'Visits' } },
                'y-left': { type: 'linear', display: true, position: 'left', title: { display: true, text: feature1, color: 'rgb(54, 162, 235)' } },
                'y-right': { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: feature2, color: 'rgb(255, 99, 132)' } }
            }
        }
    });
}

// ==========================================================================
// 3b. PCA
// ==========================================================================

let mijnPopulatieScatter = null;

function maakPopulatieScatter(patientenLijst) {
    const ctx = document.getElementById('PopulatieScatter');
    if (!ctx) return;

    if (mijnPopulatieScatter) mijnPopulatieScatter.destroy();

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const dataMatrix = [];
    const patientInfos = []; 

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

    if (dataMatrix.length < 6) {
        schrijfMeldingInCanvas('PopulatieScatter', `Not enough data for PCA. Minimum of 6 complete visits required (Found: ${dataMatrix.length}).`);
        return; 
    }

    try {
        const transpose = m => m[0].map((x,i) => m.map(x => x[i]));
        const dataVoorPCA = transpose(dataMatrix); // Now 6 rows, N columns

        const genormaliseerdeData = dataVoorPCA.map(featureRij => {
            const n = featureRij.length;
            const mean = featureRij.reduce((sum, val) => sum + val, 0) / n;
            const variantie = featureRij.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
            const stdDev = Math.sqrt(variantie);

            return featureRij.map(val => {
                if (stdDev === 0) return 0; 
                return (val - mean) / stdDev;
            });
        });

        const pcaKlaarData = transpose(genormaliseerdeData); 
        
        const vectors = PCA.getEigenVectors(pcaKlaarData);
        
        if (!vectors || vectors.length < 2) {
            schrijfMeldingInCanvas('PopulatieScatter', "Data lacks sufficient variance to draw a PCA chart.");
            return;
        }

        const adData = PCA.computeAdjustedData(pcaKlaarData, vectors[0], vectors[1]);
    

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

        mijnPopulatieScatter = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: actieveDatasets },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'PCA Clustering (Z-score Normalized)' },
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const naam = context.raw.patientId;
                                const vis = context.raw.visitNummer;
                                return `Patient: ${naam} (Visit ${vis})`;
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
        console.error("PCA Error:", e);
        schrijfMeldingInCanvas('PopulatieScatter', "Unable to calculate PCA due to a mathematical error in the data.");
    }
}

// ==========================================================================
// 3c. Heatmap: gemiddelde waarden van patiënten per ziektestadium vs referentie
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

    // Data groeperen en optellen per stadium
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

    const gevondenStadia = Object.keys(geaggregeerdeData).sort();

    if (gevondenStadia.length === 0) {
        schrijfMeldingInDiv("populatieStadiaHeatmapChart", "No valid disease stage data found for the population heatmap.");
        return;
    }

    const alleSeries = [];

    // Gemiddeldes berekenen en formatten voor ApexCharts
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

        alleSeries.push({ name: `Stage ${stadium}`, data: rowData });
    });

    const options = {
        series: alleSeries.reverse(), // Reverse zorgt dat L1 bovenaan staat
        chart: { height: "100%", type: 'heatmap', toolbar: { show: false } },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5, radius: 2,
                colorScale: {
                    ranges: [
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Zero / Very Low' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lower' },
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'Normal' },
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Higher' }
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        title: { text: `Population: Average per Stage vs Reference` },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white shadow border">No data entered</div>';

                const patVal = data.goals && data.goals[0] ? data.goals[0].value.toFixed(1) : "?";
                const refVal = data.goals && data.goals[1] ? data.goals[1].value.toFixed(1) : "?";
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Population Avg: ${patVal} <br>
                            Reference: ${refVal}
                        </div>
                    </div>
                `;
            }
        }
    };
    mijnPopulatieStadiaHeatmap = new ApexCharts(chartContainer, options);
    mijnPopulatieStadiaHeatmap.render();
}

// ==========================================================================
// 3D. Heatmap: gemiddelde waarden van patiënten per traject vs referentie
// ==========================================================================

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
        schrijfMeldingInDiv("populatieTrajectHeatmapChart", "No Baseline (Visit 1) data found to group trajectories.");
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
                        { from: 0, to: 0.01, color: '#EFF6FF', name: 'Zero' }, 
                        { from: 0.02, to: 0.95, color: '#3B82F6', name: 'Lower' }, 
                        { from: 0.96, to: 1.05, color: '#D1D5DB', name: 'Normal' },    
                        { from: 1.06, to: 100, color: '#EF4444', name: 'Higher' } 
                    ]
                }
            }
        },
        dataLabels: { enabled: true, style: { colors: ['#000'] } },
        xaxis: { position: 'bottom', tooltip: { enabled: false } },
        tooltip: {
            custom: function({series, seriesIndex, dataPointIndex, w}) {
                const data = w.config.series[seriesIndex].data[dataPointIndex];
                const ratio = data.y;
                if (ratio === null) return '<div class="p-2 text-xs text-gray-500 bg-white border">No data entered</div>';
                
                const patVal = data.goals[0].value.toFixed(1);
                const refVal = data.goals[1].value.toFixed(1);
                
                return `
                    <div class="bg-white p-2 border border-gray-200 shadow-lg text-sm text-black">
                        <div class="font-bold mb-1">${w.globals.labels[dataPointIndex]}</div>
                        <div>Ratio: <strong>${ratio}x</strong></div>
                        <div class="text-xs text-gray-500 mt-1">
                            Population Avg: ${patVal} <br>
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

// ==========================================================================
// 3e. Legenda voor uitleg over de ziektestadia/trajecten
// ==========================================================================
function vulPopulatieLegenda(patientLijst) {
    const trajectBody = document.getElementById('populatieLegendaTrajectBody');
    const stadiaBody = document.getElementById('populatieLegendaStadiaBody');

    if (!trajectBody || !stadiaBody || patientLijst.length === 0) return;

    trajectBody.innerHTML = '';
    stadiaBody.innerHTML = '';

    // Zoek alle unieke trajecten in de hele populatie
    const uniekeTrajecten = new Set(
        patientLijst.map(p => p.ziektetraject).filter(t => t && !t.startsWith("Onbekend"))
    );
    const gesorteerdeTrajecten = Array.from(uniekeTrajecten).sort();

    // Bouw de trajecten-tabel
    if (gesorteerdeTrajecten.length > 0) {
        gesorteerdeTrajecten.forEach(trajectCode => {
            if (UITLEG_TRAJECTEN[trajectCode]) {
                const rij = document.createElement('tr');
                rij.className = "border-b border-gray-100";
                rij.innerHTML = `
                    <td class="py-2 px-2 font-bold text-blue-600 w-16 align-top">${trajectCode}</td>
                    <td class="py-2 px-2 text-gray-600 text-xs">${UITLEG_TRAJECTEN[trajectCode]}</td>
                `;
                trajectBody.appendChild(rij);
            }
        });
    } else {
        trajectBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs italic">No trajectories found in population</td></tr>';
    }

    const uniekeStadia = new Set(
        patientLijst.map(p => p.ziektestadium).filter(s => s && !s.startsWith("Onbekend"))
    );
    const gesorteerdeStadia = Array.from(uniekeStadia).sort();

    // Bouw de stadia-tabel
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
        stadiaBody.innerHTML = '<tr><td class="p-2 text-gray-400 text-xs italic">No calculated stages available</td></tr>';
    }
}


// ==========================================================================
// 4e. POPULATION SCATTER (PCA): PATIENTS VS REFERENCE DUMMIES
// Computes a PCA including predefined reference patients (diamonds)
// so the user can visually assess cluster quality of new data.
// ==========================================================================

let mijnPopulatieScatterRef = null;

function maakPopulatieScatterReferentie(patientenLijst) {
    const ctx = document.getElementById('PopulatieScatterReferentie');
    if (!ctx) return;

    if (mijnPopulatieScatterRef) mijnPopulatieScatterRef.destroy();

    const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
    const dataMatrix = [];
    const patientInfos = []; 

    // DATA COLLECTION: Real Patients
    patientenLijst.forEach(p => {
        if (!p.ziektetraject || p.ziektetraject.startsWith("Onbekend")) return;

        let mistData = false;
        const rij = [];

        for (const f of features) {
            if (p[f] === null || p[f] === undefined || p[f] === "") {
                mistData = true; break; 
            }
            rij.push(Number(p[f]));
        }

        if (!mistData) {
            dataMatrix.push(rij);
            patientInfos.push({ 
                id: p.patient_id, 
                visit: p.visit, 
                traject: p.ziektetraject,
                isReferentie: false 
            });
        }
    });

    // DATA COLLECTION: Reference Patients (Dummies added to the same matrix)
    if (typeof REF_TRAJECT_POPULATIE !== 'undefined') {
        const trajectNamen = ['TR1', 'TR2', 'TR3', 'TR4'];
        
        trajectNamen.forEach(tr => {
            if (REF_TRAJECT_POPULATIE[tr]) {
                REF_TRAJECT_POPULATIE[tr].forEach((refPatient, index) => {
                    const rij = [];
                    for (const f of features) {
                        rij.push(Number(refPatient[f] || 0));
                    }
                    dataMatrix.push(rij);
                    patientInfos.push({
                        id: `Dummy ${index + 1}`,
                        visit: '-',
                        traject: tr,
                        isReferentie: true 
                    });
                });
            }
        });
    }

    if (dataMatrix.length < 6) {
        schrijfMeldingInCanvas('PopulatieScatterReferentie', `Not enough data for PCA.`);
        return; 
    }

    try {
        const transpose = m => m[0].map((x,i) => m.map(x => x[i]));
        const dataVoorPCA = transpose(dataMatrix); 

        const genormaliseerdeData = dataVoorPCA.map(featureRij => {
            const n = featureRij.length;
            const mean = featureRij.reduce((sum, val) => sum + val, 0) / n;
            const variantie = featureRij.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
            const stdDev = Math.sqrt(variantie);

            return featureRij.map(val => {
                if (stdDev === 0) return 0; 
                return (val - mean) / stdDev;
            });
        });

        const pcaKlaarData = transpose(genormaliseerdeData); 
        const vectors = PCA.getEigenVectors(pcaKlaarData);
        
        if (!vectors || vectors.length < 2) {
            schrijfMeldingInCanvas('PopulatieScatterReferentie', "Data lacks sufficient variance for PCA.");
            return;
        }

        const adData = PCA.computeAdjustedData(pcaKlaarData, vectors[0], vectors[1]);

        const datasets = {
            'Ref TR1': { label: 'Reference TR1', data: [], backgroundColor: '#064E3B', pointStyle: 'rectRot', radius: 6 },
            'Ref TR2': { label: 'Reference TR2', data: [], backgroundColor: '#78350F', pointStyle: 'rectRot', radius: 6 },
            'Ref TR3': { label: 'Reference TR3', data: [], backgroundColor: '#7F1D1D', pointStyle: 'rectRot', radius: 6 },
            'Ref TR4': { label: 'Reference TR4', data: [], backgroundColor: '#4C1D95', pointStyle: 'rectRot', radius: 6 },
            
            'Pat TR1': { label: 'Own Data TR1', data: [], backgroundColor: '#34D399', pointStyle: 'circle', radius: 4 },
            'Pat TR2': { label: 'Own Data TR2', data: [], backgroundColor: '#FBBF24', pointStyle: 'circle', radius: 4 },
            'Pat TR3': { label: 'Own Data TR3', data: [], backgroundColor: '#F87171', pointStyle: 'circle', radius: 4 },
            'Pat TR4': { label: 'Own Data TR4', data: [], backgroundColor: '#A78BFA', pointStyle: 'circle', radius: 4 }
        };

        for (let i = 0; i < patientInfos.length; i++) {
            const x = adData.adjustedData[0][i];
            const y = adData.adjustedData[1][i];
            const info = patientInfos[i];
            
            const sleutel = info.isReferentie ? `Ref ${info.traject}` : `Pat ${info.traject}`;
            
            if (datasets[sleutel]) {
                datasets[sleutel].data.push({ 
                    x: x, 
                    y: y, 
                    patientId: info.id,
                    visitNummer: info.visit,
                    isReferentie: info.isReferentie
                });
            }
        }

        const actieveDatasets = Object.values(datasets).filter(ds => ds.data.length > 0);

        mijnPopulatieScatterRef = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: actieveDatasets },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'PCA Clustering: Patients vs Reference' },
                    legend: { position: 'top', labels: { usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const raw = context.raw;
                                if (raw.isReferentie) {
                                    return `Reference ${context.dataset.label.split(' ')[1]}: ${raw.patientId}`;
                                }
                                return `Patient: ${raw.patientId} (Visit ${raw.visitNummer})`;
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
        console.error("PCA Error:", e);
        schrijfMeldingInCanvas('PopulatieScatterReferentie', "Unable to calculate PCA.");
    }
}

// ==========================================================================
// 4f. alle patiënt GRAPH PROJECTION
// ==========================================================================

let populatieNetwork = null;

function maakPopulatieGraphProjection(patientenLijst, trajectFilter = 'ALL') {
    const container = document.getElementById('populatieGraphNetwork');
    if (!container) return;

    if (populatieNetwork) {
        populatieNetwork.destroy();
    }
    container.innerHTML = '';

    if (typeof vis === 'undefined') {
        schrijfMeldingInDiv("populatieGraphNetwork", "Vis.js library not loaded.");
        return;
    }

    // Filter de lijst op basis van de dropdown keuze
    let gefilterdeLijst = patientenLijst;
    if (trajectFilter !== 'ALL') {
        gefilterdeLijst = patientenLijst.filter(p => p.ziektetraject === trajectFilter);
    }

    if (gefilterdeLijst.length === 0) {
        schrijfMeldingInDiv("populatieGraphNetwork", `No data available for filter: ${trajectFilter}`);
        return;
    }

    // Data verzamelen: Tel de Nodes en Edges
    const nodeTellers = {};
    const edgeTellers = {};
    const patientRoutes = {};

    // Sorteer op visite en bouw de route per patiënt op
    const gesorteerd = [...gefilterdeLijst].sort((a, b) => a.visit - b.visit);
    gesorteerd.forEach(p => {
        if (!p.ziektestadium || p.ziektestadium.startsWith("Onbekend")) return;
        
        if (!patientRoutes[p.patient_id]) {
            patientRoutes[p.patient_id] = [];
        }
        patientRoutes[p.patient_id].push(p.ziektestadium);
    });

    // Tel hoe vaak elke route en node voorkomt
    Object.values(patientRoutes).forEach(route => {
        route.forEach(stadium => {
            nodeTellers[stadium] = (nodeTellers[stadium] || 0) + 1;
        });

        for (let i = 0; i < route.length - 1; i++) {
            const from = route[i];
            const to = route[i+1];
            if (from === to) continue; 
            
            const edgeKey = `${from}_naar_${to}`;
            if (!edgeTellers[edgeKey]) {
                edgeTellers[edgeKey] = { from: from, to: to, count: 0 };
            }
            edgeTellers[edgeKey].count++;
        }
    });

    //=======================================================================
    // tabel voor hoeveelheid patienten per stadium en voor elke overgang tussen stadia.
    console.groupCollapsed(`📊 Populatie Graph Data (Filter: ${trajectFilter})`);
    
    // Maak een nette array voor de Nodes tabel (gesorteerd van hoog naar laag)
    const logNodes = Object.keys(nodeTellers).map(s => ({
        Stadium: s,
        Aantal_Patienten: nodeTellers[s]
    })).sort((a,b) => b.Aantal_Patienten - a.Aantal_Patienten);
    console.log("Knooppunten (Nodes):");
    console.table(logNodes);

    // Maak een nette array voor de Edges tabel (gesorteerd van hoog naar laag)
    const logEdges = Object.values(edgeTellers).map(e => ({
        Van_Stadium: e.from,
        Naar_Stadium: e.to,
        Overgangen: e.count
    })).sort((a,b) => b.Overgangen - a.Overgangen);
    console.log("Lijnen (Edges / Overgangen):");
    console.table(logEdges);
    
    console.groupEnd();
    // ======================================================================


    // Nodes (Bollen) genereren
    const maxNodeCount = Math.max(...Object.values(nodeTellers), 1);
    
    const nodeData = Object.keys(nodeTellers).map(stadium => {
        const count = nodeTellers[stadium];
        
        const padding = 10 + ((count / maxNodeCount) * 25); 

        return {
            id: stadium,
            label: stadium,
            title: `Stage: ${stadium}<br>Patient Count: ${count}`,
            shape: 'circle',
            margin: padding,
            color: {
                background: '#2563EB', 
                border: '#1E3A8A'
            },
            font: { 
                color: '#ffffff', 
                face: 'Arial, sans-serif', 
                size: 16, 
                bold: true
            }
        };
    });

    // Edges (Lijnen) genereren
    const maxEdgeCount = Math.max(...Object.values(edgeTellers).map(e => e.count), 1);

    const edgeData = Object.values(edgeTellers).map(overgang => {
        const edgeWidth = 1 + ((overgang.count / maxEdgeCount) * 8);
        
        return {
            from: overgang.from, 
            to: overgang.to,
            title: `From ${overgang.from} to ${overgang.to}<br>Transitions: ${overgang.count}`, 
            arrows: { 
                to: { enabled: true, scaleFactor: 0.5 + (edgeWidth * 0.1) } 
            },
            color: '#9CA3AF', 
            width: edgeWidth,
            smooth: { type: 'curvedCW', roundness: 0.2 } 
        };
    });

    // figuur Tekenen
    const data = { nodes: new vis.DataSet(nodeData), edges: new vis.DataSet(edgeData) };
    const options = {
        layout: { hierarchical: { direction: 'LR', sortMethod: 'directed', nodeSpacing: 100, levelSeparation: 150 } },
        interaction: { dragNodes: true, dragView: true, zoomView: true, hover: true },
        physics: { hierarchicalRepulsion: { nodeDistance: 120 } }
    };

    populatieNetwork = new vis.Network(container, data, options);
}