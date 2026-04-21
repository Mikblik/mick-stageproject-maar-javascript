/*
 * ============================================================================
 * BESTAND: resultaten.js
 * BESCHRIJVING: 
 * Dit script beheert de 'resultaten.html' pagina. Het haalt data op uit de
 * sessie(data die is geüpload in app.js), draait de voorspellende modellen, 
 * en roept de juiste grafieken op (individu of alle patiënten pagina).
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Globale variabele om de huidig geselecteerde patiënt in op te slaan
    let gekozenpatientlijst = [];

    // ========================================================================
    // 1. DATA INITIALISATIE & VALIDATIE
    // ========================================================================

    // Haal de ruwe data string op uit de browser opslag.
    const dataString = sessionStorage.getItem('patient_data_json');

    // Validatie: Als er geen data is, stuur direct terug naar homepage.
    if (!dataString) {
        console.error("No data found! Redirecting to home.");
        window.location.href = 'index.html'; 
        return; 
    }

    // Zet DataString om naar een bruikbaar object (parsen).
    const patientenLijst = JSON.parse(dataString);
    console.log("Data successfully loaded from sessionStorage:", patientenLijst);

    const dataRapport = evalueerDataKwaliteit(patientenLijst);
    toonDataKwaliteitMelding(dataRapport);

    // ========================================================================
    // 2. DOM ELEMENTEN OPSLAAN (Voor snellere toegang)
    // ========================================================================

    // Navigatie (Header)
    const navHomeKnop = document.getElementById('nav-home');
    const navPatientKnop = document.getElementById('nav-patient');
    const navAllPatientsKnop = document.getElementById('nav-all-patients');

    // Views (Deze bepalen welke pagina we laten zien)
    const individueleView = document.getElementById('individuele-view');
    const allePatientenView = document.getElementById('alle-patienten-view');

    // Interactie voor Individuele pagina
    const patientinputveld = document.getElementById("DePatiënt");
    const patkiezenknop = document.getElementById('verstuurKnop');

    // Dropdowns voor Individuele pagina
    const selectLijn1 = document.getElementById('select-lijn-1');
    const selectLijn2 = document.getElementById('select-lijn-2');
    const selectKansVisite = document.getElementById('select-kans-visite');
    const selectKansType = document.getElementById('select-kans-type');
    const selectGraphRef = document.getElementById('select-graph-ref');

    // Dropdowns voor Alle Patiënten pagina
    const selectTrendFeat1 = document.getElementById('select-trend-feat1');
    const selectTrendFeat2 = document.getElementById('select-trend-feat2');

    // Modal (De opgeslagen info voor de "i" knopjes)
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.getElementById('modal-close-button');
    const allInfoButtons = document.querySelectorAll('.info-button');

    
    // ========================================================================
    // 3. PAGINA ROUTING (Welke view moet er openen?)
    // ========================================================================
    if (patientenLijst.length === 1) {
        individueleView.classList.remove('hidden');
    } else {
        allePatientenView.classList.remove('hidden');
    }

    // ========================================================================
    // 4. MODEL UITVOERING
    // Hier worden alle modellen aangeroepen uit "modellen.js".
    // ========================================================================

    // Voeg een ziektestadium toe aan elke visite
    ziektestadiamodel(patientenLijst);

    // Tel hoeveel visites elke patiënt in totaal heeft
    voegVisiteTellersToe(patientenLijst);

    // Haal de gekozen trajectstrategie op uit de sessie data (via app.js)
    let modelVoorkeur = sessionStorage.getItem('model_voorkeur');
    console.log("Selected model strategy:", modelVoorkeur);

    // De juiste trajectstrategie aanroepen
    if (modelVoorkeur === "baseline") {
        console.log("Using Baseline model.");
        baselinemodel(patientenLijst);
    } else if (modelVoorkeur === "traject") {
        console.log("Using DTW/KNN pipeline.");
        pipeline_DTW_KNN(patientenLijst);
    } else {
        console.log("Using Combo model (Baseline + DTW/KNN fallback).");
        combomodel(patientenLijst);
    }

    console.log("Updated patient list WITH trajectories/stages:", patientenLijst);


    // ========================================================================
    // 5. INDIVIDUELE PATIËNT LOGICA (Event Listeners & Dropdowns)
    // ========================================================================

    // A. Zoek-knop: Teken alle grafieken voor één patiënt
    patkiezenknop.addEventListener('click', () => {
        const gekozenpatient = patientinputveld.value.trim();
        gekozenpatientlijst = patientenLijst.filter(p => {
            const id = p.patient_id || p.Patient || p.patient;
            return String(id).toLowerCase() === gekozenpatient.toLowerCase();
        });
        
        console.log("Patient selected:", gekozenpatient);

        if (gekozenpatientlijst.length > 0) {
            
            // 1. Combo Grafiek 
            maakFlexibeleComboGrafiek(gekozenpatientlijst, selectLijn1.value, selectLijn2.value);

            // 2. Kansen/Zekerheid Grafiek
            vulVisiteDropdown(gekozenpatientlijst);
            selectKansType.value = "Stadium"; 
            maakKansenGrafiek(gekozenpatientlijst, selectKansVisite.value, "Stadium");

            // 3. Heatmaps & Netwerk
            maakApexHeatmap(gekozenpatientlijst);
            maakTrajectHeatmap(gekozenpatientlijst);
            
            const patientTraject = gekozenpatientlijst[0].ziektetraject || "TR1";
            if (selectGraphRef) selectGraphRef.value = patientTraject;
            maakIndividualGraphProjection(gekozenpatientlijst, selectGraphRef.value);

            // 4. Tabellen
            vulBurenTabel(gekozenpatientlijst);
            vulPatientSpecifiekeLegenda(gekozenpatientlijst);

        } else {
            alert("Patient not found in the dataset.");
        }
    });

    // B. Dropdown: Vis.js Netwerk Figuur
    if (selectGraphRef) {
        selectGraphRef.addEventListener('change', () => {
            if (gekozenpatientlijst.length > 0) {
                maakIndividualGraphProjection(gekozenpatientlijst, selectGraphRef.value);
            }
        });
    }

    // C. Dropdown: Visite selectie voor Zekerheidsgrafiek
    selectKansVisite.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakKansenGrafiek(gekozenpatientlijst, selectKansVisite.value, selectKansType.value);
            // Optioneel: we updaten hier ook de heatmap voor de zekerheid
            maakApexHeatmap(gekozenpatientlijst);
        }
    });

    // D. Dropdown: Type selectie (Stadium vs Traject) voor Zekerheidsgrafiek
    selectKansType.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakKansenGrafiek(gekozenpatientlijst, selectKansVisite.value, selectKansType.value);
        }
    });

    // E. Dropdowns: Combo Grafiek (Lijn Links & Rechts)
    selectLijn1.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakFlexibeleComboGrafiek(gekozenpatientlijst, selectLijn1.value, selectLijn2.value);
        }
    });

    selectLijn2.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakFlexibeleComboGrafiek(gekozenpatientlijst, selectLijn1.value, selectLijn2.value);
        }
    });


    // ========================================================================
    // 6. HULPFUNCTIES
    // ========================================================================

    // Vult de visite-dropdown op basis van de aanwezige visites van een patiënt
    function vulVisiteDropdown(data) {
        selectKansVisite.innerHTML = "";
        data.sort((a, b) => a.visit - b.visit);

        data.forEach(rij => {
            const optie = document.createElement("option");
            optie.value = rij.visit;
            optie.text = `Visit ${rij.visit}`; // Translated to English
            selectKansVisite.appendChild(optie);
        });

        if (data.length > 0) {
            selectKansVisite.value = data[0].visit; 
        }
    }


    // ========================================================================
    // 7. NAVIGATIE & MODALS (Bovenkant van de pagina)
    // ========================================================================

    navHomeKnop.addEventListener('click', (event) => {
        window.location.href = 'index.html';
    });

    navPatientKnop.addEventListener('click', (event) => { 
        event.preventDefault(); 
        console.log("Switching to Individual View");
        individueleView.classList.remove('hidden');
        allePatientenView.classList.add('hidden');
    });

    navAllPatientsKnop.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("Switching to All Patients View");
        individueleView.classList.add('hidden');
        allePatientenView.classList.remove('hidden');
    });

    function openModal(title, description) {
        modalTitle.innerText = title;
        modalContent.innerText = description;
        modal.classList.remove('hidden');
    }

    // ========================================================================
    // 8. MODAL / POP-UP LOGICA (Inzoomen op grafieken)
    // ========================================================================
    
    let actieveWitteBox = null;
    let grafiekPlaceholder = null;
    let origineleHoogteClass = '';

    allInfoButtons.forEach(button => {
        button.addEventListener('click', () => {
            const title = button.dataset.title;
            const description = button.dataset.description;
            
            // Zoek het originele blauwe blok en pak de witte inhoud (de grafiek)
            const card = button.closest('.bg-blue-800');
            actieveWitteBox = card.querySelector('.bg-white');
            
            if (!actieveWitteBox) return; // Als er niks is, doe niks

            // Sla op hoe hoog het blokje was
            const match = actieveWitteBox.className.match(/h-\w+|h-\[\d+%\]/);
            origineleHoogteClass = match ? match[0] : 'h-96';

            // Maak een "Gereserveerd" blokje aan zodat je pagina-layout niet inzakt!
            grafiekPlaceholder = document.createElement('div');
            grafiekPlaceholder.className = actieveWitteBox.className; 
            grafiekPlaceholder.innerHTML = '<div class="flex h-full w-full items-center justify-center text-blue-300 font-bold italic">Chart opened in pop-up...</div>';
            
            // Wissel de echte grafiek om met de placeholder
            actieveWitteBox.replaceWith(grafiekPlaceholder);

            // Zet de echte grafiek in de pop-up
            const modalSlot = document.getElementById('modal-chart-slot');
            modalSlot.innerHTML = ''; 
            modalSlot.appendChild(actieveWitteBox);

            // Maak de grafiek groot
            actieveWitteBox.classList.remove('h-48', 'h-56', 'h-64', 'h-96', 'h-auto', 'min-h-[12rem]');
            actieveWitteBox.classList.add('h-full', 'w-full', 'flex-grow');

            // Vul tekst in en open de modal
            modalTitle.innerText = title;
            modalContent.innerText = description;
            modal.classList.remove('hidden');

            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        });
    });

    function closeModal() {
        modal.classList.add('hidden');
        
        if (actieveWitteBox && grafiekPlaceholder) {
            // Haal de pop-up grootte weg
            actieveWitteBox.classList.remove('h-full', 'w-full', 'flex-grow');
            // Geef de originele grootte weer terug
            actieveWitteBox.classList.add(origineleHoogteClass);
            
            // Zet de grafiek weer terug op je dashboard (vervangt de placeholder)
            grafiekPlaceholder.replaceWith(actieveWitteBox);
            
            // Leegmaken
            actieveWitteBox = null;
            grafiekPlaceholder = null;
            
            // Vertel grafieken weer te krimpen
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        }
    }

    closeButton.addEventListener('click', closeModal);

    // Om modal te sluiten als je buiten het inhoudsgedeelte klikt (de zwarte rand)
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    

    // ========================================================================
    // 9. ALLE PATIËNTEN FIGUREN (AANSTURING)
    // ========================================================================

    const trajectGemiddeldes = berekenGemiddeldesPerTraject(patientenLijst);

    // Functie om grafiek te updaten
    function updateTrendGrafiek() {
        maakTrajectTrendGrafiek(
            trajectGemiddeldes, 
            selectTrendFeat1.value, 
            selectTrendFeat2.value
        );
    }

    // Event listeners toevoegen voor Trend Grafiek
    if(selectTrendFeat1 && selectTrendFeat2) {
        selectTrendFeat1.addEventListener('change', updateTrendGrafiek);
        selectTrendFeat2.addEventListener('change', updateTrendGrafiek);

        // Initiële grafiek tekenen (Default: TJC, SJC)
        updateTrendGrafiek();
    }

    // Luister naar het filter dropdown menu voor de alle patiënt graph projection
    const filterSelect = document.getElementById('select-pop-graph-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            if (patientenLijst.length > 1) {
                maakPopulatieGraphProjection(patientenLijst, e.target.value);
            }
        });
    }

    if (patientenLijst.length > 1) {
        console.log("Multiple patients found, drawing Population Charts...");
        maakPopulatieScatter(patientenLijst);
        maakPopulatieStadiaHeatmap(patientenLijst);
        maakPopulatieTrajectHeatmap(patientenLijst);
        vulPopulatieLegenda(patientenLijst);
        maakPopulatieScatterReferentie(patientenLijst)
        maakPopulatieGraphProjection(patientenLijst, 'ALL');
    }

    // ========================================================================
    // 10. DATA KWALITEIT & RAPPORTAGE
    // ========================================================================

    function evalueerDataKwaliteit(patientenLijst) {
        const features = ['TJC', 'SJC', 'ESR', 'Leukocytes', 'HB', 'Thrombocytes'];
        const patientStatus = {};
        const incompleteVisitesData = [];

        let totaalVisitesMetMissendeData = 0;

        // Loop door alle data en verzamel de statistieken
        patientenLijst.forEach(p => {
            const id = p.patient_id;
            
            // Maak de patiënt aan in ons rapportage-object als deze nog niet bestaat
            if (!patientStatus[id]) {
                patientStatus[id] = { totaalVisites: 0, incompleteVisites: 0 };
            }

            patientStatus[id].totaalVisites++;

            let isIncomplete = false;
            let mistVelden = [];
            
            // Controleer op missende features
            features.forEach(f => {
                if (p[f] === null || p[f] === undefined || p[f] === "") {
                    isIncomplete = true;
                    mistVelden.push(f);
                }
            });

            // Als er iets mist, sla de details apart op
            if (isIncomplete) {
                patientStatus[id].incompleteVisites++;
                totaalVisitesMetMissendeData++;
                incompleteVisitesData.push({
                    patient_id: id,
                    visit: p.visit,
                    mist: mistVelden
                });
            }
        });

        // Bereken de totalen op patient lvl
        let patientenMetMinimaal1MissendeVisite = 0;
        let patientenMetAlleVisitesMissend = 0;

        for (const id in patientStatus) {
            const stats = patientStatus[id];
            if (stats.incompleteVisites > 0) {
                patientenMetMinimaal1MissendeVisite++;
                // Check of alles mist
                if (stats.incompleteVisites === stats.totaalVisites) {
                    patientenMetAlleVisitesMissend++;
                }
            }
        }

        // Sla de ongebruikte/incomplete data apart op in de sessie
        sessionStorage.setItem('uitgesloten_data_log', JSON.stringify(incompleteVisitesData));

        // Geef het rapportage object terug
        return {
            totaalMissendeVisites: totaalVisitesMetMissendeData,
            minimaalEénMissend: patientenMetMinimaal1MissendeVisite,
            allesMissend: patientenMetAlleVisitesMissend,
            totaalPatienten: Object.keys(patientStatus).length,
            details: incompleteVisitesData
        };
    }

    function toonDataKwaliteitMelding(rapport) {
        // Als de data perfect is, tonen we geen melding
        if (rapport.totaalMissendeVisites === 0) return;

        // Maak Tailwind waarschuwingsbanner aan
        const banner = document.createElement('div');
        banner.className = "bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 shadow-sm rounded-r-md";
        
        banner.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-yellow-800">
                        Data Quality Report
                    </h3>
                    <div class="mt-2 text-sm text-yellow-700">
                        <ul class="list-disc pl-5 space-y-1">
                            <li><strong>${rapport.totaalMissendeVisites} visits</strong> in total are missing clinical data.</li>
                            <li><strong>${rapport.minimaalEénMissend} out of ${rapport.totaalPatienten} patients</strong> are missing data in at least one visit.</li>
                            <li><strong>${rapport.allesMissend} patients</strong> are missing data in all of their visits.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    
        const allePatientenView = document.getElementById('alle-patienten-view');
        if (allePatientenView) {
            allePatientenView.insertBefore(banner, allePatientenView.firstChild);
        }
    }

    // ========================================================================
    // 11. EXPORT NAAR CSV (EXCEL) - ALLE PATIËNTEN
    // ========================================================================
    const exportKnop = document.getElementById('exportCsvKnop');
    
    if (exportKnop) {
        exportKnop.addEventListener('click', () => {
            console.log("Starting CSV export for Population...");

            // Bouw een schone lijst met alleen de kolommen die we willen exporteren
            const exportData = patientenLijst.map(p => {
                const veiligID = p.patient_id || p.Patient || p.patient || 'Unknown';

                return {
                    'Patient ID': veiligID,
                    'Visit': p.visit,
                    'TJC28': p.TJC !== null ? p.TJC : '', 
                    'SJC28': p.SJC !== null ? p.SJC : '',
                    'ESR': p.ESR !== null ? p.ESR : '',
                    'Leukocytes': p.Leukocytes !== null ? p.Leukocytes : '',
                    'HB (adj.)': p.HB !== null ? p.HB : '',
                    'Thrombocytes': p.Thrombocytes !== null ? p.Thrombocytes : '',
                    'Disease Stage (L1-L8)': p.ziektestadium || 'Unknown',
                    'Predicted Trajectory (TR1-TR4)': p.ziektetraject || 'Unknown',
                    'Applied AI Model': p.gebruiktTrajectModel || p.modelGebruikt || 'None'
                };
            });

            // Gebruik PapaParse om de JSON om te zetten naar een string
            const csvString = Papa.unparse(exportData, {
                quotes: true, 
                delimiter: ";"
            });

            const excelFix = "\uFEFFsep=;\n";
            const definitieveCsv = excelFix + csvString;

            // Maak een downloadbaar bestandje aan in de browser
            const blob = new Blob([definitieveCsv], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob);
            
            // Maak een onzichtbare link, klik erop, en gooi hem weer weg
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "RA_Predictions_Export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // ========================================================================
    // 12. EXPORT NAAR CSV (EXCEL) - INDIVIDUELE PATIËNT
    // ========================================================================
    const exportIndivKnop = document.getElementById('exportIndivCsvKnop');
    
    if (exportIndivKnop) {
        exportIndivKnop.addEventListener('click', () => {
            // Bepaal welke patiënt momenteel bekeken wordt
            const huidigeNaam = document.getElementById('DePatiënt').value.trim();
            
            if (!huidigeNaam) {
                alert("Please enter a patient name first.");
                return;
            }

            // Filter de volledige lijst op alleen deze patiënt
            const specifiekePatientData = patientenLijst.filter(p => {
                const id = p.patient_id || p.Patient || p.patient;
                return String(id).toLowerCase() === huidigeNaam.toLowerCase();
            });

            if (specifiekePatientData.length === 0) {
                alert("No data found for this patient to export.");
                return;
            }

            console.log(`Exporting data for patient: ${huidigeNaam}`);

            // Formatteer de data (Identiek aan de populatie export)
            const exportData = specifiekePatientData.map(p => {
                const veiligID = p.patient_id || p.Patient || p.patient || 'Unknown';
                return {
                    'Patient ID': veiligID,
                    'Visit': p.visit,
                    'TJC28': p.TJC !== null ? p.TJC : '', 
                    'SJC28': p.SJC !== null ? p.SJC : '',
                    'ESR': p.ESR !== null ? p.ESR : '',
                    'Leukocytes': p.Leukocytes !== null ? p.Leukocytes : '',
                    'HB (adj.)': p.HB !== null ? p.HB : '',
                    'Thrombocytes': p.Thrombocytes !== null ? p.Thrombocytes : '',
                    'Disease Stage (L1-L8)': p.ziektestadium || 'Unknown',
                    'Predicted Trajectory (TR1-TR4)': p.ziektetraject || 'Unknown',
                    'Applied AI Model': p.gebruiktTrajectModel || p.modelGebruikt || 'None'
                };
            });

            // Omzetten naar CSV met Excel fix
            const csvString = Papa.unparse(exportData, {
                quotes: true, 
                delimiter: ";" 
            });

            const excelFix = "\uFEFFsep=;\n";
            const definitieveCsv = excelFix + csvString;

            // Download triggeren
            const blob = new Blob([definitieveCsv], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Data_Patient_${huidigeNaam}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

// EINDE DOMContentLoaded
});