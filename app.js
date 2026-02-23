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
    'Leukocyte': 'Leukocytes', // Extra fallback voor de Engelse spelling
    'HB (adj.)': 'HB',
    'Trombocyten': 'Thrombocytes'
};

const INDIVIDUELE_NUMERIEKE_VELDEN = [
    'visit', 'TJC', 'SJC', 'ESR', 
    'Leukocytes', 'HB', 'Thrombocytes'
];

const INDIVIDUELE_VELDEN = [
    'patient_id', ...INDIVIDUELE_NUMERIEKE_VELDEN
];


document.addEventListener('DOMContentLoaded', () => {

    const settingsKnop = document.getElementById('settings-knop');
    const settingsDropdown = document.getElementById('settings-dropdown');

    let geselecteerdeModel = 'auto';

    const modelOptieAuto = document.getElementById('model-auto');
    const modelOptieBaseline = document.getElementById('model-baseline');
    const modelOptieTraject = document.getElementById('model-traject');
    
    // Formulieren & Navigatie
    const csvForm = document.getElementById('csv-form');
    const singlePatientForm = document.getElementById('single-patient-form');
    const navPatient = document.getElementById('nav-patient');
    const navAllPatients = document.getElementById('nav-all-patients');
    
    // CSV-formulier elementen
    const csvFileInput = document.getElementById('csv_file');
    const csvErrorBox = document.getElementById('csv-error-box');
    const csvErrorMessage = document.getElementById('csv-error-message');


    // ==========================================================
    // 1. LAAD AUTOMATISCH HET MODELLEN.CSV BESTAND
    // ==========================================================
    async function laadLokaleModelConfig() {
        try {
            console.log("Bezig met zoeken naar modellen.csv in de projectmap...");
            const response = await fetch('modellen.csv'); 
            
            if (response.ok) {
                const csvTekst = await response.text();
                sessionStorage.setItem('custom_model_config', csvTekst);
                console.log("✅ Lokale modellen.csv succesvol geladen!");
            } else {
                console.warn("⚠️ Geen 'modellen.csv' gevonden in de map. Resultaten kunnen onbekend worden.");
                sessionStorage.removeItem('custom_model_config');
            }
        } catch (error) {
            console.error("Fout bij het ophalen van modellen.csv:", error);
            sessionStorage.removeItem('custom_model_config');
        }
    }

    // Direct uitvoeren bij laden van de pagina
    laadLokaleModelConfig();


    // ==========================================================
    // 2. FORMULIER LISTENERS
    // ==========================================================
    if (csvForm) {
        csvForm.addEventListener('submit', handleCsvSubmit);
    }
    
    if (singlePatientForm) {
        singlePatientForm.addEventListener('submit', handleSinglePatientSubmit);
    }

    function showCsvError(message) {
        csvErrorMessage.innerText = message;
        csvErrorBox.classList.remove('hidden');
    }

    // ==========================================================
    // 3. PATIËNTEN CSV VERWERKEN
    // ==========================================================
    function handleCsvSubmit(event) {
        event.preventDefault(); 
        
        csvErrorBox.classList.add('hidden');
        csvErrorMessage.innerText = '';

        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            showCsvError("Selecteer alstublieft een patiënten CSV-bestand.");
            return;
        }

        const file = csvFileInput.files[0];

        if (!file.name.toLowerCase().endsWith('.csv')) {
            showCsvError("Het geüploade bestand moet een .csv bestand zijn.");
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            error: (err) => showCsvError(`Fout: ${err.message}`),
            complete: (results) => {
                try {
                    const data = results.data;
                    let gevalideerdeData = [];

                    for (let i = 0; i < data.length; i++) {
                        const rij = data[i];
                        let nieuweRij = {};
                        
                        for (const key in KOLOM_MAPPING) {
                            if(rij[key] !== undefined) {
                                nieuweRij[KOLOM_MAPPING[key]] = rij[key];
                            }
                        }

                        // VERSOEPELDE VALIDATIE (Voor ontbrekende data)
                        for (const colName of INDIVIDUELE_NUMERIEKE_VELDEN) {
                            let waarde = nieuweRij[colName];
                            
                            if (waarde === null || waarde === undefined || String(waarde).trim() === "") {
                                nieuweRij[colName] = null; 
                            } else {
                                if (isNaN(parseFloat(waarde))) {
                                    showCsvError(`Rij ${i + 2}: '${colName}' is geen geldig getal.`);
                                    return;
                                }
                                nieuweRij[colName] = parseFloat(waarde);
                            }
                        }
                        gevalideerdeData.push(nieuweRij);
                    }

                    // Sla alles op in sessie
                    sessionStorage.setItem('patient_data_json', JSON.stringify(gevalideerdeData));
                    sessionStorage.setItem('data_loaded', 'true');
                    sessionStorage.setItem('model_voorkeur', geselecteerdeModel);
                    
                    // Ga naar resultaten pagina
                    window.location.href = 'resultaten.html';

                } catch (e) {
                    showCsvError(`Validatie fout: ${e.message}`);
                }
            }
        });
    }
    
    // ==========================================================
    // 4. INDIVIDUELE PATIËNT VERWERKEN (Formulier)
    // ==========================================================
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

            // Bij enkele patiënt formulier mag data missen, dus velden hoeven niet verplicht te zijn
            // We controleren alleen óf het een getal is ALS het is ingevuld.
            if (waarde !== "" && INDIVIDUELE_NUMERIEKE_VELDEN.includes(veld)) {
                if (isNaN(parseFloat(waarde))) { 
                    errors[veld] = `Veld '${veld}' moet leeg zijn óf een geldig getal zijn.`;
                } else {
                    formData[veld] = parseFloat(waarde);
                }
            } else if (waarde === "") {
                if(veld === 'patient_id') {
                    errors[veld] = "Patient ID is verplicht.";
                } else {
                    formData[veld] = null; // Opslaan als null voor ontbrekende data
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            console.log("Validatie mislukt:", errors);
            for (const veld in errors) {
                const errorElem = document.getElementById(`error-${veld}`);
                const inputElem = document.getElementById(veld);
                errorElem.innerText = errors[veld]; 
                errorElem.classList.remove('hidden'); 
                inputElem.classList.add('error'); 
            }
            return;
        }

        const dataToStore = JSON.stringify([formData]); 

        sessionStorage.setItem('patient_data_json', dataToStore);
        sessionStorage.setItem('data_loaded', 'true');
        sessionStorage.setItem('model_voorkeur', geselecteerdeModel);

        window.location.href = 'resultaten.html'; 
    }


    // ==========================================================
    // 5. SESSIE DATA CHECK (Voor de navigatieknoppen in de header)
    // ==========================================================
    function checkSessionData() {
        if (sessionStorage.getItem('data_loaded') === 'true') {
            navPatient.classList.remove('disabled');
            navAllPatients.classList.remove('disabled');

            navPatient.addEventListener('click', (event) => {
                event.preventDefault(); 
                window.location.href = 'resultaten.html';
            });
            
            navAllPatients.addEventListener('click', (event) => {
                event.preventDefault(); 
                window.location.href = 'resultaten.html';
            });
        }
    }
    checkSessionData();


    // ==========================================================
    // 6. SETTINGS DROPDOWN LOGICA
    // ==========================================================
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
        event.preventDefault(); geselecteerdeModel = 'auto'; settingsDropdown.classList.add('hidden'); 
    });

    modelOptieBaseline.addEventListener('click', (event) => {
        event.preventDefault(); geselecteerdeModel = 'baseline'; settingsDropdown.classList.add('hidden');
    });

    modelOptieTraject.addEventListener('click', (event) => {
        event.preventDefault(); geselecteerdeModel = 'traject'; settingsDropdown.classList.add('hidden');
    });

});