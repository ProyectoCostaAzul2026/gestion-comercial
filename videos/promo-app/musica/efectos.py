"""Efectos de sonido del video, hechos por código (sin derechos de autor).

Uso: python3 musica/efectos.py  ->  public/sfx/*.wav
Remotion los pone en el video: teclas y toques según src/eventos.json (lo anota demo/grabar.js) y el resto en las escenas.
"""
import os
import wave

import numpy as np

SR = 44100
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'public', 'sfx')
rng = np.random.default_rng(11)


def t_(seg):
    return np.arange(int(seg * SR)) / SR


def ruido(n):
    return rng.standard_normal(n)


def pasa_bajos(x, corte):
    """Filtro de un polo con corte fijo o variable (corte puede ser un arreglo del largo de x)."""
    corte = np.broadcast_to(np.asarray(corte, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * corte / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def pasa_altos(x, corte):
    return x - pasa_bajos(x, corte)


def banda(x, bajo, alto):
    return pasa_altos(pasa_bajos(x, alto), bajo)


def barrido_seno(f0, f1, seg, curva=1.0):
    t = t_(seg)
    f = f0 + (f1 - f0) * (t / seg) ** curva
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env(t, ataque, caida):
    return np.minimum(1, t / max(ataque, 1e-4)) * np.exp(-t * caida)


def campana(f0, seg, parciales=((1, 1), (2.76, 0.45), (5.4, 0.25), (8.93, 0.12)), caida=4.0):
    t = t_(seg)
    return sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * caida * (1 + r * 0.35)) for r, a in parciales)


def mezclar(*partes):
    """partes: (señal, segundo de inicio, volumen)"""
    largo = max(int(s * SR) + len(x) for x, s, _ in partes)
    y = np.zeros(largo)
    for x, s, v in partes:
        i = int(s * SR)
        y[i:i + len(x)] += x * v
    return y


def guardar(nombre, x, estereo=None):
    x = np.asarray(x, dtype=float)
    pico = np.max(np.abs(x if estereo is None else np.concatenate([x, estereo]))) + 1e-9
    izq = x / pico * 0.9
    der = izq if estereo is None else estereo / pico * 0.9
    n = min(len(izq), len(der))
    # rampa corta al final para que no chasquee
    rampa = min(200, n)
    fin = np.ones(n)
    fin[-rampa:] = np.linspace(1, 0, rampa)
    datos = np.stack([izq[:n] * fin, der[:n] * fin], axis=1)
    with wave.open(os.path.join(SALIDA, nombre + '.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((datos * 32767).astype('<i2').tobytes())


os.makedirs(SALIDA, exist_ok=True)

# ── Teclado del celular: clic corto y brillante (4 variantes para que no suene a máquina) ──
for k, (tono, brillo) in enumerate([(1900, 5200), (2100, 5800), (1750, 4800), (2250, 6200)]):
    t = t_(0.045)
    clic = banda(ruido(len(t)), 1800, brillo) * env(t, 0.0005, 260)
    cuerpo = np.sin(2 * np.pi * tono * t) * env(t, 0.0005, 380) * 0.35
    golpe = np.sin(2 * np.pi * 420 * t) * env(t, 0.001, 300) * 0.25
    guardar(f'tecla{k + 1}', clic + cuerpo + golpe)

# ── Toque en la pantalla: "tok" suave ──
t = t_(0.09)
guardar('toque', barrido_seno(820, 380, 0.09, 0.5) * env(t, 0.001, 55) + banda(ruido(len(t)), 1500, 6000) * env(t, 0.0003, 400) * 0.25)

# ── Burbuja (tarjetas, botones que aparecen) ──
t = t_(0.14)
guardar('pop', barrido_seno(260, 1100, 0.14, 0.6) * env(t, 0.002, 32) + barrido_seno(520, 2200, 0.14, 0.6) * env(t, 0.002, 45) * 0.2)

# ── Marcar como hecho ──
t = t_(0.5)
guardar('check', mezclar((banda(ruido(len(t_(0.02))), 2000, 7000) * env(t_(0.02), 0.0003, 300), 0, 0.4),
                         (campana(1760, 0.5, caida=7), 0.015, 0.7), (campana(2637, 0.45, caida=8), 0.07, 0.5)))

# ── Notificación: dos notas de cristal ──
guardar('notificacion', mezclar((campana(1318.5, 0.9, ((1, 1), (3, 0.12), (4.2, 0.05)), caida=5), 0, 0.8),
                                 (campana(1975.5, 1.0, ((1, 1), (3, 0.12), (4.2, 0.05)), caida=4.5), 0.11, 0.8)))

# ── Caja registradora: golpe del cajón y campana ──
t = t_(0.12)
cajon = banda(ruido(len(t)), 300, 2500) * env(t, 0.001, 45) * 0.6 + np.sin(2 * np.pi * 110 * t) * env(t, 0.001, 30) * 0.7
cha = banda(ruido(len(t_(0.07))), 3000, 9000) * env(t_(0.07), 0.001, 70)
monedas = [(campana(rng.uniform(3200, 5600), 0.25, ((1, 1), (2.3, 0.3)), caida=18), 0.1 + rng.uniform(0, 0.35), rng.uniform(0.08, 0.2)) for _ in range(9)]
guardar('cobro', mezclar((cajon, 0, 1.0), (cha, 0.0, 0.5), (campana(1568, 1.6, caida=2.6), 0.08, 0.75),
                         (campana(2093, 1.5, caida=2.8), 0.1, 0.6), *monedas))

# ── Lluvia de monedas ("Cobra.") ──
guardar('monedas', mezclar(*[(campana(rng.uniform(2600, 6000), 0.3, ((1, 1), (2.4, 0.35), (4.1, 0.15)), caida=14),
                              rng.uniform(0, 0.5) ** 1.3, rng.uniform(0.25, 0.6)) for _ in range(22)]))

# ── Golpe de palabra: grave y seco ──
t = t_(0.5)
golpe = barrido_seno(170, 42, 0.5, 0.25) * env(t, 0.001, 9) + banda(ruido(len(t)), 800, 7000) * env(t, 0.0005, 120) * 0.45
guardar('golpe', np.tanh(golpe * 1.8))

# ── Explosión: sub grave, estruendo que se apaga y chasquidos ──
seg = 2.4
t = t_(seg)
sub = barrido_seno(90, 26, seg, 0.3) * env(t, 0.002, 1.6)
corte = 7000 * np.exp(-t * 2.2) + 120
estruendo_i = pasa_bajos(ruido(len(t)), corte) * env(t, 0.001, 1.4)
estruendo_d = pasa_bajos(ruido(len(t)), corte) * env(t, 0.001, 1.4)
chasquidos = np.zeros(len(t))
for _ in range(60):
    i = int(rng.uniform(0.02, 1.2) ** 1.6 * SR)
    largo = int(0.004 * SR)
    chasquidos[i:i + largo] += ruido(largo) * rng.uniform(0.2, 0.7) * np.exp(-i / SR * 2)
crack = banda(ruido(len(t_(0.05))), 1500, 9000) * env(t_(0.05), 0.0003, 60)
base = sub * 1.1
izq = np.tanh((base + estruendo_i * 1.3 + chasquidos * 0.6 + np.pad(crack, (0, len(t) - len(crack))) * 0.8) * 1.4)
der = np.tanh((base + estruendo_d * 1.3 + np.roll(chasquidos, 300) * 0.6 + np.pad(crack, (0, len(t) - len(crack))) * 0.8) * 1.4)
guardar('explosion', izq, der)

# ── Succión hacia la explosión (sube y corta en seco) ──
seg = 0.3
t = t_(seg)
k = t / seg
succion = pasa_bajos(ruido(len(t)), 300 + 9000 * k ** 2) * k ** 2.5 + barrido_seno(200, 1600, seg, 2) * k ** 3 * 0.25
guardar('succion', succion)

# ── Tachón con marcador ──
seg = 0.32
t = t_(seg)
grano = (np.sin(2 * np.pi * 38 * t) > -0.2).astype(float)
grano = pasa_bajos(grano, 200)
tachon = banda(ruido(len(t)), 1400, 4500) * grano * np.minimum(1, t / 0.02) * np.minimum(1, (seg - t) / 0.05)
guardar('tachon', tachon)

# ── Soplo de transición (de izquierda a derecha) ──
for nombre, seg in (('soplo', 0.55), ('soplo_corto', 0.3)):
    t = t_(seg)
    k = t / seg
    centro = 400 + 5000 * np.sin(np.pi * k) ** 2
    s = pasa_altos(pasa_bajos(ruido(len(t)), centro), 200)
    forma = np.sin(np.pi * k) ** 2
    guardar(nombre, s * forma * np.sqrt(1 - k), s * forma * np.sqrt(k))

# ── Corte de tarjeta en el montaje: soplo muy corto y golpecito ──
t = t_(0.22)
golpecito = barrido_seno(300, 90, 0.22, 0.3) * env(t, 0.001, 22)
silbido = pasa_altos(pasa_bajos(ruido(len(t)), 6000), 1500) * np.exp(-((t - 0.03) / 0.03) ** 2)
guardar('carta', golpecito + silbido * 0.5)

# ── Barras que suben ("Controla.") ──
notas = [1046.5, 1318.5, 1568, 2093, 2637]
guardar('subir', mezclar(*[(barrido_seno(n * 0.7, n, 0.12, 0.4) * env(t_(0.12), 0.002, 30), i * 0.045, 0.6) for i, n in enumerate(notas)]))

# ── Contador de la cifra: tics que se van espaciando (sigue la curva del número) ──
dura = 1.0
tics = []
for j in range(26):
    progreso = j / 26
    # la cifra sigue 1 - (1 - t)^3: se busca el tiempo en que llega a cada fracción
    tt = (1 - (1 - progreso) ** (1 / 3)) * dura
    tics.append((banda(ruido(len(t_(0.012))), 2500, 8000) * env(t_(0.012), 0.0002, 500) + np.sin(2 * np.pi * 3100 * t_(0.012)) * env(t_(0.012), 0.0002, 600) * 0.5, tt, 0.6))
guardar('conteo', mezclar(*tics))

# ── Brillo del logo al final ──
notas = [1568, 2093, 2637, 3136, 4186]
guardar('brillo', mezclar(*[(campana(n, 1.4, ((1, 1), (2.01, 0.2)), caida=3), i * 0.07, 0.5) for i, n in enumerate(notas)]))

# ── Falla digital (montaje rápido) ──
t = t_(0.16)
cuadrada = np.sign(np.sin(2 * np.pi * np.repeat(rng.uniform(200, 1400, 8), len(t) // 8 + 1)[:len(t)] * t))
compuerta = np.repeat(rng.random(8) > 0.3, len(t) // 8 + 1)[:len(t)]
guardar('falla', cuadrada * compuerta * 0.4 + banda(ruido(len(t)), 2000, 9000) * compuerta * 0.3)

print('Efectos en', SALIDA, sorted(os.listdir(SALIDA)))
