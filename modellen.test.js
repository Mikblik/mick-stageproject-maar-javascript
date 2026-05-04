const fs = require('fs');

// ========================================================================
// 1. vaste waarden
// ========================================================================
global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("nep,csv") }));
global.Papa = { parse: jest.fn() };

// ========================================================================
// 2. CODE INLADEN
// ========================================================================
const modellenCode = fs.readFileSync('./modellen.js', 'utf8');
eval(modellenCode);

// ========================================================================
// 3. ALGORITME TESTS
// ========================================================================
describe('Tests voor Modellen, Baselines en de Pipeline', () => {

    test('1. berekenDTWAfstand berekent succesvol de afstand tussen twee reeksen', () => {
        const reeks1 = ["L1", "L2", "L3"];
        const reeks2 = ["L1", "L1", "L2"];
        
        const afstand = berekenDTWAfstand(reeks1, reeks2);
        expect(typeof afstand).toBe('number');
    });

    test('2. baselinemodel verwerkt patiënten zonder te crashen (Smoke Test)', () => {
        const nepPatiënten = [
            { patient_id: 1, visite: 1, waarden: { featureX: 10 } }, 
            { patient_id: 2, visite: 2, waarden: { featureX: 15 } }  
        ];
        
        baselinemodel(nepPatiënten);
        expect(true).toBe(true);
    });

    test('3. ziektestadiamodel loopt succesvol door zonder te crashen (Smoke Test)', () => {
        const nepPatiënten = [ { patient_id: 1, visite: 1, meting: 5 } ];
        
        ziektestadiamodel(nepPatiënten);
        expect(true).toBe(true);
    });

    test('4. pipeline_DTW_KNN produceert geen fouten met testdata (Smoke Test)', () => {
        const nepPatiënten = [ { patient_id: 1, data_reeks: ["L1", "L2", "L3"] } ];
        
        pipeline_DTW_KNN(nepPatiënten);
        expect(true).toBe(true);
    });

    test('5. combomodel neemt de regie en overleeft de rit (Smoke Test)', () => {
        const nepPatiënten = [ 
            { patient_id: 1, visite: 1, data_reeks: ["L1", "L2"] },
            { patient_id: 2, visite: 2, data_reeks: ["E2", "L3"] } 
        ];
        
        combomodel(nepPatiënten);
        expect(true).toBe(true);
    });

});