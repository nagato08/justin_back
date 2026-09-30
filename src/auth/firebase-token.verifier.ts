import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { App, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface VerifiedPhone {
  uid: string;
  phone: string;
}

const APP_NAME = "ma-cuisine-auth";

@Injectable()
export class FirebaseTokenVerifier {
  constructor(private readonly config: ConfigService) {}

  async verifyPhoneToken(idToken: string): Promise<VerifiedPhone> {
    const decoded = await getAuth(this.app())
      .verifyIdToken(idToken)
      .catch(() => null);
    if (
      !decoded?.phone_number ||
      decoded.firebase.sign_in_provider !== "phone"
    ) {
      throw new UnauthorizedException("Numéro de téléphone non vérifié.");
    }
    return { uid: decoded.uid, phone: decoded.phone_number };
  }

  // La vérification d’un ID token n’exige que l’identifiant du projet :
  // les clés publiques de Firebase sont téléchargées et mises en cache.
  private app(): App {
    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    if (!projectId) {
      throw new UnauthorizedException(
        "La connexion par téléphone n’est pas configurée.",
      );
    }
    return (
      getApps().find((app) => app.name === APP_NAME) ??
      initializeApp({ projectId }, APP_NAME)
    );
  }
}
