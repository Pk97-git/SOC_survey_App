require('dotenv').config();

module.exports = {
  "expo": {
    "name": "Condition Survey",
    "slug": "FacilitySurveyApp",
    "scheme": "facilitysurveyapp",
    "version": "1.0.1",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": false,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "package": "com.consultancy.cit.operationsurvey",
      "versionCode": 2,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "baseUrl": "/socsurvey/"
    },
    "plugins": [
      "expo-web-browser",
      [
        "expo-build-properties",
        {
          "android": {
            "networkSecurityConfig": "./assets/network-security-config.xml"
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "24e8f7f5-716e-439c-b8e6-9629c36a8664"
      },
      "microsoftClientId": process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID,
      "microsoftTenantId": process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID,
      "microsoftDiscovery": process.env.EXPO_PUBLIC_MICROSOFT_DISCOVERY
    },
    "owner": "prashanthk977"
  }
};
