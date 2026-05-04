const fs = require('fs');

// ========================================================================
// 1. MOCKS
// ========================================================================
global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("") }));
global.Papa = { parse: jest.fn() };

global.REF_GEM_PER_STADIA = [ { stadium: "L1", waarde: 5 } ]; 

global.ApexCharts = jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    destroy: jest.fn()
}));
window.ApexCharts = global.ApexCharts;

// ========================================================================
// 2. CODE INLADEN
// ========================================================================
const grafiekenCode = fs.readFileSync('./grafieken.js', 'utf8');
eval(grafiekenCode);

// ========================================================================
// 3. GRAFIEK TESTS 
// ========================================================================
describe('Isolatie Tests voor Grafieken', () => {

    const nepHtmlElement = {
        classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn(), contains: jest.fn() },
        style: {},
        innerHTML: '',
        value: '',
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        querySelector: jest.fn(function() { return this; }), 
        
        getContext: jest.fn(() => ({
            fillText: jest.fn(),
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            measureText: jest.fn(() => ({ width: 10 })),
            beginPath: jest.fn()
        }))
    };

    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.spyOn(document, 'getElementById').mockReturnValue(nepHtmlElement);
        jest.spyOn(document, 'querySelector').mockReturnValue(nepHtmlElement);
    });

    test('1. maakApexHeatmap produceert geen fatale fouten (Smoke Test)', () => {
        // OPZET
        const nepPatientenData = [{ patient_id: 1, ziektestadium: "L1" }];
        
        // test run
        maakApexHeatmap(nepPatientenData);

        // CONTROLE
        expect(true).toBe(true); 
    });

    test('2. maakTrajectTrendGrafiek verwerkt geneste lijsten correct (Smoke Test)', () => {
        const nepTrendData = {
            "Groep_L1": [ { patient_id: 1, trend_waarde: 10 } ],
            "Groep_L2": [ { patient_id: 2, trend_waarde: 15 } ]
        };
        
        // ACTIE
        maakTrajectTrendGrafiek(nepTrendData);

        // CONTROLE
        expect(true).toBe(true); 
    });

});