/*
 * ============================================================================
 * BESTAND: resultaten.js
 * BESCHRIJVING: 
 * Dit script beheert de 'resultaten.html' pagina. Het haalt data op uit de
 * sessie(data dat is geupload in app.js), draait de voorspellende modellen, en roept de juiste
 * grafieken op (individu of alle patiënt pagina).
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    // ========================================================================
    // DATA INITIALISATIE & VALIDATIE
    // ========================================================================

    // Haal de ruwe data string op uit de browser opslag.
    const dataString = sessionStorage.getItem('patient_data_json');

    // Validatie: Als er geen data is, stuur direct terug naar homepage.
    if (!dataString) {
        console.error("Geen data gevonden! Terugsturen naar home.");
        window.location.href = 'index.html'; 
        return; 
    }

    //  zet DataString om naar een bruikbaar object (parsen).
    const patientenLijst = JSON.parse(dataString);
    console.log("Data succesvol geladen uit sessionStorage:", patientenLijst);

    const dataRapport = evalueerDataKwaliteit(patientenLijst);
    toonDataKwaliteitMelding(dataRapport);

    // ========================================================================
    // Sla alle elementen in een keer op.
    // ========================================================================

    // navigatie (header)
    const navHomeKnop = document.getElementById('nav-home');
    const navPatientKnop = document.getElementById('nav-patient');
    const navAllPatientsKnop = document.getElementById('nav-all-patients');

    // views (deze zijn om de juiste pagina te laten zien (individu of alle patient))
    const individueleView = document.getElementById('individuele-view');
    const allePatientenView = document.getElementById('alle-patienten-view');

    // interactie voor individu pagina.
    const patientinputveld = document.getElementById("DePatiënt");
    const patkiezenknop = document.getElementById('verstuurKnop');

    // dropdowns voor individu pagina
    const selectLijn1 = document.getElementById('select-lijn-1');
    const selectLijn2 = document.getElementById('select-lijn-2');
    const selectKansVisite = document.getElementById('select-kans-visite');
    const selectKansType = document.getElementById('select-kans-type');

    // dropdowns voor alle patiënt pagina.
    const selectTrendFeat1 = document.getElementById('select-trend-feat1');
    const selectTrendFeat2 = document.getElementById('select-trend-feat2');

    // modal (Dit is de opgeslagen info voor de I knop.)
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.getElementById('modal-close-button');
    const allInfoButtons = document.querySelectorAll('.info-button');

    // traject keuzebalk voor graph projection Individupagina
    const selectGraphRef = document.getElementById('select-graph-ref');

    // KIJKT HOEVEEL DATA JE HEBT 1 patient of meerdere?? en opent de juiste start pagina>!>!
    // DIT STUK MOET NOG AANGEPAST WORDEN! (BUGGED) ============+!+!++!+!+!++!+!+======
    if (patientenLijst.length === 1) {
        individueleView.classList.remove('hidden');
    } else {
        allePatientenView.classList.remove('hidden');
        
    }

    // ========================================================================
    // MODEL UITVOERING:
    // Hier worden alle modellen aangeroepen, de modellen zelf staan
    // in het bestand "modellen.js".
    // ========================================================================

    // Dit model voegt een ziektestadium toe aan elke visite.
    ziektestadiamodel(patientenLijst)

    // Deze functie telt hoeveel visites elke patiënt in totaal heeft.
    voegVisiteTellersToe(patientenLijst)

    // De gekozen traject strategie uit de sessie data (verkregen uit app.js) halen
    let modelVoorkeur = sessionStorage.getItem('model_voorkeur');
    console.log("gekozen model:", modelVoorkeur);

    // De juiste traject strategie model aanroepen.
    if (modelVoorkeur == "baseline"){
        console.log("baseline model word gebruikt.")
        baselinemodel(patientenLijst);
    } else if (modelVoorkeur == "traject"){
        console.log("DTW / KNN pipeline word gebruikt.")
        pipeline_DTW_KNN(patientenLijst);
    } else {
        console.log("combo van Baseline en DTW / KNN pipeline word gebruikt.")
        combomodel(patientenLijst)
    }

    console.log("geupdate patientenlijst MET TRAJECT/STADIA", patientenLijst)


//--------------------------------------------------------------------- tot hier goede doc gedaan

    patkiezenknop.addEventListener('click', () => {
        const gekozenpatient = patientinputveld.value.trim();
        gekozenpatientlijst = patientenLijst.filter(p => p.patient_id.trim() === gekozenpatient);
        
        console.log("Patient gekozen:", gekozenpatient);

        if (gekozenpatientlijst.length > 0) {
            
            //  TEKEN COMBO GRAFIEK 
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );

            //  VUL DE VISITE DROPDOWN 
            vulVisiteDropdown(gekozenpatientlijst);
            selectKansType.value = "Stadium"; 
            maakKansenGrafiek(gekozenpatientlijst, selectKansVisite.value, "Stadium");

            maakApexHeatmap(gekozenpatientlijst);

            maakTrajectHeatmap(gekozenpatientlijst);

            vulBurenTabel(gekozenpatientlijst);

            vulPatientSpecifiekeLegenda(gekozenpatientlijst);

            const patientTraject = gekozenpatientlijst[0].ziektetraject || "TR1";
            if (selectGraphRef) selectGraphRef.value = patientTraject;
            maakIndividualGraphProjection(gekozenpatientlijst, selectGraphRef.value);

            }
    });

    // Luister naar de dropdown van het Netwerk Figuur
        if (selectGraphRef) {
            selectGraphRef.addEventListener('change', () => {
                // Controleer of we al een patiënt hebben gezocht
                if (typeof gekozenpatientlijst !== 'undefined' && gekozenpatientlijst.length > 0) {
                    // Teken de grafiek opnieuw, maar nu met de waarde uit de dropdown!
                    maakIndividualGraphProjection(gekozenpatientlijst, selectGraphRef.value);
                }
            });
        }

    // Als visite verandert (staafdiagram (individupagina))
    selectKansVisite.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakKansenGrafiek(
                gekozenpatientlijst, 
                selectKansVisite.value, 
                selectKansType.value
            );
            maakApexHeatmap(gekozenpatientlijst);
        }
    });

    // Als type verandert (Stadium vs Traject(staafdiagram individupagina))
    selectKansType.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakKansenGrafiek(
                gekozenpatientlijst, 
                selectKansVisite.value, 
                selectKansType.value
            );
        }
    });

    // vult de visite dropdown met visites (staafdiagram (individupagina))
    function vulVisiteDropdown(data) {
        // Maak dropdown leeg
        selectKansVisite.innerHTML = "";
        
        data.sort((a, b) => a.visit - b.visit);

        data.forEach(rij => {
            const optie = document.createElement("option");
            optie.value = rij.visit;
            optie.text = `Visite ${rij.visit}`;
            selectKansVisite.appendChild(optie);
        });

        if (data.length > 0) {
            selectKansVisite.value = data[0].visit; 
        }
    }
    selectLijn1.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );
        }
    });

    selectLijn2.addEventListener('change', () => {
        if (gekozenpatientlijst.length > 0) {
            maakFlexibeleComboGrafiek(
                gekozenpatientlijst, 
                selectLijn1.value, 
                selectLijn2.value
            );
        }
    });
   

    navHomeKnop.addEventListener('click', (event) => {
        window.location.href = 'index.html';
    });

    navPatientKnop.addEventListener('click', (event) => { 
        event.preventDefault(); 
        
        console.log("Schakel naar Individuele View");

        individueleView.classList.remove('hidden');
        allePatientenView.classList.add('hidden');
        
    });

    navAllPatientsKnop.addEventListener('click', (event) => {
        event.preventDefault();

        console.log("Schakel naar Alle Patiënten View");

        individueleView.classList.add('hidden');
        allePatientenView.classList.remove('hidden');
    });

    function openModal(title, description) {
        modalTitle.innerText = title;
        modalContent.innerText = description;
        modal.classList.remove('hidden');
    }

    // ========================================================================
    // MODAL / POP-UP LOGICA (Inzoomen op grafieken)
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

            //  Sla op hoe hoog het blokje was
            const match = actieveWitteBox.className.match(/h-\w+|h-\[\d+%\]/);
            origineleHoogteClass = match ? match[0] : 'h-96';

            // Maak een "Gereserveerd" blokje aan zodat je pagina-layout niet inzakt!
            grafiekPlaceholder = document.createElement('div');
            grafiekPlaceholder.className = actieveWitteBox.className; 
            grafiekPlaceholder.innerHTML = '<div class="flex h-full w-full items-center justify-center text-blue-300 font-bold italic">Grafiek is geopend in pop-up...</div>';
            
            // Wissel de echte grafiek om met de placeholder
            actieveWitteBox.replaceWith(grafiekPlaceholder);

            // Zet de echte grafiek in de pop-up
            const modalSlot = document.getElementById('modal-chart-slot');
            modalSlot.innerHTML = ''; 
            modalSlot.appendChild(actieveWitteBox);

            // Maak de grafiek groot
            actieveWitteBox.classList.remove('h-48', 'h-56', 'h-64', 'h-96', 'h-auto', 'min-h-[12rem]');
            actieveWitteBox.classList.add('h-full', 'w-full', 'flex-grow');

            // 7. Vul tekst in en open de modal
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

    // OM MODAL TE SLUITEN ALS JE BUITEN HET INHOUDSGEDEELTE KLIKT DUS EROMHEEN
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // ALLE PATIENT FIGUREN HIERONDER


    const trajectGemiddeldes = berekenGemiddeldesPerTraject(patientenLijst);

    // Functie om grafiek te updaten
    function updateTrendGrafiek() {
        maakTrajectTrendGrafiek(
            trajectGemiddeldes, 
            selectTrendFeat1.value, 
            selectTrendFeat2.value
        );
    }

    // Event listeners toevoegen
    if(selectTrendFeat1 && selectTrendFeat2) {
        selectTrendFeat1.addEventListener('change', updateTrendGrafiek);
        selectTrendFeat2.addEventListener('change', updateTrendGrafiek);

        // Initiële grafiek tekenen (Default: TJC, SJC)
        updateTrendGrafiek();
    }

    if (patientenLijst.length > 1) {
        console.log("Meerdere patiënten gevonden, PCA Scatter tekenen...");
        maakPopulatieScatter(patientenLijst);
        maakPopulatieStadiaHeatmap(patientenLijst);
        maakPopulatieTrajectHeatmap(patientenLijst);
        vulPopulatieLegenda(patientenLijst);
        maakPopulatieScatterReferentie(patientenLijst)
    }

// ==========================================================================
// DATA KWALITEIT & RAPPORTAGE
// ==========================================================================

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

    //  Sla de ongebruikte/incoompete data apart op in de sessie
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
    // Als de data perfect is, tonen geen melding
    if (rapport.totaalMissendeVisites === 0) return;

    // maak Tailwind waarschuwingsbanner aan
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
                    Datakwaliteit Rapportage
                </h3>
                <div class="mt-2 text-sm text-yellow-700">
                    <ul class="list-disc pl-5 space-y-1">
                        <li><strong>${rapport.totaalMissendeVisites} visites</strong> in totaal missen klinische data.</li>
                        <li><strong>${rapport.minimaalEénMissend} van de ${rapport.totaalPatienten} patiënten</strong> mist data in minstens één visite.</li>
                        <li><strong>${rapport.allesMissend} patiënten</strong> missen data in al hun visites.</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
 
    const allePatientenView = document.getElementById('alle-patienten-view');
    if (allePatientenView) {
        allePatientenView.insertBefore(banner, allePatientenView.firstChild);
    }

    // ========================================================================
    // EXPORT NAAR CSV (EXCEL)
    // ========================================================================
    const exportKnop = document.getElementById('exportCsvKnop');
    
    if (exportKnop) {
        exportKnop.addEventListener('click', () => {
            console.log("Start export naar CSV...");

            // Bouw een schone lijst met alleen de kolommen die we willen exporteren
            const exportData = patientenLijst.map(p => {
                const veiligID = p.patient_id || p.Patient || p.patient || 'Onbekend';

                return {
                    'Patient ID': veiligID,
                    'Visite': p.visit,
                    'TJC28': p.TJC !== null ? p.TJC : '', 
                    'SJC28': p.SJC !== null ? p.SJC : '',
                    'ESR': p.ESR !== null ? p.ESR : '',
                    'Leukocyten': p.Leukocytes !== null ? p.Leukocytes : '',
                    'HB (adj.)': p.HB !== null ? p.HB : '',
                    'Trombocyten': p.Thrombocytes !== null ? p.Thrombocytes : '',
                    'Ziektestadium (L1-L8)': p.ziektestadium || 'Onbekend',
                    'Voorspeld Traject (TR1-TR4)': p.ziektetraject || 'Onbekend',
                    'Gebruikt AI Model': p.gebruiktTrajectModel || p.modelGebruikt || 'Geen'
                };
            });

            // 2. Gebruik PapaParse om de JSON om te zetten naar een string
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
            link.setAttribute("download", "RA_Voorspellingen_Export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // ========================================================================
    // EXPORT INDIVIDUELE PATIËNT NAAR CSV (EXCEL)
    // ========================================================================
    const exportIndivKnop = document.getElementById('exportIndivCsvKnop');
    
    if (exportIndivKnop) {
        exportIndivKnop.addEventListener('click', () => {
            // 1. Bepaal welke patiënt momenteel bekeken wordt
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
                    'Visite': p.visit,
                    'TJC28': p.TJC !== null ? p.TJC : '', 
                    'SJC28': p.SJC !== null ? p.SJC : '',
                    'ESR': p.ESR !== null ? p.ESR : '',
                    'Leukocyten': p.Leukocytes !== null ? p.Leukocytes : '',
                    'HB (adj.)': p.HB !== null ? p.HB : '',
                    'Trombocyten': p.Thrombocytes !== null ? p.Thrombocytes : '',
                    'Ziektestadium (L1-L8)': p.ziektestadium || 'Unknown',
                    'Voorspeld Traject (TR1-TR4)': p.ziektetraject || 'Unknown',
                    'Gebruikt AI Model': p.gebruiktTrajectModel || p.modelGebruikt || 'None'
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
}
});

