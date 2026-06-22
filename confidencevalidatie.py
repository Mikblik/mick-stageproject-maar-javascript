import math

# De klinische waarden
tjc = 1
sjc = 1
esr =1
leukocytes = 1
hb = 1
thrombocytes = 1

# De coëfficiënten voor alle 8 ziektestadia
""""
coefficients = {
    'L1': [-0.779, -1.119, -0.222, -0.626,  1.838, -0.003],
    'L2': [-0.607, -0.742,  0.171, -0.082,  0.349, -0.002],
    'L3': [-0.591, -0.853, -0.214,  1.385, -0.245, -0.001],
    'L4': [ 0.658,  0.363, -0.189, -0.204,  0.923, -0.006],
    'L5': [ 0.312,  0.488,  0.092, -0.011, -0.106, -0.001],
    'L6': [-0.192,  0.039,  0.337,  0.135, -1.467,  0.002],
    'L7': [ 1.010,  1.611, -0.043,  0.057, -0.753, -0.010],
    'L8': [ 0.190,  0.212,  0.067, -0.655, -0.541,  0.021]
}
"""
#de coefficiënten voor de 4 ziektetrajecten
coefficients = {
    'TR1': [-0.025, -0.100,  0.047,  0.027, -0.018, -0.002],
    'TR2': [-0.020,  0.047, -0.015, -0.239,  0.312,  0.000],
    'TR3': [-0.029, -0.031, -0.012,  0.285, -0.286,  0.002],
    'TR4': [ 0.076,  0.084, -0.019, -0.073, -0.007,  0.000]
}

# Bereken de ruwe score per stadium
ruwe_scores = {}
for stadium, coef in coefficients.items():
    score = (tjc * coef[0] + 
             sjc * coef[1] + 
             esr * coef[2] + 
             leukocytes * coef[3] + 
             hb * coef[4] + 
             thrombocytes * coef[5])
    ruwe_scores[stadium] = score

# Zoek de hoogste score
max_val = max(ruwe_scores.values())

# Bereken de Softmax en tel ze allemaal bij elkaar op
exponenten = {}
totaal_som = 0
for stadium, score in ruwe_scores.items():
    exp = math.exp(score - max_val) 
    exponenten[stadium] = exp
    totaal_som += exp

# 6. Bereken de definitieve kansen in procenten en print het resultaat
print("Gevalideerde kansen voor Jacob (Visite 1):")
print("-" * 40)
for stadium, exp in exponenten.items():
    kans_percentage = (exp / totaal_som) * 100
    print(f"{stadium}: {kans_percentage:.1f}%")