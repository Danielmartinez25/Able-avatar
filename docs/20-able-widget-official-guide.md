# Guía de Integración del Widget de Chat Able

Integra el widget de chat de Able en tu sitio web.

## Integración

### Obtener tu ChatId

1. Ve a [https://able.ithreexglobal.com/](https://able.ithreexglobal.com/)
2. Accede al detalle del bot que quieres integrar
3. Haz clic en **"Chat Live"** en tu bot
4. Copia la parte después de `/chat/` de la URL

**Ejemplo:**

- URL: `https://able.ithreexglobal.com/chat/7f2a8b4c-5e9d-4c1a-8b3f-2a1c9e7d5f8b_9c4e2a1f8b5d3e7a2c9f6b4e8d1a5c7f`
- **ChatId:** `7f2a8b4c-5e9d-4c1a-8b3f-2a1c9e7d5f8b_9c4e2a1f8b5d3e7a2c9f6b4e8d1a5c7f`

### Agregar el Script

```html
<script>
  (function () {
    var script = document.createElement("script");
    script.src = "https://able.ithreexglobal.com/able-widget.js";
    script.async = true;
    script.onload = function () {
      AbleWidget.init({
        chatId: "TU_CHAT_ID_AQUI",
        theme: "dark",
        position: "bottom-right",
      });
    };
    document.head.appendChild(script);
  })();
</script>
```

### Personalizar (Opcional)

```javascript
AbleWidget.init({
  chatId: "TU_CHAT_ID_AQUI",
  theme: "dark", // dark, light, blue, purple, green
  position: "bottom-right", // única posición disponible
  size: "medium" // small, medium, large
});
```

## 🎨 Temas Disponibles

- **`dark`** - Tema oscuro (por defecto)
- **`light`** - Tema claro
- **`blue`** - Tema azul profesional
- **`purple`** - Tema púrpura moderno
- **`green`** - Tema verde natural


## 📏 Tamaños Disponibles

- **`small`** - 320x450px 
- **`medium`** - 360x500px (por defecto)
- **`large`** - 400x550px 

## 📝 Ejemplos de Implementación

### HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Mi Sitio</title>
  </head>
  <body>
    <!-- Tu contenido -->

    <script>
      (function () {
        var script = document.createElement("script");
        script.src = "https://able.ithreexglobal.com/able-widget.js";
        script.async = true;
        script.onload = function () {
          AbleWidget.init({
            chatId: "TU_CHAT_ID_AQUI",
            theme: "dark",
          });
        };
        document.head.appendChild(script);
      })();
    </script>
  </body>
</html>
```

### React

```jsx
import { useEffect } from "react";

function App() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://able.ithreexglobal.com/able-widget.js";
    script.async = true;
    script.onload = () => {
      window.AbleWidget.init({
        chatId: process.env.REACT_APP_CHAT_ID,
        theme: "blue",
      });
    };
    document.head.appendChild(script);
  }, []);

  return <div>Tu aplicación</div>;
}
```

### WordPress

```php
// En functions.php
function add_able_widget() {
    ?>
    <script>
        (function() {
            var script = document.createElement('script');
            script.src = 'https://able.ithreexglobal.com/able-widget.js';
            script.async = true;
            script.onload = function() {
                AbleWidget.init({
                    chatId: '<?php echo get_option('able_chat_id'); ?>',
                    theme: 'dark'
                });
            };
            document.head.appendChild(script);
        })();
    </script>
    <?php
}
add_action('wp_footer', 'add_able_widget');
```

## 🛠️ Solución de Problemas

**El widget no aparece:**

1. Verifica que el ChatId sea correcto
2. Asegúrate de que tu sitio tenga HTTPS
3. Revisa la consola del navegador para errores

**El widget aparece pero no funciona:**

1. Verifica que JavaScript esté habilitado
2. Desactiva bloqueadores de anuncios temporalmente

---

_© 2025 Ithreex Global - Widget de Chat Agentic_
