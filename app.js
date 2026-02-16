const VERWACHTE_KOLOMMEN_CSV = [
    'Patient', 'Visite', 'TJC28', 'SJC28', 'ESR',
    'Leukocyten', 'HB (adj.)', 'Trombocyten'
];

const KOLOM_MAPPING = {
    'Patient': 'patient_id',
    'Visite': 'visit',
    'TJC28': 'TJC',
    'SJC28': 'SJC',
    'ESR': 'ESR',
    'Leukocyten': 'Leukocytes',
    'HB (adj.)': 'HB',
    'Trombocyten': 'Thrombocytes'
};

const NUMERIEKE_KOLOMMEN_CSV = [
    'Visite', 'TJC28', 'SJC28', 'ESR', 
    'Leukocyten', 'HB (adj.)', 'Trombocyten'
];

// Velden voor het individuele formulier
const INDIVIDUELE_VELDEN = [
    'patient_id', 'visit', 'TJC', 'SJC', 
    'ESR', 'Leukocytes', 'HB', 'Thrombocytes'
];
const INDIVIDUELE_NUMERIEKE_VELDEN = [
    'visit', 'TJC', 'SJC', 'ESR', 
    'Leukocytes', 'HB', 'Thrombocytes'
];

const VERWACHTE_MODEL_HEADERS = [
    'ModelNaam', 'Target', 
    'TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'
];

document.addEventListener('DOMContentLoaded', () => {

    const settingsKnop = document.getElementById('settings-knop');
    const settingsDropdown = document.getElementById('settings-dropdown');

    let geselecteerdeModel = 'auto';

    const modelOptieAuto = document.getElementById('model-auto');
    const modelOptieBaseline = document.getElementById('model-baseline');
    const modelOptieTraject = document.getElementById('model-traject');
    
    // Formulieren
    const csvForm = document.getElementById('csv-form');
    const singlePatientForm = document.getElementById('single-patient-form');

    // Navigatieknoppen
    const navPatient = document.getElementById('nav-patient');
    const navAllPatients = document.getElementById('nav-all-patients');
    
    // CSV-formulier elementen
    const csvFileInput = document.getElementById('csv_file');
    const csvErrorBox = document.getElementById('csv-error-box');
    const csvErrorMessage = document.getElementById('csv-error-message');

    // model CSV 
    const modelCsvInput = document.getElementById('model_csv_file');


    if (csvForm) {
        csvForm.addEventListener('submit', handleCsvSubmit);
    }
    
    if (singlePatientForm) {
        singlePatientForm.addEventListener('submit', handleSinglePatientSubmit);
    }

    function handleCsvSubmit(event) {
        event.preventDefault();
        csvErrorBox.classList.add('hidden');
        csvErrorMessage.innerText = '';

        // 1. EERST HET MODEL CSV LEZEN (ALS HET ER IS)
        if (modelCsvInput && modelCsvInput.files.length > 0) {
            const modelFile = modelCsvInput.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Sla de ruwe tekst op in sessie. Resultaten.js parset het later.
                sessionStorage.setItem('custom_model_config', e.target.result);
                console.log("Custom model config opgeslagen.");
                
                // Nu pas de patiënten data verwerken
                verwerkPatientenCSV(); 
            };
            reader.readAsText(modelFile);
        } else {
            // Geen model geüpload? Verwijder oude config en ga door.
            sessionStorage.removeItem('custom_model_config');
            verwerkPatientenCSV();
        }
    }

    function verwerkPatientenCSV() {
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            showCsvError("Selecteer alstublieft een patiënten CSV-bestand.");
            return;
        }
        
        const file = csvFileInput.files[0];
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            error: (err) => showCsvError(`Fout: ${err.message}`),
            complete: (results) => {
                try {
                    const data = results.data;
                    let gevalideerdeData = [];

                    // Loop door de rijen
                    for (let i = 0; i < data.length; i++) {
                        const rij = data[i];
                        let nieuweRij = {};
                        
                        // Mapping toepassen
                        for (const key in KOLOM_MAPPING) {
                            nieuweRij[KOLOM_MAPPING[key]] = rij[key];
                        }

                        // VERSOEPELDE VALIDATIE:
                        // Lege cellen worden null, geen error meer!
                        for (const colName of INDIVIDUELE_NUMERIEKE_VELDEN) {
                            let waarde = nieuweRij[colName];
                            
                            if (waarde === null || waarde === undefined || waarde.trim() === "") {
                                nieuweRij[colName] = null; // Opslaan als null
                            } else {
                                if (isNaN(parseFloat(waarde))) {
                                    // Ongeldige tekst blijft wel een error
                                    showCsvError(`Rij ${i + 2}: '${colName}' is geen getal.`);
                                    return;
                                }
                                nieuweRij[colName] = parseFloat(waarde);
                            }
                        }
                        gevalideerdeData.push(nieuweRij);
                    }

                    sessionStorage.setItem('patient_data_json', JSON.stringify(gevalideerdeData));
                    sessionStorage.setItem('data_loaded', 'true');
                    sessionStorage.setItem('model_voorkeur', geselecteerdeModel);
                    
                    window.location.href = 'resultaten.html';

                } catch (e) {
                    showCsvError(`Validatie fout: ${e.message}`);
                }
            }
        });
    }
    
    // ... (rest van je code: single patient handler etc) ...

    function checkSessionData() {
        if (sessionStorage.getItem('data_loaded') === 'true') {
            
            console.log("Data is al geladen in deze sessie. Knoppen worden geactiveerd.");
            
            navPatient.classList.remove('disabled');
            navAllPatients.classList.remove('disabled');

            navPatient.addEventListener('click', (event) => {
                event.preventDefault(); // Stop de '#' link
                window.location.href = 'resultaten.html';
            });
            
            navAllPatients.addEventListener('click', (event) => {
                event.preventDefault(); 
                window.location.href = 'resultaten.html';
            });
        }
    }

    checkSessionData();


    // CSV INPUT HIERO
    
    function handleCsvSubmit(event) {
        event.preventDefault(); 
        
        csvErrorBox.classList.add('hidden');
        csvErrorMessage.innerText = '';

        // STAP A: MODEL CSV VERWERKEN (ALS HET ER IS)
        if (modelCsvInput && modelCsvInput.files.length > 0) {
            const modelFile = modelCsvInput.files[0];

            // Check 1: Extensie
            if (!modelFile.name.toLowerCase().endsWith('.csv')) {
                showCsvError("Model bestand fout: Het moet een .csv bestand zijn.");
                return;
            }

            const reader = new FileReader();
            
            reader.onload = function(e) {
                const csvTekst = e.target.result;

                // Check 2: Inhoud Parsen & Valideren
                // We gebruiken Papa Parse om de string te analyseren
                const parseResult = Papa.parse(csvTekst, {
                    header: true,
                    skipEmptyLines: true
                });

                // Is de CSV leesbaar?
                if (parseResult.errors.length > 0) {
                    showCsvError(`Model CSV leesfout: ${parseResult.errors[0].message}`);
                    return;
                }

                // Check 3: Headers controleren
                const gevondenHeaders = parseResult.meta.fields || [];
                const missendeHeaders = VERWACHTE_MODEL_HEADERS.filter(h => !gevondenHeaders.includes(h));

                if (missendeHeaders.length > 0) {
                    showCsvError(`Model CSV ongeldig. Mist kolommen: ${missendeHeaders.join(', ')}`);
                    return;
                }

                // Check 4: Is er data? (Minimaal 1 model regel)
                if (parseResult.data.length === 0) {
                    showCsvError("Model CSV is leeg. Voeg minimaal één modelregel toe.");
                    return;
                }

                // ALLES OK! Opslaan en doorgaan.
                console.log("Model CSV gevalideerd en goedgekeurd.");
                sessionStorage.setItem('custom_model_config', csvTekst);
                
                verwerkPatientenCSV(); 
            };
            
            reader.onerror = function() {
                showCsvError("Fout bij lezen van model bestand.");
            };

            reader.readAsText(modelFile);

        } else {
            // Geen model geüpload? Prima, oude config weg en doorgaan met default.
            sessionStorage.removeItem('custom_model_config');
            verwerkPatientenCSV();
        }
    }
    
    // INPUT INDIVIDUELE PATIEËNT HIERO
    
    function handleSinglePatientSubmit(event) {
        event.preventDefault(); 

        let errors = {};
        let formData = {};

        for (const veld of INDIVIDUELE_VELDEN) {
            document.getElementById(veld).classList.remove('error');
            const errorElem = document.getElementById(`error-${veld}`);
            if (errorElem) {
                errorElem.classList.add('hidden');
                errorElem.innerText = '';
            }
        }

        for (const veld of INDIVIDUELE_VELDEN) {
            const inputElem = document.getElementById(veld);
            const waarde = inputElem.value.trim(); 
            formData[veld] = waarde;

            if (waarde === "") { 
                errors[veld] = `Veld '${veld}' is verplicht.`;
                continue;
            }

            if (INDIVIDUELE_NUMERIEKE_VELDEN.includes(veld)) {
                if (isNaN(parseFloat(waarde))) { 
                    errors[veld] = `Veld '${veld}' moet een geldig getal zijn.`;
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            console.log("Validatie mislukt:", errors);
            
            for (const veld in errors) {
                const errorElem = document.getElementById(`error-${veld}`);
                const inputElem = document.getElementById(veld);
                
                errorElem.innerText = errors[veld]; // Zet de fouttekst
                errorElem.classList.remove('hidden'); // Maak emm zichtbaar
                inputElem.classList.add('error'); // Maak het veld rood
            }
            return;
        }

        console.log("Validatie succesvol Data:", formData);

        const dataToStore = JSON.stringify([formData]); 

        sessionStorage.setItem('patient_data_json', dataToStore);
        sessionStorage.setItem('data_loaded', 'true');
        sessionStorage.setItem('model_voorkeur', geselecteerdeModel);

        window.location.href = 'resultaten.html'; 
    }

    // KNOPPEN LUISTER DINGEN
    settingsKnop.addEventListener('click', (event) => {
        event.stopPropagation(); 
        
        settingsDropdown.classList.toggle('hidden');
    });

    window.addEventListener('click', () => {
        if (!settingsDropdown.classList.contains('hidden')) {
            settingsDropdown.classList.add('hidden');
        }
    });

    modelOptieAuto.addEventListener('click', (event) => {
        event.preventDefault(); 
        geselecteerdeModel = 'auto'; 
        console.log("Modelkeuze is nu:", geselecteerdeModel);
        settingsDropdown.classList.add('hidden'); 
    });

    modelOptieBaseline.addEventListener('click', (event) => {
        event.preventDefault();
        geselecteerdeModel = 'baseline'; 
        console.log("Modelkeuze is nu:", geselecteerdeModel);
        settingsDropdown.classList.add('hidden');
    });

    modelOptieTraject.addEventListener('click', (event) => {
        event.preventDefault();
        geselecteerdeModel = 'traject'; 
        console.log("Modelkeuze is nu:", geselecteerdeModel);
        settingsDropdown.classList.add('hidden');
    });

    function showCsvError(message) {
        csvErrorMessage.innerText = message;
        csvErrorBox.classList.remove('hidden');
    }

});