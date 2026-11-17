"""
Administración de funcionarios desde la terminal (las contraseñas se guardan con hash).

  python backend/crear_usuario.py                     -> crea un funcionario (te pregunta los datos)
  python backend/crear_usuario.py --cambiar-clave RUT -> cambia la contraseña de un funcionario
  python backend/crear_usuario.py --listar            -> muestra los funcionarios (sin contraseñas)
  python backend/crear_usuario.py --eliminar RUT      -> elimina un funcionario

La contraseña se escribe sin que se vea en pantalla y se pide dos veces.
"""
import argparse
import getpass
import sys

import database
import usuarios
from database import init_db
from rut_utils import normalizar_rut
from seguridad import validar_password


def _pedir_password(rut):
    """Pide la contraseña dos veces hasta que sea válida y coincidan."""
    while True:
        p1 = getpass.getpass("Contraseña (no se verá al escribir): ")
        error = validar_password(p1, rut)
        if error:
            print(f"  -> {error}")
            continue
        if p1 != getpass.getpass("Repite la contraseña: "):
            print("  -> Las contraseñas no coinciden. Intenta de nuevo.")
            continue
        return p1


def main(argv=None):
    parser = argparse.ArgumentParser(description="Administra los funcionarios del sistema.")
    grupo = parser.add_mutually_exclusive_group()
    grupo.add_argument("--listar", action="store_true", help="Lista los funcionarios")
    grupo.add_argument("--cambiar-clave", metavar="RUT", help="Cambia la contraseña de un funcionario")
    grupo.add_argument("--eliminar", metavar="RUT", help="Elimina un funcionario")
    args = parser.parse_args(argv)

    init_db()
    print(f"Base de datos: {database.DB_PATH}\n")

    if args.listar:
        lista = usuarios.listar()
        if not lista:
            print("No hay funcionarios. Crea el primero ejecutando este script sin opciones.")
        for f in lista:
            estado = "" if f["protegida"] else "   [!] contraseña SIN proteger"
            print(f"  {f['rut']:<12} {f['nombre']}  ({f['cargo'] or 'sin cargo'}){estado}")
        return 0

    if args.eliminar:
        rut = normalizar_rut(args.eliminar)
        if input(f"¿Eliminar al funcionario {rut}? Escribe SI para confirmar: ").strip().upper() != "SI":
            print("Cancelado.")
            return 1
        print("Eliminado." if usuarios.eliminar(rut) else "No existe ese RUT.")
        return 0

    if args.cambiar_clave:
        rut = normalizar_rut(args.cambiar_clave)
        if rut not in {f["rut"] for f in usuarios.listar()}:
            print("No existe un funcionario con ese RUT.")
            return 1
        try:
            usuarios.crear_o_actualizar(rut, password=_pedir_password(rut))
        except ValueError as e:
            print(f"Error: {e}")
            return 1
        print("Contraseña actualizada.")
        return 0

    # Crear funcionario
    print("Nuevo funcionario")
    rut = normalizar_rut(input("RUT (ej. 12345678-5): "))
    nombre = input("Nombre completo: ")
    cargo = input("Cargo (ej. Trabajador Social): ")
    if rut in {f["rut"] for f in usuarios.listar()}:
        print("Ese RUT ya existe. Para cambiar su contraseña usa: --cambiar-clave", rut)
        return 1
    try:
        usuarios.crear_o_actualizar(rut, nombre, cargo, _pedir_password(rut))
    except ValueError as e:
        print(f"Error: {e}")
        return 1
    print(f"Funcionario {rut} creado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())