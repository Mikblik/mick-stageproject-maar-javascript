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


    if (csvForm) {
        csvForm.addEventListener('submit', handleCsvSubmit);
    }
    
    if (singlePatientForm) {
        singlePatientForm.addEventListener('submit', handleSinglePatientSubmit);
    }

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
        event.preventDefault(); // Voorkom pagina herlading
        
        // Reset de error box
        csvErrorBox.classList.add('hidden');
        csvErrorMessage.innerText = '';
        
        // cheken of  er een bestand is en of het CSV is !>!
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            showCsvError("Selecteer alstublieft een CSV-bestand.");
            return;
        }
        
        const file = csvFileInput.files[0];

        if (!file.name.endsWith('.csv')) {
            showCsvError("Het geüploade bestand moet een .csv-bestand zijn.");
            return;
        }

        Papa.parse(file, {
            header: true,  // er is een header -> TRUE
            skipEmptyLines: true, // skip lege rijen
            
            error: (err) => {
                showCsvError(`Er ging iets mis met het lezen van het bestand: ${err.message}`);
            },
            
            complete: (results) => {
                try {
                    
                    const data = results.data; // Dit is een lijst van objecten/rijen
                    const gevondenKolommen = results.meta.fields; // Dit is de lijst met kolomnamen

                    let ontbrekendeKolommen = [];
                    for (const verwachteKolom of VERWACHTE_KOLOMMEN_CSV) {
                        if (!gevondenKolommen.includes(verwachteKolom)) {
                            ontbrekendeKolommen.push(verwachteKolom);
                        }
                    }

                    if (ontbrekendeKolommen.length > 0) {
                        showCsvError(`De CSV mist de volgende kolommen: ${ontbrekendeKolommen.join(', ')}`);
                        return;
                    }

    let gevalideerdeData = [];
    for (let i = 0; i < data.length; i++) {
        const rij = data[i]; 
        
        // HERNOEM DE RIJ
        let nieuweRij = {};
        for (const key in KOLOM_MAPPING) {
            nieuweRij[KOLOM_MAPPING[key]] = rij[key];
        }

        for (const colName of INDIVIDUELE_NUMERIEKE_VELDEN) { 
            
            const waarde = nieuweRij[colName]; 
            
            if (waarde === null || waarde === undefined || waarde === "") {
                showCsvError(`Rij ${i + 2} heeft een lege waarde in kolom '${colName}'.`);
                return;
            }
            if (isNaN(parseFloat(waarde))) {
                showCsvError(`Rij ${i + 2}, kolom '${colName}' bevat een ongeldige waarde.`);
                return;
            }
        }
    
        gevalideerdeData.push(nieuweRij);
    }

                    console.log("CSV Validatie succesvol!", gevalideerdeData);

                    sessionStorage.setItem('patient_data_json', JSON.stringify(gevalideerdeData));
                    sessionStorage.setItem('data_loaded', 'true');
                    sessionStorage.setItem('model_voorkeur', geselecteerdeModel);
                    
                    window.location.href = 'resultaten.html'; 
                } catch (e) {
                    showCsvError(`Onverwachte fout na het parsen: ${e.message}`);
                }
            }
        });
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