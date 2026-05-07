const fs = require('fs');

// ========================================================================
// nep test data 
// ========================================================================
global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("") }));
global.Papa = { 
    parse: jest.fn((tekst, opties) => {
        opties.complete({ data: [ { ModelNaam: "TestModel", Target: "L1", TJC: 0.5 } ] });
    }) 
};

// Voeg de externe bibliotheken toe
global.ApexCharts = jest.fn().mockImplementation(() => ({ render: jest.fn(), destroy: jest.fn() }));
global.Chart = jest.fn().mockImplementation(() => ({ destroy: jest.fn(), update: jest.fn(), render: jest.fn() }));
global.vis = { Network: jest.fn().mockImplementation(() => ({ destroy: jest.fn(), once: jest.fn(), fit: jest.fn() })), DataSet: jest.fn((d) => d) };
global.PCA = { getEigenVectors: jest.fn(() => [[1,0], [0,1]]), computeAdjustedData: jest.fn(() => ({ adjustedData: [[1,2], [3,4]] })) };

window.ApexCharts = global.ApexCharts;
window.Chart = global.Chart;

// Referentiewaarden voor de wiskunde in grafieken.js
global.REF_GEM_PER_STADIA = { "L1": { TJC: 5, SJC: 2 } };
global.REF_TRAJECT_BASELINE = { "TR1": { TJC: 10, SJC: 5 } };
global.REF_GRAPH_PER_TRAJECT = { "TR1": { nodes: { "L1": 1 }, edges: [] } };
global.UITLEG_TRAJECTEN = { "TR1": "Uitleg over TR1" };
global.UITLEG_STADIA = { "L1": "Uitleg over L1" };
global.GLOBALE_MODEL_DATA = [ { ModelNaam: "TestModel", Target: "L1", TJC: 0.5 } ];

// ========================================================================
// CODE INLADEN
// ========================================================================
const grafiekenCode = fs.readFileSync('./grafieken.js', 'utf8');
eval(grafiekenCode);

// ========================================================================
// SETUP VOOR ELKE TEST (Virtuele Browser opbouwen)
// ========================================================================
beforeEach(() => {
    jest.clearAllMocks();
    
    // Mute console waarschuwingen voor een schone terminal
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    document.body.innerHTML = `
        <canvas id="ComboGrafiek"></canvas>
        <canvas id="KansenGrafiek"></canvas>
        <div id="heatmapChart"></div>
        <div id="trajectHeatmapChart"></div>
        
        <table><tbody id="burenTabelBody"></tbody></table>
        <div id="geenBurenMelding"></div>
        
        <div id="graphProjectionNetwork"></div>
        
        <table>
            <tbody id="legendaTrajectBody"></tbody>
            <tbody id="legendaStadiaBody"></tbody>
            <tbody id="impactTabelBody"></tbody>
        </table>
        <div id="impactTabelMelding"></div>
        
        <canvas id="TrajectTrendGrafiek"></canvas>
        <canvas id="PopulatieScatter"></canvas>
        <div id="populatieStadiaHeatmapChart"></div>
        <div id="populatieTrajectHeatmapChart"></div>
        
        <table>
            <tbody id="populatieLegendaTrajectBody"></tbody>
            <tbody id="populatieLegendaStadiaBody"></tbody>
        </table>
        
        <div id="populatieGraphNetwork"></div>
    `;

    const vasteTekendoos = {
        fillText: jest.fn(), 
        clearRect: jest.fn(), 
        fillRect: jest.fn(),
        measureText: jest.fn(() => ({ width: 10 })), 
        beginPath: jest.fn()
    };
    
    HTMLCanvasElement.prototype.getContext = () => vasteTekendoos;
});

// ========================================================================
// 1:  SMOKE TESTS
// ========================================================================
describe('Hoofdstuk 1: Isolatie Tests voor Alle Grafieken (Smoke Tests)', () => {
    
    // Jouw standaard data (iets uitgebreid om alle grafieken tevreden te houden)
    const standaardPatientLijst = [{ patient_id: 1, visit: 1, ziektestadium: "L1", ziektetraject: "TR1", TJC: 5 }];

    test('1. maakFlexibeleComboGrafiek produceert geen fatale fouten', () => { 
        maakFlexibeleComboGrafiek(standaardPatientLijst, "FeatureLinks", "FeatureRechts"); 
        expect(true).toBe(true); 
    });
    
    test('2. maakKansenGrafiek produceert geen fatale fouten', () => { 
        standaardPatientLijst[0].stadiumKansen = { L1: 0.8, L2: 0.2 }; 
        maakKansenGrafiek(standaardPatientLijst, 1, "Stadium"); 
        expect(true).toBe(true); 
    });
    
    test('3. maakApexHeatmap produceert geen fatale fouten', () => { 
        maakApexHeatmap(standaardPatientLijst); 
        expect(true).toBe(true); 
    });
    
    test('4. maakTrajectHeatmap produceert geen fatale fouten', () => { 
        maakTrajectHeatmap(standaardPatientLijst); 
        expect(true).toBe(true); 
    });
    
    test('5. vulBurenTabel produceert geen fatale fouten', () => { 
        vulBurenTabel([{ knn_buren: [{ id: 2, traject: "TR1", afstand: 1.5 }] }]); 
        expect(true).toBe(true); 
    });
    
    test('6. maakIndividualGraphProjection produceert geen fatale fouten', () => { 
        maakIndividualGraphProjection(standaardPatientLijst, "TR1"); 
        expect(true).toBe(true); 
    });
    
    test('7. vulPatientSpecifiekeLegenda produceert geen fatale fouten', () => { 
        vulPatientSpecifiekeLegenda(standaardPatientLijst); 
        expect(true).toBe(true); 
    });
    
    test('8. maakImpactTabel produceert geen fatale fouten', () => { 
        standaardPatientLijst[0].modelGebruikt = "TestModel";
        maakImpactTabel(standaardPatientLijst, "Stadium"); 
        expect(true).toBe(true); 
    });
    
    test('9. maakTrajectTrendGrafiek produceert geen fatale fouten', () => { 
        const specifiekeTrendData = { "TR1": [ { patient_id: 1, visit: 1, feature1: 10, feature2: 5 } ] };
        maakTrajectTrendGrafiek(specifiekeTrendData, "feature1", "feature2"); 
        expect(true).toBe(true); 
    });
    
    test('10. maakPopulatieScatter produceert geen fatale fouten', () => { 
        maakPopulatieScatter(standaardPatientLijst); 
        expect(true).toBe(true); 
    });
    
    test('11. maakPopulatieStadiaHeatmap produceert geen fatale fouten', () => { 
        maakPopulatieStadiaHeatmap(standaardPatientLijst); 
        expect(true).toBe(true); 
    });
    
    test('12. maakPopulatieTrajectHeatmap produceert geen fatale fouten', () => { 
        maakPopulatieTrajectHeatmap(standaardPatientLijst); 
        expect(true).toBe(true); 
    });
    
    test('13. vulPopulatieLegenda produceert geen fatale fouten', () => { 
        vulPopulatieLegenda(standaardPatientLijst); 
        expect(true).toBe(true); 
    });
    
    test('14. maakPopulatieGraphProjection produceert geen fatale fouten', () => { 
        maakPopulatieGraphProjection(standaardPatientLijst, "ALL"); 
        expect(true).toBe(true); 
    });
});

// ========================================================================
// 2: de functies van de grafieken testen
// ========================================================================
describe('Hoofdstuk 2: Deep Tests voor Grafieken en Tabellen', () => {

    test('Deep 1: maakKansenGrafiek converteert kommagetallen correct naar percentages (0.85 -> 85%)', () => {
        const patientData = [{ visit: 1, stadiumKansen: { "L1": 0.85, "L2": 0.15 } }];
        
        maakKansenGrafiek(patientData, 1, "Stadium");
        
        // Vang het configuratie-bestand op dat jouw code naar Chart.js heeft gestuurd
        const chartConfigArgs = global.Chart.mock.calls[0][1];
        
        expect(chartConfigArgs.data.labels).toEqual(["L1", "L2"]);
        expect(chartConfigArgs.data.datasets[0].data).toEqual([85, 15]);
    });

    test('Deep 2: vulBurenTabel vult daadwerkelijk de HTML tabel in het DOM met de juiste patiënten', () => {
        const knnPatient = [{ 
            knn_buren: [{ id: "Patiënt 99", traject: "TR3", afstand: 1.234 }] 
        }];
        
        vulBurenTabel(knnPatient);
        
        // Haal de inhoud van de tabel direct uit onze nep-HTML op
        const tabelInhoud = document.getElementById('burenTabelBody').innerHTML;
        
        expect(tabelInhoud).toContain("Patiënt 99");
        expect(tabelInhoud).toContain("TR3");
        expect(tabelInhoud).toContain("1.23"); // Test de toFixed(2) afronding
    });

    test('Deep 3: vulPatientSpecifiekeLegenda vertaalt codes (TR1) naar leesbare uitleg', () => {
        const patientData = [{ ziektetraject: "TR1", ziektestadium: "L1" }];
        
        vulPatientSpecifiekeLegenda(patientData);
        
        const trajectHTML = document.getElementById('legendaTrajectBody').innerHTML;
        const stadiaHTML = document.getElementById('legendaStadiaBody').innerHTML;
        
        expect(trajectHTML).toContain("Uitleg over TR1");
        expect(stadiaHTML).toContain("Uitleg over L1");
    });

    test('Deep 4: maakImpactTabel rekent de impact correct uit (Waarde * Coëfficiënt)', () => {
        const patientData = [{ visit: 1, ziektestadium: "L1", modelGebruikt: "TestModel", TJC: 10 }];
        
        maakImpactTabel(patientData, "Stadium");
        
        const impactHTML = document.getElementById('impactTabelBody').innerHTML;
        
        // De tabel moet de originele waarde (10.0) én de impact (+5.00) bevatten
        expect(impactHTML).toContain("10.0");
        expect(impactHTML).toContain("+5.00");
    });

    test('Deep 5: maakApexHeatmap berekent de juiste ratios ten opzichte van referentiewaardes', () => {
        const patientData = [{ visit: 1, ziektestadium: "L1", TJC: 15 }];
        
        maakApexHeatmap(patientData);
        
        const apexConfig = global.ApexCharts.mock.calls[0][1];
        const tjcData = apexConfig.series[0].data.find(d => d.x === 'TJC');
        
        // Referentie TJC voor L1 = 5, Patiënt TJC = 15. Ratio moet zijn: 15 / 5 = 3x
        expect(tjcData.y).toBe("3.00");
    });

    test('Deep 6: schrijfMeldingInCanvas tekent de grijze waarschuwingsberichtjes op het scherm', () => {
        schrijfMeldingInCanvas('ComboGrafiek', 'TEST MELDING');
        
        const canvas = document.getElementById('ComboGrafiek');
        const ctx = canvas.getContext('2d');
        
        expect(ctx.clearRect).toHaveBeenCalled();
        expect(ctx.fillText).toHaveBeenCalledWith('TEST MELDING', expect.any(Number), expect.any(Number));
    });

});