"""Pista del video, hecha por código (sin derechos de autor): electrónica a 120 pulsos por minuto.

Lee la línea de tiempo del video (src/linea.json) para que los golpes, las subidas y la energía caigan con las escenas.
Uso: python3 musica/generar.py  ->  public/musica.wav
"""
import json
import os
import wave

import numpy as np

SR = 44100
BPM = 120
PULSO = 60 / BPM  # medio segundo
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(7)

linea = json.load(open(os.path.join(RAIZ, 'src', 'linea.json')))
inicio = {}
acum = 0
for e in linea:
    inicio[e['id']] = acum
    acum += e['pulsos']
TOTAL_PULSOS = acum
N = int((TOTAL_PULSOS * PULSO + 1.5) * SR)
izq = np.zeros(N)
der = np.zeros(N)
mus_izq = np.zeros(N)
mus_der = np.zeros(N)


def poner(senal, pulso, vol=1.0, pan=0.0, musica=False):
    """Suma una señal mono en el pulso indicado, con paneo (-1 izquierda, 1 derecha).
    musica=True la manda al bus que se agacha con cada bombo."""
    i = int(round(pulso * PULSO * SR))
    if i >= N:
        return
    s = senal[: N - i] * vol
    L, R = (mus_izq, mus_der) if musica else (izq, der)
    L[i: i + len(s)] += s * np.sqrt((1 - pan) / 2) * 1.414
    R[i: i + len(s)] += s * np.sqrt((1 + pan) / 2) * 1.414


def t_(seg):
    return np.arange(int(seg * SR)) / SR


# ── Instrumentos ──
def bombo():
    t = t_(0.42)
    f = 48 + 95 * np.exp(-t * 32)
    fase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(fase) * np.exp(-t * 6.5) + 0.25 * np.exp(-t * 400) * rng.standard_normal(len(t))


def aplauso():
    t = t_(0.28)
    ruido = rng.standard_normal(len(t))
    ruido = ruido - np.convolve(ruido, np.ones(6) / 6, 'same')  # quita graves
    env = np.exp(-t * 22) + 0.6 * np.exp(-((t - 0.012) * 300) ** 2) + 0.5 * np.exp(-((t - 0.024) * 300) ** 2)
    return ruido * env * 0.55


def platillo(largo=0.05, brillo=1.0):
    t = t_(largo)
    ruido = rng.standard_normal(len(t))
    ruido = ruido - np.convolve(ruido, np.ones(3) / 3, 'same')  # solo agudos
    return ruido * np.exp(-t * (70 / largo * 0.05)) * 0.16 * brillo


def nota(f, largo, armonicos=6, caida=8.0, ataque=0.004):
    t = t_(largo)
    s = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.4 for k in range(1, armonicos + 1))
    env = np.minimum(1, t / ataque) * np.exp(-t * caida)
    return s * env


def colchon(frecs, largo):
    """Acorde suave y ancho: varias voces un poco desafinadas, ataque lento."""
    t = t_(largo)
    s = np.zeros(len(t))
    for f in frecs:
        for d in (-0.004, 0, 0.004):
            s += sum(np.sin(2 * np.pi * f * (1 + d) * k * t + rng.uniform(0, 6)) / k ** 2 for k in range(1, 5))
    env = np.minimum(1, t / 0.35) * np.minimum(1, (largo - t) / 0.3)
    return s * env / (len(frecs) * 3)


def subida(pulsos):
    """Ruido que crece y sube de tono, antes de un cambio grande."""
    largo = pulsos * PULSO
    t = t_(largo)
    ruido = rng.standard_normal(len(t))
    agudo = ruido - np.convolve(ruido, np.ones(4) / 4, 'same')
    tono = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / largo) ** 2) / SR) * 0.15
    return (agudo * 0.35 + tono) * (t / largo) ** 2.2


def golpe():
    """Impacto de entrada de escena: bombo grave largo y un brillo de ruido."""
    t = t_(1.6)
    f = 40 + 60 * np.exp(-t * 18)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    ruido = rng.standard_normal(len(t)) * np.exp(-t * 4) * 0.25
    return boom + ruido


def barrido():
    """Soplo corto para los cortes de escena."""
    t = t_(0.45)
    ruido = rng.standard_normal(len(t))
    ruido = ruido - np.convolve(ruido, np.ones(8) / 8, 'same')
    return ruido * np.sin(np.pi * t / 0.45) ** 2 * 0.18


# Progresión por compás (4 pulsos): Do, Sol, La menor, Fa
ACORDES = [
    (65.41, [261.63, 329.63, 392.00]),
    (49.00, [196.00, 246.94, 293.66]),
    (55.00, [220.00, 261.63, 329.63]),
    (43.65, [174.61, 220.00, 261.63]),
]

def acorde(pulso):
    return ACORDES[int(pulso // 4) % 4]


def energia(pulso):
    """0 = sin ritmo, 1 = ritmo normal, 2 = ritmo fuerte (explosión del inicio y funciones secundarias)."""
    g = inicio['gancho']
    if pulso < g + 2:  # la pregunta, en tensión
        return 0
    if pulso < g + 7:  # explosión y golpes
        return 2
    if inicio['masTitulo'] <= pulso < inicio['secundarias']:
        return 0
    if inicio['secundarias'] <= pulso < inicio['tema']:
        return 2
    if pulso >= inicio['final']:
        return 0
    return 1


BOMBO, APLAUSO = bombo(), aplauso()
fin_ritmo = inicio['final']

# Colchón de acordes en todo el video
for c in range(0, TOTAL_PULSOS, 4):
    raiz, tonos = acorde(c)
    vol = 0.22 if energia(c) == 0 else 0.13
    if c < inicio['gancho'] + 2:  # la pregunta va sin acordes: el colchón entra con la explosión
        poner(colchon(tonos, 2 * PULSO + 0.3), c + 2, 0.13 * 1.4, musica=True)
        continue
    poner(colchon(tonos, 4 * PULSO + 0.3), c, vol * 1.4, musica=True)

# Gancho: zumbido grave que crece durante la pregunta y platillo largo en la explosión
t = t_(2 * PULSO)
zumbido = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t)) * (t / t[-1]) ** 1.5
poner(zumbido, inicio['gancho'], 0.35)
poner(platillo(1.6, 1.3), inicio['gancho'] + 2, 0.45)

# Ritmo
for b8 in np.arange(0, TOTAL_PULSOS, 0.5):
    b = float(b8)
    e = energia(b)
    if e == 0:
        continue
    raiz, tonos = acorde(b)
    if b == int(b):
        poner(BOMBO, b, 0.95)
        if int(b) % 2 == 1:
            poner(APLAUSO, b, 0.55, pan=0.05)
    # platillo cerrado en los contratiempos, abierto de vez en cuando
    if b != int(b):
        poner(platillo(0.06), b, 0.6, pan=0.25)
        if int(b) % 4 == 3:
            poner(platillo(0.22), b, 0.5, pan=-0.2)
    # bajo en corcheas, con la raíz y su octava
    f = raiz * (2 if (b * 2) % 4 == 3 else 1)
    poner(nota(f, 0.24, armonicos=7, caida=9), b, 0.42, musica=True)
    # arpegio en semicorcheas
    for k, s16 in enumerate((0, 0.25)):
        tono = tonos[int((b * 4 + k) % 3)] * (2 if e == 2 else 1)
        poner(nota(tono, 0.22, armonicos=4, caida=12), b + s16, 0.2 if e == 1 else 0.24, pan=-0.35 if k else 0.35, musica=True)
    if e == 2:
        poner(platillo(0.04), b + 0.25, 0.45, pan=-0.3)

# Melodía: un motivo de cuatro notas que sigue al acorde, cada dos compases
MOTIVO = [(0, 2), (1, 1), (1.5, 0), (2.5, 1)]  # (pulso dentro del compás, voz del acorde)
for c in range(0, TOTAL_PULSOS, 8):
    if energia(c) == 0:
        continue
    _, tonos = acorde(c)
    for d, voz in MOTIVO:
        poner(nota(tonos[voz] * 2, 0.45, armonicos=3, caida=5), c + d, 0.14, pan=0.1, musica=True)

# Subida antes de "Y mucho más" -> secundarias
poner(subida(3), inicio['masTitulo'], 0.55)
# Golpes en cambios grandes
for clave in ('presentacion', 'cifra', 'secundarias', 'final'):
    poner(golpe(), inicio[clave], 0.6)
# Soplo en cada corte de escena
for e in linea:
    if e['id'] not in ('gancho', 'presentacion', 'cifra', 'secundarias', 'final', 'creditosFotos'):
        poner(barrido(), inicio[e['id']] - 0.35, 1.0)
# Soplos en cada cambio de función secundaria
for k in range(1, 14):
    poner(barrido(), inicio['secundarias'] + 2 * k - 0.3, 0.6)
# Cierre: acorde final largo
poner(colchon(ACORDES[0][1] + [523.25], 6.0), inicio['final'], 0.35)
poner(nota(ACORDES[0][0] * 2, 3.0, caida=1.5), inicio['final'], 0.3)

# Bombeo: la música baja con cada bombo y se recupera en un cuarto de segundo
agacha = np.ones(N)
caida = 1 - 0.45 * np.exp(-t_(0.3) * 14)
for b in range(TOTAL_PULSOS):
    if energia(b):
        i = int(b * PULSO * SR)
        tramo = agacha[i: i + len(caida)]
        tramo *= caida[: len(tramo)]
estereo = np.stack([izq + mus_izq * agacha, der + mus_der * agacha], axis=1)
fin = int(TOTAL_PULSOS * PULSO * SR)
estereo = estereo[: fin + int(0.2 * SR)]
desvanece = int(2.0 * SR)
estereo[-desvanece:] *= np.linspace(1, 0, desvanece)[:, None]
estereo /= np.max(np.abs(estereo)) + 1e-9
estereo = np.tanh(estereo * 1.6) / np.tanh(1.6) * 0.89

salida = os.path.join(RAIZ, 'public', 'musica.wav')
with wave.open(salida, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((estereo * 32767).astype('<i2').tobytes())
print(salida, round(len(estereo) / SR, 1), 's')
