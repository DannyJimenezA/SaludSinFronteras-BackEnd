# Configuración de Variables de Entorno en Render

## Problema Actual
El registro de usuarios falla con error "timeout of 15000ms exceeded" porque el servicio de correo no puede enviar emails. Esto ocurre porque las variables de entorno no están configuradas correctamente en Render.

## Solución: Configurar Variables de Entorno en Render

### Paso 1: Ir a la Configuración de tu Servicio en Render
1. Ve a [https://dashboard.render.com](https://dashboard.render.com)
2. Selecciona tu servicio backend "saludsinfronteras-backend"
3. Ve a la pestaña **Environment**

### Paso 2: Agregar las Variables de Entorno para Email

Agrega las siguientes variables de entorno (haz clic en "Add Environment Variable" para cada una):

#### Variables de Email (SMTP Gmail)
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=saludsinfronteras506@gmail.com
MAIL_PASSWORD=yiju sfst xgba lpry
MAIL_FROM=saludsinfronteras506@gmail.com
```

#### URL del Frontend (IMPORTANTE)
```
FRONTEND_URL=https://salud-sin-fronteras.vercel.app
```

**NOTA**: Esta variable es crucial porque se usa para generar los links de verificación de email que se envían a los usuarios.

### Paso 3: Variables Adicionales Importantes

Si aún no las tienes configuradas, también necesitas:

#### Base de Datos
```
DATABASE_URL=mysql://root:dbTinsoPDNiFxuFHEbloXERlgpGqEXKq@yamanote.proxy.rlwy.net:45481/railway?timezone=America/Costa_Rica
```

#### JWT
```
JWT_ACCESS_SECRET=super_access_secret_32chars_min
JWT_REFRESH_SECRET=super_refresh_secret_32chars_min
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

#### Cifrado
```
ENCRYPTION_SECRET=my-super-secret-key-32-chars!!
```

#### Redis
```
REDIS_URL=rediss://default:AT4mAAIncDIzNGFkNzMzMTUxZGQ0ZGU1YTgwODI4MzIwMjJmZGVmMXAyMTU5MTA@ultimate-monitor-15910.upstash.io:6379
```

#### LiveKit (Videollamadas)
```
LIVEKIT_HOST=https://salud-sin-fronteras-t5ebkkcs.livekit.cloud
LIVEKIT_WS_URL=wss://salud-sin-fronteras-t5ebkkcs.livekit.cloud
LIVEKIT_DOMAIN=salud-sin-fronteras-t5ebkkcs.livekit.cloud
LIVEKIT_API_KEY=APIh9TFmZHVeH8F
LIVEKIT_API_SECRET=CQYNxsZRCmeTDNdX20xofnR1ZC4vJifTCQlMf8NHYOeD
LIVEKIT_SANDBOX_URL=https://saludsinfronteras-2q91c9.sandbox.livekit.io
```

#### Cloudinary (Almacenamiento)
```
CLOUDINARY_CLOUD_NAME=dttbpad65
CLOUDINARY_API_KEY=189138818456982
CLOUDINARY_API_SECRET=4j-Js4zc7btCKBfTD1saaG5kDwg
```

#### Otras Configuraciones
```
NODE_ENV=production
PORT=3000
TZ=America/Costa_Rica
DEFAULT_LANGUAGE=es
TRANSLATION_PROVIDER=mymemory
TRANSLATION_API_URL=https://api.mymemory.translated.net/get
```

### Paso 4: Redesplegar el Servicio

1. Después de agregar todas las variables, haz clic en **"Save Changes"**
2. Render automáticamente redesplegar tu servicio
3. Espera a que el despliegue termine (status: "Live")

### Paso 5: Verificar que Funciona

1. Ve a tu aplicación en Vercel: https://salud-sin-fronteras.vercel.app
2. Intenta registrar un nuevo usuario
3. Deberías recibir un email de verificación en la bandeja de entrada
4. El error "timeout of 15000ms exceeded" ya no debería aparecer

## Verificación de Logs

Para verificar que todo está funcionando correctamente:

1. Ve a la pestaña **Logs** en Render
2. Busca mensajes como:
   - `Intentando enviar email de verificación a: [email]`
   - `Email de verificación enviado exitosamente a: [email]`

Si ves errores, verifica que:
- Las variables de entorno estén escritas correctamente (sin espacios extra)
- La contraseña de aplicación de Gmail sea correcta
- La cuenta de Gmail permite "Aplicaciones menos seguras" o tiene configuradas las "Contraseñas de aplicación"

## Notas Importantes sobre Gmail

La contraseña que estás usando (`yiju sfst xgba lpry`) es una **contraseña de aplicación** de Gmail. Esto es correcto y más seguro que usar tu contraseña real.

Si Gmail bloquea el envío de correos, necesitas:
1. Ir a https://myaccount.google.com/security
2. Habilitar "Verificación en 2 pasos"
3. Generar una nueva "Contraseña de aplicación" específica para este proyecto
4. Reemplazar `MAIL_PASSWORD` con la nueva contraseña generada

## Mejoras Realizadas en el Código

He actualizado el código para:
1. **Aumentar timeouts**: De 15 segundos a 60 segundos para el envío de emails
2. **Agregar logs detallados**: Para ver exactamente qué está pasando con los emails
3. **Mejor manejo de errores**: Para identificar rápidamente problemas de configuración

Estos cambios están en:
- [mail.module.ts:17-22](telemed-backend/src/mail/mail.module.ts#L17-L22) - Configuración de timeouts
- [mail.service.ts:14-18](telemed-backend/src/mail/mail.service.ts#L14-L18) - Logs de diagnóstico
