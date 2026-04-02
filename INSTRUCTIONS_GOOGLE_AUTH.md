# Instructions pour configurer l'authentification Google

Pour que l'inscription via Google fonctionne, vous devez obtenir un **Client ID** depuis la Google Cloud Console.

## Étape 1 : Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/).
2. Créez un nouveau projet (ex: "SariaBeautyy Auth").
3. Allez dans **APIs & Services** > **OAuth consent screen**.
   - Choisissez **External**.
   - Remplissez le nom de l'application et les emails de contact.
   - Sauvegardez et continuez.

## Étape 2 : Créer des identifiants OAuth

1. Allez dans **APIs & Services** > **Credentials**.
2. Cliquez sur **Create Credentials** > **OAuth client ID**.
3. Choisissez **Web application**.
4. Ajoutez les **Authorized JavaScript origins** :
   - `http://localhost:5173` (pour le développement local)
   - `https://votre-site-en-production.com` (quand vous mettrez en ligne)
5. Cliquez sur **Create**.
6. Copiez votre **Client ID**.

## Étape 3 : Configurer les variables d'environnement

### Dans le dossier `server/`

Créez ou modifiez le fichier `.env` et ajoutez :

```env
GOOGLE_CLIENT_ID=votre_client_id_ici
```

### Dans le dossier `client/`

Créez ou modifiez le fichier `.env` (ou `.env.local`) et ajoutez :

```env
VITE_GOOGLE_CLIENT_ID=votre_client_id_ici
```

## Note sur iCloud (Apple Sign In)

L'authentification via Apple (iCloud) nécessite :
1. Un compte Apple Developer payant (99$/an).
2. Une configuration plus complexe.
3. Google est gratuit et suffit généralement pour garantir des emails réels.
