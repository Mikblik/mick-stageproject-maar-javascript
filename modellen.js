/*
 * ============================================================================
 * BESTAND: modellen.js
 * BESCHRIJVING: 
 * Dit script bevat alle voorspellende/Wiskundige modellen voor de applicatie.
 * Het bevat het Ziektestadia Waterval model, het Traject Baseline model, 
 * de DTW/KNN Pipeline en het gecombineerde Combo Model. 
 * Ook staan alle wiskundige hulpfuncties (zoals Softmax) onderaan verzameld.
 * ============================================================================
 */


// ==========================================================================
// ZIEKTESTADIA MODEL
// Bepaalt het actuele ziektestadium (L1 t/m L8) per visite, op basis van 
// het ingeladen 'modellen.csv' bestand. Flexibel met missing values.
// ==========================================================================
function ziektestadiamodel(patientenLijst) {
    console.log("--- Start Ziektestadia Model (Waterval) ---");

    let modelLijst = [];
    
    // Haal de CSV string op die app.js op de achtergrond heeft ingeladen
    const customCsv = sessionStorage.getItem('custom_model_config');
    
    if (customCsv) {
        try {
            modelLijst = parseModelConfig(customCsv);
            console.log(` Succes: ${modelLijst.length} modellen geladen uit modellen.csv`);
        } catch (e) {
            console.error(" Fout bij het vertalen van modellen.csv:", e);
        }
    } else {
        console.error(" Geen modellen.csv gevonden! Controleer of het bestand in de juiste map staat. Alle patiënten krijgen status 'Onbekend'.");
    }

    // LOOP DOOR PATIËNTEN
    for (const patient of patientenLijst) {
        let gekozenModel = null;

        // Probeer modellen op volgorde (het hoogste/beste model eerst)
        for (const model of modelLijst) {
            let heeftAlles = true;
            
            // Check of patiënt alle benodigde data heeft voor dit specifieke model
            for (const feature of model.required) {
                if (patient[feature] === null || patient[feature] === undefined || patient[feature] === "") {
                    heeftAlles = false;
                    break; 
                }
            }
            
            if (heeftAlles) {
                gekozenModel = model;
                break; // Gevonden! Stop met zoeken naar mindere modellen.
            }
        }

        // BEREKENEN VAN HET STADIUM
        if (gekozenModel) {
            const resultaten = {};
            
            for (const [target, coeffs] of Object.entries(gekozenModel.targets)) {
                let score = 0; 

                for (const [feat, factor] of Object.entries(coeffs)) {
                    score += (Number(patient[feat]) * factor);
                }
                resultaten[target] = score;
            }
            
            // Softmax berekenen en de winnaar (L1-L8) direct opslaan via hulpfunctie
            patient.stadiumKansen = berekenSoftmax(resultaten);
            patient.ziektestadium = bepaalWinnaar(resultaten);
            patient.modelGebruikt = gekozenModel.naam; 

            console.log(`Gevonden Ziektestadia voor ${patient.patient_id} (Visite ${patient.visit}): Gebruikt model "${gekozenModel.naam}" -> Uitslag: ${patient.ziektestadium}`);

        } else {
            // Geen enkel model paste, óf het modellen.csv bestand ontbrak
            patient.ziektestadium = "Onbekend";
            patient.stadiumKansen = null;
            patient.modelGebruikt = "Geen";

            console.log(`Geen Ziektestadia voor ${patient.patient_id} (Visite ${patient.visit}): Geen model beschikbaar (te veel missende data).`);
        }
    }
}


// ==========================================================================
// BASELINE MODEL
// Berekent het traject (TR1-TR4) uitsluitend gebaseerd op Visite 1.
// Strenge eis: mist de patiënt data op Visite 1, dan wordt hij uitgesloten.
// ==========================================================================
function baselinemodel(patientenLijst) {
    console.log("--- Start Baseline Model (Streng) ---");
    
    const requiredFeatures = ['TJC', 'SJC', 'ESR', 'HB', 'Leukocytes', 'Thrombocytes'];
    const baselineGeheugen = {};

    for (const patient of patientenLijst) {
        
        // Baseline kijkt alleen naar visite 1 voor de voorspelling
        if (Number(patient.visit) !== 1) continue;

        // CHECK: Zijn alle vereiste waardes ingevuld?
        let missing = [];
        requiredFeatures.forEach(f => {
            if (patient[f] === null || patient[f] === undefined) missing.push(f);
        });

        if (missing.length > 0) {
            // AFGEKEURD! Patient mist data op Visite 1.
            console.warn(`Patiënt ${patient.patient_id} uitgesloten van Baseline. Mist: ${missing.join(', ')}`);
            
            baselineGeheugen[patient.patient_id] = {
                status: 'excluded',
                reason: missing
            };
        } else {
            // GOEDGEKEURD! Bereken Baseline scores
            const resultaten = {
                TR1: (Number(patient.TJC) * 0.777) + (Number(patient.SJC) * -1.032),
                TR2: (Number(patient.TJC) * 0.595) + (Number(patient.SJC) * -0.699),
                TR3: (Number(patient.TJC) * 0.597) + (Number(patient.SJC) * -0.808),
                TR4: (Number(patient.TJC) * 0.619) + (Number(patient.SJC) * -0.359),
            };
            
            // Sla de resultaten op in het geheugen voor later gebruik
            baselineGeheugen[patient.patient_id] = {
                status: 'ok',
                traject: bepaalWinnaar(resultaten),
                kansen: berekenSoftmax(resultaten)
            };
            console.log(`Baseline gevonden voor ${patient.patient_id}: ${baselineGeheugen[patient.patient_id].traject}`);
        }
    }

    // Pas de behaalde Visite 1 resultaten toe op ALLE visites van de patiënt
    for (const patient of patientenLijst) {
        const geheugen = baselineGeheugen[patient.patient_id]; 

        if (geheugen) {
            if (geheugen.status === 'ok') {
                patient.ziektetraject = geheugen.traject;    
                patient.trajectKansen = geheugen.kansen;       
                patient.baseline_excluded = false;
            } else {
                // Patiënt was uitgesloten wegens missende data
                patient.ziektetraject = "Onbekend (Data incompleet)";
                patient.trajectKansen = null;
                patient.baseline_excluded = true;
            }
        } else {
            // Patiënt had überhaupt geen Visite 1 in de dataset zitten
            if (!patient.ziektetraject) {
                patient.ziektetraject = "Onbekend (Geen V1)";
            }
        }
    }
    console.log("Baseline Model voltooid.");
}


// ==========================================================================
// DTW / KNN PIPELINE
// Kijkt naar de sequentie van berekende ziektestadia (L1-L8) en 
// zoekt de meest vergelijkbare patiënten in de referentie bibliotheek 
// met behulp van Dynamic Time Warping (DTW) en K-Nearest Neighbors (KNN).
// ==========================================================================
function stadiumNaarGetal(stadiumCode) {
    if (!stadiumCode || stadiumCode === "Onbekend") return 0;
    return parseInt(stadiumCode.replace('L', '')) || 0;
}

function berekenDTWAfstand(seq1, seq2) {
    const n = seq1.length;
    const m = seq2.length;
    let dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const val1 = stadiumNaarGetal(seq1[i - 1]);
            const val2 = stadiumNaarGetal(seq2[j - 1]);
            const cost = Math.abs(val1 - val2);
            dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
        }
    }
    return dtw[n][m] / (n + m);
}

function pipeline_DTW_KNN(patientenLijst) {
    console.log("--- Start DTW/KNN Pipeline ---");
    const gesorteerd = [...patientenLijst].sort((a, b) => a.visit - b.visit);
    
    // Bouw de tijdlijn op (bijv: ["L1", "L2", "L4"])
    const patientSequentie = gesorteerd
        .map(p => p.ziektestadium)
        .filter(s => s !== undefined && s !== "Onbekend"); 

    if (patientSequentie.length === 0) {
        console.error("Geen geldige ziektestadia gevonden voor deze patiënt! KNN stopt.");
        return null;
    }
    console.log("Patiënt Sequentie:", patientSequentie);

    // Vergelijk met de referentie bibliotheek
    const scores = REFERENTIE_BIBLIOTHEEK.map(refPat => {
        const afstand = berekenDTWAfstand(patientSequentie, refPat.sequentie);
        return { id: refPat.id, traject: refPat.traject, sequentie: refPat.sequentie, afstand: afstand };
    });
    
    // Sorteer op de kortste afstand (beste match)
    scores.sort((a, b) => a.afstand - b.afstand);

    // Pak de 5 beste buren
    const k = 5; 
    const buren = scores.slice(0, k);
    console.log(`Top ${k} buren:`, buren);

    // Laat de buren 'stemmen' op hun eigen traject
    const stemmen = {};
    buren.forEach(buur => stemmen[buur.traject] = (stemmen[buur.traject] || 0) + 1);

    // Bepaal het winnende traject (Majority Vote)
    let winnendTraject = null;
    let meesteStemmen = -1;
    Object.keys(stemmen).forEach(traject => {
        if (stemmen[traject] > meesteStemmen) {
            meesteStemmen = stemmen[traject];
            winnendTraject = traject;
        }
    });

    console.log("Voorspeld Traject (KNN):", winnendTraject);
    
    // Voeg de resultaten toe aan de patiënt data
    patientenLijst.forEach(p => {
        p.knn_voorspelling = winnendTraject;
        p.knn_buren = buren; 
        p.ziektetraject = winnendTraject;
    });
    
    return winnendTraject;
}


// ==========================================================================
// COMBO MODEL 
// Kiest het beste model op basis van het aantal visites van de patiënt.
// Heeft een patiënt 3 of meer visites? -> Volgt de DTW/KNN Pipeline.
// Heeft een patiënt 1 of 2 visites? -> Volgt het Baseline Model.
// ==========================================================================
function combomodel(patientenLijst) {
    console.log("--- Start Combo Model (>=3 visites: KNN, <=2 visites: Baseline) ---");

    // Groepeer de lijst per patiënt
    const patientGroepen = {};
    patientenLijst.forEach(p => {
        if (!patientGroepen[p.patient_id]) {
            patientGroepen[p.patient_id] = [];
        }
        patientGroepen[p.patient_id].push(p);
    });

    const lijstVoorBaseline = [];

    // Loop door elke patiënt heen en splits de wegen
    for (const [patientId, bezoeken] of Object.entries(patientGroepen)) {
        
        if (bezoeken.length >= 3) {
            // ROUTE A: 3 of meer visites -> Geschikt voor KNN Pipeline
            console.log(`Patiënt ${patientId} heeft ${bezoeken.length} visites. Start KNN Pipeline...`);
            
            pipeline_DTW_KNN(bezoeken);
            
            // Label de data zodat je in de UI weet hoe dit is berekend
            bezoeken.forEach(p => {
                p.gebruiktTrajectModel = "Combo (KNN Pipeline)";
            });
            
        } else {
            // ROUTE B: 1 of 2 visites -> Te kort voor patroonherkenning, gebruik Baseline
            console.log(`Patiënt ${patientId} heeft ${bezoeken.length} visites. Start Baseline...`);
            
            // Verzamel deze bezoeken om ze straks in één keer door de baseline te halen
            lijstVoorBaseline.push(...bezoeken);
            
            // Label de data
            bezoeken.forEach(p => {
                p.gebruiktTrajectModel = "Combo (Baseline)";
            });
        }
    }

    // Voer het baseline model in één keer uit voor alle verzamelde Route B patiënten
    if (lijstVoorBaseline.length > 0) {
        baselinemodel(lijstVoorBaseline);
    }

    console.log("--- Combo Model Voltooid ---");
}


// ==========================================================================
// HULP FUNCTIES (Utils)
// Wiskundige functies en datatransformaties die door de modellen gebruikt worden.
// ==========================================================================

// Parseert de CSV tekst naar een bruikbaar JavaScript object voor het Ziektestadiamodel
function parseModelConfig(csvString) {
    const regels = csvString.trim().split('\n');
    const headers = regels[0].split(',').map(h => h.trim()); 
    
    const modellenMap = {};
    const volgorde = []; 

    for (let i = 1; i < regels.length; i++) {
        const kolommen = regels[i].split(',');
        const modelNaam = kolommen[0].trim();
        const target = kolommen[1].trim(); 

        if (!modellenMap[modelNaam]) {
            modellenMap[modelNaam] = { 
                naam: modelNaam, 
                targets: {},
                benodigdeFeatures: new Set() 
            };
            volgorde.push(modelNaam);
        }

        modellenMap[modelNaam].targets[target] = {}; 

        for (let j = 2; j < headers.length; j++) {
            const featNaam = headers[j];
            const waarde = kolommen[j] ? kolommen[j].trim() : "";

            if (waarde && !isNaN(parseFloat(waarde))) {
                modellenMap[modelNaam].targets[target][featNaam] = parseFloat(waarde);
                modellenMap[modelNaam].benodigdeFeatures.add(featNaam);
            }
        }
    }

    return volgorde.map(naam => ({
        naam: naam,
        targets: modellenMap[naam].targets,
        required: Array.from(modellenMap[naam].benodigdeFeatures)
    }));
}

// Berekent hoeveel visites een patiënt in de dataset heeft staan
function voegVisiteTellersToe(patientenLijst) {
    const tellers = {};
    patientenLijst.forEach(patient => {
        const id = patient.patient_id;
        tellers[id] = (tellers[id] || 0) + 1;
    });
    patientenLijst.forEach(patient => {
        patient.aantalVisites = tellers[patient.patient_id];
    });
}

// Zet ruwe model-scores om naar percentages (tussen 0 en 1) die optellen tot 100%
function berekenSoftmax(scores) {
    const values = Object.values(scores);
    const maxVal = Math.max(...values);
    const exponenten = {};
    let totaalSom = 0;
    
    for (const [key, val] of Object.entries(scores)) {
        const exp = Math.exp(val - maxVal);
        exponenten[key] = exp;
        totaalSom += exp;
    }
    
    const kansen = {};
    for (const [key, val] of Object.entries(exponenten)) {
        kansen[key] = val / totaalSom;
    }
    return kansen;
}

// Pakt het hoogste getal uit een lijst met scores en geeft de ID (bijv 'TR1' of 'L4') terug
function bepaalWinnaar(scores) {
    const [winnaarID] = Object.entries(scores).reduce((max, cur) => cur[1] > max[1] ? cur : max);
    return winnaarID;
}

// Rekent het gemiddelde uit van alle features per traject en visite
function berekenGemiddeldesPerTraject(patientenLijst) {
    console.log("--- Start berekenen gemiddelden per traject ---");
    const features = ['TJC', 'SJC', 'ESR', 'HB', 'Leukocytes', 'Thrombocytes'];
    const tempOpslag = {}; 
    ['TR1', 'TR2', 'TR3', 'TR4'].forEach(tr => tempOpslag[tr] = {});

    patientenLijst.forEach(p => {
        if (p.ziektetraject && !p.ziektetraject.startsWith("Onbekend")) {
            const traject = p.ziektetraject; 
            const visit = p.visit;
            
            if (!tempOpslag[traject][visit]) {
                tempOpslag[traject][visit] = { count: 0 };
                features.forEach(f => tempOpslag[traject][visit][f] = 0);
            }
            tempOpslag[traject][visit].count += 1;
            features.forEach(f => {
                tempOpslag[traject][visit][f] += Number(p[f] || 0);
            });
        }
    });

    const eindResultaat = {};
    for (const [tr, visits] of Object.entries(tempOpslag)) {
        eindResultaat[tr] = [];
        for (const [visiteNummer, data] of Object.entries(visits)) {
            const gemiddeldeRij = { visit: Number(visiteNummer) };
            features.forEach(f => {
                gemiddeldeRij[f] = data[f] / data.count;
            });
            eindResultaat[tr].push(gemiddeldeRij);
        }
        eindResultaat[tr].sort((a, b) => a.visit - b.visit);
    }
    console.log("Gemiddeldes berekend:", eindResultaat);
    return eindResultaat;
};