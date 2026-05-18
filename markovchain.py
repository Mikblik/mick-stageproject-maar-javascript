import json
import random
import numpy as np
from echte_patient_seq import ECHTE_REFERENTIES

# Dit is hoe de input er uit moet zien met veel verschillende patienten
#ECHTE_REFERENTIES = [
#    {
#        "id": "ref_001",
#        "traject": "TR3",
#        "sequentie": [
#            "L1",
#            "L2",
#            "L3"
#        ]
#    },
#     ]

print(f" {len(ECHTE_REFERENTIES)} echte referenties ingeladen.")


modellen = {}

for ref in ECHTE_REFERENTIES:
    # loop door elke patient en pak per patient traject + seq
    traj = ref["traject"]
    seq = ref["sequentie"]
    
    # als het traject nog niet bestond in modellen dan wordt een nieuwe template gemaakt in modellen.
    if traj not in modellen:
        modellen[traj] = {
            "start_telling": {},
            "overgangen": {},
            "lengtes": []
        }
    
    # Sla op hoe lang deze sequentie was (zodat er realistische lengtes gemaakt worden)
    modellen[traj]["lengtes"].append(len(seq))
    
    if len(seq) == 0: continue
    
    # Tel de start-stadia
    start_stad = seq[0]
    #output is dictionary: {"L3": 1}
    modellen[traj]["start_telling"][start_stad] = modellen[traj]["start_telling"].get(start_stad, 0) + 1
    
    # Tel de overgangen
    for i in range(len(seq) - 1):
        van_stad = seq[i]
        naar_stad = seq[i+1]
        
        if van_stad not in modellen[traj]["overgangen"]:
            modellen[traj]["overgangen"][van_stad] = {}
            
        modellen[traj]["overgangen"][van_stad][naar_stad] = \
            modellen[traj]["overgangen"][van_stad].get(naar_stad, 0) + 1

# modellen ziet er nu als volgt uit.
# modellen = {'TR3': { 'start telling': {'L6': 5, 'L8': 1, 'L1': 5}, 
#   'overgangen': 'L5': {'L7': 10, 'L8': 4, 'L1': 2}, 'L2': {'L7': 12, 'L8': 3, 'L1': 4}, + 6 trajecten}
#   'lengtes': [1,2,7,4,7,7,6,9, + Alle lengtes]},
#   {'TR2': weer start telling, overgangen, lengtes}

# Zet alle tellingen om in procentuele kansen 
for traj, data in modellen.items():
    # tel hoeveel start stadia in totaal er zijn
    tot_start = sum(data["start_telling"].values())
    # deel elk aantal per ziektestadia door totaal aantal ziektestadia voor een percentage
    data["start_kansen"] = {k: v / tot_start for k, v in data["start_telling"].items()}
    
    # Overgangskansen
    data["transities"] = {}
    for van_stad, naar_counts in data["overgangen"].items():
        # tel hoeveel overgangen in totaal er zijn
        tot_naar = sum(naar_counts.values())
        # deel elk aantal per overgang door totaal aantal overgangen voor een percentage
        data["transities"][van_stad] = {k: v / tot_naar for k, v in naar_counts.items()}

# Het volgende aan modellen toegevoegd.
#"start_kansen": {
#      "L6": 0.454, 
#      "L8": 0.091, 
#      "L1": 0.454   
#"transities": {
#      "L5": {
#        "L7": 0.625, 
#        "L8": 0.250, 
#        "L1": 0.125 
#      },
#    "L2": {
#        "L7": 0.632, 
#        "L8": 0.158, 
#        "L1": 0.211 


AANTAL_TE_GENEREREN = 1500  # Kies hier hoeveel refs gemaakt moeten worden
synthetische_bibliotheek = []


# verhouding in trajecten 
alle_trajecten = [r["traject"] for r in ECHTE_REFERENTIES]
traject_kansen = {t: alle_trajecten.count(t) / len(alle_trajecten) for t in set(alle_trajecten)}

for i in range(1, AANTAL_TE_GENEREREN + 1):
    #kiezen welk traject gebasseerd op random kans met de verhouding van traject_kansen
    gekozen_traj = np.random.choice(list(traject_kansen.keys()), p=list(traject_kansen.values()))
    model = modellen[gekozen_traj]
    
    # Kies een random lengte uit alle lengtes lijst
    doel_lengte = random.choice(model["lengtes"])
    
    # Gooi de dobbelsteen voor het startstadium gebasseerd op start_kansen verhouding
    huidig_stadium = np.random.choice(list(model["start_kansen"].keys()), p=list(model["start_kansen"].values()))
    
    # nieuwe sequentie is nu alleen de start stadium.
    nieuwe_sequentie = [huidig_stadium]
    
    # Loop het pad af totdat we de doellengte hebben bereikt
    while len(nieuwe_sequentie) < doel_lengte:
        if huidig_stadium in model["transities"]:
            # pak de percentages die horen vanaf ziektestadia X naar elke mogelijke target
            mogelijke_volgende = list(model["transities"][huidig_stadium].keys())
            kansen = list(model["transities"][huidig_stadium].values())
            
            # pak een random ziektestadium met behulp van de verhouding
            huidig_stadium = np.random.choice(mogelijke_volgende, p=kansen)
            # voeg ziektestadium toe aan sequentie
            nieuwe_sequentie.append(huidig_stadium)
        else:
            break
            
    synthetische_bibliotheek.append({
        "id": f"synth_ref_{i:04d}",
        "traject": gekozen_traj,
        "sequentie": nieuwe_sequentie
    })

#print(modellen)
output_bestand = "veilige_referentiewaarden.js"

with open(output_bestand, "w") as f:
    f.write("const REFERENTIE_BIBLIOTHEEK = ")
    json.dump(synthetische_bibliotheek, f, indent=4)
    f.write(";\n")


