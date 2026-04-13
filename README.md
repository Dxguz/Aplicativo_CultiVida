# Aplicativo CultiVida

Bienvenido al repositorio del aplicativo web CultiVida. Esta guía te ayudará a configurar y ejecutar el proyecto en tu entorno de desarrollo local.

## Índice

- [Prerrequisitos](#prerrequisitos)
- [Instalación](#instalación)
  - [1. Clonar el repositorio](#1-clonar-el-repositorio)
  - [2. Configurar Firebase](#2-configurar-firebase)
  - [3. Configurar un usuario Administrador](#3-configurar-un-usuario-administrador)
- [Ejecución](#ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)

## Prerrequisitos

Antes de empezar, asegúrate de tener lo siguiente:

- **Git**: Para clonar el repositorio.
- **Navegador web moderno**: Como Chrome, Firefox o Edge.
- **Editor de código**: Se recomienda [Visual Studio Code](https://code.visualstudio.com/).
- **Extensión Live Server** (para VS Code): Facilita la ejecución de un servidor de desarrollo local. Puedes instalarla desde el [Marketplace](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).
- **Cuenta de Firebase**: Necesitarás una para configurar la base de datos, autenticación y otras funcionalidades backend. Puedes crear una gratis en [firebase.google.com](https://firebase.google.com/).

## Instalación

Sigue estos pasos para configurar el proyecto localmente.

### 1. Clonar el repositorio

Abre tu terminal, navega al directorio donde quieras guardar el proyecto y clona el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO> CultiVidaApp
cd CultiVidaApp
```

> https://github.com/Dxguz/Aplicativo_CultiVida.git

### 2. Configurar Firebase

El proyecto se conecta a Firebase para la mayoría de sus funcionalidades. Debes crear tu propia instancia de Firebase y conectar el proyecto a ella.

1.  **Ve a la Consola de Firebase** y crea un nuevo proyecto.
2.  Dentro de tu proyecto, habilita los siguientes servicios:
    - **Authentication**: Ve a la pestaña `Authentication`, haz clic en "Comenzar" y habilita el proveedor "Correo electrónico/Contraseña".
    - **Firestore Database**: Ve a la pestaña `Firestore Database`, haz clic en "Crear base de datos" y créala en modo de **producción**. Deberás ajustar las reglas de seguridad más adelante.
3.  **Registra tu aplicación web**:
    - En la vista general de tu proyecto de Firebase, haz clic en el ícono de web (`</>`).
    - Dale un apodo a tu app (ej. "CultiVida Web") y haz clic en "Registrar app".
    - Firebase te proporcionará un objeto de configuración `firebaseConfig`. ¡Cópialo!
4.  **Crea el archivo de configuración en el proyecto**:
    - Dentro del código del proyecto, navega a `src/js/`.
    - Crea un nuevo archivo llamado `firebase.js`.
    - Pega el siguiente código en `firebase.js` y reemplaza el objeto `firebaseConfig` con el que copiaste de la consola:

```javascript
// src/js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

// Tu configuración de Firebase - ¡REEMPLAZA ESTO!
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que usarás en la aplicación
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
```

### 3. Configurar un usuario Administrador

El panel de moderación requiere que un usuario tenga permisos de administrador. Esto se gestiona mediante "Custom Claims" en Firebase.

1.  **Crea un usuario** en tu aplicación a través del flujo de registro normal.
2.  **Ve a la consola de Firebase** -> `Authentication` -> `Users`.
3.  **Obtén el UID** del usuario que quieres que sea administrador.
4.  **Asigna el claim**: La forma más segura de hacerlo es a través de un entorno de backend (como una Cloud Function). El proyecto ya incluye una función `setupAdminUser` para esto. Asegúrate de desplegar las Cloud Functions asociadas al proyecto y ejecutarla para el UID deseado, o configúralo manualmente si tienes un script de backend para ello. El claim necesario es: `{ admin: true }`.

## Ejecución

Dado que el proyecto utiliza módulos de JavaScript (`import`/`export`), no puedes abrir los archivos `*.html` directamente en el navegador. Necesitas servirlos desde un servidor web local.

La forma más sencilla con **Visual Studio Code** es:

1.  Abre la carpeta del proyecto en VS Code.
2.  Haz clic derecho sobre el archivo `index.html` (o el HTML principal que quieras ver).
3.  Selecciona **"Open with Live Server"**.

Esto abrirá el proyecto en tu navegador con una URL como `http://127.0.0.1:5500/index.html`.

## Estructura del Proyecto

```
CultiVidaApp/
├── src/
│   ├── css/         # Hojas de estilo CSS
│   ├── js/          # Lógica de la aplicación (JavaScript)
│   ├── img/         # Imágenes y recursos gráficos
│   └── ...
├── index.html       # Punto de entrada principal y otros archivos HTML
└── README.md        # Este archivo
```