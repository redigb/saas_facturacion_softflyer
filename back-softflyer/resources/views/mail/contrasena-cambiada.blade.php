<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu contraseña cambió</title>
</head>
<body style="margin:0;padding:0;background:#f3f8fc;font-family:Montserrat,Segoe UI,Arial,sans-serif;color:#0b2a4a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f8fc;padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
                <tr>
                    <td style="background:#0c5ea7;background-image:linear-gradient(135deg,#083f71,#0c5ea7,#18b4fa);padding:32px 36px;">
                        <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Soft</span><span style="font-size:26px;font-weight:800;color:#fccd0b;letter-spacing:-0.5px;">Flyer</span>
                        <div style="width:48px;height:5px;background:#fccd0b;border-radius:3px;margin-top:18px;"></div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:36px;">
                        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0b2a4a;">¡Hola, {{ $nombre }}!</h1>
                        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                            La contraseña de tu cuenta en <strong>{{ $restaurante }}</strong> cambió el {{ $fecha }} (hora de Lima).
                            Por seguridad cerramos tu sesión en todos los dispositivos.
                        </p>
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                            <tr>
                                <td style="background:#0c5ea7;border-radius:12px;">
                                    <a href="{{ $url }}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">
                                        Iniciar sesión
                                    </a>
                                </td>
                            </tr>
                        </table>
                        <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                            Si no fuiste tú, avisa de inmediato al administrador de tu restaurante o escríbenos para bloquear el acceso.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="background:#f3f8fc;padding:20px 36px;font-size:12px;color:#94a3b8;">
                        SOFTLYERSAAS · Vende, controla y factura sin detener tu restaurante.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
