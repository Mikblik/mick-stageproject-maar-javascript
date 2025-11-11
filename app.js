// --- DEEL 1: CONSTANTEN (Net als bovenaan je views.py) ---

// Vertaald uit je Python-lijst
const VERWACHTE_KOLOMMEN_CSV = [
    'Patient', 'Visite', 'TJC28', 'SJC28', 'ESR',
    'Leukocyten', 'HB (adj.)', 'Trombocyten'
];

// Vertaald uit je Python dictionary. We gebruiken dit na het parsen.
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

// We definiëren de numerieke kolommen hier opnieuw voor makkelijke validatie
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


// --- DEEL 2: WACHT TOT DE PAGINA GELADEN IS ---

// Dit is de 'hoofdfunctie' die alles start.
// Het is de vervanging van 'def home_view(request):'
document.addEventListener('DOMContentLoaded', () => {

    // --- DEEL 3: ELEMENTEN "VANGEN" ---
    // We zoeken alle HTML-elementen die we nodig hebben één keer op

    // 1. "Vang" de knop en de dropdown
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

    // --- DEEL 4: EVENT LISTENERS INSTELLEN ---
    // Dit vervangt 'if request.method == 'POST':'

    if (csvForm) {
        // Dit vervangt 'if 'verwerk-csv' in request.POST:'
        csvForm.addEventListener('submit', handleCsvSubmit);
    }
    
    if (singlePatientForm) {
        // Dit vervangt 'if 'verwerk-individueel' in request.POST:'
        singlePatientForm.addEventListener('submit', handleSinglePatientSubmit);
    }

    // Een functie die checkt of data al geladen is
    function checkSessionData() {
        // Check of de "data_loaded" sleutel bestaat in de rugzak
        if (sessionStorage.getItem('data_loaded') === 'true') {
            
            console.log("Data is al geladen in deze sessie. Knoppen worden geactiveerd.");
            
            // 1. Verwijder de 'disabled' class (dit deed je al)
            navPatient.classList.remove('disabled');
            navAllPatients.classList.remove('disabled');

            // 2. VOEG DE LINK-LOGICA TOE (NIEUW!)
            // We willen niet dat de 'href="#"' wordt gebruikt.
            navPatient.addEventListener('click', (event) => {
                event.preventDefault(); // Stop de '#' link
                // Stuur de gebruiker direct naar de resultaten
                window.location.href = 'resultaten.html';
            });
            
            navAllPatients.addEventListener('click', (event) => {
                event.preventDefault(); // Stop de '#' link
                // Stuur de gebruiker direct naar de resultaten
                window.location.href = 'resultaten.html';
            });
        }
    }

    checkSessionData();


    // --- DEEL 5: FUNCTIE VOOR CSV-VERWERKING ---
    
    function handleCsvSubmit(event) {
        event.preventDefault(); // Voorkom pagina-herlading
        
        // 1. Reset de error-box
        csvErrorBox.classList.add('hidden');
        csvErrorMessage.innerText = '';
        
        // 2. Basisvalidatie (zoals in je 'views.py')
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            showCsvError("Selecteer alstublieft een CSV-bestand.");
            return;
        }
        
        const file = csvFileInput.files[0];

        if (!file.name.endsWith('.csv')) {
            showCsvError("Het geüploade bestand moet een .csv-bestand zijn.");
            return;
        }

        // 3. Bestand parsen met Papa Parse (vervangt pd.read_csv)
        // 'Papa' object is beschikbaar dankzij de script-tag in de HTML
        Papa.parse(file, {
            header: true, // Zegt dat de eerste rij kolomnamen zijn
            skipEmptyLines: true, // Slaat lege rijen over
            
            // Dit is de 'try...except' block
            error: (err) => {
                showCsvError(`Er ging iets mis met het lezen van het bestand: ${err.message}`);
            },
            
            // Dit wordt uitgevoerd als het parsen (lezen) is gelukt
            complete: (results) => {
                try {
                    // console.log("Geparste data:", results);
                    
                    const data = results.data; // Dit is een lijst van objecten
                    const gevondenKolommen = results.meta.fields; // Dit is de lijst met kolomnamen

                    // 4. Valideer de kolommen (zoals 'verwachte_kolommen_set.issubset')
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

                    // 5. Valideer de data (numeriek en geen nulls)
                    let gevalideerdeData = [];
                    for (let i = 0; i < data.length; i++) {
                        const rij = data[i];
                        
                        // Check numerieke kolommen (zoals 'pd.to_numeric')
                        for (const colName of NUMERIEKE_KOLOMMEN_CSV) {
                            const waarde = rij[colName];
                            if (waarde === null || waarde === undefined || waarde === "") {
                                showCsvError(`Rij ${i + 2} heeft een lege waarde in kolom '${colName}'.`);
                                return;
                            }
                            if (isNaN(parseFloat(waarde))) {
                                showCsvError(`Rij ${i + 2}, kolom '${colName}' bevat een ongeldige waarde. Zorg dat dit alleen getallen zijn.`);
                                return;
                            }
                        }

                        // Hernoem de kolommen (zoals 'df.rename(columns=KOLOM_MAPPING)')
                        let nieuweRij = {};
                        for (const key in KOLOM_MAPPING) {
                            nieuweRij[KOLOM_MAPPING[key]] = rij[key];
                        }
                        gevalideerdeData.push(nieuweRij);
                    }

                    // 6. SUCCES! Sla data op en ga verder
                    console.log("CSV Validatie succesvol!", gevalideerdeData);
                    
                    // Sla op in sessie (vervangt 'request.session[...]')
                    sessionStorage.setItem('patient_data_json', JSON.stringify(gevalideerdeData));
                    sessionStorage.setItem('data_loaded', 'true');
                    sessionStorage.setItem('model_voorkeur', geselecteerdeModel);
                    
                    // Stuur door naar de 'alle patiënten' pagina (vervangt 'redirect()')
                    window.location.href = 'resultaten.html'; // Zorg dat deze pagina bestaat!

                } catch (e) {
                    showCsvError(`Onverwachte fout na het parsen: ${e.message}`);
                }
            }
        });
    }

    // --- DEEL 6: FUNCTIE VOOR INDIVIDUELE PATIËNT ---
    
    function handleSinglePatientSubmit(event) {
        event.preventDefault(); // Voorkom pagina-herlading

        let errors = {};
        let formData = {};

        // 1. Reset alle oude foutmeldingen
        for (const veld of INDIVIDUELE_VELDEN) {
            document.getElementById(veld).classList.remove('error');
            const errorElem = document.getElementById(`error-${veld}`);
            if (errorElem) {
                errorElem.classList.add('hidden');
                errorElem.innerText = '';
            }
        }

        // 2. Valideer elk veld (zoals je for-loop in 'views.py')
        for (const veld of INDIVIDUELE_VELDEN) {
            const inputElem = document.getElementById(veld);
            const waarde = inputElem.value.trim(); // .trim() is als .strip()
            formData[veld] = waarde; // Sla de waarde op

            if (waarde === "") { // 'if not waarde:'
                errors[veld] = `Veld '${veld}' is verplicht.`;
                continue;
            }

            // 'if veld in numerieke_velden:'
            if (INDIVIDUELE_NUMERIEKE_VELDEN.includes(veld)) {
                // 'try: float(waarde)'
                if (isNaN(parseFloat(waarde))) { 
                    errors[veld] = `Veld '${veld}' moet een geldig getal zijn.`;
                }
            }
        }

        // 3. Verwerk fouten (zoals 'if context['errors']:')
        if (Object.keys(errors).length > 0) {
            console.log("Validatie mislukt:", errors);
            
            for (const veld in errors) {
                const errorElem = document.getElementById(`error-${veld}`);
                const inputElem = document.getElementById(veld);
                
                errorElem.innerText = errors[veld]; // Zet de fouttekst
                errorElem.classList.remove('hidden'); // Maak 'm zichtbaar
                inputElem.classList.add('error'); // Maak het veld rood
            }
            return; // Stop de functie hier
        }

        // 4. SUCCES! Sla data op en ga verder
        console.log("Validatie succesvol! Data:", formData);

        // Converteer de data naar JSON (net als df.to_json)
        // We stoppen het in een array (tussen [...]) zodat het
        // dezelfde structuur heeft als de CSV-data (een lijst met objecten)
        const dataToStore = JSON.stringify([formData]); 

        // Sla het op in de 'sessie' van de browser (vervangt 'request.session')
        sessionStorage.setItem('patient_data_json', dataToStore);
        sessionStorage.setItem('data_loaded', 'true');
        sessionStorage.setItem('model_voorkeur', geselecteerdeModel);

        // Stuur de gebruiker door (vervangt 'redirect')
        window.location.href = 'resultaten.html'; // Zorg dat deze pagina bestaat!
    }


    // --- DEEL 7: HELPER FUNCTIES ---

    // Koppel een 'click' listener aan de knop
    settingsKnop.addEventListener('click', (event) => {
        // Stop de klik, zodat de 'window' listener hieronder 'm niet vangt
        event.stopPropagation(); 
        
        // De "lichtschakelaar":
        // Als 'hidden' erop staat, haalt hij 'm weg.
        // Als 'hidden' er niet op staat, voegt hij 'm toe.
        settingsDropdown.classList.toggle('hidden');
    });

    // Sluit de dropdown als je ergens anders klikt
    window.addEventListener('click', () => {
        // Als de dropdown *niet* verborgen is...
        if (!settingsDropdown.classList.contains('hidden')) {
            // ...verberg 'm dan.
            settingsDropdown.classList.add('hidden');
        }
    });

    modelOptieAuto.addEventListener('click', (event) => {
        event.preventDefault(); // Stop de <a> link
        geselecteerdeModel = 'auto'; // Update het "geheugen"
        console.log("Modelkeuze is nu:", geselecteerdeModel);
        settingsDropdown.classList.add('hidden'); // Sluit de dropdown
    });

    modelOptieBaseline.addEventListener('click', (event) => {
        event.preventDefault();
        geselecteerdeModel = 'baseline'; // Update het "geheugen"
        console.log("Modelkeuze is nu:", geselecteerdeModel);
        settingsDropdown.classList.add('hidden');
    });

    modelOptieTraject.addEventListener('click', (event) => {
        event.preventDefault();
        geselecteerdeModel = 'traject'; // Update het "geheugen"
        console.log("Modelkeuze is nu:", geselecteerdeModel);
        settingsDropdown.classList.add('hidden');
    });

    // Een simpele functie om CSV-fouten te tonen
    function showCsvError(message) {
        csvErrorMessage.innerText = message;
        csvErrorBox.classList.remove('hidden');
    }
    
});