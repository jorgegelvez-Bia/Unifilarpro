import os

# En las pruebas se acepta la cabecera X-User (modo de trabajo en el PC).
os.environ.setdefault("UNIFILAR_DEV", "1")
