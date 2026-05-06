const fs = require('fs');

// ========================================================================
// DECORSTUKKEN & DATA MOCKS (Voor alle tests)
// ========================================================================
global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("nep,csv") }));
global.Papa = { parse: jest.fn() };

// Voor de KNN Pipeline: Een minimale referentie bibliotheek
global.REFERENTIE_BIBLIOTHEEK = [ 
    { id: 99, traject: "TR1", sequentie: ["L1", "L2", "L3"] } 
];

// Fop de sessionStorage zodat het ziektestadiamodel een nep-CSV kan inladen
const nepCsvString = `ModelNaam,Target,Feature1,Feature2
TestModel,L1,0.5,1.5`;

Object.defineProperty(window, 'sessionStorage', {
    value: { getItem: jest.fn(() => nepCsvString) },
    writable: true
});

// Zorg voor een schone console (Mute de warnings) tijdens het testen
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

// ========================================================================
// CODE INLADEN
// ========================================================================
const modellenCode = fs.readFileSync('./modellen.js', 'utf8');
eval(modellenCode);

// ========================================================================
// 1: SMOKE TESTS 
// ========================================================================
describe('Hoofdstuk 1: Smoke Tests (Crasht de code niet?)', () => {

    test('1. berekenDTWAfstand berekent succesvol de afstand tussen twee reeksen', () => {
        const reeks1 = ["L1", "L2", "L3"];
        const reeks2 = ["L1", "L1", "L2"];
        const afstand = berekenDTWAfstand(reeks1, reeks2);
        expect(typeof afstand).toBe('number');
    });

    test('2. baselinemodel verwerkt patiënten zonder te crashen', () => {
        const nepPatiënten = [
            { patient_id: 1, visit: 1, TJC: 10, SJC: 0, ESR: 1, HB: 1, Leukocytes: 1, Thrombocytes: 1 }, 
            { patient_id: 2, visit: 2, TJC: 15 }  
        ];
        baselinemodel(nepPatiënten);
        expect(true).toBe(true);
    });

    test('3. ziektestadiamodel loopt succesvol door zonder te crashen', () => {
        const nepPatiënten = [ { patient_id: 1, visit: 1, Feature1: 5 } ];
        ziektestadiamodel(nepPatiënten);
        expect(true).toBe(true);
    });

    test('4. pipeline_DTW_KNN produceert geen fouten met testdata', () => {
        const nepPatiënten = [ { patient_id: 1, ziektestadium: "L1" } ];
        pipeline_DTW_KNN(nepPatiënten);
        expect(true).toBe(true);
    });

    test('5. combomodel neemt de regie en overleeft de rit', () => {
        const nepPatiënten = [ 
            { patient_id: 1, visit: 1, ziektestadium: "L1" },
            { patient_id: 2, visit: 2, ziektestadium: "L3" } 
        ];
        combomodel(nepPatiënten);
        expect(true).toBe(true);
    });
});

// ========================================================================
// 2: testen voor de hulpfuncties
// ========================================================================
describe('Hoofdstuk 2: Deep Tests - Hulpfuncties', () => {

    test('stadiumNaarGetal: Zet L-codes succesvol om naar pure getallen', () => {
        expect(stadiumNaarGetal("L5")).toBe(5);
        expect(stadiumNaarGetal("Onbekend")).toBe(0);
        expect(stadiumNaarGetal(undefined)).toBe(0);
    });

    test('bepaalWinnaar: Kiest altijd de sleutel met de hoogste score', () => {
        const scores = { TR1: 5.5, TR2: 10.2, TR3: 2.1 };
        expect(bepaalWinnaar(scores)).toBe("TR2");
    });

    test('berekenSoftmax: Berekent perfecte verhoudingen (50/50 kans)', () => {
        const gelijkeScores = { A: 10, B: 10 };
        const kansen = berekenSoftmax(gelijkeScores);
        expect(kansen.A).toBe(0.5);
        expect(kansen.B).toBe(0.5);
    });

    test('voegVisiteTellersToe: Telt het exacte aantal bezoeken per patiënt', () => {
        const nepData = [
            { patient_id: 1, visit: 1 },
            { patient_id: 1, visit: 2 },
            { patient_id: 2, visit: 1 }
        ];
        voegVisiteTellersToe(nepData);
        expect(nepData[0].aantalVisites).toBe(2);
        expect(nepData[2].aantalVisites).toBe(1);
    });

});

// ========================================================================
// 3: testen voor de 3 modellen
// ========================================================================
describe('Hoofdstuk 3: Deep Tests - Grote Modellen', () => {
    // DEZE MOET AANGEPAST WORDEN OMDAT NOG NIET DE BASELINE COEFFICIENTEN HEBBEN>! 
    test('baselinemodel (Wiskunde): Berekent en kiest het juiste traject op basis van coëfficiënten', () => {
        const testPatient = { 
            patient_id: 1, visit: 1, 
            TJC: 10, SJC: 1, ESR: 1, HB: 1, Leukocytes: 1, Thrombocytes: 1 
        };
        baselinemodel([testPatient]);
        expect(testPatient.baseline_excluded).toBe(false);
        expect(testPatient.ziektetraject).toBe("TR4"); 
    });

    test('baselinemodel (Strenge Controle): Sluit patiënten uit die data missen', () => {
        const missendeDataPatient = { patient_id: 2, visit: 1, TJC: 10 };
        baselinemodel([missendeDataPatient]);
        expect(missendeDataPatient.baseline_excluded).toBe(true);
        expect(missendeDataPatient.ziektetraject).toBe("Onbekend (Data incompleet)");
    });

    test('combomodel: Stuurt patiënten met >= 3 visites naar KNN, en <= 2 naar Baseline', () => {
        const lijst = [
            { patient_id: 1, visit: 1, TJC: 10, SJC: 0, ESR: 1, HB: 1, Leukocytes: 1, Thrombocytes: 1 },
            { patient_id: 1, visit: 2, TJC: 10, SJC: 0, ESR: 1, HB: 1, Leukocytes: 1, Thrombocytes: 1 },
            { patient_id: 2, visit: 1, ziektestadium: "L1" },
            { patient_id: 2, visit: 2, ziektestadium: "L2" },
            { patient_id: 2, visit: 3, ziektestadium: "L3" }
        ];
        combomodel(lijst);
        expect(lijst[0].gebruiktTrajectModel).toBe("Combo (Baseline)");
        expect(lijst[2].gebruiktTrajectModel).toBe("Combo (KNN Pipeline)");
    });

    test('berekenDTWAfstand: Exacte reeksen hebben afstand 0, afwijkende reeksen > 0', () => {
        const reeks1 = ["L1", "L2"];
        const reeks2 = ["L1", "L2"]; 
        const reeks3 = ["L5", "L6"]; 
        expect(berekenDTWAfstand(reeks1, reeks2)).toBe(0);
        expect(berekenDTWAfstand(reeks1, reeks3)).toBeGreaterThan(0);
    });
});