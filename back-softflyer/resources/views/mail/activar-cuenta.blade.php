<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Activa tu cuenta</title>
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
                        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0b2a4a;">¡Bienvenido, {{ $nombre }}!</h1>
                        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                            Tu sistema para <strong>{{ $restaurante }}</strong> ya está listo. Crea tu contraseña para entrar por primera vez.
                        </p>
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                            <tr>
                                <td style="background:#0c5ea7;border-radius:12px;">
                                    <a href="{{ $url }}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">
                                        Crear mi contraseña
                                    </a>
                                </td>
                            </tr>
                        </table>
                        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#64748b;">
                            El enlace sirve una sola vez y vence en {{ $vigencia }}. Si el botón no funciona, copia esta dirección en tu navegador:
                        </p>
                        <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;">
                            <a href="{{ $url }}" style="color:#0c5ea7;">{{ $url }}</a>
                        </p>
                        <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                            Después entrarás siempre por <a href="{{ $direccion }}/login" style="color:#0c5ea7;">{{ $direccion }}</a>. Guárdala en tus favoritos.
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
