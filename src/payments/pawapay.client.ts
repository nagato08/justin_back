import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PawaPayClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>("PAWAPAY_BASE_URL") ?? "https://api.sandbox.pawapay.io"
    ).replace(/\/$/, "");
    this.token = config.get<string>("PAWAPAY_API_TOKEN");
  }

  activeConfiguration() {
    return this.request("/v2/active-conf");
  }
  getDeposit(depositId: string) {
    return this.request(`/v2/deposits/${encodeURIComponent(depositId)}`);
  }
  initiateDeposit(body: Record<string, unknown>) {
    return this.request("/v2/deposits", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<PawaPayResponse> {
    if (!this.token)
      throw new ServiceUnavailableException("PawaPay n’est pas configuré.");
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
    } catch {
      throw new BadGatewayException("PawaPay est temporairement injoignable.");
    }
    const data = (await response.json().catch(() => ({}))) as PawaPayResponse;
    if (!response.ok)
      throw new BadGatewayException({
        message: "PawaPay a refusé la requête.",
        providerStatus: response.status,
        providerResponse: data,
      });
    return data;
  }
}

export interface PawaPayResponse {
  status?: string;
  data?: { status?: string };
  rejectionReason?: unknown;
  failureReason?: unknown;
  [key: string]: unknown;
}
