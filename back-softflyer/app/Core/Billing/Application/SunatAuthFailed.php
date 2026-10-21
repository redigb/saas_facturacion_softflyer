<?php

namespace App\Core\Billing\Application;

use RuntimeException;

/** SUNAT rechazó el usuario o la clave SOL: reintentar no lo arregla, hay que corregir las credenciales. */
final class SunatAuthFailed extends RuntimeException {}
