const fs = require('fs');

// ========================================================================
// 1. vaste waarden nodig voor unit tests
// ========================================================================
global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("") }));
global.Papa = { parse: jest.fn() };
global.REF_GEM_PER_STADIA = [ { stadium: "L1", waarde: 5 } ];

global.UITLEG_STADIA = [];

global.Chart = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    render: jest.fn()
}));
window.Chart = global.Chart;
const grafiekenCode = fs.readFileSync('./grafieken.js', 'utf8');
eval(grafiekenCode);

// ========================================================================
// 2. GRAFIEK TESTS
// ========================================================================
describe('Isolatie Tests voor Alle Grafieken en Tabellen', () => {

    const nepHtmlElement = {
        classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn(), contains: jest.fn() },
        style: {},
        innerHTML: '',
        value: '',
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        querySelector: jest.fn(function() { return this; }), 
        getContext: jest.fn(() => ({
            fillText: jest.fn(), clearRect: jest.fn(), fillRect: jest.fn(),
            measureText: jest.fn(() => ({ width: 10 })), beginPath: jest.fn()
        }))
    };

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.spyOn(document, 'getElementById').mockReturnValue(nepHtmlElement);
        jest.spyOn(document, 'querySelector').mockReturnValue(nepHtmlElement);
    });

    // patiëntenlijst
    const standaardPatientLijst = [{ patient_id: 1, ziektestadium: "L1", traject: "A" }];

    // --- 1. maakFlexibeleComboGrafiek ---
    test('1. maakFlexibeleComboGrafiek produceert geen fatale fouten', () => {
        maakFlexibeleComboGrafiek(standaardPatientLijst, "FeatureLinks", "FeatureRechts");
        expect(true).toBe(true);
    });

    // --- 2. maakKansenGrafiek ---
    test('2. maakKansenGrafiek produceert geen fatale fouten', () => {
        maakKansenGrafiek(standaardPatientLijst, 1, "KansType");
        expect(true).toBe(true);
    });

    // --- 3. maakApexHeatmap ---
    test('3. maakApexHeatmap produceert geen fatale fouten', () => {
        maakApexHeatmap(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 4. maakTrajectHeatmap ---
    test('4. maakTrajectHeatmap produceert geen fatale fouten', () => {
        maakTrajectHeatmap(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 5. vulBurenTabel ---
    test('5. vulBurenTabel produceert geen fatale fouten', () => {
        vulBurenTabel(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 6. maakIndividualGraphProjection ---
    test('6. maakIndividualGraphProjection produceert geen fatale fouten', () => {
        maakIndividualGraphProjection(standaardPatientLijst, "TrajectRefA");
        expect(true).toBe(true);
    });

    // --- 7. vulPatientSpecifiekeLegenda ---
    test('7. vulPatientSpecifiekeLegenda produceert geen fatale fouten', () => {
        vulPatientSpecifiekeLegenda(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 8. maakImpactTabel ---
    test('8. maakImpactTabel produceert geen fatale fouten', () => {
        maakImpactTabel(standaardPatientLijst, "ToonTypeA");
        expect(true).toBe(true);
    });

    // --- 9. maakTrajectTrendGrafiek ---
    test('9. maakTrajectTrendGrafiek produceert geen fatale fouten', () => {
        // Deze was iets specifieker met zijn data, dus gebruiken we het Object:
        const specifiekeTrendData = { "Groep_L1": [ { patient_id: 1, trend_waarde: 10 } ] };
        maakTrajectTrendGrafiek(specifiekeTrendData, "Feature1", "Feature2");
        expect(true).toBe(true);
    });

    // --- 10. maakPopulatieScatter ---
    test('10. maakPopulatieScatter produceert geen fatale fouten', () => {
        maakPopulatieScatter(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 11. maakPopulatieStadiaHeatmap ---
    test('11. maakPopulatieStadiaHeatmap produceert geen fatale fouten', () => {
        maakPopulatieStadiaHeatmap(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 12. maakPopulatieTrajectHeatmap ---
    test('12. maakPopulatieTrajectHeatmap produceert geen fatale fouten', () => {
        maakPopulatieTrajectHeatmap(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 13. vulPopulatieLegenda ---
    test('13. vulPopulatieLegenda produceert geen fatale fouten', () => {
        vulPopulatieLegenda(standaardPatientLijst);
        expect(true).toBe(true);
    });

    // --- 14. maakPopulatieGraphProjection ---
    test('14. maakPopulatieGraphProjection produceert geen fatale fouten', () => {
        maakPopulatieGraphProjection(standaardPatientLijst, "ALL");
        expect(true).toBe(true);
    });

    

});