// ==========================================================================
// BESTAND: modellen.js
// ==========================================================================

/**
 * 1. ZIEKTESTADIA MODEL (WATERVAL)
 * Bepaalt L1-L8. Flexibel met missing values.
 */
function ziektestadiamodel(patientenLijst) {
    console.log("--- Start Ziektestadia Model (Waterval) ---");

    // A. DEFINIEER HET STANDAARD MODEL
    const DEFAULT_ZIEKTESTADIA_MODEL = [
        {
            naam: "Default (Alles)",
            // Lijst van features die NIET null mogen zijn voor dit model
            required: ["TJC", "SJC", "ESR", "Leukocytes", "HB", "Thrombocytes"],
            
            // De formules per stadium (L1..L8)
            targets: {
                L1: { TJC: -0.777, SJC: -1.032, ESR: -0.209, Leukocytes: -0.516, HB: 1.68, Thrombocytes: -0.004 },
                L2: { TJC: -0.595, SJC: -0.699, ESR: 0.165, Leukocytes: -0.096, HB: 0.329, Thrombocytes: -0.002 },
                L3: { TJC: -0.569, SJC: -0.808, ESR: -0.203, Leukocytes: 1.302, HB: -0.271, Thrombocytes: 0 },
                L4: { TJC: 0.619, SJC: 0.359, ESR: -0.188, Leukocytes: -0.204, HB: 0.858, Thrombocytes: -0.004 },
                L5: { TJC: 0.296, SJC: 0.472, ESR: 0.087, Leukocytes: 0.005, HB: -0.1, Thrombocytes: -0.001 },
                L6: { TJC: -0.151, SJC: 0.025, ESR: 0.329, Leukocytes: 0.052, HB: -1.364, Thrombocytes: 0.001 },
                L7: { TJC: 0.890, SJC: 1.475, ESR: -0.042, Leukocytes: 0.108, HB: -0.65, Thrombocytes: -0.01 },
                L8: { TJC: 0.286, SJC: 0.208, ESR: 0.060, Leukocytes: -0.650, HB: -0.481, Thrombocytes: 0.02 }
            }
        }
    ];

    // B. INITIALISEER DE MODEL LIJST
    let modelLijst = DEFAULT_ZIEKTESTADIA_MODEL;
    
    // Check of er een custom CSV is geüpload in app.js
    const customCsv = sessionStorage.getItem('custom_model_config');
    if (customCsv) {
        console.log("Custom model config gevonden! Parsen...");
        try {
            modelLijst = parseModelConfig(customCsv);
        } catch (e) {
            console.error("Fout bij parsen custom model, fallback naar default:", e);
        }
    }

    // C. LOOP DOOR PATIËNTEN
    for (const patient of patientenLijst) {
        let gekozenModel = null;

        // D. DE WATERVAL: Probeer modellen op volgorde
        for (const model of modelLijst) {
            let heeftAlles = true;
            
            // Check of patiënt alle benodigde data heeft voor dit model
            for (const feature of model.required) {
                if (patient[feature] === null || patient[feature] === undefined) {
                    heeftAlles = false;
                    break; 
                }
            }
            
            if (heeftAlles) {
                gekozenModel = model;
                break; // Gevonden! Stop met zoeken naar slechtere modellen.
            }
        }

        // E. BEREKENEN
        if (gekozenModel) {
            const resultaten = {};
            
            // Voor elk Target (L1, L2...)
            for (const [target, coeffs] of Object.entries(gekozenModel.targets)) {
                let score = 0; // Start op 0 (Geen intercept in jouw modellen)

                for (const [feat, factor] of Object.entries(coeffs)) {
                    score += (Number(patient[feat]) * factor);
                }
                resultaten[target] = score;
            }
            
            // Softmax en winnaar bepalen
            patient.stadiumKansen = berekenSoftmax(resultaten);
            const [hoogsteID] = Object.entries(resultaten).reduce((max, cur) => cur[1] > max[1] ? cur : max);
            
            patient.ziektestadium = hoogsteID;
            patient.modelGebruikt = gekozenModel.naam; // Handig om te weten!
            
            console.log(`wel Ziektestadia gevonden voor ${patient.patient_id} (Visite ${patient.visit}): Gebruikt model "${gekozenModel.naam}" -> Uitslag: ${hoogsteID}`);

        } else {
            // Geen enkel model paste (te veel missing values)
            patient.ziektestadium = "Onbekend";
            patient.stadiumKansen = null;
            patient.modelGebruikt = "Geen";
            console.log(`geen Ziektestadia gevonden voor ${patient.patient_id} (Visite ${patient.visit}): Geen enkel model paste (te veel missing data).`);
        }
    }
}


/**
 * 2. BASELINE MODEL
 */
function baselinemodel(patientenLijst) {
    console.log("--- Start Baseline Model (Streng) ---");
    
    const requiredFeatures = ['TJC', 'SJC', 'ESR', 'HB', 'Leukocytes', 'Thrombocytes'];
    const baselineGeheugen = {};

    for (const patient of patientenLijst) {
        
        // Baseline kijkt alleen naar visite 1
        if (Number(patient.visit) !== 1) continue;

        // CHECK: Zijn alle waardes er
        let missing = [];
        requiredFeatures.forEach(f => {
            if (patient[f] === null || patient[f] === undefined) missing.push(f);
        });

        if (missing.length > 0) {
            // AFGEKEURD! Patient mist data.
            console.warn(`Patiënt ${patient.patient_id} uitgesloten van Baseline. Mist: ${missing.join(', ')}`);
            
            baselineGeheugen[patient.patient_id] = {
                status: 'excluded',
                reason: missing
            };
        } else {
            // GOEDGEKEURD! Bereken Baseline
            const resultaten = {
                TR1: (Number(patient.TJC) * 0.777) + (Number(patient.SJC) * -1.032),
                TR2: (Number(patient.TJC) * 0.595) + (Number(patient.SJC) * -0.699),
                TR3: (Number(patient.TJC) * 0.597) + (Number(patient.SJC) * -0.808),
                TR4: (Number(patient.TJC) * 0.619) + (Number(patient.SJC) * -0.359),
            };

            const kansen = berekenSoftmax(resultaten);
            const [hoogsteID] = Object.entries(resultaten).reduce((max, cur) => cur[1] > max[1] ? cur : max);
            
            baselineGeheugen[patient.patient_id] = {
                status: 'ok',
                traject: hoogsteID,
                kansen: kansen
            };
            console.log(`Baseline gevonden voor ${patient.patient_id}: ${hoogsteID}`);
        }
    }

    // Resultaten toepassen op alle visites van de patiënt
    for (const patient of patientenLijst) {
        const geheugen = baselineGeheugen[patient.patient_id]; 

        if (geheugen) {
            if (geheugen.status === 'ok') {
                patient.ziektetraject = geheugen.traject;     
                patient.trajectKansen = geheugen.kansen;       
                patient.baseline_excluded = false;
            } else {
                // Patient was excluded
                patient.ziektetraject = "Onbekend (Data incompleet)";
                patient.trajectKansen = null;
                patient.baseline_excluded = true;
            }
        } else {
            // Geen visite 1 gevonden voor deze patiënt
            if (!patient.ziektetraject) {
                patient.ziektetraject = "Onbekend (Geen V1)";
            }
        }
    }
    console.log("Baseline Model voltooid.");
}


// --- HULPFUNCTIES (Parse, Softmax, Tellers, etc.) ---

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

        // Starten bij index 2 (want index 0=Naam, 1=Target)
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
}

// ------ DTW/KNN PIPELNE ------

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
    const patientSequentie = gesorteerd
        .map(p => p.ziektestadium)
        .filter(s => s !== undefined && s !== "Onbekend"); 

    if (patientSequentie.length === 0) {
        console.error("Geen geldig ziektestadia gevonden voor deze patiënt!");
        return null;
    }
    console.log("Patiënt Sequentie:", patientSequentie);

    const scores = REFERENTIE_BIBLIOTHEEK.map(refPat => {
        const afstand = berekenDTWAfstand(patientSequentie, refPat.sequentie);
        return { id: refPat.id, traject: refPat.traject, sequentie: refPat.sequentie, afstand: afstand };
    });
    scores.sort((a, b) => a.afstand - b.afstand);

    const k = 5; 
    const buren = scores.slice(0, k);
    console.log(`Top ${k} buren:`, buren);

    const stemmen = {};
    buren.forEach(buur => stemmen[buur.traject] = (stemmen[buur.traject] || 0) + 1);

    let winnendTraject = null;
    let meesteStemmen = -1;
    Object.keys(stemmen).forEach(traject => {
        if (stemmen[traject] > meesteStemmen) {
            meesteStemmen = stemmen[traject];
            winnendTraject = traject;
        }
    });

    console.log("Voorspeld Traject (KNN):", winnendTraject);
    patientenLijst.forEach(p => {
        p.knn_voorspelling = winnendTraject;
        p.knn_buren = buren; 
        p.ziektetraject = winnendTraject;
    });
    return winnendTraject;
}